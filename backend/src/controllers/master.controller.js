const service = require('../services/master.service');

async function categories(req, res, next) {
  try { res.json({ data: await service.getPicProductCategories() }); } catch (e) { next(e); }
}

async function countries(req, res, next) {
  try { res.json({ data: await service.getCountries(req.query.search) }); } catch (e) { next(e); }
}

module.exports = { categories, countries };
