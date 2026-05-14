require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const authRoutes = require('./routes/auth');
const assetRoutes = require('./routes/assets');
const purchaseRoutes = require('./routes/purchases');
const transferRoutes = require('./routes/transfers');
const assignmentRoutes = require('./routes/assignments');

const app = express();

// -- Middleware --
app.use(cors({
  origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// -- Route mounting --
app.use('/api/auth', authRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/purchases', purchaseRoutes);
app.use('/api/transfers', transferRoutes);
app.use('/api/assignments', assignmentRoutes);

// Health check - useful for deployment probes
app.get('/api/health', (_req, res) => {
  res.json({ status: 'operational', timestamp: new Date().toISOString() });
});

// Catch-all for unknown routes under /api
app.use('/api/*', (_req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Global error handler - catches anything that slips through route-level try/catch
app.use((err, _req, res, _next) => {
  console.error(`[${new Date().toISOString()}] Unhandled error:`, err.message);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
});

// -- Database connection + server start --
const PORT = process.env.PORT || 5000;

mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`KristalBall API running on port ${PORT}`);
    });
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });

module.exports = app;
