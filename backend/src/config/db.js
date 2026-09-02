const sql = require('mssql');
require('dotenv').config();

const config = {
  server: process.env.DB_SERVER || 'localhost',
  port: Number(process.env.DB_PORT || 1433),
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD,
  database: process.env.PIC_DB || 'pic',
  options: {
    encrypt: String(process.env.DB_ENCRYPT).toLowerCase() === 'true',
    trustServerCertificate: String(process.env.DB_TRUST_SERVER_CERTIFICATE).toLowerCase() !== 'false'
  },
  pool: { max: 10, min: 0, idleTimeoutMillis: 30000 }
};

const chemicalConfig = { ...config, database: process.env.CHEMICAL_DB || 'chemical_db' };

let picPool;
let chemicalPool;

async function getPicPool() {
  if (!picPool) picPool = await new sql.ConnectionPool(config).connect();
  return picPool;
}

async function getChemicalPool() {
  if (!chemicalPool) chemicalPool = await new sql.ConnectionPool(chemicalConfig).connect();
  return chemicalPool;
}

async function closePools() {
  if (picPool) await picPool.close();
  if (chemicalPool) await chemicalPool.close();
}

module.exports = { sql, getPicPool, getChemicalPool, closePools };
