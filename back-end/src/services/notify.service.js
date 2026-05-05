const nodemailer = require('nodemailer');

// Create transporter once (reuse TCP connection pool)
let transporter = null;

function getTransporter() {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: parseInt(process.env.SMTP_PORT, 10) || 465,
            secure: true,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS,
            },
            // Connection timeouts to prevent hanging on Railway
            connectionTimeout: 10000,  // 10s to establish connection
            greetingTimeout: 10000,    // 10s for SMTP greeting
            socketTimeout: 15000,      // 15s for socket inactivity
            pool: true,                // Use connection pooling
            maxConnections: 3,
            maxMessages: 10,
        });
    }
    return transporter;
}

const sendContactEmail = async (type, data, requestId) => {
    // Check if SMTP is configured
    const isConfigured = process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS;

    if (!isConfigured) {
        console.warn(`[${requestId}] SMTP NOT CONFIGURED. Logging payload instead:`, data);
        console.warn(`[${requestId}] ENV CHECK → SMTP_HOST: ${process.env.SMTP_HOST ? 'SET' : 'MISSING'}, SMTP_USER: ${process.env.SMTP_USER ? 'SET' : 'MISSING'}, SMTP_PASS: ${process.env.SMTP_PASS ? 'SET' : 'MISSING'}`);
        return true;
    }

    console.log(`[${requestId}] Preparing email for type: ${type}`);
    console.log(`[${requestId}] SMTP Config → Host: ${process.env.SMTP_HOST}, Port: ${process.env.SMTP_PORT || 465}, User: ${process.env.SMTP_USER}`);

    const transport = getTransporter();

    const htmlContent = `
        <h2>Nueva solicitud de contacto: ${type}</h2>
        <p><strong>ID de solicitud:</strong> ${requestId}</p>
        <hr>
        ${Object.keys(data).map(key => `<p><strong>${key}:</strong> ${data[key]}</p>`).join('')}
    `;

    try {
        // Verify SMTP connection first
        console.log(`[${requestId}] Verifying SMTP connection...`);
        await transport.verify();
        console.log(`[${requestId}] SMTP connection verified OK.`);

        const info = await transport.sendMail({
            from: `"Motor System" <${process.env.SMTP_USER}>`,
            to: process.env.NOTIFY_TO_EMAIL,
            subject: `[Motor Contact] Nuevo perfil: ${type}`,
            html: htmlContent,
        });
        console.log(`[${requestId}] Email sent successfully. MessageId: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error(`[${requestId}] ❌ FAILED to send email:`, error.message);
        console.error(`[${requestId}] Error code: ${error.code}, command: ${error.command}`);
        
        // Reset transporter on connection errors so next attempt creates a fresh one
        if (error.code === 'ESOCKET' || error.code === 'ECONNECTION' || error.code === 'ETIMEDOUT') {
            console.log(`[${requestId}] Resetting transporter due to connection error.`);
            transporter = null;
        }

        // THROW the error so the controller knows it failed
        throw error;
    }
};

module.exports = {
    sendContactEmail
};
