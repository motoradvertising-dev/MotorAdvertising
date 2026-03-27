const { v4: uuidv4 } = require('uuid');
const notifyService = require('../services/notify.service');

const handleEmpresa = async (req, res) => {
    const requestId = uuidv4();
    const payload = req.body;

    console.log(`[${requestId}] New Empresa contact submission:`, payload);

    try {
        await notifyService.sendContactEmail('Empresa', payload, requestId);

        res.json({
            success: true,
            message: 'Información recibida. Nuestro equipo te contactará pronto.',
            requestId
        });
    } catch (error) {
        console.error(`[${requestId}] Error in handleEmpresa:`, error);
        res.status(500).json({
            success: false,
            message: 'Error al procesar la solicitud',
            requestId
        });
    }
};

const handleProfesional = async (req, res) => {
    const requestId = uuidv4();
    const payload = req.body;

    console.log(`[${requestId}] New Profesional contact submission:`, payload);

    try {
        await notifyService.sendContactEmail('Profesional', payload, requestId);

        res.json({
            success: true,
            message: 'Información recibida. Nuestro equipo te contactará pronto.',
            requestId
        });
    } catch (error) {
        console.error(`[${requestId}] Error in handleProfesional:`, error);
        res.status(500).json({
            success: false,
            message: 'Error al procesar la solicitud',
            requestId
        });
    }
};

const handleCuentas = async (req, res) => {
    const requestId = uuidv4();
    const payload = req.body;

    console.log(`[${requestId}] New Cuentas contact submission:`, payload);

    try {
        await notifyService.sendContactEmail('Creación de Cuenta', payload, requestId);

        res.json({
            success: true,
            message: 'Información recibida. Tu asesor ha sido notificado.',
            requestId
        });
    } catch (error) {
        console.error(`[${requestId}] Error in handleCuentas:`, error);
        res.status(500).json({
            success: false,
            message: 'Error al procesar la solicitud',
            requestId
        });
    }
};

module.exports = {
    handleEmpresa,
    handleProfesional,
    handleCuentas
};
