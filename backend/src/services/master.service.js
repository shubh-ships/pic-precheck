const { getChemicalPool } = require('../config/db');

async function getPicProductCategories() {
  const pool = await getChemicalPool();
  const result = await pool.request().query(`
    SELECT cm_id AS id, cm_code AS code, cm_value AS name, cm_value_ar AS nameArabic
    FROM mas.common_masters
    WHERE cm_type = 'PIC_PRODUCT_CATEGORY'
      AND is_active = 1
    ORDER BY cm_id;
  `);
  return result.recordset;
}

async function getCountries(search) {
  const pool = await getChemicalPool();
  const request = pool.request();
  request.input('search', search ? `%${search}%` : null);
  const result = await request.query(`
    SELECT cm_id AS id, cm_code AS code, cm_value AS name, cm_value_ar AS nameArabic
    FROM mas.common_masters
    WHERE cm_type = 'COUNTRY'
      AND is_active = 1
      AND (@search IS NULL OR cm_value LIKE @search OR cm_code LIKE @search)
    ORDER BY cm_value;
  `);
  return result.recordset;
}

module.exports = { getPicProductCategories, getCountries };
