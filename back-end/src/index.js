require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const contactRoutes = require('./routes/contact.routes');

const app = express();
const PORT = process.env.PORT || 3001;

// Basic Security
app.use(helmet());
app.use(express.json());

app.use(cors());

// Rate Limiting
const limiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 30, // limit each IP to 30 requests per windowMs
    message: { success: false, message: 'Demasiadas solicitudes, por favor intenta más tarde.' }
});
app.use('/api/', limiter);

// Routes
app.use('/api/contact', contactRoutes);

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        requestId: req.headers['x-request-id'] || 'system'
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Motor Backend running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
