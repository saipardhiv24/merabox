const mongoose = require('mongoose');

/**
 * Paste schema
 * ------------
 * id         - short public identifier (generated with nanoid), used in URLs like /p/abc1234
 * title      - optional title, defaults to "Untitled"
 * content    - the actual pasted text/code
 * language   - optional language hint, used for syntax highlighting on the client
 * createdAt  - when the paste was created
 * expiresAt  - when the paste should expire. `null` means "Never expires".
 */
const pasteSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  title: {
    type: String,
    default: 'Untitled',
    trim: true,
    maxlength: 200
  },
  content: {
    type: String,
    required: true
  },
  language: {
    type: String,
    default: 'plaintext',
    trim: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: null
  }
});

/**
 * TTL (Time-To-Live) index.
 * MongoDB runs a background task (roughly every 60s) that automatically
 * deletes any document whose `expiresAt` value is in the past.
 *
 * Important: documents where `expiresAt` is `null` are NOT considered
 * date values, so MongoDB's TTL monitor simply ignores them. That's how
 * "Never expire" pastes stay in the database forever.
 */
pasteSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('Paste', pasteSchema);
