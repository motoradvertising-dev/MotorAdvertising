require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const contactRoutes = require('./routes/contact.routes');

const app = express();
const PORT = process.env.PORT || 3001;

// Trust the reverse proxy (required for rate limiting and HTTPS detection on Railway)
app.set('trust proxy', 1);

// Force HTTPS middleware (must be first to avoid mixed content)
app.use((req, res, next) => {
    if (req.headers['x-forwarded-proto'] && req.headers['x-forwarded-proto'] !== 'https') {
        return res.redirect(301, `https://${req.headers.host}${req.url}`);
    }
    next();
});

// CORS — must come before Helmet to handle preflight OPTIONS correctly
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Compression — gzip/brotli for all responses (huge performance win)
app.use(compression());

// Security headers — Helmet with CSP configured for our external resources
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrcAttr: ["'unsafe-inline'"],
            scriptSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://cdnjs.cloudflare.com",
                "https://unpkg.com",
                "https://cdn.tailwindcss.com",
            ],
            styleSrc: [
                "'self'",
                "'unsafe-inline'",
                "https://fonts.googleapis.com",
                "https://cdnjs.cloudflare.com",
            ],
            fontSrc: [
                "'self'",
                "https://fonts.gstatic.com",
                "https://cdnjs.cloudflare.com",
            ],
            imgSrc: [
                "'self'",
                "data:",
                "https://images.unsplash.com",
                "https://res.cloudinary.com",
                "https://raw.githubusercontent.com",
                "https://user-images.githubusercontent.com",
            ],
            mediaSrc: [
                "'self'",
                "https://raw.githubusercontent.com",
                "https://res.cloudinary.com",
            ],
            connectSrc: ["'self'", "https://wa.link"],
            frameSrc: ["'none'"],
        },
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
}));

app.use(express.json());

// Request logging for API routes only
app.use('/api/', (req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} from ${req.ip}`);
    next();
});

// Rate Limiting (API only)
const limiter = rateLimit({
    windowMs: 10 * 60 * 1000, // 10 minutes
    max: 30,
    message: { success: false, message: 'Demasiadas solicitudes, por favor intenta más tarde.' }
});
app.use('/api/', limiter);

// API Routes
app.use('/api/contact', contactRoutes);

// Quick API test endpoint
app.get('/api/ping', (req, res) => {
    res.json({ pong: true, timestamp: new Date().toISOString() });
});

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Redirect any request ending in /index.html to the path without it (clean URLs)
app.use((req, res, next) => {
    if (req.path.endsWith('/index.html')) {
        const cleanPath = req.path.slice(0, -10); // strip 'index.html'
        const query = req.url.substring(req.path.length); // keep query string
        return res.redirect(301, cleanPath + query);
    }
    next();
});

// Serve frontend static files with caching headers
const FRONTEND_ROOT = path.join(__dirname, '../../');
app.use(express.static(FRONTEND_ROOT, {
    maxAge: '1h',
    setHeaders: (res, filePath) => {
        // Long cache for assets (images, fonts, etc.)
        if (/\.(png|jpg|jpeg|webp|gif|svg|woff2?|ttf|eot|mp4)$/i.test(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
        }
        // Short cache for HTML
        if (/\.html?$/i.test(filePath)) {
            res.setHeader('Cache-Control', 'public, max-age=300');
        }
    }
}));

// Catch-all: serve index.html for any unmatched GET route (excluding /api paths)
app.get('*', (req, res, next) => {
    // Never serve index.html for API routes — let them 404 properly
    if (req.path.startsWith('/api')) {
        return res.status(404).json({ success: false, message: 'API endpoint not found' });
    }
    res.sendFile(path.join(FRONTEND_ROOT, 'index.html'));
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
