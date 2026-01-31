# CLAUDE.md - Social Proof Sentiment Aggregator

## Project Overview

A real-time retail sentiment aggregator for ES/SPX/QQQ trading. Scrapes StockTwits, Reddit, and Twitter/X to measure retail trader sentiment, providing contrarian signals when sentiment reaches extremes.

**Business Context:** This is a VICI Trading Solutions product. Ryan Bailey is the founder. The tool helps traders identify when retail sentiment is at extremes (90%+ bullish = fade it, 90%+ bearish = buy the panic).

**Monetization Plan:**
- Free tier: Current sentiment only
- Paid tier ($59/mo): Historical charts, alerts, API access

---

## Current State (as of 2026-01-31)

### ✅ WORKING
- Express server with full REST API
- JSON file-based storage (no SQLite compilation issues)
- StockTwits scraping (primary source - has built-in sentiment tags)
- Reddit scraping (r/wallstreetbets, r/stocks, r/options, r/daytrading)
- Twitter/X scraping via Bird CLI (when AUTH_TOKEN/CT0 env vars set)
- Clean dark-mode dashboard with Chart.js
- Real-time gauge visualization
- Historical sentiment charts (6h, 24h, 48h, 7d)
- Extreme sentiment alerts system
- Auto-refresh every 15 minutes

### 🔜 TODO / ROADMAP
1. **Discord integration** - Scrape trading Discord servers
2. **User authentication** - For paid tier features
3. **Telegram/email alerts** - Push notifications on extreme signals
4. **Historical backtesting** - Show past extreme signals vs actual price action
5. **Mobile app** - React Native or PWA
6. **More tickers** - NQ, RTY, individual stocks
7. **Sentiment scoring model** - ML-based classification instead of keyword matching

---

## Architecture

```
sentiment-aggregator/
├── server.js        # Express server + API routes (port 3500)
├── db.js            # JSON file storage (no SQLite needed)
├── scraper.js       # Multi-source sentiment scraping
├── package.json     # Dependencies (express, node-fetch, cors)
├── sentiment-data.json  # Data storage (auto-created)
└── public/
    ├── index.html   # Dashboard UI
    ├── style.css    # Dark theme styles
    └── app.js       # Frontend logic + Chart.js
```

### Data Flow
1. `scraper.js` fetches from StockTwits, Reddit, Twitter
2. Each source returns bullish/bearish/neutral counts
3. Aggregate is calculated and stored in `sentiment-data.json`
4. `server.js` exposes REST API
5. `public/app.js` fetches from API and updates dashboard

---

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/sentiment/current` | GET | Latest aggregate sentiment |
| `/api/sentiment/history?hours=24` | GET | Historical data |
| `/api/alerts` | GET | Active (unacknowledged) alerts |
| `/api/alerts/:id/ack` | POST | Acknowledge an alert |
| `/api/sentiment/refresh` | POST | Manual refresh trigger |
| `/api/status` | GET | Health check |

### Response Format (current sentiment)
```json
{
  "bullishPct": 67.5,
  "bearishPct": 25.3,
  "neutralPct": 7.2,
  "totalPosts": 156,
  "extremeSignal": null,
  "timestamp": "2026-01-31T17:45:00.000Z"
}
```

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

```bash
# Install dependencies
npm install

# Start server (runs on port 3500)
npm start

# Manual scrape (without server)
npm run scrape
```

Open http://localhost:3500 for dashboard.

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

---

## Code Patterns

### Adding a new data source
1. Create fetch function in `scraper.js` (see `fetchRedditSentiment` as example)
2. Return object: `{ source, bullish, bearish, neutral, total, bullishPct, bearishPct, neutralPct }`
3. Add call in `aggregateSentiment()` function
4. Results automatically aggregate and store

### Adding new API endpoint
1. Add route in `server.js`
2. Use `db.js` methods for data access
3. Return JSON response

---

## Testing Checklist

- [ ] Server starts without errors
- [ ] Dashboard loads at localhost:3500
- [ ] StockTwits data appears in console
- [ ] Reddit data appears (if relevant posts exist)
- [ ] Chart displays historical data
- [ ] Refresh button triggers new scrape
- [ ] Alerts display when sentiment >90%

---

## Contact

**Owner:** Ryan Bailey / VICI Trading Solutions
**Email:** iamryanrbailey@gmail.com

---

*Last updated: 2026-01-31 by Max (AI assistant)*
