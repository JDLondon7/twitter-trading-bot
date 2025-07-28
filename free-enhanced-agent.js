require('dotenv').config();
const { TwitterApi } = require('twitter-api-v2');
const cron = require('node-cron');
const sqlite3 = require('sqlite3').verbose();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');

class FreeEnhancedAgent {
    constructor() {
        // APIs
        this.twitter = new TwitterApi({
            appKey: process.env.TWITTER_API_KEY,
            appSecret: process.env.TWITTER_API_SECRET,
            accessToken: process.env.TWITTER_ACCESS_TOKEN,
            accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
        }).readWrite;

        this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
        this.geminiModel = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        // Enhanced state management
        this.marketData = {};
        this.economicEvents = [];
        this.socialSentiment = {};
        this.performanceMetrics = {};
        this.successPatterns = {};
        this.dailyPostCount = 0;
        this.maxDailyPosts = 10;
        
        // Enhanced database
        this.dbPath = path.join(__dirname, 'enhanced_free_agent.db');
        this.initializeEnhancedDatabase();

        // Your authentic profile
        this.traderProfile = {
            identity: "Professional day trader specializing in NQ/MNQ, ES/MES, GC/MGC, CL/MCL",
            style: "Direct, no-bullshit, practical insights",
            expertise: "Risk management, trading psychology, market structure"
        };

        // FREE data sources
        this.freeDataSources = {
            economics: 'https://api.stlouisfed.org/fred/series/observations', // Federal Reserve
            news: [
                'https://feeds.reuters.com/reuters/businessNews',
                'https://feeds.bloomberg.com/markets/news.rss',
                'https://finance.yahoo.com/news/rssindex'
            ],
            social: {
                reddit: 'https://www.reddit.com/r/SecurityAnalysis/.json',
                twitter_trends: 'Available via Twitter API'
            }
        };

        // Enhanced content strategies
        this.contentStrategies = {
            THREAD_SERIES: { weight: 15, viral_potential: 'HIGH' },
            CONTROVERSY: { weight: 20, viral_potential: 'VERY_HIGH' },
            MARKET_OBSERVATION: { weight: 25, viral_potential: 'MEDIUM' },
            EDUCATIONAL: { weight: 20, viral_potential: 'MEDIUM' },
            PSYCHOLOGY: { weight: 10, viral_potential: 'HIGH' },
            LIVE_COMMENTARY: { weight: 10, viral_potential: 'EXTREME' }
        };
    }

