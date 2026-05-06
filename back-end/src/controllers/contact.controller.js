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

    // Always respond success to the user — data is already logged
    res.json({
        success: true,
        message: 'Información recibida. Nuestro equipo te contactará pronto.',
        requestId
    });

    // Attempt email in background (fire-and-forget)
    try {
        await sendWithRetry('Empresa', payload, requestId);
    } catch (error) {
        console.error(`[${requestId}] Email failed after retries (data already logged above):`, error.message);
    }
};

const handleProfesional = async (req, res) => {
    const requestId = uuidv4();
    const payload = req.body;

    console.log(`[${requestId}] New Profesional contact submission:`, payload);

    res.json({
        success: true,
        message: 'Información recibida. Nuestro equipo te contactará pronto.',
        requestId
    });

    try {
        await sendWithRetry('Profesional', payload, requestId);
    } catch (error) {
        console.error(`[${requestId}] Email failed after retries (data already logged above):`, error.message);
    }
};

const handleCuentas = async (req, res) => {
    const requestId = uuidv4();
    const payload = req.body;

    console.log(`[${requestId}] New Cuentas contact submission:`, payload);

    res.json({
        success: true,
        message: 'Información recibida. Tu asesor ha sido notificado.',
        requestId
    });

    try {
        await sendWithRetry('Creación de Cuenta', payload, requestId);
    } catch (error) {
        console.error(`[${requestId}] Email failed after retries (data already logged above):`, error.message);
    }
};

module.exports = {
    handleEmpresa,
    handleProfesional,
    handleCuentas
};
