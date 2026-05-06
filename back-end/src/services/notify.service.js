/**
 * Email notification service.
 * 
 * Primary:  Resend REST API (works on Railway — uses HTTPS, not blocked SMTP ports)
 * Fallback: Console logging (data is never lost)
 *
 * To use Resend:
 *   1. Create a free account at https://resend.com
 *   2. Get your API key from the dashboard
 *   3. Set RESEND_API_KEY in Railway environment variables
 *   4. Set NOTIFY_TO_EMAIL to the email where you want to receive notifications
 *
 * Free tier: 100 emails/day, 3,000/month — more than enough for contact forms.
 */

const sendContactEmail = async (type, data, requestId) => {
    const resendKey = process.env.RESEND_API_KEY;
    const toEmail = process.env.NOTIFY_TO_EMAIL;

    // Build the HTML content
    const htmlContent = `
        <h2>Nueva solicitud de contacto: ${type}</h2>
        <p><strong>ID de solicitud:</strong> ${requestId}</p>
        <p><strong>Fecha:</strong> ${new Date().toISOString()}</p>
        <hr>
        ${Object.keys(data).map(key => `<p><strong>${key}:</strong> ${data[key]}</p>`).join('')}
    `;

    // If Resend is not configured, just log (data is already logged by the controller)
    if (!resendKey) {
        console.warn(`[${requestId}] RESEND_API_KEY not configured. Email NOT sent.`);
        console.warn(`[${requestId}] To enable emails: set RESEND_API_KEY in Railway env vars.`);
        return true;
    }

    if (!toEmail) {
        console.warn(`[${requestId}] NOTIFY_TO_EMAIL not configured. Email NOT sent.`);
        return true;
    }

    console.log(`[${requestId}] Sending email via Resend API...`);

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${resendKey}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from: process.env.RESEND_FROM_EMAIL || 'Motor Advertising <onboarding@resend.dev>',
            to: [toEmail],
            subject: `[Motor Contact] Nuevo perfil: ${type}`,
            html: htmlContent,
        }),
    });

    const result = await response.json();

    if (!response.ok) {
        console.error(`[${requestId}] ❌ Resend API error:`, result);
        throw new Error(result.message || 'Resend API failed');
    }

    console.log(`[${requestId}] ✅ Email sent via Resend. ID: ${result.id}`);
    return true;
};

module.exports = {
    sendContactEmail
};
