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

// Routes
app.use('/identity', identityRoutes);
app.use('/tasks', tasksRoutes);
app.use('/score', scoreRoutes);
app.use('/loans', loansRoutes);
app.use('/ai', aiRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'veragig-node-api' });
});

app.get('/', (req, res) => {
  res.send('Veragig Node.js API is running');
});

// For Vercel/Production
if (process.env.VERCEL || process.env.NODE_ENV === 'production') {
  connectDB().catch(err => {
    console.error('Failed to connect to Firestore on startup:', err.message);
  });
} else {
  // Local development
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  }).catch(err => {
    console.error('Failed to start server due to Firestore error:', err.message);
  });
}

module.exports = app;
