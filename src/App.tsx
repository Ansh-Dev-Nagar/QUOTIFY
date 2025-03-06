import { useState, useEffect } from 'react'
import { FaHeart, FaRegHeart, FaQuoteLeft, FaQuoteRight, FaArrowLeft } from 'react-icons/fa'
import './App.css'

interface Quote {
  text: string;
  author: string;
  isFavorite: boolean;
}

function App() {
  const [quote, setQuote] = useState<Quote>({
    text: "Ask not what your country can do for you; ask what you can do for your country.",
    author: "John Kennedy",
    isFavorite: false
  });
  
  const [favorites, setFavorites] = useState<Quote[]>([]);
  const [showFavorites, setShowFavorites] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load favorites from localStorage on initial render
  useEffect(() => {
    const savedFavorites = localStorage.getItem('quotify-favorites');
    if (savedFavorites) {
      setFavorites(JSON.parse(savedFavorites));
    }
  }, []);

  // Save favorites to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('quotify-favorites', JSON.stringify(favorites));
  }, [favorites]);

  const toggleFavorite = () => {
    if (quote.isFavorite) {
      setFavorites(favorites.filter(fav => fav.text !== quote.text));
    } else {
      setFavorites([...favorites, {...quote, isFavorite: true}]);
    }
    setQuote({...quote, isFavorite: !quote.isFavorite});
  };

  const getNewQuote = () => {
    // This will be replaced with API call later
    // For now, just a placeholder with loading state
    setIsLoading(true);
    
    setTimeout(() => {
      const dummyQuotes = [
        { text: "The only limit to our realization of tomorrow is our doubts of today.", author: "Franklin D. Roosevelt" },
        { text: "Life is what happens when you're busy making other plans.", author: "John Lennon" },
        { text: "The future belongs to those who believe in the beauty of their dreams.", author: "Eleanor Roosevelt" },
        { text: "In the end, we will remember not the words of our enemies, but the silence of our friends.", author: "Martin Luther King Jr." },
        { text: "Success is not final, failure is not fatal: It is the courage to continue that counts.", author: "Winston Churchill" },
        { text: "The greatest glory in living lies not in never falling, but in rising every time we fall.", author: "Nelson Mandela" }
      ];
      
      const randomQuote = dummyQuotes[Math.floor(Math.random() * dummyQuotes.length)];
      const isFavorite = favorites.some(fav => fav.text === randomQuote.text);
      
      setQuote({...randomQuote, isFavorite});
      setIsLoading(false);
    }, 600); // Simulate API delay
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
            <div className="favorite-icon" onClick={toggleFavorite}>
              {quote.isFavorite ? <FaHeart color="#4ecdc4" /> : <FaRegHeart color="#4ecdc4" />}
            </div>
          </div>
          
          <div className="quote-content">
            <div className="quote-marks"><FaQuoteLeft /></div>
            <p className="quote-text">{isLoading ? "Loading..." : quote.text}</p>
            <div className="quote-author">{isLoading ? "" : quote.author}</div>
            <div className="quote-marks closing-marks"><FaQuoteRight /></div>
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
