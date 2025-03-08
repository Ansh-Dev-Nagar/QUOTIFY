import { useState, useEffect, useRef, useCallback } from 'react'
import { FaHeart, FaRegHeart, FaQuoteLeft, FaQuoteRight, FaArrowLeft, FaShare, FaCheck, FaTwitter, FaKeyboard } from 'react-icons/fa'
import './App.css'
import { Quote } from './types'
import quotesService from './services/quotesService'

// Constants for localStorage
const STORAGE_KEY = 'QUOTIFY_FAVORITES_V2';

// Direct localStorage functions
const getFavoritesFromStorage = (): Quote[] => {
  try {
    const storedData = window.localStorage.getItem(STORAGE_KEY);
    if (storedData) {
      const parsed = JSON.parse(storedData);
      if (Array.isArray(parsed)) {
        console.log('Retrieved favorites from storage:', parsed);
        return parsed;
      }
    }
    return [];
  } catch (err) {
    console.error('Error getting favorites from storage:', err);
    return [];
  }
};

const saveFavoritesToStorage = (favorites: Quote[]): boolean => {
  try {
    const jsonData = JSON.stringify(favorites);
    window.localStorage.setItem(STORAGE_KEY, jsonData);
    console.log('Saved favorites to storage:', favorites);
    return true;
  } catch (err) {
    console.error('Error saving favorites to storage:', err);
    return false;
  }
};

