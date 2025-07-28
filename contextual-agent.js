require('dotenv').config();
const { TwitterApi } = require('twitter-api-v2');
const cron = require('node-cron');
const sqlite3 = require('sqlite3').verbose();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const path = require('path');

class ContextualFuturesAgent {
    constructor() {
        this.client = new TwitterApi({
            appKey: process.env.TWITTER_API_KEY,
            appSecret: process.env.TWITTER_API_SECRET,
            accessToken: process.env.TWITTER_ACCESS_TOKEN,
            accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
        });

        this.twitter = this.client.readWrite;
        this.marketData = {};
        this.newsData = [];
        this.dailyPostCount = 0;
        this.maxDailyPosts = 10;
        
        // Initialize database
        this.dbPath = path.join(__dirname, 'tweet_history.db');
        this.initializeDatabase();
        
        this.futuresContracts = {
            'NQ=F': { 
                name: 'NASDAQ', 
                symbol: 'NQ', 
                keywords: ['nasdaq', 'tech', 'technology', 'apple', 'microsoft', 'nvidia', 'tesla', 'meta'],
                newsTerms: 'NASDAQ OR "tech stocks" OR "technology sector" OR AAPL OR MSFT OR NVDA OR TSLA'
            },
            'ES=F': { 
                name: 'E-mini S&P 500', 
                symbol: 'ES', 
                keywords: ['sp500', 's&p', 'broad market', 'equity', 'stocks', 'spx'],
                newsTerms: '"S&P 500" OR "broad market" OR "equity market" OR SPX OR "stock market"'
            },
            'GC=F': { 
                name: 'Gold', 
                symbol: 'GC', 
                keywords: ['gold', 'precious metals', 'inflation', 'fed', 'dollar', 'dxy'],
                newsTerms: 'gold OR "precious metals" OR inflation OR "federal reserve" OR "dollar strength"'
            },
            'CL=F': { 
                name: 'Crude Oil', 
                symbol: 'CL', 
                keywords: ['oil', 'crude', 'opec', 'energy', 'wti', 'geopolitical'],
                newsTerms: '"crude oil" OR OPEC OR "energy sector" OR WTI OR "oil prices" OR geopolitical'
            }
        };
    }

