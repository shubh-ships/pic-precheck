const { getPicPool, getChemicalPool } = require('../config/db');
const { sql } = require('../config/db');
const { getFraName } = require('../utils/fraRules');
const { getChemicalById } = require('./chemical.service');

async function getCategoryName(categoryId) {
  const pool = await getChemicalPool();
  const request = pool.request();
  request.input('categoryId', Number(categoryId));
  const result = await request.query(`
    SELECT TOP 1 cm_id AS id, cm_code AS code, cm_value AS name
    FROM mas.common_masters
    WHERE cm_id = @categoryId
      AND cm_type = 'PIC_PRODUCT_CATEGORY'
      AND is_active = 1;
  `);
  return result.recordset[0] || null;
}

async function getAnnexCategories(chemicalId) {
  const pic = await getPicPool();
  const request = pic.request();
  request.input('chemicalId', Number(chemicalId));
  const result = await request.query(`
    SELECT DISTINCT
      a.categoryid AS id,
      cm.cm_code AS code,
      cm.cm_value AS name
    FROM mas.annexiiicategory a
    LEFT JOIN ${process.env.CHEMICAL_DB || 'chemical_db'}.mas.common_masters cm
      ON cm.cm_id = a.categoryid
    WHERE a.chemicalid = @chemicalId
      AND a.is_deleted = 0
    ORDER BY a.categoryid;
  `);
  return result.recordset;
}

async function getPrecheck({ chemicalId, countryId, categoryId, isAnnex = true }) {
  const chemical = await getChemicalById(chemicalId);
  if (!chemical) {
    const error = new Error('Chemical not found');
    error.status = 404;
    throw error;
  }

  const selectedCategory = await getCategoryName(categoryId);
  if (!selectedCategory) {
    const error = new Error('Invalid or inactive PIC product category');
    error.status = 400;
    throw error;
  }

  const categories = await getAnnexCategories(chemicalId);
  const isAnnexCalculated = categories.length > 0;
  const categoryMatch = categories.some(c => Number(c.id) === Number(categoryId));
  const effectiveIsAnnex = isAnnex === undefined ? isAnnexCalculated : Boolean(isAnnex);

  const pic = await getPicPool();
  const request = pic.request();
  request.input('chemicalId', Number(chemicalId));
  request.input('countryId', Number(countryId));
  request.input('categoryId', Number(categoryId));

  const result = await request.query(`
    SELECT TOP 1
      fra.id AS fraId,
      fra.countryid AS countryId,
      fra.chemicalid AS chemicalId,
      frc.id AS fraCategoryId,
      frc.categoryid AS categoryId,
      frc.fraid,
      frc.publishdate AS publishDate
    FROM mas.finalregulatoryaction fra
    LEFT JOIN mas.finalregulatoryactioncategory frc
      ON frc.finalregulatoryactionid = fra.id
     AND frc.categoryid = @categoryId
     AND frc.is_deleted = 0
    WHERE fra.chemicalid = @chemicalId
      AND fra.countryid = @countryId
      AND fra.is_active = 1
    ORDER BY fra.id;

    SELECT TOP 1
      id,
      countryid AS countryId,
      chemicalid AS chemicalId,
      decision,
      publishdate AS publishDate,
      reviseddate AS revisedDate
    FROM mas.importresponse
    WHERE countryid = @countryId
      AND chemicalid = @chemicalId
      AND is_active = 1
    ORDER BY ISNULL(reviseddate, publishdate) DESC, id DESC;
  `);

  const fra = result.recordsets[0]?.[0] || null;
  const importResponse = result.recordsets[1]?.[0] || null;

  // Same logic as Java existsInEither(countryId):
  // true if the country exists in either importresponse or finalregulatoryaction.
  const partyRequest = pic.request();
  partyRequest.input('partyCountryId', Number(countryId));

  const partyResult = await partyRequest.query(`
    SELECT CASE
      WHEN EXISTS (
        SELECT 1
        FROM mas.importresponse
        WHERE countryid = @partyCountryId
      )
      OR EXISTS (
        SELECT 1
        FROM mas.finalregulatoryaction
        WHERE countryid = @partyCountryId
      )
      THEN CAST(1 AS bit)
      ELSE CAST(0 AS bit)
    END AS isPartyToPic;
  `);

  const isPartyToPic = partyResult.recordset[0]?.isPartyToPic ?? false;

  const fraName = fra ? getFraName(fra.fraid) : 'N/A';
  const useCategoryName = categories.length ? categories.map(c => c.name).join(',') : 'N/A';

  // Same intent as the Java code: category match is explicit consent on Annex III;
  // Banned / Severely Restricted FRA also requires explicit consent.
  const explicitConsentRequired = Boolean(
    (effectiveIsAnnex && categoryMatch) ||
    fraName === 'Banned' ||
    fraName === 'Severely Restricted'
  );

  return {
    chemical,
    annexIII: isAnnexCalculated,
    requestedCategory: selectedCategory,
    annexCategories: categories,
    useCategoryName,
    finalRegulatoryAction: fra ? {
      fraId: fra.fraId,
      fraCategoryId: fra.fraCategoryId,
      fraid: fra.fraid,
      fraName,
      publishDate: fra.publishDate
    } : {
      fraId: null,
      fraCategoryId: null,
      fraid: null,
      fraName: 'N/A',
      publishDate: null
    },
    importResponse: importResponse ? {
      id: importResponse.id,
      decision: importResponse.decision,
      publishDate: importResponse.publishDate,
      revisedDate: importResponse.revisedDate
    } : {
      id: null,
      decision: 'N/A',
      publishDate: null,
      revisedDate: null
    },
    isPartyToPic,
    explicitConsentRequired,
    categoryMatch
  };
}

module.exports = { getPrecheck, getAnnexCategories };
