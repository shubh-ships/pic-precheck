const { getChemicalPool } = require('../config/db');

async function searchChemicals({ search, casNumber, scientificName, page = 0, size = 20 }) {
  const pool = await getChemicalPool();
  const request = pool.request();
  request.input('search', search ? `%${search.toLowerCase()}%` : null);
  request.input('casNumber', casNumber ? `%${casNumber}%` : null);
  request.input('scientificName', scientificName ? `%${scientificName}%` : null);
  request.input('offset', Number(page) * Number(size));
  request.input('size', Number(size));

  const result = await request.query(`
    SELECT
      chemical_id AS chemicalId,
      cas_number AS casNumber,
      scientific_name_english AS scientificName
    FROM mas.chemicals
    WHERE (@search IS NULL
           OR LOWER(ISNULL(cas_number, '')) LIKE @search
           OR LOWER(ISNULL(scientific_name_english, '')) LIKE @search)
      AND (@casNumber IS NULL OR cas_number LIKE @casNumber)
      AND (@scientificName IS NULL OR scientific_name_english LIKE @scientificName)
    ORDER BY chemical_id
    OFFSET @offset ROWS FETCH NEXT @size ROWS ONLY;

    SELECT COUNT_BIG(1) AS total
    FROM mas.chemicals
    WHERE (@search IS NULL
           OR LOWER(ISNULL(cas_number, '')) LIKE @search
           OR LOWER(ISNULL(scientific_name_english, '')) LIKE @search)
      AND (@casNumber IS NULL OR cas_number LIKE @casNumber)
      AND (@scientificName IS NULL OR scientific_name_english LIKE @scientificName);
  `);

  const rows = result.recordsets[0] || [];
  const total = Number(result.recordsets[1]?.[0]?.total || 0);
  return { content: rows, page: Number(page), size: Number(size), totalElements: total, totalPages: Math.ceil(total / Number(size)) };
}

async function getChemicalById(chemicalId) {
  const pool = await getChemicalPool();
  const request = pool.request();
  request.input('chemicalId', Number(chemicalId));
  const result = await request.query(`
    SELECT TOP 1
      chemical_id AS chemicalId,
      cas_number AS casNumber,
      scientific_name_english AS scientificName
    FROM mas.chemicals
    WHERE chemical_id = @chemicalId;
  `);
  return result.recordset[0] || null;
}


async function getAnnexStatus(chemicalId) {
  const pool = await getChemicalPool();
  const request = pool.request();
  request.input('chemicalId', Number(chemicalId));

  const result = await request.query(`
    SELECT CAST(
      CASE WHEN EXISTS (
        SELECT 1
        FROM pic.mas.annexiiicategory a
        WHERE a.chemicalid = @chemicalId
          AND ISNULL(a.is_deleted, 0) = 0
      )
      THEN 1 ELSE 0 END
    AS bit) AS annexIII;
  `);

  return {
    chemicalId: Number(chemicalId),
    annexIII: Boolean(result.recordset[0]?.annexIII)
  };
}

module.exports = { searchChemicals, getChemicalById, getAnnexStatus };
