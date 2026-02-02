# CLAUDE.md - Social Proof Sentiment Aggregator

## Project Overview

A real-time retail sentiment aggregator for ES/SPX/SPY/QQQ/NDX trading. Scrapes StockTwits, Reddit, and Twitter/X to measure retail trader sentiment, providing contrarian signals when sentiment reaches extremes.

**Business Context:** This is a VICI Trading Solutions product. Ryan Bailey is the founder. The tool helps traders identify when retail sentiment is at extremes (90%+ bullish = fade it, 90%+ bearish = buy the panic).

**Monetization Plan:**
- Free tier: Current sentiment only
- Paid tier ($59/mo): Historical charts, alerts, API access

---

## Current State (as of 2026-02-02)

### WORKING
- Express server with full REST API (port 3500)
- JSON file-based storage (no SQLite compilation issues)
- StockTwits scraping for SPY, ES_F, QQQ, SPX, NDX (has built-in sentiment tags)
- Reddit scraping (r/wallstreetbets, r/stocks, r/options, r/daytrading)
- Twitter/X scraping via Bird CLI (when AUTH_TOKEN/CT0 env vars set)
- Clean dark-mode dashboard with Chart.js
- Real-time gauge visualization
- **Source breakdown dashboard** - Shows sentiment per source (StockTwits, Reddit, Twitter/X)
- Historical sentiment charts (6h, 24h, 48h, 7d)
- Extreme sentiment alerts system
- Auto-refresh every 15 minutes
- **Desktop shortcut** - Double-click to start server and open dashboard

### TODO / ROADMAP
1. **Discord integration** - Scrape trading Discord servers
2. **User authentication** - For paid tier features
3. **Telegram/email alerts** - Push notifications on extreme signals
4. **Historical backtesting** - Show past extreme signals vs actual price action
5. **Mobile app** - React Native or PWA
6. **More tickers** - RTY, individual stocks
7. **Sentiment scoring model** - ML-based classification instead of keyword matching

---

## Architecture

```
Social Media Sentiment Indicator/
├── server.js           # Express server + API routes (port 3500)
├── db.js               # JSON file storage (no SQLite needed)
├── scraper.js          # Multi-source sentiment scraping
├── package.json        # Dependencies (express, node-fetch, cors)
├── sentiment-data.json # Data storage (auto-created)
├── start-dashboard.bat # Windows batch file to start server + open browser
└── public/
    ├── index.html      # Dashboard UI
    ├── style.css       # Dark theme styles
    └── app.js          # Frontend logic + Chart.js
```

### Data Flow
1. `scraper.js` fetches from StockTwits, Reddit, Twitter
2. Each source returns bullish/bearish/neutral counts
3. Aggregate is calculated with per-source breakdown
4. Data stored in `sentiment-data.json` with source breakdown
5. `server.js` exposes REST API including source breakdown
6. `public/app.js` fetches from API and updates dashboard with source cards

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sentiment/current` | GET | Latest aggregate sentiment + source breakdown |
| `/api/sentiment/history?hours=24` | GET | Historical data |
| `/api/alerts` | GET | Active (unacknowledged) alerts |
| `/api/alerts/:id/ack` | POST | Acknowledge an alert |
| `/api/sentiment/refresh` | POST | Manual refresh trigger |
| `/api/status` | GET | Health check |

### Response Format (current sentiment)
```json
{
  "bullishPct": 29.6,
  "bearishPct": 28.9,
  "neutralPct": 41.5,
  "totalPosts": 318,
  "extremeSignal": null,
  "timestamp": "2026-02-02T18:06:06.059Z",
  "sourceBreakdown": {
    "stocktwits": {
      "source": "stocktwits",
      "label": "StockTwits",
      "icon": "📈",
      "bullish": 54,
      "bearish": 20,
      "neutral": 76,
      "total": 150,
      "bullishPct": 36.0,
      "bearishPct": 13.3,
      "neutralPct": 50.7
    },
    "reddit": {
      "source": "reddit",
      "label": "Reddit",
      "icon": "🤖",
      "bullish": 40,
      "bearish": 72,
      "neutral": 56,
      "total": 168,
      "bullishPct": 23.8,
      "bearishPct": 42.9,
      "neutralPct": 33.3
    }
  }
}
```

---

## Tickers Tracked

### StockTwits
- SPY, ES_F, QQQ, SPX, NDX

### Reddit Search Terms
- SPY, ES, SPX, QQQ, NDX, $SPY, $ES, $SPX, $QQQ, $NDX, NQ, $NQ

### Twitter/X Search Terms
- $SPY, $SPX, $QQQ, $NDX, #ES_F, #NQ_F, ES futures

---

## Key Implementation Details

### Sentiment Classification
- **StockTwits:** Uses built-in sentiment tags (most reliable)
- **Reddit/Twitter:** Keyword-based classification:
  - Bullish: bullish, bull, long, calls, buy, moon, pump, rip, green, rocket, ath, breakout, higher, uppies
  - Bearish: bearish, bear, short, puts, sell, dump, crash, red, drill, tank, drop, lower, downies, fade

### Extreme Signal Thresholds
- 90%+ bullish → `EXTREME_BULLISH` (FADE IT)
- 90%+ bearish → `EXTREME_BEARISH` (BUY THE PANIC)
- 75-90% → `HIGH_BULLISH` or `HIGH_BEARISH` (caution zone)
- 40-60% → Neutral (no signal)

### Twitter/X Integration
Requires Bird CLI with auth cookies:
```bash
# Set these environment variables
AUTH_TOKEN=your_auth_token
CT0=your_ct0_cookie
```
If not set, Twitter scraping is skipped silently.

---

## Running the Project

### Option 1: Desktop Shortcut (Recommended)
Double-click "Sentiment Dashboard" shortcut on desktop. This will:
1. Start the Node.js server
2. Open http://localhost:3500 in your browser

### Option 2: Command Line
```bash
# Install dependencies
npm install

