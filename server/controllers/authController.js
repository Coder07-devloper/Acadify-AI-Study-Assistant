const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const axios = require('axios');
const User = require('../models/User');

// 🔹 Generate JWT Token
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: '7d',
  });
};

const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';
const SERVER_URL = process.env.SERVER_URL || 'http://localhost:5000';

// 🔹 Local Email/Password Signup
const signup = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res
        .status(400)
        .json({ message: 'Name, email and password are required' });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: 'Email is already registered' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      provider: 'local',
    });

    return res.status(201).json({
      message: 'User registered successfully',
      token: generateToken(user._id),
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Signup error:', error);
    return res.status(500).json({ message: 'Server error during signup' });
  }
};

// 🔹 Local Email/Password Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: 'Email and password are required' });
    }

    const user = await User.findOne({ email });

    if (!user || !user.password) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    return res.status(200).json({
      message: 'Login successful',
      token: generateToken(user._id),
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
      },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ message: 'Server error during login' });
  }
};

// Helper to create/find OAuth user
const findOrCreateOAuthUser = async ({ email, name, provider, providerId, avatar }) => {
  let user = await User.findOne({ email });

  if (!user) {
    user = await User.create({
      name: name || email.split('@')[0],
      email,
      provider,
      providerId,
      avatar,
    });
  } else {
    if (!user.provider) user.provider = provider;
    if (!user.providerId) user.providerId = providerId;
    if (avatar && !user.avatar) user.avatar = avatar;
    await user.save();
  }

  return user;
};

// 🔹 Google OAuth (redirect)
const googleAuth = (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({ message: 'Google OAuth is not configured' });
  }
  const redirectUri =
    process.env.GOOGLE_REDIRECT_URI ||
    `${SERVER_URL}/api/auth/google/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'online',
    prompt: 'consent',
  });

  return res.redirect(`https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`);
};

// 🔹 Google OAuth callback
const googleCallback = async (req, res) => {
  try {
    const code = req.query.code;

    if (!code) {
      return res.redirect(`${CLIENT_URL}/login?error=google_auth_failed`);
    }

    const redirectUri =
      process.env.GOOGLE_REDIRECT_URI ||
      `${SERVER_URL}/api/auth/google/callback`;

    const tokenRes = await axios.post(
      'https://oauth2.googleapis.com/token',
      new URLSearchParams({
        code,
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code',
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const accessToken = tokenRes.data.access_token;

    const profileRes = await axios.get(
      'https://www.googleapis.com/oauth2/v3/userinfo',
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );

    const { sub, email, name, picture } = profileRes.data;

    if (!email) {
      return res.redirect(`${CLIENT_URL}/login?error=google_no_email`);
    }

    const user = await findOrCreateOAuthUser({
      email,
      name,
      provider: 'google',
      providerId: sub,
      avatar: picture,
    });

    const token = generateToken(user._id);

    const qp = new URLSearchParams({
      token: token,
      name: user.name || "",
      email: user.email || "",
    });

    return res.redirect(`${CLIENT_URL}/oauth/callback?${qp.toString()}`);
  } catch (error) {
    console.error('Google OAuth error:', error.response?.data || error.message);
    return res.redirect(`${CLIENT_URL}/login?error=google_auth_failed`);
  }
};

// 🔹 GitHub OAuth (redirect)
const githubAuth = (req, res) => {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({ message: 'GitHub OAuth is not configured' });
  }
  const redirectUri =
    process.env.GITHUB_REDIRECT_URI ||
    `${SERVER_URL}/api/auth/github/callback`;

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    scope: 'read:user user:email',
  });

  return res.redirect(
    `https://github.com/login/oauth/authorize?${params.toString()}`
  );
};

// 🔹 GitHub OAuth callback
const githubCallback = async (req, res) => {
  try {
    const code = req.query.code;

    if (!code) {
      return res.redirect(`${CLIENT_URL}/login?error=github_auth_failed`);
    }

    const redirectUri =
      process.env.GITHUB_REDIRECT_URI ||
      `${SERVER_URL}/api/auth/github/callback`;

    const tokenRes = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: process.env.GITHUB_CLIENT_ID,
        client_secret: process.env.GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: redirectUri,
      },
      {
        headers: {
          Accept: 'application/json',
        },
      }
    );

    const accessToken = tokenRes.data.access_token;

    const profileRes = await axios.get('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
      },
    });

    const emailsRes = await axios.get('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
      },
    });

    const primaryEmailObj =
      emailsRes.data.find((e) => e.primary && e.verified) ||
      emailsRes.data[0];

    const email = primaryEmailObj?.email;

    if (!email) {
      return res.redirect(`${CLIENT_URL}/login?error=github_no_email`);
    }

    const { id, name, avatar_url } = profileRes.data;

    const user = await findOrCreateOAuthUser({
      email,
      name,
      provider: 'github',
      providerId: String(id),
      avatar: avatar_url,
    });

    const token = generateToken(user._id);

    const qp = new URLSearchParams({
      token: token,
      name: user.name || "",
      email: user.email || "",
    });

    return res.redirect(`${CLIENT_URL}/oauth/callback?${qp.toString()}`);
  } catch (error) {
    console.error('GitHub OAuth error:', error.response?.data || error.message);
    return res.redirect(`${CLIENT_URL}/login?error=github_auth_failed`);
  }
};

module.exports = {
  signup,
  login,
  googleAuth,
  googleCallback,
  githubAuth,
  githubCallback,
};