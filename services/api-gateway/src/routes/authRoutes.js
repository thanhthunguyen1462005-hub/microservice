import express from 'express';
import { authClient } from '../grpcClients/index.js';

const router = express.Router();

// API-AUTH-01: Register a new account
router.post('/register', (req, res) => {
  const { username, password, email, phone } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Missing username or password' });
  }

  authClient.Register({ username, password, email, phone }, (err, response) => {
    if (err) {
      const msg = err.details || err.message;
      if (err.code === 6 || msg.includes('already exists')) {
        return res.status(409).json({ error: msg });
      }
      return res.status(400).json({ error: msg });
    }
    return res.status(201).json({
      message: response.message,
      uid: response.uid,
    });
  });
});

// API-AUTH-02: Authenticate user and return JWT
router.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Missing username or password' });
  }

  authClient.Login({ username, password }, (err, response) => {
    if (err) {
      return res.status(401).json({ error: err.details || 'Invalid username or password' });
    }
    return res.status(200).json({
      accessToken: response.accessToken,
      tokenType: response.tokenType,
      expiresIn: response.expiresIn,
    });
  });
});

export default router;
