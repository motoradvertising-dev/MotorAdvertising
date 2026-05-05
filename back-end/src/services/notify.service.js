const nodemailer = require('nodemailer');

// Transporter cache
let transporter = null;
let transporterType = null;

// Build transporter configs in priority order
function getTransporterConfigs() {
    const auth = {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    };
    const timeouts = {
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
    };

    return [
        {
            // Priority 1: Port 587 STARTTLS (works on Railway/Heroku/Render/etc.)
            name: 'STARTTLS-587',
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth,
            ...timeouts,
        },
        {
            // Priority 2: Port 465 SSL (blocked on some cloud platforms)
            name: 'SSL-465',
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: 465,
            secure: true,
            auth,
            ...timeouts,
        },
        {
            // Priority 3: Gmail service shorthand (uses OAuth-style internally)
            name: 'Gmail-Service',
            service: 'gmail',
            auth,
            ...timeouts,
        },
    ];
}

async function createWorkingTransporter(requestId) {
    const configs = getTransporterConfigs();

    for (const config of configs) {
        const { name, ...transportConfig } = config;
        try {
            console.log(`[${requestId}] Trying SMTP config: ${name}...`);
            const t = nodemailer.createTransport(transportConfig);
            await t.verify();
            console.log(`[${requestId}] ✅ SMTP config ${name} verified OK.`);
            return { transport: t, type: name };
        } catch (err) {
            console.warn(`[${requestId}] ⚠ SMTP config ${name} failed: ${err.message}`);
        }
    }

    throw new Error('All SMTP configurations failed');
}

async function getTransporter(requestId) {
    if (transporter) {
        try {
            await transporter.verify();
            return transporter;
        } catch {
            console.log(`[${requestId}] Cached transporter (${transporterType}) stale, recreating...`);
            transporter = null;
        }
    }

    const result = await createWorkingTransporter(requestId);
    transporter = result.transport;
    transporterType = result.type;
    return transporter;
}

const sendContactEmail = async (type, data, requestId) => {
    // Check if SMTP is configured
    const isConfigured = process.env.SMTP_USER && process.env.SMTP_PASS;

    if (!isConfigured) {
        console.warn(`[${requestId}] SMTP NOT CONFIGURED. Logging payload instead:`, data);
        console.warn(`[${requestId}] ENV CHECK → SMTP_USER: ${process.env.SMTP_USER ? 'SET' : 'MISSING'}, SMTP_PASS: ${process.env.SMTP_PASS ? 'SET' : 'MISSING'}`);
        return true;
    }

    console.log(`[${requestId}] Preparing email for type: ${type}`);

    const htmlContent = `
        <h2>Nueva solicitud de contacto: ${type}</h2>
        <p><strong>ID de solicitud:</strong> ${requestId}</p>
        <hr>
        ${Object.keys(data).map(key => `<p><strong>${key}:</strong> ${data[key]}</p>`).join('')}
    `;

    try {
        // Get a working transporter (auto-discovers best SMTP config)
        const transport = await getTransporter(requestId);

        const info = await transport.sendMail({
            from: `"Motor System" <${process.env.SMTP_USER}>`,
            to: process.env.NOTIFY_TO_EMAIL,
            subject: `[Motor Contact] Nuevo perfil: ${type}`,
            html: htmlContent,
        });
        console.log(`[${requestId}] ✅ Email sent successfully via ${transporterType}. MessageId: ${info.messageId}`);
        return true;
    } catch (error) {
        console.error(`[${requestId}] ❌ FAILED to send email:`, error.message);
        console.error(`[${requestId}] Error code: ${error.code}, command: ${error.command}`);
        
        // Reset transporter so next attempt rediscovers a working config
        transporter = null;
        transporterType = null;

        // THROW the error so the controller knows it failed
        throw error;
    }
};

module.exports = {
    sendContactEmail
};
