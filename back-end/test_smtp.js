const nodemailer = require('nodemailer');
async function test() {
    try {
        const t = nodemailer.createTransport({
            host: 'smtp.gmail.com',
            port: 465,
            secure: false
        });
        await t.verify();
        console.log('ok');
    } catch(e) {
        console.error(e.code, e.message);
    }
}
test();
