import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import routes from './routes/index.js';
import { notFound, errorHandler } from './middlewares/errorHandler.js';

const app = express();

// Middlewares
const parseOrigins = () => {
  const envOrigins = (process.env.CLIENT_URL || '')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);

  return [
    'http://localhost:5173',
    'http://127.0.0.1:5173',
    ...envOrigins,
  ];
};

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (curl, mobile apps, server-to-server)
      if (!origin) return callback(null, true);

      try {
        const normalizedOrigin = origin.replace(/\/$/, '');
        const allowed = parseOrigins();
        const originUrl = new URL(origin);

        // Allow explicitly configured origins or Render/Vercel domains
        if (
          allowed.includes(normalizedOrigin) ||
          originUrl.hostname.endsWith('.onrender.com') ||
          originUrl.hostname.endsWith('.vercel.app')
        ) {
          return callback(null, true);
        }
      } catch (_) {}

      return callback(new Error(`Blocked by CORS: ${origin} is not allowed`));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept'],
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// API Routes
app.use('/api', routes);

// Welcome route
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Document Management API',
    docs: '/api/health',
  });
});

// Error handling
app.use(notFound);
app.use(errorHandler);

export default app;

