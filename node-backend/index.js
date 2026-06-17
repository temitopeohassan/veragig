const express = require('express');
const cors = require('cors');
const { connectDB, getDiagnostics } = require('./app/database');

const app = express();
const PORT = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

// Lazy-load routes to prevent top-level crashes
app.use('/identity', require('./app/routes/identity'));
app.use('/tasks', require('./app/routes/tasks'));
app.use('/score', require('./app/routes/score'));
app.use('/loans', require('./app/routes/loans'));
app.use('/ai', require('./app/routes/ai'));

app.get('/health', (req, res) => {
  const db = connectDB();
  const diagnostics = getDiagnostics();
  
  res.json({ 
    status: 'ok', 
    database: db ? 'connected' : 'failed',
    diagnostics
  });
});

app.get('/', (req, res) => {
  res.send('Veragig Node API is running. Check /health for status.');
});

if (process.env.NODE_ENV !== 'production' && !process.env.VERCEL) {
  app.listen(PORT, () => console.log(`Server running on ${PORT}`));
}

module.exports = app;
