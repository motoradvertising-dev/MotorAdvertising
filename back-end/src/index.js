require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const contactRoutes = require('./routes/contact.routes');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS MUST come before Helmet to handle preflight OPTIONS correctly
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Basic Security (after CORS)
app.use(helmet());
app.use(express.json());

// Trust the reverse proxy (required for rate limiting on Railway)
app.set('trust proxy', 1);

// Request logging for debugging
app.use('/api/', (req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} from ${req.ip}`);
    next();
});

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
