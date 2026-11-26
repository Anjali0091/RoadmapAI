import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/user.js';
import auth from '../middleware/auth.js';

const router = Router();

const makeToken = (user) =>
  jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: '7d' });

router.post('/signup', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password || password.length < 6) {
      return res.status(400).json({ error: 'Enter an email and a password of at least 6 characters.' });
    }

    const exists = await User.findOne({ email: email.toLowerCase().trim() });
    if (exists) return res.status(409).json({ error: 'This email is already registered.' });

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, password: hash });
    res.status(201).json({ token: makeToken(user), email: user.email });
  } catch (err) {
    console.error('SIGNUP ERROR:', err.message);
    res.status(500).json({ error: 'Signup failed.' });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ error: 'Enter your email and password.' });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    const ok = user && (await bcrypt.compare(password, user.password));
    if (!ok) return res.status(401).json({ error: 'Wrong email or password.' });

    res.json({ token: makeToken(user), email: user.email });
  } catch (err) {
    console.error('LOGIN ERROR:', err.message);
    res.status(500).json({ error: 'Login failed.' });
  }
});

// quick check that a token works
router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.userId).select('email');
  if (!user) return res.status(401).json({ error: 'Please log in.' });
  res.json({ email: user.email });
});

export default router;