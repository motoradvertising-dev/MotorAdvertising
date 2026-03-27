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

const validateCuentas = (req, res, next) => {
    const { negocio, gmail, instragram, page, sitio } = req.body;
    
    // We only validate that negocio is provided since some steps might be skipped intentionally or left blank by mistake, 
    // but the name is required to know who is creating this.
    if (!negocio) {
        return res.status(400).json({ success: false, message: 'El nombre del negocio es obligatorio.' });
    }

    next();
};

module.exports = {
    validateEmpresa,
    validateProfesional,
    validateCuentas
};
