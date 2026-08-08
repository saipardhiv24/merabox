require('dotenv').config();

const express = require('express');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
const pasteRoutes = require('./routes/pasteRoutes');

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/merabox';

// --- Middleware ---
app.use(cors());
app.use(express.json({ limit: '2mb' })); // parses incoming JSON request bodies

// --- Serve the frontend (client/) as static files ---
const clientPath = path.join(__dirname, '..', 'client');
app.use(express.static(clientPath));

// --- REST API routes ---
app.use('/api/pastes', pasteRoutes);

// --- Client-side "view paste" route ---
// A URL like /p/abc1234 is not a real file on disk; it's handled entirely
// by client/script.js. So we just serve index.html here, and the frontend
// JavaScript reads the id from the URL and fetches the paste via the API.
app.get('/p/:id', (req, res) => {
  res.sendFile(path.join(clientPath, 'index.html'));
});

// --- 404 handler for unknown API routes ---
app.use('/api', (req, res) => {
  res.status(404).json({ error: 'API route not found.' });
});

// --- Global error handler (catches anything unexpected) ---
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('Unexpected error:', err.stack);
  res.status(500).json({ error: 'Internal server error.' });
});

// --- Connect to MongoDB, then start the server ---
mongoose
  .connect(MONGODB_URI)
  .then(() => {
    console.log('✅ Connected to MongoDB');
    app.listen(PORT, () => {
      console.log(`🚀 MeraBox is running at http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('❌ Failed to connect to MongoDB:', err.message);
    console.error('   Check that MongoDB is running and MONGODB_URI in your .env file is correct.');
    process.exit(1);
  });
