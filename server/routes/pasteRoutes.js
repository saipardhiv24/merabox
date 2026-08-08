const express = require('express');
const router = express.Router();
const { createPaste, getPaste, deletePaste } = require('../controllers/pasteController');

// POST   /api/pastes       -> create a new paste
// GET    /api/pastes/:id   -> fetch a paste
// DELETE /api/pastes/:id   -> delete a paste
router.post('/', createPaste);
router.get('/:id', getPaste);
router.delete('/:id', deletePaste);

module.exports = router;
