const { v4: uuidv4 } = require('uuid');
const notifyService = require('../services/notify.service');

// Helper: attempt email with retry
async function sendWithRetry(type, payload, requestId, maxRetries = 2) {
    let lastError;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            console.log(`[${requestId}] Email attempt ${attempt}/${maxRetries}...`);
            await notifyService.sendContactEmail(type, payload, requestId);
            return true; // success
        } catch (error) {
            lastError = error;
            console.warn(`[${requestId}] Attempt ${attempt} failed: ${error.message}`);
            if (attempt < maxRetries) {
                // Wait briefly before retrying
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
    }
    throw lastError;
}

const handleEmpresa = async (req, res) => {
    const requestId = uuidv4();
    const payload = req.body;

    console.log(`[${requestId}] New Empresa contact submission:`, payload);

    try {
        await sendWithRetry('Empresa', payload, requestId);

        res.json({
            success: true,
            message: 'Información recibida. Nuestro equipo te contactará pronto.',
            requestId
        });
    } catch (error) {
        console.error(`[${requestId}] Error in handleEmpresa after retries:`, error.message);
        res.status(500).json({
            success: false,
            message: 'Error al procesar la solicitud. Por favor intenta de nuevo.',
            requestId
        });
    }
};

const handleProfesional = async (req, res) => {
    const requestId = uuidv4();
    const payload = req.body;

    console.log(`[${requestId}] New Profesional contact submission:`, payload);

    try {
        await sendWithRetry('Profesional', payload, requestId);

        res.json({
            success: true,
            message: 'Información recibida. Nuestro equipo te contactará pronto.',
            requestId
        });
    } catch (error) {
        console.error(`[${requestId}] Error in handleProfesional after retries:`, error.message);
        res.status(500).json({
            success: false,
            message: 'Error al procesar la solicitud. Por favor intenta de nuevo.',
            requestId
        });
    }
};

const handleCuentas = async (req, res) => {
    const requestId = uuidv4();
    const payload = req.body;

    console.log(`[${requestId}] New Cuentas contact submission:`, payload);

    try {
        await sendWithRetry('Creación de Cuenta', payload, requestId);

        res.json({
            success: true,
            message: 'Información recibida. Tu asesor ha sido notificado.',
            requestId
        });
    } catch (error) {
        console.error(`[${requestId}] Error in handleCuentas after retries:`, error.message);
        res.status(500).json({
            success: false,
            message: 'Error al procesar la solicitud. Por favor intenta de nuevo.',
            requestId
        });
    }
};

module.exports = {
    handleEmpresa,
    handleProfesional,
    handleCuentas
};
