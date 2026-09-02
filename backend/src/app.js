const express = require('express');
const cors = require('cors');
const chemicalRoutes = require('./routes/chemical.routes');
const masterRoutes = require('./routes/master.routes');
const picRoutes = require('./routes/pic.routes');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => res.json({ status: 'UP', service: 'pic-precheck-backend' }));
app.use('/api/chemicals', chemicalRoutes);
app.use('/api/master', masterRoutes);
app.use('/api/pic', picRoutes);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({ message: err.message || 'Internal server error' });
});

module.exports = app;
