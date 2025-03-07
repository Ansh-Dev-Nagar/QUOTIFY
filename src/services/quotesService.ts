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
  // Using a simple, reliable API endpoint
  const response = await fetch('https://dummyjson.com/quotes/random');
  
  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }
  
  const data = await response.json();
  
  return {
    text: data.quote,
    author: data.author,
    isFavorite: false
  };
};

/**
 * Get a quote - tries API first, falls back to local if API fails
 */
export const getQuote = async (): Promise<{ quote: Quote; source: 'api' | 'local'; error?: string }> => {
  try {
    const quote = await fetchQuoteFromAPI();
    return { quote, source: 'api' };
  } catch (err) {
    console.error('API failed, using local quote:', err);
    return { 
      quote: getRandomLocalQuote(), 
      source: 'local',
      error: err instanceof Error ? err.message : 'Failed to fetch from API'
    };
  }
};

export default {
  getRandomLocalQuote,
  fetchQuoteFromAPI,
  getQuote
}; 