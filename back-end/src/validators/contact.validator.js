const validateEmail = (email) => {
    return String(email)
        .toLowerCase()
        .match(/^(([^<>()[\]\\.,;:\s@"]+(\.[^<>()[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/);
};

const validateUrl = (url) => {
    try {
        new URL(url);
        return true;
    } catch (_) {
        return false;
    }
};

const validateEmpresa = (req, res, next) => {
    const { name, email, company, budget, message } = req.body;

    if (!name || !email || !company || !budget || !message) {
        return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios.' });
    }

    if (!validateEmail(email)) {
        return res.status(400).json({ success: false, message: 'Email inválido.' });
    }

    // Sanitize strings
    req.body.name = name.trim();
    req.body.company = company.trim();
    req.body.message = message.trim();

    next();
};

const validateProfesional = (req, res, next) => {
    const { name, email, role, portfolio, experience } = req.body;

    if (!name || !email || !role || !portfolio || !experience) {
        return res.status(400).json({ success: false, message: 'Todos los campos son obligatorios.' });
    }

    if (!validateEmail(email)) {
        return res.status(400).json({ success: false, message: 'Email inválido.' });
    }

    if (!validateUrl(portfolio)) {
        return res.status(400).json({ success: false, message: 'URL de portafolio inválida.' });
    }

    // Sanitize strings
    req.body.name = name.trim();
    req.body.experience = experience.trim();

    next();
};

module.exports = {
    validateEmpresa,
    validateProfesional
};