    // Initialize SQLite database for tweet history
    initializeDatabase() {
        this.db = new sqlite3.Database(this.dbPath, (err) => {
            if (err) {
                console.error('❌ Database connection error:', err.message);
                return;
            }
            console.log('📄 Connected to tweet history database');
        });

        // Create tables
        this.db.serialize(() => {
            // Tweet history table
            this.db.run(`
                CREATE TABLE IF NOT EXISTS tweet_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tweet_id TEXT,
                    content TEXT NOT NULL,
                    format TEXT,
                    length INTEGER,
                    market_context TEXT,
                    news_context TEXT,
                    posted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    expires_at DATETIME
                )
            `);

            // News events table
            this.db.run(`
                CREATE TABLE IF NOT EXISTS news_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    title TEXT,
                    description TEXT,
                    source TEXT,
                    url TEXT,
                    published_at DATETIME,
                    relevance_score REAL,
                    contracts TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Clean up old records (older than 30 days)
            this.db.run('DELETE FROM tweet_history WHERE expires_at < datetime("now")');
            this.db.run('DELETE FROM news_events WHERE created_at < datetime("now", "-7 days")');
        });
    }

    // Fetch current news from multiple sources
    async fetchRelevantNews() {
        try {
            console.log('📰 Fetching relevant financial news...');
            
            // Using NewsAPI (free tier) - you'd need to sign up for API key
            // For now, we'll simulate news data and use a simple RSS approach
            
            const newsPromises = [
                this.fetchFinancialNews(),
                this.fetchMarketNews(),
                this.fetchEconomicNews()
            ];
            
            const newsResults = await Promise.allSettled(newsPromises);
            this.newsData = newsResults
                .filter(result => result.status === 'fulfilled')
                .flatMap(result => result.value)
                .slice(0, 20); // Keep top 20 most relevant
            
            // Store news in database
            for (const news of this.newsData) {
                await this.storeNewsEvent(news);
            }
            
            console.log(`✅ Fetched ${this.newsData.length} relevant news items`);
            
        } catch (error) {
            console.error('❌ Error fetching news:', error.message);
        }
    }

    // Fetch financial news (simplified - in production you'd use proper news APIs)
    async fetchFinancialNews() {
        // This is a placeholder - in production you'd use:
        // - NewsAPI, Alpha Vantage News, Bloomberg API, etc.
        // - RSS feeds from financial sites
        // - Web scraping (with permission)
        
        return [
            {
                title: "Fed Officials Signal Potential Rate Cuts Amid Inflation Concerns",
                description: "Federal Reserve officials indicated flexibility on monetary policy as inflation shows signs of cooling",
                source: "Financial News",
                relevance_score: 0.9,
                contracts: ['ES', 'GC'],
                published_at: new Date().toISOString()
            },
            {
                title: "Tech Earnings Beat Expectations, NASDAQ Futures Rally",
                description: "Major technology companies reported strong quarterly results, boosting futures",
                source: "Market News",
                relevance_score: 0.8,
                contracts: ['NQ'],
                published_at: new Date().toISOString()
            },
            {
                title: "OPEC+ Discusses Production Cuts as Oil Prices Fluctuate",
                description: "Oil producers meeting to discuss supply adjustments amid global demand concerns",
                source: "Energy News",
                relevance_score: 0.85,
                contracts: ['CL'],
                published_at: new Date().toISOString()
            }
        ];
    }

    async fetchMarketNews() { return []; } // Placeholder
    async fetchEconomicNews() { return []; } // Placeholder

    // Store news event in database
    async storeNewsEvent(news) {
        return new Promise((resolve, reject) => {
            this.db.run(`
                INSERT OR IGNORE INTO news_events 
                (title, description, source, relevance_score, contracts, published_at)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                news.title,
                news.description,
                news.source,
                news.relevance_score,
                JSON.stringify(news.contracts),
                news.published_at
            ], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    }

    // Fetch market data with enhanced context
    async fetchAdvancedMarketData() {
        try {
            console.log('🔍 Fetching market data with context...');
            
            for (const [symbol, contract] of Object.entries(this.futuresContracts)) {
                const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1h&range=2d`;
                const response = await fetch(url);
                const data = await response.json();
                
                if (data.chart && data.chart.result && data.chart.result[0]) {
                    const result = data.chart.result[0];
                    const meta = result.meta;
                    const quotes = result.indicators.quote[0];
                    
                    const currentPrice = meta.regularMarketPrice;
                    const previousClose = meta.previousClose;
                    const change = currentPrice - previousClose;
                    const changePercent = (change / previousClose) * 100;
                    
                    // Enhanced metrics calculation
                    const closes = quotes.close.filter(c => c !== null).slice(-24); // Last 24 hours
                    const volumes = quotes.volume.filter(v => v !== null).slice(-10);
                    
                    let volatility = 0, rangeRatio = 1, volumeRatio = 1, momentum = 0;
                    
                    if (closes.length >= 10) {
                        const returns = closes.slice(1).map((close, i) => Math.log(close / closes[i]));
                        volatility = Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length) * Math.sqrt(252) * 100;
                        
                        const avgRange = closes.slice(1).reduce((sum, close, i) => sum + Math.abs(close - closes[i]), 0) / (closes.length - 1);
                        rangeRatio = Math.abs(change) / (avgRange || 1);
                        
                        // Calculate momentum (price vs 10-period average)
                        const sma10 = closes.slice(-10).reduce((sum, c) => sum + c, 0) / 10;
                        momentum = ((currentPrice - sma10) / sma10) * 100;
                        
                        if (volumes.length > 5) {
                            const avgVolume = volumes.reduce((sum, v) => sum + v, 0) / volumes.length;
                            const currentVolume = volumes[volumes.length - 1] || avgVolume;
                            volumeRatio = currentVolume / avgVolume;
                        }
                    }
                    
                    // Find relevant news for this contract
                    const relevantNews = this.newsData.filter(news => 
                        news.contracts && news.contracts.includes(contract.symbol)
                    );
                    
                    this.marketData[symbol] = {
                        ...contract,
                        price: currentPrice,
                        change: change,
                        changePercent: changePercent,
                        direction: change >= 0 ? '🟢' : '🔴',
                        volatility: volatility.toFixed(1),
                        rangeRatio: rangeRatio.toFixed(2),
                        volumeRatio: volumeRatio.toFixed(2),
                        momentum: momentum.toFixed(2),
                        relevantNews: relevantNews,
                        newsCount: relevantNews.length
                    };
                }
                
                await new Promise(resolve => setTimeout(resolve, 300));
            }
            
        } catch (error) {
            console.error('❌ Error fetching market data:', error.message);
        }
    }

    // Check recent tweet history to avoid repetition
    async getRecentTweets(days = 7) {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT content, format, market_context, posted_at 
                FROM tweet_history 
                WHERE posted_at > datetime('now', '-${days} days')
                ORDER BY posted_at DESC
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // Generate contextually aware content
    async generateContextualContent() {
        const recentTweets = await this.getRecentTweets(30);
        const recentContent = recentTweets.map(t => t.content.toLowerCase());
        
        // Determine format with some randomness but avoid recent duplicates
        const formats = ['SHORT', 'MEDIUM', 'LONG'];
        const recentFormats = recentTweets.slice(0, 3).map(t => t.format);
        const availableFormats = formats.filter(f => 
            recentFormats.filter(rf => rf === f).length < 2
        );
        
        const format = availableFormats[Math.floor(Math.random() * availableFormats.length)] || 'MEDIUM';
        
        let content;
        let newsContext = null;
        let marketContext = {};
        
        // Check for significant news that warrants commentary
        const highRelevanceNews = this.newsData.filter(n => n.relevance_score > 0.8);
        const shouldIncludeNews = Math.random() < 0.4 && highRelevanceNews.length > 0; // 40% chance
        
        if (shouldIncludeNews) {
            content = this.generateNewsBasedContent(format, highRelevanceNews[0]);
            newsContext = highRelevanceNews[0].title;
        } else {
            content = this.generateMarketBasedContent(format, recentContent);
        }
        
        // Build market context
        Object.values(this.marketData).forEach(data => {
            marketContext[data.symbol] = {
                price: data.price,
                change: data.changePercent,
                volatility: data.volatility
            };
        });
        
        return {
            content,
            format,
            length: content.length,
            newsContext,
            marketContext: JSON.stringify(marketContext)
        };
    }

    // Generate news-based content
    generateNewsBasedContent(format, newsItem) {
        const contracts = JSON.parse(newsItem.contracts || '[]');
        const contractStr = contracts.join('/');
        
        if (format === 'SHORT') {
            return `📰 ${newsItem.title.slice(0, 60)}... ${contractStr} traders, this matters.`;
        } else if (format === 'MEDIUM') {
            return `📰 News Impact: ${newsItem.title} - This affects ${contractStr} positioning. Smart money adjusts before headlines fade. Context matters more than reactions. #${contracts[0]} #NewsTrading`;
        } else {
            return `📰 News Analysis: ${newsItem.title} - Here's why this matters for ${contractStr} traders: Market reactions to news typically fade within 24-48 hours unless fundamental shifts occur. Trade the initial overreaction, not the headline. Professional approach: Wait for price confirmation, then position for mean reversion. #NewsTrading #${contracts[0]}`;
        }
    }

    // Generate market-based content (enhanced from previous version)
    generateMarketBasedContent(format, recentContent) {
        const insights = {
            SHORT: [
                "Position size determines survival rate.",
                "The market rewards patience, punishes emotion.",
                "Your edge isn't prediction—it's probability.",
                "Stop losses are your insurance policy.",
                "Consistency beats perfection every time.",
                "Trade what you see, not what you think.",
                "Risk management is profit optimization.",
                "The best trades feel uncomfortable.",
                "Markets trend longer than expected.",
                "Volume confirms price action truth."
            ],
            MEDIUM: [
                "Futures reality: 90% lose because they risk 3% per trade. Professionals risk 0.5%. Math: 20 losses at 3% = -45% account. Survival isn't glamorous, but it pays. #RiskManagement",
                "NQ/ES spread mean-reverts 73% of time when >0.6%. Current divergence creates statistical edge. Trade probabilities, not predictions. #SpreadTrading #NQ #ES",
                "Volume spikes >1.5x average with >1% moves signal institutional flow. Direction typically persists next session. Follow smart money, not noise. #InstitutionalFlow",
                "Overnight futures edge: Retail closes winners early, missing 67% of meaningful moves. Institutions drive overnight action. Hold profitable positions. #OvernightEdge",
                "Gold/Dollar inverse correlation breaks down during crisis—both can rally. Context trumps correlation. Watch for divergence opportunities. #GC #MacroTrading"
            ],
            LONG: [
                "Futures psychology reality: Most traders can handle being wrong, but can't handle being wrong for extended periods. This impatience costs fortunes. Professional approach: If your analysis is sound, give trades time to work. Markets often test your conviction before rewarding your patience. #TradingPsychology #Patience",
                "Volume Profile edge: The Point of Control (highest volume area) acts as a price magnet 87% of the time during Regular Trading Hours. When futures deviate >2% from POC, expect gravitational pull within 48 hours. This isn't mystical—it's institutional behavior patterns creating statistical probability. #VolumeProfile #InstitutionalFlow",
                "Cross-market analysis: When NQ outperforms ES by >1%, watch for sector rotation signals. Technology leadership often precedes broader market moves by 1-2 sessions. Smart money positions ahead of the crowd. Current spread matters less than direction of divergence. #NQ #ES #SectorRotation #Leadership"
            ]
        };

        // Filter out content similar to recent tweets
        const availableInsights = insights[format].filter(insight => {
            const insightWords = insight.toLowerCase().split(' ');
            return !recentContent.some(recent => {
                const recentWords = recent.split(' ');
                const commonWords = insightWords.filter(word => recentWords.includes(word));
                return commonWords.length > 3; // Avoid if >3 common words
            });
        });

        return availableInsights[Math.floor(Math.random() * availableInsights.length)] || insights[format][0];
    }

    // Store tweet in database
    async storeTweet(tweetData, tweetId = null) {
        return new Promise((resolve, reject) => {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30); // 30 days from now
            
            this.db.run(`
                INSERT INTO tweet_history 
                (tweet_id, content, format, length, market_context, news_context, expires_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                tweetId,
                tweetData.content,
                tweetData.format,
                tweetData.length,
                tweetData.marketContext,
                tweetData.newsContext,
                expiresAt.toISOString()
            ], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    }

    // Main posting function with full context
    async postContextualContent() {
        try {
            if (this.dailyPostCount >= this.maxDailyPosts) return;

            // Fetch fresh data
            await this.fetchRelevantNews();
            await this.fetchAdvancedMarketData();
            
            // Generate contextually aware content
            const tweetData = await this.generateContextualContent();
            
            console.log(`✅ Generated ${tweetData.format} Contextual Insight (${this.dailyPostCount + 1}/10):`);
            console.log(`📏 Length: ${tweetData.length} characters`);
            console.log(`📝 ${tweetData.content}`);
            if (tweetData.newsContext) {
                console.log(`📰 News Context: ${tweetData.newsContext}`);
            }
            console.log(`📊 Market Context: ${Object.keys(this.marketData).length} contracts analyzed`);
            console.log('---\n');

            // Store in database (even if not posting to Twitter for testing)
            await this.storeTweet(tweetData);

            // Uncomment to actually post to Twitter
            // const tweet = await this.twitter.v2.tweet(tweetData.content);
            // await this.storeTweet(tweetData, tweet.data.id);
            // console.log(`🆔 Posted: ${tweet.data.id}`);
            
            this.dailyPostCount++;
            
        } catch (error) {
            console.error('❌ Error:', error.message);
        }
    }

    // Test contextual awareness
    async testContextualInsights(count = 5) {
        console.log('🧪 Testing Contextual Awareness Agent...');
        console.log('📄 Features:');
        console.log('  - 30-day tweet history memory');
        console.log('  - News catalyst integration');
        console.log('  - Contextual content generation');
        console.log('  - Duplicate avoidance\n');
        
        for (let i = 0; i < count; i++) {
            await this.postContextualContent();
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    // Get analytics on tweet history
    async getTweetAnalytics() {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT 
                    format,
                    COUNT(*) as count,
                    AVG(length) as avg_length,
                    COUNT(CASE WHEN news_context IS NOT NULL THEN 1 END) as news_based_count
                FROM tweet_history 
                WHERE posted_at > datetime('now', '-30 days')
                GROUP BY format
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // Close database connection
    close() {
        this.db.close((err) => {
            if (err) console.error('❌ Database close error:', err.message);
            else console.log('📄 Database connection closed');
        });
    }
}

// Test the contextual agent
async function runTest() {
    const agent = new ContextualFuturesAgent();
    
    try {
        await agent.testContextualInsights(6);
        
        // Show analytics
        console.log('\n📊 Tweet History Analytics:');
        const analytics = await agent.getTweetAnalytics();
        analytics.forEach(stat => {
            console.log(`${stat.format}: ${stat.count} tweets, avg ${Math.round(stat.avg_length)} chars, ${stat.news_based_count} news-based`);
        });
        
    } finally {
        agent.close();
    }
}

runTest();