const router = require('express').Router();
const controller = require('../controllers/pic.controller');
router.get('/precheck', controller.precheck);
module.exports = router;
