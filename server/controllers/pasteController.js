const { nanoid } = require('nanoid');
const Paste = require('../models/Paste');

// Maps the expiry option sent by the client to a duration in milliseconds.
const EXPIRY_DURATIONS_MS = {
  '10m': 10 * 60 * 1000,
  '1h': 60 * 60 * 1000,
  '1d': 24 * 60 * 60 * 1000,
  '1w': 7 * 24 * 60 * 60 * 1000
  // 'never' is intentionally not listed here -> expiresAt stays null
};

const ID_LENGTH = 7;

/**
 * POST /api/pastes
 * Creates a new paste and returns its public id + URL.
 */
exports.createPaste = async (req, res) => {
  try {
    const { title, content, language, expiry } = req.body;

    if (!content || typeof content !== 'string' || !content.trim()) {
      return res.status(400).json({ error: 'Paste content cannot be empty.' });
    }

    if (content.length > 500000) {
      return res.status(400).json({ error: 'Paste content is too large (max 500,000 characters).' });
    }

    let expiresAt = null;
    if (expiry && EXPIRY_DURATIONS_MS[expiry]) {
      expiresAt = new Date(Date.now() + EXPIRY_DURATIONS_MS[expiry]);
    }

    const paste = await Paste.create({
      id: nanoid(ID_LENGTH),
      title: title && title.trim() ? title.trim() : 'Untitled',
      content,
      language: language && language.trim() ? language.trim() : 'plaintext',
      expiresAt
    });

    return res.status(201).json({
      id: paste.id,
      title: paste.title,
      language: paste.language,
      createdAt: paste.createdAt,
      expiresAt: paste.expiresAt,
      url: `/p/${paste.id}`
    });
  } catch (err) {
    console.error('Error creating paste:', err);
    return res.status(500).json({ error: 'Something went wrong while creating the paste.' });
  }
};

/**
 * GET /api/pastes/:id
 * Fetches a single paste by its public id.
 */
exports.getPaste = async (req, res) => {
  try {
    const { id } = req.params;
    const paste = await Paste.findOne({ id });

    if (!paste) {
      return res.status(404).json({ error: 'Paste not found.' });
    }

    // Belt-and-suspenders check: MongoDB's TTL cleanup task runs
    // periodically (not instantly), so a paste could technically still be
    // in the database for a few seconds after it "expired". We double
    // check here and delete + reject it immediately if that happens.
    if (paste.expiresAt && paste.expiresAt.getTime() < Date.now()) {
      await Paste.deleteOne({ id });
      return res.status(404).json({ error: 'This paste has expired.' });
    }

    return res.json({
      id: paste.id,
      title: paste.title,
      content: paste.content,
      language: paste.language,
      createdAt: paste.createdAt,
      expiresAt: paste.expiresAt
    });
  } catch (err) {
    console.error('Error fetching paste:', err);
    return res.status(500).json({ error: 'Something went wrong while fetching the paste.' });
  }
};

/**
 * DELETE /api/pastes/:id
 * Deletes a paste by its public id.
 */
exports.deletePaste = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await Paste.deleteOne({ id });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Paste not found.' });
    }

    return res.json({ message: 'Paste deleted successfully.' });
  } catch (err) {
    console.error('Error deleting paste:', err);
    return res.status(500).json({ error: 'Something went wrong while deleting the paste.' });
  }
};
