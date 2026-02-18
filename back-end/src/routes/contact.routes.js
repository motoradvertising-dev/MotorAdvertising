const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contact.controller');
const { validateEmpresa, validateProfesional } = require('../validators/contact.validator');

router.post('/empresa', validateEmpresa, contactController.handleEmpresa);
router.post('/profesional', validateProfesional, contactController.handleProfesional);

module.exports = router;
