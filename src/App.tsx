import { useState, useEffect, useRef, useCallback } from 'react'
import { FaHeart, FaRegHeart, FaQuoteLeft, FaQuoteRight, FaArrowLeft, FaShare, FaCheck, FaTwitter, FaKeyboard } from 'react-icons/fa'
import './App.css'
import { Quote } from './types'
import quotesService from './services/quotesService'

function App() {
  const [quote, setQuote] = useState<Quote>({
    text: "Ask not what your country can do for you; ask what you can do for your country.",
    author: "John Kennedy",
    isFavorite: false
  });
  
  const [favorites, setFavorites] = useState<Quote[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showShareOptions, setShowShareOptions] = useState(false);
  const [copied, setCopied] = useState(false);
  const [quoteSource, setQuoteSource] = useState<'api' | 'local' | null>(null);
  const [showKeyboardHints, setShowKeyboardHints] = useState(false);
  const shareOptionsRef = useRef<HTMLDivElement>(null);

  // Load favorites from localStorage on initial render
  useEffect(() => {
    const savedFavorites = localStorage.getItem('quotify-favorites');
    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites));
      } catch (err) {
        console.error('Error parsing saved favorites:', err);
        // Reset favorites if there's an error
        localStorage.removeItem('quotify-favorites');
        setFavorites([]);
      }
    }
    
    // Fetch a quote when the app loads
    getNewQuote().catch(err => {
      console.error('Error in initial quote fetch:', err);
    });
  }, []);

  // Save favorites to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('quotify-favorites', JSON.stringify(favorites));
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
    if (quote.isFavorite) {
      setFavorites(favorites.filter(fav => fav.text !== quote.text));
    } else {
      setFavorites([...favorites, {...quote, isFavorite: true}]);
    }
    setQuote({...quote, isFavorite: !quote.isFavorite});
  };

  const getNewQuote = async () => {
    setIsLoading(true);
    setError(null);
    
    // If we're offline, immediately show a local quote without API call
    if (!navigator.onLine) {
      const localQuote = quotesService.getRandomLocalQuote();
      setQuote({
        ...localQuote,
        isFavorite: favorites.some(fav => fav.text === localQuote.text)
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
        setQuote({
          ...localQuote,
          isFavorite: favorites.some(fav => fav.text === localQuote.text)
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
              <p className={`quote-notification ${error.includes('offline') ? 'offline-notice' : error.includes('Using local quotes') ? 'local-fallback' : 'error'}`}>{error}</p>
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
            <h2>Your Favorite Quotes</h2>
            <button className="back-btn-small" onClick={() => setShowFavorites(false)}>
              <FaArrowLeft />
            </button>
          </div>
          
          {favorites.length > 0 ? (
            <div className="favorites-list">
              {favorites.map((fav, index) => (
                <div key={index} className="favorite-item">
                  <p>"{fav.text}"</p>
                  <small>- {fav.author}</small>
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
