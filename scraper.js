const fetch = require('node-fetch');
const https = require('https');
const { exec } = require('child_process');
const { promisify } = require('util');
const db = require('./db');

const execAsync = promisify(exec);

// Tickers to track
const TICKERS = ['SPY', 'ES_F', 'QQQ', 'SPX'];
const SEARCH_TERMS = ['SPY', 'ES', 'SPX', 'QQQ', '$SPY', '$ES', '$SPX', '$QQQ'];

// Sentiment keywords
const BULLISH_KEYWORDS = ['bullish', 'bull', 'long', 'calls', 'buy', 'moon', 'pump', 'rip', 'green', 'rocket', 'ath', 'breakout', 'higher', 'uppies'];
const BEARISH_KEYWORDS = ['bearish', 'bear', 'short', 'puts', 'sell', 'dump', 'crash', 'red', 'drill', 'tank', 'drop', 'lower', 'downies', 'fade'];

// StockTwits API endpoint
const STOCKTWITS_API = 'https://api.stocktwits.com/api/2/streams/symbol';

/**
 * Classify sentiment based on keywords
 */
function classifySentiment(text) {
  const lowerText = text.toLowerCase();
  let bullishScore = 0;
  let bearishScore = 0;
  
  BULLISH_KEYWORDS.forEach(keyword => {
    if (lowerText.includes(keyword)) bullishScore++;
  });
  
  BEARISH_KEYWORDS.forEach(keyword => {
    if (lowerText.includes(keyword)) bearishScore++;
  });
  
  if (bullishScore > bearishScore) return 'bullish';
  if (bearishScore > bullishScore) return 'bearish';
  return 'neutral';
}

/**
 * Fetch sentiment from StockTwits for a ticker
 */
async function fetchStockTwitsSentiment(ticker) {
  try {
    const url = `${STOCKTWITS_API}/${ticker}.json?filter=all&limit=30`;
    const response = await fetch(url, {
      headers: { 'User-Agent': 'VICI-Sentiment-Aggregator/1.0' }
    });
    
    if (!response.ok) {
      console.log(`   StockTwits API error for ${ticker}: ${response.status}`);
      return null;
    }
    
    const data = await response.json();
    const messages = data.messages || [];
    
    let bullish = 0, bearish = 0, neutral = 0;
    
    messages.forEach(msg => {
      if (msg.entities && msg.entities.sentiment) {
        const sentiment = msg.entities.sentiment.basic;
        if (sentiment === 'Bullish') bullish++;
        else if (sentiment === 'Bearish') bearish++;
        else neutral++;
      } else {
        neutral++;
      }
    });
    
    const total = messages.length;
    return {
      source: 'stocktwits',
      ticker,
      bullish, bearish, neutral, total,
      bullishPct: total > 0 ? (bullish / total * 100) : 0,
      bearishPct: total > 0 ? (bearish / total * 100) : 0,
      neutralPct: total > 0 ? (neutral / total * 100) : 0
    };
    
  } catch (error) {
    console.error(`   StockTwits error for ${ticker}:`, error.message);
    return null;
  }
}

/**
 * Fetch sentiment from Reddit (r/wallstreetbets, r/stocks, r/options)
 */
async function fetchRedditSentiment() {
  const subreddits = ['wallstreetbets', 'stocks', 'options', 'daytrading'];
  const results = { bullish: 0, bearish: 0, neutral: 0, total: 0 };
  
  for (const subreddit of subreddits) {
    try {
      const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=50`;
      
      const response = await fetch(url, {
        headers: { 'User-Agent': 'VICI-Sentiment-Bot/1.0' }
      });
      
      if (!response.ok) {
        console.log(`   Reddit API error for r/${subreddit}: ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      const posts = data.data?.children || [];
      
      // Filter posts mentioning our tickers
      const relevantPosts = posts.filter(post => {
        const title = (post.data.title || '').toLowerCase();
        const selftext = (post.data.selftext || '').toLowerCase();
        const combined = title + ' ' + selftext;
        return SEARCH_TERMS.some(term => combined.includes(term.toLowerCase()));
      });
      
      relevantPosts.forEach(post => {
        const text = post.data.title + ' ' + (post.data.selftext || '');
        const sentiment = classifySentiment(text);
        if (sentiment === 'bullish') results.bullish++;
        else if (sentiment === 'bearish') results.bearish++;
        else results.neutral++;
        results.total++;
      });
      
    } catch (error) {
      console.error(`   Reddit error for r/${subreddit}:`, error.message);
    }
    
    // Rate limiting
    await new Promise(r => setTimeout(r, 500));
  }
  
  return {
    source: 'reddit',
    ...results,
    bullishPct: results.total > 0 ? (results.bullish / results.total * 100) : 0,
    bearishPct: results.total > 0 ? (results.bearish / results.total * 100) : 0,
    neutralPct: results.total > 0 ? (results.neutral / results.total * 100) : 0
  };
}

