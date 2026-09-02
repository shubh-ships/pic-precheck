const router = require('express').Router();
const controller = require('../controllers/chemical.controller');
router.get('/search', controller.search);
router.get('/annex-status', controller.annexStatus);
module.exports = router;
