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

// For Vercel, we export the app instead of calling app.listen
// but for local development, we still want app.listen
if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  connectDB().then(() => {
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  });
} else {
    // In production (Vercel), we just connect to DB
    connectDB();
}

module.exports = app;
