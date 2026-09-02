const router = require('express').Router();
const controller = require('../controllers/master.controller');
router.get('/pic-product-categories', controller.categories);
router.get('/countries', controller.countries);
module.exports = router;
