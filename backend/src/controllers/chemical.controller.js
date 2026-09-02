const service = require('../services/chemical.service');

async function search(req, res, next) {
  try {
    const page = Math.max(0, Number(req.query.page || 0));
    const size = Math.min(100, Math.max(1, Number(req.query.size || 20)));
    res.json(await service.searchChemicals({
      search: req.query.search,
      casNumber: req.query.casNumber,
      scientificName: req.query.scientificName,
      page,
      size
    }));
  } catch (e) { next(e); }
}


async function annexStatus(req, res, next) {
  try {
    const chemicalId = Number(req.query.chemicalId);

    if (!Number.isInteger(chemicalId) || chemicalId <= 0) {
      return res.status(400).json({ message: 'chemicalId must be a positive integer' });
    }

    res.json(await service.getAnnexStatus(chemicalId));
  } catch (e) {
    next(e);
  }
}

module.exports = { search, annexStatus };
