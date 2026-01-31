// API Base URL
const API_BASE = '';

// Chart instance
let sentimentChart = null;

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  loadCurrentSentiment();
  loadHistory(24);
  checkAlerts();
  
  // Auto-refresh every 2 minutes
  setInterval(() => {
    loadCurrentSentiment();
    checkAlerts();
  }, 120000);
});

/**
 * Load current sentiment data
 */
async function loadCurrentSentiment() {
  try {
    const response = await fetch(`${API_BASE}/api/sentiment/current`);
    const data = await response.json();
    
    updateGauge(data);
    updateBreakdown(data);
    updateSignal(data);
    updateMeta(data);
    
  } catch (error) {
    console.error('Error loading sentiment:', error);
  }
}

/**
 * Update the sentiment gauge
 */
function updateGauge(data) {
  const bullishPct = data.bullishPct || 50;
  const gaugeFill = document.getElementById('bullish-fill');
  const bullishNum = document.getElementById('bullish-pct');
  
  // Position the gauge indicator (0% = left/bearish, 100% = right/bullish)
  gaugeFill.style.width = `${bullishPct}%`;
  
  // Update big number
  bullishNum.textContent = bullishPct.toFixed(1);
  
  // Color based on sentiment
  if (bullishPct >= 75) {
    bullishNum.style.color = '#3fb950'; // green
  } else if (bullishPct <= 25) {
    bullishNum.style.color = '#f85149'; // red
  } else {
    bullishNum.style.color = '#58a6ff'; // blue
  }
}

/**
 * Update breakdown numbers
 */
function updateBreakdown(data) {
  document.getElementById('bullish-count').textContent = `${(data.bullishPct || 0).toFixed(1)}%`;
  document.getElementById('bearish-count').textContent = `${(data.bearishPct || 0).toFixed(1)}%`;
  document.getElementById('neutral-count').textContent = `${(data.neutralPct || 0).toFixed(1)}%`;
}

/**
 * Update signal indicator
 */
function updateSignal(data) {
  const signalEl = document.getElementById('signal-indicator');
  const signal = data.extremeSignal;
  const bullish = data.bullishPct || 50;
  const bearish = data.bearishPct || 50;
  
  // Reset classes
  signalEl.className = 'signal';
  
  if (signal === 'EXTREME_BULLISH' || bullish >= 90) {
    signalEl.classList.add('bullish-extreme');
    signalEl.innerHTML = `
      <span class="signal-icon">🚨</span>
      <span class="signal-text">EXTREME BULLISH (${bullish.toFixed(1)}%) — CONTRARIAN SELL SIGNAL</span>
    `;
  } else if (signal === 'EXTREME_BEARISH' || bearish >= 90) {
    signalEl.classList.add('bearish-extreme');
    signalEl.innerHTML = `
      <span class="signal-icon">🚨</span>
      <span class="signal-text">EXTREME BEARISH (${bearish.toFixed(1)}%) — CONTRARIAN BUY SIGNAL</span>
    `;
  } else if (signal === 'HIGH_BULLISH' || bullish >= 75) {
    signalEl.classList.add('bullish-high');
    signalEl.innerHTML = `
      <span class="signal-icon">📈</span>
      <span class="signal-text">HIGH BULLISH (${bullish.toFixed(1)}%) — Getting frothy, stay cautious</span>
    `;
  } else if (signal === 'HIGH_BEARISH' || bearish >= 75) {
    signalEl.classList.add('bearish-high');
    signalEl.innerHTML = `
      <span class="signal-icon">📉</span>
      <span class="signal-text">HIGH BEARISH (${bearish.toFixed(1)}%) — Fear building, watch for reversal</span>
    `;
  } else {
    signalEl.classList.add('neutral');
    signalEl.innerHTML = `
      <span class="signal-icon">⚖️</span>
      <span class="signal-text">NEUTRAL — No extreme signal (${bullish.toFixed(1)}% bullish)</span>
    `;
  }
}

/**
 * Update meta information
 */
function updateMeta(data) {
  document.getElementById('total-posts').textContent = data.totalPosts || 0;
  
  if (data.timestamp) {
    const date = new Date(data.timestamp);
    document.getElementById('last-update').textContent = date.toLocaleTimeString();
  }
}

/**
 * Load historical sentiment data
 */
async function loadHistory(hours) {
  try {
    // Update active button
    document.querySelectorAll('.chart-btn').forEach(btn => btn.classList.remove('active'));
    event?.target?.classList.add('active');
    
    const response = await fetch(`${API_BASE}/api/sentiment/history?hours=${hours}`);
    const data = await response.json();
    
    updateChart(data, hours);
    
  } catch (error) {
    console.error('Error loading history:', error);
  }
}

/**
 * Update the chart with historical data
 */
function updateChart(data, hours) {
  const ctx = document.getElementById('sentiment-chart').getContext('2d');
  
  // Destroy existing chart
  if (sentimentChart) {
    sentimentChart.destroy();
  }
  
  // Prepare data
  const labels = data.map(d => {
    const date = new Date(d.timestamp);
    return hours <= 24 
      ? date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      : date.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit' });
  });
  
  const bullishData = data.map(d => d.bullishPct);
  const bearishData = data.map(d => d.bearishPct);
  
  sentimentChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Bullish %',
          data: bullishData,
          borderColor: '#3fb950',
          backgroundColor: 'rgba(63, 185, 80, 0.1)',
          fill: true,
          tension: 0.3
        },
        {
          label: 'Bearish %',
          data: bearishData,
          borderColor: '#f85149',
          backgroundColor: 'rgba(248, 81, 73, 0.1)',
          fill: true,
          tension: 0.3
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          labels: { color: '#e6edf3' }
        }
      },
      scales: {
        x: {
          ticks: { color: '#8b949e' },
          grid: { color: '#30363d' }
        },
        y: {
          min: 0,
          max: 100,
          ticks: { 
            color: '#8b949e',
            callback: value => `${value}%`
          },
          grid: { color: '#30363d' }
        }
      },
      interaction: {
        intersect: false,
        mode: 'index'
      }
    }
  });
}

/**
 * Check for active alerts
 */
async function checkAlerts() {
  try {
    const response = await fetch(`${API_BASE}/api/alerts`);
    const alerts = await response.json();
    
    const banner = document.getElementById('alert-banner');
    const message = document.getElementById('alert-message');
    
    if (alerts.length > 0) {
      const latest = alerts[0];
      message.textContent = latest.message;
      banner.classList.remove('hidden');
      banner.dataset.alertId = latest.id;
    } else {
      banner.classList.add('hidden');
    }
    
  } catch (error) {
    console.error('Error checking alerts:', error);
  }
}

/**
 * Dismiss alert
 */
async function dismissAlert() {
  const banner = document.getElementById('alert-banner');
  const alertId = banner.dataset.alertId;
  
  if (alertId) {
    try {
      await fetch(`${API_BASE}/api/alerts/${alertId}/ack`, { method: 'POST' });
    } catch (error) {
      console.error('Error dismissing alert:', error);
    }
  }
  
  banner.classList.add('hidden');
}

/**
 * Manual refresh
 */
async function refreshData() {
  const btn = document.getElementById('refresh-btn');
  btn.textContent = '⏳ Loading...';
  btn.disabled = true;
  
  try {
    await fetch(`${API_BASE}/api/sentiment/refresh`, { method: 'POST' });
    await loadCurrentSentiment();
    await loadHistory(24);
  } catch (error) {
    console.error('Error refreshing:', error);
  }
  
  btn.textContent = '🔄 Refresh';
  btn.disabled = false;
}