/**
 * Fetch sentiment from Twitter/X using Bird CLI
 */
async function fetchTwitterSentiment() {
  // Check if Bird CLI credentials are available
  if (!process.env.AUTH_TOKEN || !process.env.CT0) {
    console.log('   Twitter: Skipping (AUTH_TOKEN/CT0 not set)');
    return null;
  }
  
  const results = { bullish: 0, bearish: 0, neutral: 0, total: 0 };
  
  for (const term of ['SPY', 'ES futures', 'SPX']) {
    try {
      const command = `bird search "${term}" --limit 30`;
      const { stdout } = await execAsync(command, {
        env: { ...process.env },
        timeout: 30000
      });
      
      // Parse Bird CLI output (JSON array of tweets)
      let tweets = [];
      try {
        tweets = JSON.parse(stdout);
      } catch {
        // Bird CLI might return line-delimited or other format
        const lines = stdout.trim().split('\n').filter(l => l);
        tweets = lines.map(l => {
          try { return JSON.parse(l); } 
          catch { return { text: l }; }
        });
      }
      
      tweets.forEach(tweet => {
        const text = tweet.text || tweet.full_text || '';
        if (text.length < 5) return;
        
        const sentiment = classifySentiment(text);
        if (sentiment === 'bullish') results.bullish++;
        else if (sentiment === 'bearish') results.bearish++;
        else results.neutral++;
        results.total++;
      });
      
    } catch (error) {
      // Bird CLI might not be available or might fail
      if (!error.message.includes('not found')) {
        console.log(`   Twitter search error for "${term}":`, error.message.slice(0, 50));
      }
    }
    
    await new Promise(r => setTimeout(r, 1000)); // Rate limit
  }
  
  if (results.total === 0) {
    console.log('   Twitter: No results (Bird CLI may need auth refresh)');
    return null;
  }
  
  return {
    source: 'twitter',
    ...results,
    bullishPct: results.total > 0 ? (results.bullish / results.total * 100) : 0,
    bearishPct: results.total > 0 ? (results.bearish / results.total * 100) : 0,
    neutralPct: results.total > 0 ? (results.neutral / results.total * 100) : 0
  };
}

/**
 * Aggregate sentiment from all sources
 */
