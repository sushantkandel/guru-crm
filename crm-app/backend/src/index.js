require('dotenv').config();
const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');

const authRoutes = require('./routes/auth');
const customerRoutes = require('./routes/customers');
const orderRoutes = require('./routes/orders');
const paymentRoutes = require('./routes/payments');
const mapRoutes = require('./routes/map');
const locationRoutes = require('./routes/locations');
const dashboardRoutes = require('./routes/dashboard');
const productRoutes = require('./routes/products');
const deleteRequestRoutes = require('./routes/deleteRequests');
const companyRoutes = require('./routes/companies');

const app = express();
const PORT = process.env.PORT || 5001;
const HOST = process.env.HOST || '0.0.0.0';

const allowedOrigins = new Set(
  [
    process.env.FRONTEND_URL,
    'http://localhost:5173',
    'http://127.0.0.1:5173',
  ].filter(Boolean),
);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.has(origin)) return callback(null, true);
      try {
        const { hostname, protocol } = new URL(origin);
        if (protocol === 'https:' && (hostname === 'github.io' || hostname.endsWith('.github.io'))) {
          return callback(null, true);
        }
      } catch {
        // ignore invalid origin URL
      }
      callback(null, process.env.NODE_ENV !== 'production');
    },
    credentials: true,
  }),
);
app.use(express.json());

const { getEmailProvider, brevoApiKeyFormatOk, probeBrevoApi } = require('./services/emailService');
const { getFrontendBaseUrl } = require('./config/frontendUrl');

app.get('/api/health', (req, res) => {
  const emailProvider = getEmailProvider();
  const payload = {
    status: 'ok',
    emailProvider,
    passwordResetBase: getFrontendBaseUrl(),
  };
  if (emailProvider === 'brevo') {
    payload.brevoKeyFormat = brevoApiKeyFormatOk() ? 'ok' : 'invalid-use-xkeysib-api-key';
  }
  res.json(payload);
});

app.get('/api/health/brevo', async (req, res, next) => {
  try {
    res.json(await probeBrevoApi());
  } catch (err) {
    next(err);
  }
});

app.use('/api/auth', authRoutes);
app.use('/api/customers', customerRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/map', mapRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/products', productRoutes);
app.use('/api/delete-requests', deleteRequestRoutes);
app.use('/api/company', companyRoutes);

app.use(errorHandler);

app.listen(PORT, HOST, () => {
  console.log(`CRM API running on http://localhost:${PORT} (bound to ${HOST})`);
});
