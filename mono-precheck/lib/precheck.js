import "server-only";
import { databases, getPool, sql } from "./db";
import { getFraName } from "./fra-rules";

const isoDate = (value) => (value instanceof Date ? value.toISOString() : value ?? null);
const chemicalPool = () => getPool(databases.chemical);
const picPool = () => getPool(databases.pic);

export async function getMasterData() {
  const pool = await chemicalPool();
  const [countries, categories] = await Promise.all([
    pool.request().query("SELECT cm_id AS id, cm_code AS code, cm_value AS name FROM mas.common_masters WHERE cm_type = 'COUNTRY' AND is_active = 1 ORDER BY cm_value;"),
    pool.request().query("SELECT cm_id AS id, cm_code AS code, cm_value AS name FROM mas.common_masters WHERE cm_type = 'PIC_PRODUCT_CATEGORY' AND is_active = 1 ORDER BY cm_id;"),
  ]);
  return { countries: countries.recordset, categories: categories.recordset };
}

export async function searchCasOptions(term) {
  const trimmed = term?.trim();
  if (!trimmed || trimmed.length < 2) return [];
  const chemicals = await chemicalPool();
  const options = await chemicals.request().input("term", sql.NVarChar, `${trimmed}%`).query(`
    SELECT TOP 20 cas_number AS casNumber, scientific_name_english AS scientificName
    FROM mas.chemicals WHERE cas_number LIKE @term ORDER BY cas_number;
  `);
  return options.recordset;
}

export async function searchChemicalByCas(cas) {
  const chemicals = await chemicalPool();
  const search = await chemicals.request().input("cas", sql.NVarChar, cas).query(`
    SELECT chemical_id AS chemicalId, cas_number AS casNumber, scientific_name_english AS scientificName
    FROM mas.chemicals WHERE cas_number = @cas ORDER BY chemical_id;
  `);
  if (search.recordset.length !== 1) return search.recordset.length ? { error: "Multiple chemicals found. Enter the exact CAS number." } : { error: "No chemical found for this CAS number." };

  const selected = search.recordset[0];
  const pics = await picPool();
  const annex = await pics.request().input("chemicalId", sql.Int, selected.chemicalId).query(`
    SELECT TOP 1 1 AS listed FROM mas.annexiiicategory
    WHERE chemicalid = @chemicalId AND ISNULL(is_deleted, 0) = 0;
  `);
  return { chemical: { ...selected, annexIII: annex.recordset.length > 0 } };
}

export async function runPrecheck({ chemicalId, countryId, categoryId }) {
  const [chemicalIdNumber, countryIdNumber, categoryIdNumber] = [chemicalId, countryId, categoryId].map(Number);
  if ([chemicalIdNumber, countryIdNumber, categoryIdNumber].some((id) => !Number.isInteger(id) || id <= 0)) throw new Error("Chemical, country and category are required.");

  const [chemicals, pics] = await Promise.all([chemicalPool(), picPool()]);
  const [chemicalResult, categoryResult, annexIdsResult, fraResult, responseResult, partyResult] = await Promise.all([
    chemicals.request().input("chemicalId", sql.Int, chemicalIdNumber).query("SELECT TOP 1 chemical_id AS chemicalId, cas_number AS casNumber, scientific_name_english AS scientificName FROM mas.chemicals WHERE chemical_id = @chemicalId;"),
    chemicals.request().input("categoryId", sql.Int, categoryIdNumber).query("SELECT TOP 1 cm_id AS id, cm_code AS code, cm_value AS name FROM mas.common_masters WHERE cm_id = @categoryId AND cm_type = 'PIC_PRODUCT_CATEGORY' AND is_active = 1;"),
    pics.request().input("chemicalId", sql.Int, chemicalIdNumber).query("SELECT DISTINCT a.categoryid AS id FROM mas.annexiiicategory a WHERE a.chemicalid = @chemicalId AND ISNULL(a.is_deleted, 0) = 0 ORDER BY a.categoryid;"),
    pics.request().input("categoryId", sql.Int, categoryIdNumber).input("chemicalId", sql.Int, chemicalIdNumber).input("countryId", sql.Int, countryIdNumber).query("SELECT TOP 1 fra.id AS fraId, fra.countryid AS countryId, fra.chemicalid AS chemicalId, frc.id AS fraCategoryId, frc.categoryid AS categoryId, frc.fraid, frc.publishdate AS publishDate FROM mas.finalregulatoryaction fra LEFT JOIN mas.finalregulatoryactioncategory frc ON frc.finalregulatoryactionid = fra.id AND frc.categoryid = @categoryId AND ISNULL(frc.is_deleted, 0) = 0 WHERE fra.chemicalid = @chemicalId AND fra.countryid = @countryId AND fra.is_active = 1 ORDER BY fra.id;"),
    pics.request().input("countryId", sql.Int, countryIdNumber).input("chemicalId", sql.Int, chemicalIdNumber).query("SELECT TOP 1 id, countryid AS countryId, chemicalid AS chemicalId, decision, publishdate AS publishDate, reviseddate AS revisedDate FROM mas.importresponse WHERE countryid = @countryId AND chemicalid = @chemicalId AND is_active = 1 ORDER BY ISNULL(reviseddate, publishdate) DESC, id DESC;"),
    pics.request().input("countryId", sql.Int, countryIdNumber).query("SELECT CASE WHEN EXISTS (SELECT 1 FROM mas.importresponse WHERE countryid = @countryId) OR EXISTS (SELECT 1 FROM mas.finalregulatoryaction WHERE countryid = @countryId) THEN CAST(1 AS bit) ELSE CAST(0 AS bit) END AS isPartyToPic;"),
  ]);

  const chemical = chemicalResult.recordset[0];
  const selectedCategory = categoryResult.recordset[0];
  if (!chemical) throw new Error("Chemical not found.");
  if (!selectedCategory) throw new Error("Invalid or inactive PIC product category.");

  // pic and chemical_db are separate Azure SQL databases; cross-database joins aren't
  // supported there, so the category names are looked up from chemical_db separately.
  const annexIds = annexIdsResult.recordset.map((row) => row.id);
  const annexCategories = annexIds.length
    ? (
        await chemicals.request().query(`SELECT cm_id AS id, cm_code AS code, cm_value AS name FROM mas.common_masters WHERE cm_id IN (${annexIds.map(Number).join(",")}) ORDER BY cm_id;`)
      ).recordset
    : [];
  const fra = fraResult.recordset[0];
  const importResponse = responseResult.recordset[0];
  const categoryMatch = annexCategories.some((category) => Number(category.id) === categoryIdNumber);
  const fraName = fra ? getFraName(fra.fraid) : "N/A";
  return {
    chemical, annexIII: annexCategories.length > 0, requestedCategory: selectedCategory, annexCategories,
    useCategoryName: annexCategories.length ? annexCategories.map((item) => item.name).join(", ") : "N/A",
    finalRegulatoryAction: fra ? { ...fra, fraName, publishDate: isoDate(fra.publishDate) } : { fraId: null, fraCategoryId: null, fraid: null, fraName: "N/A", publishDate: null },
    importResponse: importResponse ? { ...importResponse, publishDate: isoDate(importResponse.publishDate), revisedDate: isoDate(importResponse.revisedDate) } : { id: null, decision: "N/A", publishDate: null, revisedDate: null },
    isPartyToPic: Boolean(partyResult.recordset[0]?.isPartyToPic),
    explicitConsentRequired: (annexCategories.length > 0 && categoryMatch) || ["Banned", "Severely Restricted"].includes(fraName),
    categoryMatch,
  };
}
