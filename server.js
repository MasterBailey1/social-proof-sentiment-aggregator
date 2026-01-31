const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const { startContinuousScraping, aggregateSentiment } = require('./scraper');

const app = express();
const PORT = process.env.PORT || 3500;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ============ API ROUTES ============

/**
 * GET /api/sentiment/current
 * Returns latest aggregate sentiment
 */
app.get('/api/sentiment/current', (req, res) => {
  try {
    const latest = db.getLatestSentiment();
    if (!latest) {
      return res.json({
        bullishPct: 50,
        bearishPct: 50,
        neutralPct: 0,
        totalPosts: 0,
        extremeSignal: null,
        timestamp: new Date().toISOString(),
        message: 'No data yet - scraping in progress'
      });
    }
    res.json({
      bullishPct: latest.bullish_pct,
      bearishPct: latest.bearish_pct,
      neutralPct: latest.neutral_pct,
      totalPosts: latest.total_posts,
      extremeSignal: latest.extreme_signal,
      timestamp: latest.timestamp
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/sentiment/history
 * Returns sentiment history (default 24h, optional ?hours=48)
 */
app.get('/api/sentiment/history', (req, res) => {
  try {
    const hours = parseInt(req.query.hours) || 24;
    const history = db.getSentimentRange(hours);
    
    res.json(history.map(h => ({
      timestamp: h.timestamp,
      bullishPct: h.bullish_pct,
      bearishPct: h.bearish_pct,
      neutralPct: h.neutral_pct,
      totalPosts: h.total_posts,
      extremeSignal: h.extreme_signal
    })));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/alerts
 * Returns active (unacknowledged) alerts
 */
app.get('/api/alerts', (req, res) => {
  try {
    const alerts = db.getActiveAlerts();
    res.json(alerts);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/alerts/:id/ack
 * Acknowledge an alert
 */
app.post('/api/alerts/:id/ack', (req, res) => {
  try {
    db.ackAlert(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/sentiment/refresh
 * Manually trigger a sentiment scrape
 */
app.post('/api/sentiment/refresh', async (req, res) => {
  try {
    const result = await aggregateSentiment();
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/status
 * Health check endpoint
 */
app.get('/api/status', (req, res) => {
  const latest = db.getLatestSentiment();
  res.json({
    status: 'running',
    lastUpdate: latest ? latest.timestamp : null,
    uptime: process.uptime()
  });
});

// Serve frontend
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║   SOCIAL PROOF SENTIMENT AGGREGATOR                        ║
║   VICI Trading Solutions                                   ║
╠═══════════════════════════════════════════════════════════╣
║   Dashboard: http://localhost:${PORT}                        ║
║   API:       http://localhost:${PORT}/api/sentiment/current  ║
╚═══════════════════════════════════════════════════════════╝
  `);
  
  // Start background scraping (every 15 minutes)
  startContinuousScraping(15);
});
