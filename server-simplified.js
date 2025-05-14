// server-simplified.js
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import cors from 'cors';
import session from 'express-session';
import MemoryStore from 'memorystore';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// CORS
app.use(cors({
  origin: function(origin, callback) {
    callback(null, true);
  },
  credentials: true
}));

// Session
const MemorySessionStore = MemoryStore(session);
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'keyboard cat',
    resave: false,
    saveUninitialized: false,
    store: new MemorySessionStore({
      checkPeriod: 86400000 // prune expired entries every 24h
    }),
    cookie: {
      maxAge: 86400000,
      secure: false
    }
  })
);

// Static files
const publicPath = path.resolve(__dirname, 'public');
app.use(express.static(publicPath));

// API routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/auth/me', (req, res) => {
  res.json({ user: req.session.user || null });
});

app.post('/api/auth/login', (req, res) => {
  const { username, password } = req.body;
  
  // Demo login - in production this would check against a database
  if (username === 'admin' && password === 'admin') {
    req.session.user = { id: 1, username, role: 'admin', name: 'Administrator' };
    res.json({ user: req.session.user });
  } else if (username === 'user' && password === 'user') {
    req.session.user = { id: 2, username, role: 'user', name: 'Regular User' };
    res.json({ user: req.session.user });
  } else {
    res.status(401).json({ message: 'Invalid credentials' });
  }
});

app.post('/api/auth/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

// Fallback to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(publicPath, 'index.html'));
});

// Start server
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
}); 