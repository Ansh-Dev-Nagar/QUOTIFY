import { Quote } from '../types';

// A collection of inspirational quotes for fallback
const localQuotes = [
  { text: "The only limit to our realization of tomorrow is our doubts of today.", author: "Franklin D. Roosevelt" },
  { text: "Life is what happens when you're busy making other plans.", author: "John Lennon" },
  { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
  { text: "In the end, we will remember not the words of our enemies, but the silence of our friends.", author: "Martin Luther King Jr." },
  { text: "Success is not final, failure is not fatal: It is the courage to continue that counts.", author: "Winston Churchill" },
  { text: "The greatest glory in living lies not in never falling, but in rising every time we fall.", author: "Nelson Mandela" },
  { text: "The way to get started is to quit talking and begin doing.", author: "Walt Disney" },
  { text: "If life were predictable it would cease to be life, and be without flavor.", author: "Eleanor Roosevelt" },
  { text: "Spread love everywhere you go. Let no one ever come to you without leaving happier.", author: "Mother Teresa" },
  { text: "When you reach the end of your rope, tie a knot in it and hang on.", author: "Franklin D. Roosevelt" }
];

// Keep track of offline status to avoid repeated checks
let isOfflineMode = false;

/**
 * Check if the device is offline - aggressive check that defaults to offline if there's any doubt
 */
const checkIfOffline = (): boolean => {
  // Always check navigator.onLine first - it's the most reliable indicator
  if (!navigator.onLine) {
    isOfflineMode = true;
    return true;
  }
  
  // If we previously detected offline mode, keep using that unless explicitly reset
  return isOfflineMode;
};

/**
 * Get a random quote from the local collection
 */
export const getRandomLocalQuote = (): Quote => {
  const randomIndex = Math.floor(Math.random() * localQuotes.length);
  const quote = localQuotes[randomIndex];
  return {
    text: quote.text,
    author: quote.author,
    isFavorite: false
  };
};

/**
 * Fetch a quote from an API
 */
export const fetchQuoteFromAPI = async (): Promise<Quote> => {
  // First check if we're offline - if so, fail fast
  if (checkIfOffline()) {
    throw new Error('You are offline. Using local quotes.');
  }

  try {
    // Using a simple, reliable API endpoint with a very short timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 1500); // 1.5 second timeout - much faster
    
    const response = await fetch('https://dummyjson.com/quotes/random', {
      signal: controller.signal,
      // Add cache control to prevent stale responses
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Reset offline mode if we successfully got a response
    isOfflineMode = false;
    
    return {
      text: data.quote,
      author: data.author,
      isFavorite: false
    };
  } catch (err) {
    // If we get a network error, set offline mode
    if (err instanceof TypeError && err.message.includes('fetch')) {
      isOfflineMode = true;
    }
    
    // If we get a timeout, set offline mode
    if (err instanceof DOMException && err.name === 'AbortError') {
      isOfflineMode = true;
      throw new Error('Request timed out. Using local quotes.');
    } else if (err instanceof TypeError && err.message.includes('fetch')) {
      throw new Error('Network error. Using local quotes.');
    } else {
      // Re-throw the original error or a wrapped version
      throw err;
    }
  }
};

/**
 * Get a quote - tries API first, falls back to local if API fails
 */
export const getQuote = async (): Promise<{ quote: Quote; source: 'api' | 'local'; error?: string }> => {
  // If we're in offline mode, immediately return a local quote without trying API
  if (checkIfOffline()) {
    return { 
      quote: getRandomLocalQuote(), 
      source: 'local',
      error: 'You are offline. Using local quotes.'
    };
  }
  
  try {
    const quote = await fetchQuoteFromAPI();
    return { quote, source: 'api' };
  } catch (err) {
    console.error('API failed, using local quote:', err);
    
    // Get a random local quote
    const localQuote = getRandomLocalQuote();
    
    // Return the local quote with appropriate error message
    return { 
      quote: localQuote, 
      source: 'local',
      error: err instanceof Error ? err.message : 'Failed to fetch from API. Using local quotes.'
    };
  }
};

// Export a function to manually set offline mode
export const setOfflineMode = (offline: boolean): void => {
  isOfflineMode = offline;
};

export default {
  getRandomLocalQuote,
  fetchQuoteFromAPI,
  getQuote,
  setOfflineMode
}; 