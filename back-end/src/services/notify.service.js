const nodemailer = require('nodemailer');

const sendContactEmail = async (type, data, requestId) => {
    // Check if SMTP is configured
    const isConfigured = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

    if (!isConfigured) {
        console.warn(`[${requestId}] SMTP NOT CONFIGURED. Logging payload instead:`, data);
        return true;
    }

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    const htmlContent = `
        <h2>Nueva solicitud de contacto: ${type}</h2>
        <p><strong>ID de solicitud:</strong> ${requestId}</p>
        <hr>
        ${Object.keys(data).map(key => `<p><strong>${key}:</strong> ${data[key]}</p>`).join('')}
    `;

    try {
        await transporter.sendMail({
            from: `"Motor System" <${process.env.SMTP_USER}>`,
            to: process.env.NOTIFY_TO_EMAIL,
            subject: `[Motor Contact] Nuevo perfil: ${type}`,
            html: htmlContent,
        });
        console.log(`[${requestId}] Email notification sent successfully.`);
    } catch (error) {
        console.error(`[${requestId}] Failed to send email:`, error);
        // We don't throw error here to allow the process to continue (fallback logic)
        return true;
    }
};

module.exports = {
    sendContactEmail
};
