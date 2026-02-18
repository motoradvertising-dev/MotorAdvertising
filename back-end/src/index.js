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

// CORS Configuration
const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:8080',
    process.env.FRONTEND_ORIGIN
].filter(Boolean);

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl)
        if (!origin) return callback(null, true);

        if (allowedOrigins.indexOf(origin) !== -1 || process.env.NODE_ENV !== 'production') {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    }
}));

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

app.listen(PORT, () => {
    console.log(`Motor Backend running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
});