async function aggregateSentiment() {
  console.log(`\n📊 Scraping sentiment at ${new Date().toLocaleTimeString()}...`);
  
  const allResults = [];
  
  // 1. StockTwits (primary source - has built-in sentiment)
  console.log('\n   📈 StockTwits:');
  for (const ticker of TICKERS) {
    const sentiment = await fetchStockTwitsSentiment(ticker);
    if (sentiment) {
      allResults.push(sentiment);
      db.insertReading(
        sentiment.source, sentiment.ticker,
        sentiment.bullish, sentiment.bearish, sentiment.neutral, sentiment.total,
        sentiment.bullishPct, sentiment.bearishPct, sentiment.neutralPct
      );
      console.log(`      ${ticker}: ${sentiment.bullishPct.toFixed(1)}% bullish (${sentiment.total} posts)`);
    }
    await new Promise(r => setTimeout(r, 500));
  }
  
  // 2. Reddit
  console.log('\n   🤖 Reddit:');
  const redditSentiment = await fetchRedditSentiment();
  if (redditSentiment && redditSentiment.total > 0) {
    allResults.push(redditSentiment);
    db.insertReading(
      'reddit', 'ALL',
      redditSentiment.bullish, redditSentiment.bearish, redditSentiment.neutral, redditSentiment.total,
      redditSentiment.bullishPct, redditSentiment.bearishPct, redditSentiment.neutralPct
    );
    console.log(`      Combined: ${redditSentiment.bullishPct.toFixed(1)}% bullish (${redditSentiment.total} relevant posts)`);
  } else {
    console.log('      No relevant posts found');
  }
  
  // 3. Twitter/X
  console.log('\n   🐦 Twitter/X:');
  const twitterSentiment = await fetchTwitterSentiment();
  if (twitterSentiment && twitterSentiment.total > 0) {
    allResults.push(twitterSentiment);
    db.insertReading(
      'twitter', 'ALL',
      twitterSentiment.bullish, twitterSentiment.bearish, twitterSentiment.neutral, twitterSentiment.total,
      twitterSentiment.bullishPct, twitterSentiment.bearishPct, twitterSentiment.neutralPct
    );
    console.log(`      Combined: ${twitterSentiment.bullishPct.toFixed(1)}% bullish (${twitterSentiment.total} tweets)`);
  }
  
  // Calculate weighted aggregate
  if (allResults.length === 0) {
    console.log('\n   ❌ No sentiment data collected');
    return null;
  }
  
  const totalBullish = allResults.reduce((sum, r) => sum + r.bullish, 0);
  const totalBearish = allResults.reduce((sum, r) => sum + r.bearish, 0);
  const totalNeutral = allResults.reduce((sum, r) => sum + r.neutral, 0);
  const totalPosts = allResults.reduce((sum, r) => sum + r.total, 0);
  
  const aggBullishPct = totalPosts > 0 ? (totalBullish / totalPosts * 100) : 0;
  const aggBearishPct = totalPosts > 0 ? (totalBearish / totalPosts * 100) : 0;
  const aggNeutralPct = totalPosts > 0 ? (totalNeutral / totalPosts * 100) : 0;
  
  // Check for extreme signals
  let extremeSignal = null;
  if (aggBullishPct >= 90) {
    extremeSignal = 'EXTREME_BULLISH';
    db.insertAlert('EXTREME_BULLISH', aggBullishPct, 
      `🚨 CONTRARIAN ALERT: Retail is ${aggBullishPct.toFixed(1)}% bullish. Consider fading.`);
    console.log(`\n   ⚠️ EXTREME BULLISH SIGNAL: ${aggBullishPct.toFixed(1)}% - FADE IT!`);
  } else if (aggBearishPct >= 90) {
    extremeSignal = 'EXTREME_BEARISH';
    db.insertAlert('EXTREME_BEARISH', aggBearishPct,
      `🚨 CONTRARIAN ALERT: Retail is ${aggBearishPct.toFixed(1)}% bearish. Consider buying.`);
    console.log(`\n   ⚠️ EXTREME BEARISH SIGNAL: ${aggBearishPct.toFixed(1)}% - BUY THE PANIC!`);
  } else if (aggBullishPct >= 75) {
    extremeSignal = 'HIGH_BULLISH';
    console.log(`\n   📈 HIGH BULLISH: ${aggBullishPct.toFixed(1)}% - Getting frothy...`);
  } else if (aggBearishPct >= 75) {
    extremeSignal = 'HIGH_BEARISH';
    console.log(`\n   📉 HIGH BEARISH: ${aggBearishPct.toFixed(1)}% - Fear building...`);
  }
  
  // Store aggregate
  db.insertAggregate(aggBullishPct, aggBearishPct, aggNeutralPct, totalPosts, extremeSignal);
  
  const sources = allResults.map(r => r.source).join(', ');
  console.log(`\n   ═══════════════════════════════════════════════`);
  console.log(`   📊 AGGREGATE: ${aggBullishPct.toFixed(1)}% bullish | ${aggBearishPct.toFixed(1)}% bearish`);
  console.log(`   📝 Sources: ${sources} | Total: ${totalPosts} posts`);
  console.log(`   ═══════════════════════════════════════════════\n`);
  
  return {
    bullishPct: aggBullishPct,
    bearishPct: aggBearishPct,
    neutralPct: aggNeutralPct,
    totalPosts,
    extremeSignal,
    sources: allResults.map(r => r.source)
  };
}

/**
 * Run continuous scraping
 */
async function startContinuousScraping(intervalMinutes = 15) {
  console.log(`🚀 Starting multi-source sentiment aggregator...`);
  console.log(`   Sources: StockTwits, Reddit, Twitter/X`);
  console.log(`   Update interval: ${intervalMinutes} minutes\n`);
  
  // Initial scrape
  await aggregateSentiment();
  
  // Schedule recurring scrapes
  setInterval(async () => {
    await aggregateSentiment();
  }, intervalMinutes * 60 * 1000);
}

module.exports = { aggregateSentiment, startContinuousScraping };

// Run directly
if (require.main === module) {
  aggregateSentiment().then(() => {
    console.log('Scrape complete!');
    process.exit(0);
  });
}
