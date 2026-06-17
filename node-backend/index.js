const express = require('express');
const cors = require('cors');
const { connectDB } = require('./app/database');
const identityRoutes = require('./app/routes/identity');
const tasksRoutes = require('./app/routes/tasks');
const scoreRoutes = require('./app/routes/score');
const loansRoutes = require('./app/routes/loans');
const aiRoutes = require('./app/routes/ai');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

// Initialize Database (Firestore)
try {
  connectDB();
} catch (err) {
  console.error('Initial database connection failed:', err.message);
}

// Routes
app.use('/identity', identityRoutes);
app.use('/tasks', tasksRoutes);
app.use('/score', scoreRoutes);
app.use('/loans', loansRoutes);
app.use('/ai', aiRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'veragig-node-api', database: 'firestore' });
});

app.get('/', (req, res) => {
  res.send('Veragig Node.js API is running on Firestore');
});

// For local development
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

module.exports = app;