# Start server (runs on port 3500)
npm start

# Manual scrape (without server)
npm run scrape
```

Open http://localhost:3500 for dashboard.

### Node.js Location
Node.js is installed at `D:\` on this system. The batch file is configured to use this path.

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `PORT` | No | Server port (default: 3500) |
| `AUTH_TOKEN` | No | Twitter auth cookie (for X scraping) |
| `CT0` | No | Twitter ct0 cookie (for X scraping) |

---

## Known Issues / Gotchas

1. **Reddit rate limiting** - Added 500ms delay between subreddit requests
2. **StockTwits API** - Free tier, no auth required, but rate limited
3. **Twitter/Bird CLI** - Requires manual cookie refresh periodically
4. **JSON storage** - Fine for prototype, should migrate to proper DB for production
5. **Node.js path** - Batch file uses `D:\node.exe` - update if Node moves

---

## Recent Changes (2026-02-02)

1. **Added tickers:** NDX added to StockTwits, NQ/$NQ to Reddit, #ES_F/#NQ_F to Twitter
2. **Source breakdown feature:** Dashboard now shows sentiment per source (StockTwits, Reddit, Twitter/X)
3. **Desktop shortcut:** Created "Sentiment Dashboard" shortcut for one-click launch
4. **API updated:** `/api/sentiment/current` now includes `sourceBreakdown` object
5. **Database schema:** Added `source_breakdown` field to aggregate records

---

## Code Patterns

### Adding a new data source
1. Create fetch function in `scraper.js` (see `fetchRedditSentiment` as example)
2. Return object: `{ source, bullish, bearish, neutral, total, bullishPct, bearishPct, neutralPct }`
3. Add call in `aggregateSentiment()` function
4. Add to `sourceBreakdown` object with label and icon
5. Update `sourceConfig` in `public/app.js` to display the new source card

### Adding new API endpoint
1. Add route in `server.js`
2. Use `db.js` methods for data access
3. Return JSON response

---

## Testing Checklist

- [x] Server starts without errors
- [x] Dashboard loads at localhost:3500
- [x] StockTwits data appears in console
- [x] Reddit data appears (if relevant posts exist)
- [x] Source breakdown cards show per-source sentiment
- [x] Chart displays historical data
- [x] Refresh button triggers new scrape
- [ ] Alerts display when sentiment >90%
- [ ] Twitter/X data appears (when cookies configured)

---

## Contact

**Owner:** Ryan Bailey / VICI Trading Solutions
**Email:** iamryanrbailey@gmail.com

---

*Last updated: 2026-02-02 by Claude*
