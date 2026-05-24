const express = require('express');
const path = require('path');

process.env.PATH = `${process.env.HOME}/.local/bin:${process.env.PATH}`;
const { reposRouter } = require('./api/repos');
const { scanRouter } = require('./api/scan');
const { eventsRouter } = require('./api/events');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/repos', reposRouter);
app.use('/api/scan', scanRouter);
app.use('/api/events', eventsRouter);

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`SecureVault running at http://localhost:${PORT}`);
});
