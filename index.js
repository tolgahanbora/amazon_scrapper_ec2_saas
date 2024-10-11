require('dotenv').config();
const express = require('express');
const axios = require('axios');
const rateLimit = require('express-rate-limit');
const cacheManager = require('cache-manager');

const PORT = process.env.PORT || 5000;
const app = express();

app.use(express.json());

// Rate limiter: Her IP için dakikada 100 istek
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 dakika.
  max: 100
});
app.use(limiter);

const SCRAPER_API_KEY = process.env.SCRAPER_API_KEY;

if (!SCRAPER_API_KEY) {
  console.error('SCRAPER_API_KEY is not set in environment variables');
  process.exit(1);
}

const returnScraperApiUrl = (url) => `http://api.scraperapi.com?api_key=${SCRAPER_API_KEY}&autoparse=true&url=${encodeURIComponent(url)}`;

let memoryCache;

async function setupCache() {
  memoryCache = await cacheManager.caching('memory', { 
    max: 100, 
    ttl: 60 * 5 // 5 dakika önbellek
  });
}

// Önbellek middleware'i
const cacheMiddleware = (duration) => {
  return async (req, res, next) => {
    if (!memoryCache) {
      return next();
    }
    let key = req.originalUrl || req.url;
    try {
      const result = await memoryCache.get(key);
      if (result) {
        return res.json(result);
      } else {
        res.originalJson = res.json;
        res.json = async (body) => {
          try {
            await memoryCache.set(key, body, { ttl: duration });
          } catch (err) {
            console.error(err);
          }
          res.originalJson(body);
        };
        next();
      }
    } catch (err) {
      console.error(err);
      next();
    }
  };
};

// Welcome route
app.get('/', async (req, res) => {
    res.send('Welcome to Amazon and eBay Scraper API! Created By Tolgahan Bora');
});

// Amazon Routes

// Get Amazon product details
app.get('/amazon/products/:productId', cacheMiddleware(300), async (req, res) => {
    const { productId } = req.params;

    try {
        const response = await axios.get(returnScraperApiUrl(`https://www.amazon.com/dp/${productId}`));
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Amazon product reviews
app.get('/amazon/products/:productId/reviews', cacheMiddleware(300), async (req, res) => {
    const { productId } = req.params;
    
    try {
        const response = await axios.get(returnScraperApiUrl(`https://www.amazon.com/product-reviews/${productId}`));
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Amazon product offers
app.get('/amazon/products/:productId/offers', cacheMiddleware(300), async (req, res) => {
    const { productId } = req.params;
    
    try {
        const response = await axios.get(returnScraperApiUrl(`https://www.amazon.com/gp/offer-listing/${productId}`));
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get Amazon search results
app.get('/amazon/search/:searchQuery', cacheMiddleware(300), async (req, res) => {
    const { searchQuery } = req.params;
    
    try {
        const response = await axios.get(returnScraperApiUrl(`https://www.amazon.com/s?k=${encodeURIComponent(searchQuery)}`));
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// eBay Routes

// Get eBay product details
app.get('/ebay/products/:productId', cacheMiddleware(300), async (req, res) => {
    const { productId } = req.params;

    try {
        const response = await axios.get(returnScraperApiUrl(`https://www.ebay.com/itm/${productId}`));
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get eBay seller's other items
app.get('/ebay/seller/:sellerId/items', cacheMiddleware(300), async (req, res) => {
    const { sellerId } = req.params;
    
    try {
        const response = await axios.get(returnScraperApiUrl(`https://www.ebay.com/sch/m.html?_ssn=${sellerId}&_from=R40&_trksid=p2499338.m570.l1313&_nkw=${sellerId}&_sacat=0`));
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get eBay search results
app.get('/ebay/search/:searchQuery', cacheMiddleware(300), async (req, res) => {
    const { searchQuery } = req.params;
    
    try {
        const response = await axios.get(returnScraperApiUrl(`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(searchQuery)}`));
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get eBay category listings
app.get('/ebay/category/:categoryId', cacheMiddleware(300), async (req, res) => {
    const { categoryId } = req.params;
    
    try {
        const response = await axios.get(returnScraperApiUrl(`https://www.ebay.com/b/${categoryId}`));
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

async function startServer() {
  await setupCache();
  app.listen(PORT, () => console.log(`Server Running on Port: ${PORT}`));
}

startServer();