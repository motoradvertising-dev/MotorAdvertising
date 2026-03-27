const express = require('express');
const router = express.Router();
const contactController = require('../controllers/contact.controller');
const { validateEmpresa, validateProfesional, validateCuentas } = require('../validators/contact.validator');

router.post('/empresa', validateEmpresa, contactController.handleEmpresa);
router.post('/profesional', validateProfesional, contactController.handleProfesional);
router.post('/cuenta', validateCuentas, contactController.handleCuentas);

module.exports = router;
