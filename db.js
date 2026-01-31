const fs = require('fs');
const path = require('path');

// JSON file-based storage (simple, no compilation needed)
const DB_FILE = path.join(__dirname, 'sentiment-data.json');

// Initialize database
function initDB() {
  if (!fs.existsSync(DB_FILE)) {
    fs.writeFileSync(DB_FILE, JSON.stringify({
      readings: [],
      aggregate: [],
      alerts: []
    }, null, 2));
  }
}

function loadDB() {
  initDB();
  return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function saveDB(data) {
  fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

// Insert sentiment reading
function insertReading(source, ticker, bullish, bearish, neutral, total, bullishPct, bearishPct, neutralPct) {
  const db = loadDB();
  db.readings.push({
    id: db.readings.length + 1,
    timestamp: new Date().toISOString(),
    source,
    ticker,
    bullish_count: bullish,
    bearish_count: bearish,
    neutral_count: neutral,
    total_posts: total,
    bullish_pct: bullishPct,
    bearish_pct: bearishPct,
    neutral_pct: neutralPct
  });
  // Keep last 1000 readings
  if (db.readings.length > 1000) {
    db.readings = db.readings.slice(-1000);
  }
  saveDB(db);
}

// Insert aggregate sentiment
function insertAggregate(bullishPct, bearishPct, neutralPct, totalPosts, extremeSignal) {
  const db = loadDB();
  db.aggregate.push({
    id: db.aggregate.length + 1,
    timestamp: new Date().toISOString(),
    bullish_pct: bullishPct,
    bearish_pct: bearishPct,
    neutral_pct: neutralPct,
    total_posts: totalPosts,
    extreme_signal: extremeSignal
  });
  // Keep last 500 aggregate readings
  if (db.aggregate.length > 500) {
    db.aggregate = db.aggregate.slice(-500);
  }
  saveDB(db);
}

// Get latest aggregate sentiment
function getLatestSentiment() {
  const db = loadDB();
  return db.aggregate.length > 0 ? db.aggregate[db.aggregate.length - 1] : null;
}

// Get sentiment history for custom range (hours)
function getSentimentRange(hours) {
  const db = loadDB();
  const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
  return db.aggregate.filter(a => new Date(a.timestamp) > cutoff);
}

// Get unacknowledged alerts
function getActiveAlerts() {
  const db = loadDB();
  return db.alerts.filter(a => !a.acknowledged);
}

// Insert alert
function insertAlert(alertType, sentimentPct, message) {
  const db = loadDB();
  db.alerts.push({
    id: db.alerts.length + 1,
    timestamp: new Date().toISOString(),
    alert_type: alertType,
    sentiment_pct: sentimentPct,
    message,
    acknowledged: false
  });
  // Keep last 100 alerts
  if (db.alerts.length > 100) {
    db.alerts = db.alerts.slice(-100);
  }
  saveDB(db);
}

// Acknowledge alert
function ackAlert(id) {
  const db = loadDB();
  const alert = db.alerts.find(a => a.id === parseInt(id));
  if (alert) {
    alert.acknowledged = true;
    saveDB(db);
  }
}

// Initialize on load
initDB();

module.exports = {
  insertReading,
  insertAggregate,
  getLatestSentiment,
  getSentimentRange,
  getActiveAlerts,
  insertAlert,
  ackAlert
};
