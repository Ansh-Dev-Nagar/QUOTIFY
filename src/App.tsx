import { useState, useEffect, useRef } from 'react'
import { FaHeart, FaRegHeart, FaQuoteLeft, FaQuoteRight, FaArrowLeft, FaShare, FaCheck, FaTwitter } from 'react-icons/fa'
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
      }
    } catch (err) {
      console.error('Error in getNewQuote:', err);
      setError('Failed to fetch quote. Please try again.');
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
      
      {!showFavorites ? (
        <div className={`quote-card ${isLoading ? 'loading' : ''}`}>
          {/* Decorative dots */}
          <div className="decorative-dot dot-1"></div>
          <div className="decorative-dot dot-2"></div>
          <div className="decorative-dot dot-3"></div>
          
          <div className="quote-header">
            <h2>QUOTE.</h2>
            <div className="header-actions">
              <div className="share-container">
                <div 
                  className={`action-icon ${copied ? 'copied' : ''}`} 
                  onClick={() => setShowShareOptions(!showShareOptions)}
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
              
              <div className="favorite-icon" onClick={toggleFavorite}>
                {quote.isFavorite ? <FaHeart color="#4ecdc4" /> : <FaRegHeart color="#4ecdc4" />}
              </div>
            </div>
          </div>
          
          <div className="quote-content">
            {error ? (
              <>
                <p className="quote-text error">{error}</p>
                {quoteSource === 'local' && (
                  <div className="retry-container">
                    <button 
                      className="retry-button"
                      onClick={getNewQuote}
                      disabled={isLoading}
                    >
                      Retry API
                    </button>
                  </div>
                )}
              </>
            ) : (
              <>
                <div className="quote-text-container">
                  <div className="quote-marks opening-marks"><FaQuoteLeft /></div>
                  <p className="quote-text">{isLoading ? "Loading..." : quote.text}</p>
                  <div className="quote-marks closing-marks"><FaQuoteRight /></div>
                </div>
                <div className="quote-author">{isLoading ? "" : quote.author}</div>
                {quoteSource === 'local' && !error && (
                  <div className="quote-source">Using local quote database</div>
                )}
              </>
            )}
          </div>
          
          <div className="quote-actions">
            <button 
              className="btn new-quote" 
              onClick={getNewQuote}
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : "NEW QUOTE"}
            </button>
            <button 
              className="btn add-favorite" 
              onClick={() => setShowFavorites(true)}
              disabled={isLoading}
            >
              {favorites.length > 0 ? "VIEW FAVORITES" : "NO FAVORITES YET"}
            </button>
          </div>
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
      
      <div className="heading-container">
        <h3>We have here a heading quotes.</h3>
      </div>
    </div>
  )
}

export default App
