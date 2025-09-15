const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const dotenv = require('dotenv');
const connectDB = require('./config/database');
const authRoutes = require('./routes/auth');
const instituteRoutes = require('./routes/institutes');
const alertRoutes = require('./routes/alerts');
const carbonDataRoutes = require('./routes/carbonData');
const alertService = require('./services/alertService');
const buildingRoutes = require('./routes/buildings');
const meterDataRoutes = require('./routes/meterData');
const walletRoutes = require('./routes/wallet');



dotenv.config();

connectDB();

const app = express();

app.use(helmet());

app.use(cors({
  origin: ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002'],
  credentials: true,
  optionsSuccessStatus: 200
}));

console.log('CORS configured to allow origins:', ['http://localhost:3000', 'http://localhost:3001', 'http://localhost:3002']);

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api/auth', authRoutes);
app.use('/api/institutes', instituteRoutes);
app.use('/api/alerts', alertRoutes);
app.use('/api/carbon-data', carbonDataRoutes);
app.use('/api/buildings', buildingRoutes);
app.use('/api/meter-data', meterDataRoutes);
app.use('/api/wallet', walletRoutes);

app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!'
  });
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`Server running in ${process.env.NODE_ENV} mode on port ${PORT}`);
  
  alertService.start();
});
