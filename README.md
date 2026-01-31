# Social Proof Sentiment Aggregator

Real-time retail sentiment aggregator for ES/SPX/QQQ — A contrarian trading indicator.

**Value Proposition:** Be the smart money. When retail is euphoric, you're taking profits. When they're panicking, you're buying.

## Features

- 📊 **Real-time sentiment gauge** — Bullish/bearish/neutral percentages
- 📈 **Historical charts** — Track sentiment over 6h, 24h, 48h, 7d
- 🚨 **Extreme alerts** — Notifications when sentiment hits 90%+
- 📱 **Clean dashboard** — Dark theme, mobile-friendly
- 🔄 **Auto-updating** — Refreshes every 15 minutes

## Data Sources

- **StockTwits** — Primary source (sentiment-tagged posts)
- Future: Twitter/X, Reddit, Discord

## How to Use

### Installation

```bash
cd sentiment-aggregator
npm install
npm start
```

Open http://localhost:3500

### API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sentiment/current` | GET | Latest aggregate sentiment |
| `/api/sentiment/history?hours=24` | GET | Historical data |
| `/api/alerts` | GET | Active alerts |
| `/api/alerts/:id/ack` | POST | Acknowledge alert |
| `/api/sentiment/refresh` | POST | Manual refresh |
| `/api/status` | GET | Health check |

## Trading Strategy

| Sentiment | Signal | Action |
|-----------|--------|--------|
| 90%+ Bullish | 🚨 EXTREME | **FADE IT** — Consider taking profits, hedging longs |
| 75-90% Bullish | ⚠️ HIGH | Getting frothy — Stay cautious |
| 40-60% | ⚖️ NEUTRAL | No signal — Trade your normal strategy |
| 75-90% Bearish | ⚠️ HIGH | Fear building — Watch for reversal |
| 90%+ Bearish | 🚨 EXTREME | **BUY THE PANIC** — Look for support, consider longs |

## Monetization

- **Free tier:** Current sentiment only
- **Paid tier ($59/mo):** Historical charts, alerts, API access

## Tech Stack

- Node.js + Express
- SQLite (better-sqlite3)
- Chart.js
- StockTwits API

## Files

```
sentiment-aggregator/
├── server.js        # Express server + API routes
├── db.js            # SQLite database setup
├── scraper.js       # StockTwits data fetching
├── package.json     # Dependencies
├── sentiment.db     # SQLite database (auto-created)
└── public/
    ├── index.html   # Dashboard UI
    ├── style.css    # Styles
    └── app.js       # Frontend logic
```

---

Built by **VICI Trading Solutions**