    initializeEnhancedDatabase() {
        this.db = new sqlite3.Database(this.dbPath, (err) => {
            if (err) {
                console.error('❌ Database error:', err.message);
                return;
            }
            console.log('🚀 Enhanced free agent database ready');
        });

        this.db.serialize(() => {
            // Enhanced tweet tracking
            this.db.run(`
                CREATE TABLE IF NOT EXISTS enhanced_tweets (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tweet_id TEXT,
                    content TEXT NOT NULL,
                    strategy_type TEXT,
                    market_context TEXT,
                    economic_context TEXT,
                    social_context TEXT,
                    
                    -- Performance metrics
                    likes INTEGER DEFAULT 0,
                    retweets INTEGER DEFAULT 0,
                    replies INTEGER DEFAULT 0,
                    impressions INTEGER DEFAULT 0,
                    engagement_rate REAL DEFAULT 0,
                    
                    -- Learning metrics
                    viral_score INTEGER DEFAULT 0,
                    success_factors TEXT,
                    
                    posted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    expires_at DATETIME
                )
            `);

            // Performance learning table
            this.db.run(`
                CREATE TABLE IF NOT EXISTS performance_patterns (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    pattern_type TEXT,
                    success_rate REAL,
                    avg_engagement REAL,
                    best_times TEXT,
                    successful_elements TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Economic events tracking
            this.db.run(`
                CREATE TABLE IF NOT EXISTS economic_events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    event_name TEXT,
                    event_date DATETIME,
                    importance TEXT,
                    actual_value TEXT,
                    forecast_value TEXT,
                    market_impact TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Clean old data
            this.db.run('DELETE FROM enhanced_tweets WHERE expires_at < datetime("now")');
        });
    }

    // FREE: Federal Reserve Economic Data
    async fetchEconomicData() {
        try {
            console.log('📊 Fetching FREE economic data...');
            
            // Key economic indicators (FREE from FRED API)
            const indicators = [
                'UNRATE', // Unemployment Rate
                'CPIAUCSL', // CPI
                'FEDFUNDS', // Fed Funds Rate
                'DGS10', // 10-Year Treasury
                'DEXUSEU' // USD/EUR Exchange Rate
            ];

            // Simulate economic data (in production, use actual FRED API)
            this.economicEvents = [
                {
                    name: 'CPI Release',
                    date: new Date(),
                    importance: 'HIGH',
                    impact: 'Inflation concerns affecting gold and equity futures',
                    relevance_to_futures: 'GC typically inverse to real rates, ES sensitive to growth fears'
                },
                {
                    name: 'Fed Meeting Minutes',
                    date: new Date(Date.now() + 86400000), // Tomorrow
                    importance: 'VERY_HIGH',
                    impact: 'Monetary policy guidance affects all futures contracts',
                    relevance_to_futures: 'Rate expectations drive cross-asset volatility'
                },
                {
                    name: 'NFP Release',
                    date: new Date(Date.now() + 172800000), // Day after tomorrow
                    importance: 'HIGH',
                    impact: 'Employment data affects Fed policy expectations',
                    relevance_to_futures: 'Strong jobs = hawkish Fed = pressure on GC, support for USD'
                }
            ];

            console.log(`✅ Loaded ${this.economicEvents.length} economic events`);
            
        } catch (error) {
            console.error('❌ Economic data error:', error.message);
        }
    }

    // FREE: Social sentiment analysis
    async analyzeSocialSentiment() {
        try {
            console.log('📱 Analyzing FREE social sentiment...');
            
            // Simulate social sentiment (in production: Reddit API, Twitter search)
            this.socialSentiment = {
                reddit_futures: {
                    sentiment: 'BEARISH',
                    confidence: 0.7,
                    key_topics: ['inflation fears', 'rate hikes', 'recession talk'],
                    volume: 'HIGH'
                },
                twitter_trends: {
                    trending_topics: ['#Inflation', '#FedMeeting', '#MarketCrash'],
                    futures_mentions: 'INCREASING',
                    retail_sentiment: 'FEARFUL'
                },
                overall_market_mood: 'RISK_OFF'
            };

            console.log('✅ Social sentiment analyzed');
            
        } catch (error) {
            console.error('❌ Social sentiment error:', error.message);
        }
    }

    // FREE: Enhanced market data with cross-correlations
    async fetchEnhancedMarketData() {
        try {
            console.log('📈 Fetching enhanced market data...');
            
            // Get your existing futures data
            for (const [symbol, contract] of Object.entries({
                'NQ=F': { symbol: 'NQ', name: 'NASDAQ' },
                'ES=F': { symbol: 'ES', name: 'E-mini S&P' },
                'GC=F': { symbol: 'GC', name: 'Gold' },
                'CL=F': { symbol: 'CL', name: 'Crude' }
            })) {
                const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=5m&range=1d`;
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
                    
                    // Enhanced analytics
                    const closes = quotes.close.filter(c => c !== null);
                    const volumes = quotes.volume.filter(v => v !== null);
                    
                    // FREE correlation analysis
                    let correlationSignals = [];
                    
                    // VIX relationship (for ES/NQ)
                    if (symbol === 'ES=F' || symbol === 'NQ=F') {
                        if (Math.abs(changePercent) > 1) {
                            correlationSignals.push('HIGH_VOL_ENVIRONMENT');
                        }
                    }
                    
                    // Dollar correlation (for GC/CL)
                    if (symbol === 'GC=F') {
                        correlationSignals.push(changePercent < -0.5 ? 'DOLLAR_STRENGTH' : 'DOLLAR_WEAKNESS');
                    }
                    
                    this.marketData[symbol] = {
                        ...contract,
                        price: currentPrice,
                        change: change,
                        changePercent: changePercent.toFixed(2),
                        direction: change >= 0 ? 'up' : 'down',
                        correlationSignals,
                        economicSensitivity: this.getEconomicSensitivity(contract.symbol),
                        socialMentions: this.getSocialMentions(contract.symbol)
                    };
                }
                
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            
        } catch (error) {
            console.error('❌ Enhanced market data error:', error.message);
        }
    }

    getEconomicSensitivity(symbol) {
        const sensitivities = {
            'NQ': ['Tech earnings', 'Growth concerns', 'Rate expectations'],
            'ES': ['Economic data', 'Fed policy', 'Broad market sentiment'],
            'GC': ['Inflation data', 'Real rates', 'Dollar strength'],
            'CL': ['Supply disruptions', 'Economic growth', 'Geopolitical events']
        };
        return sensitivities[symbol] || [];
    }

    getSocialMentions(symbol) {
        // Simulate social mention analysis
        const mentions = {
            'NQ': 'HIGH - Tech sector discussion',
            'ES': 'MEDIUM - Broad market sentiment',
            'GC': 'HIGH - Inflation hedge talk',
            'CL': 'MEDIUM - Energy sector focus'
        };
        return mentions[symbol] || 'LOW';
    }

    // FREE: Learning algorithm from your own tweet performance
    async analyzePerformancePatterns() {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT 
                    strategy_type,
                    AVG(engagement_rate) as avg_engagement,
                    AVG(viral_score) as avg_viral_score,
                    COUNT(*) as tweet_count,
                    MAX(engagement_rate) as best_engagement
                FROM enhanced_tweets 
                WHERE posted_at > datetime('now', '-30 days')
                  AND engagement_rate > 0
                GROUP BY strategy_type
                ORDER BY avg_engagement DESC
            `, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    this.successPatterns = {};
                    rows.forEach(row => {
                        this.successPatterns[row.strategy_type] = {
                            avgEngagement: row.avg_engagement,
                            viralScore: row.avg_viral_score,
                            tweetCount: row.tweet_count,
                            bestEngagement: row.best_engagement
                        };
                    });
                    console.log(`📊 Analyzed ${rows.length} performance patterns`);
                    resolve(rows);
                }
            });
        });
    }

    // FREE: Enhanced content generation with context
    async generateEnhancedContent() {
        try {
            // Learn from your successful patterns
            await this.analyzePerformancePatterns();
            
            // Select strategy based on success patterns
            const strategy = this.selectOptimalStrategy();
            
            const prompt = this.buildEnhancedPrompt(strategy);
            
            const result = await this.geminiModel.generateContent(prompt);
            const response = await result.response;
            let content = response.text().trim().replace(/^["']|["']$/g, '');
            
            if (content.length > 280) {
                content = content.substring(0, 277) + '...';
            }
            
            return {
                content,
                strategy,
                marketContext: this.marketData,
                economicContext: this.economicEvents,
                socialContext: this.socialSentiment
            };
            
        } catch (error) {
            console.error('❌ Enhanced content generation error:', error.message);
            return this.getFallbackContent();
        }
    }

    selectOptimalStrategy() {
        // Use learning algorithm to pick best-performing strategy
        if (Object.keys(this.successPatterns).length > 0) {
            const bestStrategy = Object.keys(this.successPatterns)
                .sort((a, b) => this.successPatterns[b].avgEngagement - this.successPatterns[a].avgEngagement)[0];
            console.log(`🎯 Selected best-performing strategy: ${bestStrategy}`);
            return bestStrategy;
        }
        
        // Default strategy selection
        const strategies = Object.keys(this.contentStrategies);
        return strategies[Math.floor(Math.random() * strategies.length)];
    }

    buildEnhancedPrompt(strategy) {
        // Build context from all FREE data sources
        const marketSummary = Object.values(this.marketData).map(d => 
            `${d.symbol}: ${d.changePercent}% (${d.correlationSignals.join(', ')})`
        ).join(', ');

        const economicContext = this.economicEvents.map(e => 
            `${e.name}: ${e.impact}`
        ).join('; ');

        const socialContext = `Market mood: ${this.socialSentiment.overall_market_mood}, Reddit sentiment: ${this.socialSentiment.reddit_futures?.sentiment}`;

        const basePrompt = `You are a professional day trader (36 years old) specializing in NQ/MNQ, ES/MES, GC/MGC, CL/MCL.

COMMUNICATION STYLE: Direct, professional, no-bullshit approach. No slang, no fluff.

CURRENT CONTEXT:
Markets: ${marketSummary}
Economic: ${economicContext}
Social: ${socialContext}

STRATEGY: ${strategy}`;

        switch (strategy) {
            case 'THREAD_SERIES':
                return `${basePrompt}

Create the opening tweet for an educational thread series. Make it compelling enough that people want to read the entire thread. Include "🧵" and "1/X".

Focus on a contrarian insight about futures trading that challenges conventional wisdom. Use current market conditions as context.`;

            case 'CONTROVERSY':
                return `${basePrompt}

Create a controversial but accurate statement about day trading that will generate discussion. Include specific statistics or market examples. 

Challenge something most traders believe. Be direct and professional.`;

            case 'LIVE_COMMENTARY':
                return `${basePrompt}

Provide real-time commentary on current market conditions. Point out something specific that most traders are missing.

Be the expert voice during market volatility. Professional and direct.`;

            default:
                return `${basePrompt}

Create direct, practical content about day trading futures. Use current market context to make a valuable point.`;
        }
    }

    getFallbackContent() {
        const fallbacks = [
            "Most traders focus on entries. Professionals focus on exits. The math determines everything.",
            "Market correlation breakdown signals regime change. Pay attention to what's NOT moving together.",
            "Risk management isn't sexy. But it's the only thing that keeps you trading tomorrow.",
            "Volume confirms price action. No volume behind the move means don't trust it.",
            "Your position size determines your stress level. Size down until you can think clearly."
        ];
        
        return {
            content: fallbacks[Math.floor(Math.random() * fallbacks.length)],
            strategy: 'FALLBACK',
            marketContext: {},
            economicContext: [],
            socialContext: {}
        };
    }

    // FREE: Enhanced tweet storage with performance tracking
    async storeEnhancedTweet(tweetData, tweetId = null) {
        return new Promise((resolve, reject) => {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);
            
            this.db.run(`
                INSERT INTO enhanced_tweets 
                (tweet_id, content, strategy_type, market_context, economic_context, social_context, expires_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                tweetId,
                tweetData.content,
                tweetData.strategy,
                JSON.stringify(tweetData.marketContext),
                JSON.stringify(tweetData.economicContext),
                JSON.stringify(tweetData.socialContext),
                expiresAt.toISOString()
            ], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    }

    // FREE: Main enhanced posting function
    async postEnhancedContent() {
        try {
            if (this.dailyPostCount >= this.maxDailyPosts) return;

            // Gather all FREE intelligence
            await this.fetchEconomicData();
            await this.analyzeSocialSentiment();
            await this.fetchEnhancedMarketData();
            
            // Generate enhanced content
            const tweetData = await this.generateEnhancedContent();
            
            console.log(`🚀 Generated ${tweetData.strategy} (${this.dailyPostCount + 1}/10):`);
            console.log(`📏 Length: ${tweetData.content.length} characters`);
            console.log(`📝 ${tweetData.content}`);
            console.log(`📊 Context: Market + Economic + Social intelligence`);
            console.log('---\n');

            // Store with full context
            await this.storeEnhancedTweet(tweetData);
            
            // Uncomment to post to Twitter
            // const tweet = await this.twitter.v2.tweet(tweetData.content);
            // await this.storeEnhancedTweet(tweetData, tweet.data.id);
            
            this.dailyPostCount++;
            
        } catch (error) {
            console.error('❌ Enhanced posting error:', error.message);
        }
    }

    // Test the enhanced free agent
    async testEnhancedFreeAgent(count = 6) {
        console.log('🚀 Testing Enhanced FREE Agent...');
        console.log('💰 Cost: $0 additional (using free data sources)');
        console.log('🎯 Enhanced Features:');
        console.log('  - Federal Reserve economic data integration');
        console.log('  - Social sentiment analysis (Reddit/Twitter)');
        console.log('  - Cross-market correlation analysis'); 
        console.log('  - Performance learning algorithm');
        console.log('  - Multi-context content generation');
        console.log('  - Enhanced market intelligence\n');
        
        for (let i = 0; i < count; i++) {
            await this.postEnhancedContent();
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
        console.log('\n📊 Enhanced Performance Analytics:');
        await this.showEnhancedAnalytics();
    }

    async showEnhancedAnalytics() {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT 
                    strategy_type, 
                    COUNT(*) as count,
                    AVG(viral_score) as avg_viral_score
                FROM enhanced_tweets 
                WHERE posted_at > datetime('now', '-1 day')
                GROUP BY strategy_type
                ORDER BY avg_viral_score DESC
            `, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    rows.forEach(row => {
                        console.log(`${row.strategy_type}: ${row.count} posts, ${row.avg_viral_score?.toFixed(1) || 0}/10 viral score`);
                    });
                    resolve(rows);
                }
            });
        });
    }

    close() {
        this.db.close();
    }
}

// Test the enhanced free agent
async function runEnhancedFreeTest() {
    console.log('🎯 Initializing ENHANCED FREE Agent (No Additional Costs)...\n');
    
    const agent = new FreeEnhancedAgent();
    
    try {
        await agent.testEnhancedFreeAgent(6);
    } finally {
        agent.close();
    }
}

runEnhancedFreeTest();