function App() {
  const [quote, setQuote] = useState<Quote>({
    text: "Ask not what your country can do for you; ask what you can do for your country.",
    author: "John Kennedy",
    isFavorite: false
  });
  
  // Initialize favorites from localStorage directly
  const [favorites, setFavorites] = useState<Quote[]>(() => {
    const storedFavorites = getFavoritesFromStorage();
    return storedFavorites;
  });
  
  const [showFavorites, setShowFavorites] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [copied, setCopied] = useState(false);
  const [quoteSource, setQuoteSource] = useState<'api' | 'local' | null>(null);
  const [showKeyboardHints, setShowKeyboardHints] = useState(false);
  const shareOptionsRef = useRef<HTMLDivElement>(null);

  // Initialize app
  useEffect(() => {
    // Check if current quote is in favorites
    const storedFavorites = getFavoritesFromStorage();
    const isFavorite = storedFavorites.some(fav => fav.text === quote.text);
    
    // Update current quote's favorite status
    if (isFavorite !== quote.isFavorite) {
      setQuote(currentQuote => ({
        ...currentQuote,
        isFavorite
      }));
    }
    
    // Fetch a quote when the app loads
    getNewQuote().catch(err => {
      console.error('Error in initial quote fetch:', err);
    });
  }, []);

  // Save favorites to localStorage whenever it changes
  useEffect(() => {
    saveFavoritesToStorage(favorites);
  }, [favorites]);

  // Close share options when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (shareOptionsRef.current && !shareOptionsRef.current.contains(event.target as Node)) {
        setShowShareOptions(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Reset copied state after 2 seconds
  useEffect(() => {
    if (copied) {
      const timer = setTimeout(() => {
        setCopied(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [copied]);

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    // Only handle shortcuts when not in an input field
    if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
      return;
    }

    switch (e.key) {
      case 'n':
        getNewQuote();
        break;
      case 'f':
        toggleFavorite();
        break;
      case 's':
        setShowShareOptions(prev => !prev);
        break;
      case 'Escape':
        setShowShareOptions(false);
        break;
      case '?':
        setShowKeyboardHints(prev => !prev);
        break;
      default:
        break;
    }
  }, []);

  // Add keyboard event listener
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Add network status listener
  useEffect(() => {
    const handleOnline = () => {
      // When we come back online, clear any offline error messages
      if (error && error.includes('offline')) {
        setError(null);
      }
      // Reset offline mode in the service
      quotesService.setOfflineMode(false);
      // Optionally fetch a new quote when coming back online
      getNewQuote().catch(console.error);
    };

    const handleOffline = () => {
      // When we go offline, show a message
      setError('You are offline. Using local quotes.');
      setQuoteSource('local');
      // Set offline mode in the service
      quotesService.setOfflineMode(true);
      
      // Only set a new local quote if we don't already have one
      if (!quote.text || quoteSource === 'api') {
        const localQuote = quotesService.getRandomLocalQuote();
        setQuote({
          ...localQuote,
          isFavorite: favorites.some(fav => fav.text === localQuote.text)
        });
      }
    };

    // Check initial network status
    if (!navigator.onLine) {
      handleOffline();
    }

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [error, favorites]); // Include error and favorites in dependencies

  const toggleFavorite = () => {
    try {
      let updatedFavorites;
      
      if (quote.isFavorite) {
        // Remove from favorites
        updatedFavorites = favorites.filter(fav => fav.text !== quote.text);
        console.log('Removing from favorites. New favorites array:', updatedFavorites);
      } else {
        // Add to favorites
        const favoriteQuote = {...quote, isFavorite: true};
        updatedFavorites = [...favorites, favoriteQuote];
        console.log('Adding to favorites. New favorites array:', updatedFavorites);
      }
      
      // Update state
      setFavorites(updatedFavorites);
      
      // Update current quote's isFavorite status
      setQuote({...quote, isFavorite: !quote.isFavorite});
      
      // Explicitly save to localStorage immediately
      const saved = saveFavoritesToStorage(updatedFavorites);
      if (saved) {
        // Show temporary success message
        setError(quote.isFavorite ? 'Removed from favorites!' : 'Added to favorites!');
        setTimeout(() => {
          setError(null);
        }, 2000);
      }
    } catch (err) {
      console.error('Error in toggleFavorite:', err);
    }
  };

  const getNewQuote = async () => {
    setIsLoading(true);
    setError(null);
    
    // If we're offline, immediately show a local quote without API call
    if (!navigator.onLine) {
      const localQuote = quotesService.getRandomLocalQuote();
      // Check if this quote is in favorites
      const isFavorite = favorites.some(fav => fav.text === localQuote.text);
      
      setQuote({
        ...localQuote,
        isFavorite
      });
      setQuoteSource('local');
      setError('You are offline. Using local quotes.');
      setIsLoading(false);
      return;
    }
    
    try {
      // Use our quotes service to get a quote
      const result = await quotesService.getQuote();
      
      // Check if this quote is in favorites
      const isFavorite = favorites.some(fav => fav.text === result.quote.text);
      
      setQuote({
        ...result.quote,
        isFavorite
      });
      
      setQuoteSource(result.source);
      
      // If we got a local quote due to API error, show a message
      if (result.source === 'local' && result.error) {
        setError(result.error);
        
        // For offline errors, keep the message visible for a short time
        if (result.error.includes('offline')) {
          setTimeout(() => {
            if (error === result.error) { // Only clear if it's still the same error
              setError(null);
            }
          }, 2000); // Shorter time for offline messages
        } else {
          // For other errors, clear after a longer time
          setTimeout(() => {
            if (error === result.error) { // Only clear if it's still the same error
              setError(null);
            }
          }, 5000);
        }
      }
    } catch (err) {
      console.error('Error in getNewQuote:', err);
      
      // Try to get a local quote directly as a last resort
      try {
        const localQuote = quotesService.getRandomLocalQuote();
        // Check if this quote is in favorites
        const isFavorite = favorites.some(fav => fav.text === localQuote.text);
        
        setQuote({
          ...localQuote,
          isFavorite
        });
        setQuoteSource('local');
        setError('Failed to fetch quote from API. Using local quotes.');
      } catch (localErr) {
        setError('Failed to fetch any quotes. Please try again later.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = () => {
    const textToCopy = `"${quote.text}" - ${quote.author}`;
    navigator.clipboard.writeText(textToCopy)
      .then(() => {
        setCopied(true);
        setShowShareOptions(false);
      })
      .catch(err => {
        console.error('Failed to copy: ', err);
      });
  };

  const shareOnTwitter = () => {
    const text = encodeURIComponent(`"${quote.text}" - ${quote.author}`);
    const url = `https://twitter.com/intent/tweet?text=${text}&hashtags=quotify,inspiration`;
    window.open(url, '_blank');
    setShowShareOptions(false);
  };

  // Function to check if localStorage is working properly
  const isLocalStorageWorking = (): boolean => {
    try {
      const testKey = 'quotify-storage-test';
      const testValue = 'test-' + Date.now();
      
      // Try to write to localStorage
      window.localStorage.setItem(testKey, testValue);
      
      // Try to read from localStorage
      const readValue = window.localStorage.getItem(testKey);
      
      // Clean up
      window.localStorage.removeItem(testKey);
      
      // Check if the value was correctly stored and retrieved
      return readValue === testValue;
    } catch (err) {
      console.error('localStorage test failed:', err);
      return false;
    }
  };

  // Check localStorage on mount
  useEffect(() => {
    const storageWorking = isLocalStorageWorking();
    console.log('localStorage is working:', storageWorking);
    
    if (!storageWorking) {
      setError('Warning: Local storage is not working. Favorites will not be saved between sessions.');
    }
  }, []);

  // Function to remove a specific favorite
  const removeFavorite = (quoteToRemove: Quote) => {
    try {
      console.log('Removing favorite:', quoteToRemove);
      
      // Filter out the quote to remove
      const updatedFavorites = favorites.filter(fav => fav.text !== quoteToRemove.text);
      console.log('Updated favorites after removal:', updatedFavorites);
      
      // Update state
      setFavorites(updatedFavorites);
      
      // If the current quote is the one being removed, update its isFavorite status
      if (quote.text === quoteToRemove.text) {
        setQuote({...quote, isFavorite: false});
      }
      
      // Save to localStorage
      saveFavoritesToStorage(updatedFavorites);
      
      // Show success message
      setError('Quote removed from favorites!');
      setTimeout(() => {
        setError(null);
      }, 2000);
      
      return true;
    } catch (err) {
      console.error('Error removing favorite:', err);
      return false;
    }
  };

  return (
    <div className="app-container">
      {/* Background decorative elements */}
      <div className="bg-circle bg-circle-1"></div>
      <div className="bg-circle bg-circle-2"></div>
      <div className="bg-circle bg-circle-3"></div>
      
      {!showFavorites ? (
        <div className={`quote-card ${isLoading ? 'loading' : ''}`}>
          <div className="quote-header">
            <h2>QUOTIFY</h2>
            <div className="header-actions">
              <div className="share-container">
                <div 
                  className={`action-icon ${copied ? 'copied' : ''}`} 
                  onClick={() => setShowShareOptions(!showShareOptions)}
                  title="Share Quote"
                >
                  {copied ? <FaCheck color="#4ecdc4" /> : <FaShare color="#4ecdc4" />}
                </div>
                
                {showShareOptions && (
                  <div className="share-options" ref={shareOptionsRef}>
                    <div className="share-option" onClick={copyToClipboard}>
                      Copy to clipboard
                    </div>
                    <div className="share-option" onClick={shareOnTwitter}>
                      <FaTwitter /> Share on Twitter
                    </div>
                  </div>
                )}
              </div>
              
              <div 
                className="favorite-icon" 
                onClick={toggleFavorite}
                title={quote.isFavorite ? "Remove from Favorites" : "Add to Favorites"}
              >
                {quote.isFavorite ? <FaHeart color="#4ecdc4" /> : <FaRegHeart color="#4ecdc4" />}
              </div>
            </div>
          </div>
          
          <div className="quote-content">
            <div className="quote-marks opening-marks"><FaQuoteLeft /></div>
            <p className="quote-text">{isLoading ? "Loading..." : quote.text}</p>
            <div className="quote-author">{isLoading ? "" : quote.author}</div>
            
            {error && (
              <p className={`quote-notification ${
                error.includes('offline') 
                  ? 'offline-notice' 
                  : error.includes('Using local quotes') 
                    ? 'local-fallback' 
                    : error.includes('saved successfully') || 
                      error.includes('Added to favorites') || 
                      error.includes('Removed from favorites') || 
                      error.includes('Quote removed from favorites') || 
                      error.includes('reloaded') || 
                      error.includes('cleared successfully')
                        ? 'success'
                        : 'error'
              }`}>{error}</p>
            )}
            
            {quoteSource === 'local' && !error && (
              <div className="quote-source">Using local quote database</div>
            )}
            
            {quoteSource === 'local' && error && !error.includes('offline') && (
              <div className="retry-container">
                <button 
                  className="retry-button"
                  onClick={getNewQuote}
                  disabled={isLoading || !navigator.onLine}
                >
                  Retry API
                </button>
              </div>
            )}
            <div className="quote-marks closing-marks"><FaQuoteRight /></div>
          </div>
          
          <div className="quote-actions">
            <button 
              className="btn new-quote" 
              onClick={getNewQuote}
              disabled={isLoading}
              title="Get a new quote (N)"
            >
              {isLoading ? "Loading..." : "NEW QUOTE"}
            </button>
            <button 
              className="btn add-favorite" 
              onClick={() => setShowFavorites(true)}
              disabled={isLoading}
              title="View your favorite quotes"
            >
              {favorites.length > 0 ? "VIEW FAVORITES" : "NO FAVORITES YET"}
            </button>
          </div>
          
          {/* Keyboard shortcuts hint */}
          <div 
            className="keyboard-hint" 
            onClick={() => setShowKeyboardHints(!showKeyboardHints)}
            title="Toggle keyboard shortcuts"
          >
            <FaKeyboard /> {showKeyboardHints ? 'Hide shortcuts' : 'Keyboard shortcuts'}
          </div>
          
          {showKeyboardHints && (
            <div className="keyboard-shortcuts">
              <div className="shortcut-item">
                <kbd>N</kbd> <span>New quote</span>
              </div>
              <div className="shortcut-item">
                <kbd>F</kbd> <span>Toggle favorite</span>
              </div>
              <div className="shortcut-item">
                <kbd>S</kbd> <span>Share options</span>
              </div>
              <div className="shortcut-item">
                <kbd>ESC</kbd> <span>Close popups</span>
              </div>
              <div className="shortcut-item">
                <kbd>?</kbd> <span>Toggle this help</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="favorites-container">
          <div className="favorites-header">
            <h2>Your Favorite Quotes ({favorites.length})</h2>
            <button className="back-btn-small" onClick={() => setShowFavorites(false)}>
              <FaArrowLeft />
            </button>
          </div>
          
          {favorites && favorites.length > 0 ? (
            <div className="favorites-list">
              {favorites.map((fav, index) => (
                <div key={`fav-${index}-${fav.text.substring(0, 10)}`} className="favorite-item">
                  <div className="favorite-content">
                    <p>"{fav.text}"</p>
                    <small>- {fav.author}</small>
                  </div>
                  <button 
                    className="remove-favorite-btn" 
                    onClick={() => removeFavorite(fav)}
                    title="Remove from favorites"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-favorites">
              <p>No favorites yet. Add some quotes to your favorites!</p>
            </div>
          )}
          
          <button className="btn back-btn" onClick={() => setShowFavorites(false)}>
            Back to Quotes
          </button>
        </div>
      )}
    </div>
  )
}

export default App
