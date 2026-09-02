const service = require('../services/pic.service');

async function precheck(req, res, next) {
  try {
    const chemicalId = Number(req.query.chemicalId);
    const countryId = Number(req.query.countryId);
    const categoryId = Number(req.query.categoryId);
    if (!chemicalId || !countryId || !categoryId) {
      return res.status(400).json({ message: 'chemicalId, countryId and categoryId are required' });
    }
    const isAnnex = req.query.isAnnex === undefined ? true : req.query.isAnnex === 'true';
    res.json(await service.getPrecheck({ chemicalId, countryId, categoryId, isAnnex }));
  } catch (e) { next(e); }
}

module.exports = { precheck };
