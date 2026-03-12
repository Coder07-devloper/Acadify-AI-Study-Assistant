const express = require('express');

const {
  signup,
  login,
  googleAuth,
  googleCallback,
  githubAuth,
  githubCallback,
} = require('../controllers/authController');

const router = express.Router();

router.post('/signup', signup);
router.post('/login', login);

router.get('/google', googleAuth);
router.get('/google/callback', googleCallback);

router.get('/github', githubAuth);
router.get('/github/callback', githubCallback);

module.exports = router;

