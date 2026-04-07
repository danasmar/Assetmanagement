// src/services/marketDataService.js
// Finnhub API integration — market data, live pricing, and news

const API_KEY = process.env.REACT_APP_FINNHUB_API_KEY;
const BASE_URL = 'https://finnhub.io/api/v1';

// Helper: shared fetch logic with error handling
const finnhubFetch = async (endpoint) => {
  try {
    const response = await fetch(`${BASE_URL}${endpoint}&token=${API_KEY}`);
    if (!response.ok) {
      throw new Error(`Finnhub error: ${response.status}`);
    }
    const data = await response.json();
    return { data, error: null };
  } catch (err) {
    console.error('Finnhub fetch failed:', err.message);
    return { data: null, error: err.message };
  }
};

// 1. Get live quote for a single ticker symbol
// Returns: current price, change, % change, high, low, open, prev close
// Example: getQuote('AAPL') or getQuote('SPY')
export const getQuote = async (symbol) => {
  return await finnhubFetch(`/quote?symbol=${symbol}`);
};

// 2. Get general market news (top headlines)
// Category options: 'general', 'forex', 'crypto', 'merger'
export const getMarketNews = async (category = 'general') => {
  return await finnhubFetch(`/news?category=${category}`);
};

// 3. Get news for a specific company by ticker symbol
// Example: getCompanyNews('AAPL') — returns last 7 days of news
export const getCompanyNews = async (symbol) => {
  const today = new Date();
  const weekAgo = new Date();
  weekAgo.setDate(today.getDate() - 7);

  const from = weekAgo.toISOString().split('T')[0];  // format: YYYY-MM-DD
  const to = today.toISOString().split('T')[0];

  return await finnhubFetch(`/company-news?symbol=${symbol}&from=${from}&to=${to}`);
};
