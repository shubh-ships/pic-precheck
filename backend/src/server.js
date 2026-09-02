require('dotenv').config();
const app = require('./app');
const { getPicPool, getChemicalPool } = require('./config/db');

const port = Number(process.env.PORT || 5000);

(async () => {
  try {
    await getPicPool();
    await getChemicalPool();
    app.listen(port, () => console.log(`PIC Precheck backend running on http://localhost:${port}`));
  } catch (error) {
    console.error('Database connection failed:', error.message);
    process.exit(1);
  }
})();
