require('dotenv').config();
const { TwitterApi } = require('twitter-api-v2');
const cron = require('node-cron');
const sqlite3 = require('sqlite3').verbose();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');

class GeminiPoweredTwitterAgent {
    constructor() {
        // Initialize APIs
        this.twitter = new TwitterApi({
            appKey: process.env.TWITTER_API_KEY,
            appSecret: process.env.TWITTER_API_SECRET,
            accessToken: process.env.TWITTER_ACCESS_TOKEN,
            accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
        }).readWrite;

        // Initialize Gemini
        this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
        this.geminiModel = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        // State management
        this.marketData = {};
        this.newsData = [];
        this.trendingTopics = [];
        this.dailyPostCount = 0;
        this.maxDailyPosts = 10;
        
        // Initialize database
        this.dbPath = path.join(__dirname, 'gemini_tweet_history.db');
        this.initializeDatabase();

        // Your trading expertise profile
        this.expertiseProfile = {
            specialization: "Futures Trading Expert & Thought Leader",
            contracts: ["NQ (NASDAQ Futures)", "ES (E-mini S&P 500)", "GC (Gold Futures)", "CL (Crude Oil Futures)"],
            expertise_areas: [
                "Advanced Trading Psychology & Behavioral Finance",
                "Quantitative Risk Management & Position Sizing",
                "Technical Analysis & Volume Profile Trading", 
                "Cross-Market Correlation Analysis",
                "Statistical Trading Edges & Backtesting",
                "Institutional Order Flow Analysis"
            ],
            personality: {
                tone: "Authoritative yet approachable",
                style: "Data-driven with contrarian insights",
                voice: "Professional trader sharing insider knowledge",
                approach: "Challenge conventional wisdom with evidence"
            },
            content_goals: {
                primary: "Build massive Twitter following through viral insights",
                secondary: "Establish authority in futures trading education",
                engagement: "Controversial takes backed by statistics"
            }
        };

        this.futuresContracts = {
            'NQ=F': { symbol: 'NQ', name: 'NASDAQ Futures', multiplier: 20, tickValue: 5 },
            'ES=F': { symbol: 'ES', name: 'E-mini S&P 500', multiplier: 50, tickValue: 12.50 },
            'GC=F': { symbol: 'GC', name: 'Gold Futures', multiplier: 100, tickValue: 10 },
            'CL=F': { symbol: 'CL', name: 'Crude Oil Futures', multiplier: 1000, tickValue: 10 }
        };
    }

    initializeDatabase() {
        this.db = new sqlite3.Database(this.dbPath, (err) => {
            if (err) {
                console.error('❌ Database error:', err.message);
                return;
            }
            console.log('🧠 Gemini-powered database ready');
        });

        this.db.serialize(() => {
            this.db.run(`
                CREATE TABLE IF NOT EXISTS gemini_tweets (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tweet_id TEXT,
                    content TEXT NOT NULL,
                    content_strategy TEXT,
                    gemini_prompt TEXT,
                    viral_score INTEGER DEFAULT 0,
                    engagement_prediction TEXT,
                    market_context TEXT,
                    trending_hooks TEXT,
                    posted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    expires_at DATETIME
                )
            `);

            this.db.run(`
                CREATE TABLE IF NOT EXISTS viral_patterns (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    pattern_type TEXT,
                    engagement_rate REAL,
                    viral_elements TEXT,
                    success_factors TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Clean old records
            this.db.run('DELETE FROM gemini_tweets WHERE expires_at < datetime("now")');
        });
    }

    // Enhanced trending topic analysis
    async fetchTrendingIntelligence() {
        try {
            // Simulate advanced trending analysis (in production: Twitter API, Google Trends, etc.)
            this.trendingTopics = [
                { 
                    topic: "#AI", 
                    momentum: 0.85, 
                    relevance: 0.8, 
                    hook: "AI trading algorithms vs human psychology",
                    viral_potential: "HIGH"
                },
                { 
                    topic: "#Inflation", 
                    momentum: 0.9, 
                    relevance: 0.95, 
                    hook: "Inflation data affecting futures markets",
                    viral_potential: "VERY_HIGH"
                },
                { 
                    topic: "#TechEarnings", 
                    momentum: 0.75, 
                    relevance: 0.8, 
                    hook: "Tech earnings impact on NQ futures",
                    viral_potential: "HIGH"
                },
                { 
                    topic: "#MarketCrash", 
                    momentum: 0.7, 
                    relevance: 0.9, 
                    hook: "How pros position during market fear",
                    viral_potential: "EXTREME"
                },
                { 
                    topic: "#BitcoinETF", 
                    momentum: 0.8, 
                    relevance: 0.6, 
                    hook: "Crypto correlation with futures markets",
                    viral_potential: "HIGH"
                }
            ];
            
            console.log(`📊 Identified ${this.trendingTopics.length} viral opportunities`);
        } catch (error) {
            console.error('❌ Trending analysis error:', error.message);
        }
    }

    // Enhanced market data with context
    async fetchMarketIntelligence() {
        try {
            console.log('📈 Gathering market intelligence...');
            
            for (const [symbol, contract] of Object.entries(this.futuresContracts)) {
                const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1h&range=3d`;
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
                    
                    // Advanced market intelligence
                    const closes = quotes.close.filter(c => c !== null).slice(-72); // 72 hours
                    const volumes = quotes.volume.filter(v => v !== null).slice(-24);
                    const highs = quotes.high.filter(h => h !== null).slice(-24);
                    const lows = quotes.low.filter(l => l !== null).slice(-24);
                    
                    let intelligence = {
                        volatility: 0,
                        momentum: 0,
                        trend_strength: 'NEUTRAL',
                        volume_profile: 'NORMAL',
                        key_levels: [],
                        market_regime: 'CONSOLIDATION',
                        institutional_signals: [],
                        risk_factors: []
                    };
                    
                    if (closes.length >= 20) {
                        // Volatility calculation (annualized)
                        const returns = closes.slice(1).map((close, i) => Math.log(close / closes[i]));
                        intelligence.volatility = Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length) * Math.sqrt(252) * 100;
                        
                        // Momentum analysis
                        const sma20 = closes.slice(-20).reduce((sum, c) => sum + c, 0) / 20;
                        const sma50 = closes.length >= 50 ? closes.slice(-50).reduce((sum, c) => sum + c, 0) / 50 : sma20;
                        intelligence.momentum = ((currentPrice - sma20) / sma20) * 100;
                        
                        // Trend strength
                        if (intelligence.momentum > 2) intelligence.trend_strength = 'STRONG_BULLISH';
                        else if (intelligence.momentum > 0.5) intelligence.trend_strength = 'BULLISH';
                        else if (intelligence.momentum < -2) intelligence.trend_strength = 'STRONG_BEARISH';
                        else if (intelligence.momentum < -0.5) intelligence.trend_strength = 'BEARISH';
                        
                        // Volume analysis
                        if (volumes.length > 10) {
                            const avgVolume = volumes.slice(0, -1).reduce((sum, v) => sum + v, 0) / (volumes.length - 1);
                            const currentVolume = volumes[volumes.length - 1];
                            const volumeRatio = currentVolume / avgVolume;
                            
                            if (volumeRatio > 2) intelligence.volume_profile = 'EXTREME_HIGH';
                            else if (volumeRatio > 1.5) intelligence.volume_profile = 'HIGH';
                            else if (volumeRatio < 0.5) intelligence.volume_profile = 'LOW';
                            
                            // Institutional signals
                            if (volumeRatio > 1.8 && Math.abs(changePercent) > 1) {
                                intelligence.institutional_signals.push('LARGE_BLOCK_ACTIVITY');
                            }
                        }
                        
                        // Key levels
                        const recentHigh = Math.max(...highs);
                        const recentLow = Math.min(...lows);
                        intelligence.key_levels = [
                            { 
                                level: recentHigh, 
                                type: 'RESISTANCE', 
                                distance: ((recentHigh - currentPrice) / currentPrice * 100).toFixed(2)
                            },
                            { 
                                level: recentLow, 
                                type: 'SUPPORT', 
                                distance: ((currentPrice - recentLow) / currentPrice * 100).toFixed(2)
                            }
                        ];
                        
                        // Market regime detection
                        if (intelligence.volatility > 30) intelligence.market_regime = 'HIGH_VOLATILITY';
                        else if (intelligence.volatility < 15) intelligence.market_regime = 'LOW_VOLATILITY';
                        else if (Math.abs(intelligence.momentum) > 3) intelligence.market_regime = 'TRENDING';
                    }
                    
                    this.marketData[symbol] = {
                        ...contract,
                        price: currentPrice,
                        change: change,
                        changePercent: changePercent.toFixed(2),
                        direction: change >= 0 ? 'BULLISH' : 'BEARISH',
                        intelligence: intelligence
                    };
                }
                
                await new Promise(resolve => setTimeout(resolve, 300));
            }
            
        } catch (error) {
            console.error('❌ Market intelligence error:', error.message);
        }
    }

    // Generate viral content with Gemini
    async generateGeminiContent(strategy, marketContext, trendingContext = null) {
        try {
            const prompt = this.buildGeminiPrompt(strategy, marketContext, trendingContext);
            
            const result = await this.geminiModel.generateContent(prompt);
            const response = await result.response;
            const content = response.text().trim();
            
            // Ensure Twitter compliance
            if (content.length > 280) {
                return content.substring(0, 277) + '...';
            }
            
            return content;
            
        } catch (error) {
            console.error('❌ Gemini API error:', error.message);
            return this.getFallbackContent(strategy);
        }
    }

    // Build sophisticated Gemini prompts
    buildGeminiPrompt(strategy, marketContext, trendingContext) {
        const marketSummary = Object.entries(marketContext).map(([symbol, data]) => {
            const intel = data.intelligence;
            return `${data.symbol}: $${data.price} (${data.changePercent}%, Vol: ${intel.volatility.toFixed(1)}%, Trend: ${intel.trend_strength}, Regime: ${intel.market_regime})`;
        }).join('\n');
        
        const trendingInfo = trendingContext ? 
            `\nTRENDING OPPORTUNITY: ${trendingContext.topic} (Momentum: ${trendingContext.momentum}, Viral Potential: ${trendingContext.viral_potential})\nConnection Hook: ${trendingContext.hook}` : '';

        const baseContext = `You are a legendary futures trading expert with 15+ years experience trading NQ, ES, GC, and CL contracts. Your Twitter has 100K+ followers who respect your contrarian insights and statistical edge.

PERSONALITY: Confident thought leader who challenges conventional wisdom with hard data. You're known for controversial takes that prove correct. Your followers trust your analysis because you back everything with statistics and real market experience.

CURRENT MARKET INTELLIGENCE:
${marketSummary}

YOUR EXPERTISE FOCUS:
- Advanced trading psychology & risk management
- Statistical edges & probability-based trading
- Institutional flow analysis & volume profile
- Cross-market correlations & regime changes
- Contrarian market positioning

VIRAL CONTENT STRATEGY: Create content that gets shared, saves, and replies. Use controversy, statistics, and insider insights.${trendingInfo}`;

        switch (strategy) {
            case 'VIRAL_CONTROVERSY':
                return `${baseContext}

CREATE: A controversial but accurate trading statement that will generate massive engagement. Include specific statistics that shock people. Use contrarian insight that challenges what 90% of traders believe.

EXAMPLES OF YOUR STYLE:
- "90% of futures traders lose money not because they can't read charts, but because they risk 3-5% per trade. Math: 20 consecutive losses at 5% = -64% account destruction. Professionals never exceed 0.5% risk."
- "Stop losses don't protect you—they feed the algorithms. When 80% of retail stops cluster at obvious levels, smart money hunts them. Better strategy: position size so small you can mentally handle 20% against you."

Generate similar hard-hitting content with current market data. Make it controversial enough to get quote tweets arguing with you. Keep under 280 characters.`;

            case 'STATISTICAL_EDGE':
                return `${baseContext}

CREATE: A specific statistical insight about futures trading that demonstrates your edge. Include exact percentages, probabilities, or backtested results. Make it valuable enough to bookmark.

FOCUS: Use current market data to highlight a statistical pattern most traders miss. Show them the math behind professional trading.

Generate insider statistical knowledge that proves your expertise. Include specific numbers and probabilities.`;

            case 'THREAD_VIRAL':
                return `${baseContext}

CREATE: An opening tweet for a viral educational thread. Make it so intriguing that people MUST read the rest. Use a counterintuitive hook that challenges everything they think they know.

FORMAT: Start with "🧵 [SHOCKING STATEMENT]" and end with "1/X"

THREAD TOPICS: Psychology of losing, why most strategies fail, institutional vs retail behavior, statistical realities of trading.

Make the hook irresistible. Promise to reveal secrets that will change how they think about trading.`;

            case 'TREND_DOMINATION':
                return `${baseContext}

CREATE: Content that naturally incorporates the trending topic while showcasing your futures expertise. Don't force it—find the genuine connection. Use the trending hashtag naturally.

Make your insight so valuable that people following the trend discover you and follow for more futures wisdom. This is your chance to capture new audience from trending traffic.`;

            case 'MARKET_PROPHET':
                return `${baseContext}

CREATE: Sharp commentary on current market conditions that positions you as the expert who "called it." Reference specific levels, volatility readings, or patterns. Sound like you have inside information.

Use current market data to make a bold but calculated prediction. Make people think "this person knows something."`;

            case 'EDUCATIONAL_FIRE':
                return `${baseContext}

CREATE: An educational insight so valuable that people screenshot it. Teach something specific that immediately makes them better traders. Use current market conditions as the example.

Make it practical, actionable, and immediately useful. This is how you build a following of serious traders who see real value in your content.`;

            default:
                return `${baseContext}

Create engaging futures trading content that showcases your expertise and builds massive Twitter following. Be controversial, specific, and valuable.`;
        }
    }

    // Strategic content type selector
    selectViralStrategy() {
        const strategies = [
            { type: 'VIRAL_CONTROVERSY', weight: 20, description: 'Controversial take that generates discussion' },
            { type: 'STATISTICAL_EDGE', weight: 25, description: 'Data-driven insight with specific numbers' },
            { type: 'EDUCATIONAL_FIRE', weight: 20, description: 'High-value teaching content' },
            { type: 'MARKET_PROPHET', weight: 15, description: 'Authoritative market commentary' },
            { type: 'THREAD_VIRAL', weight: 10, description: 'Thread opener for viral growth' },
            { type: 'TREND_DOMINATION', weight: 10, description: 'Hijack trending topics' }
        ];

        // Boost trend strategy if high viral potential trending topic exists
        const extremeViralTrends = this.trendingTopics.filter(t => t.viral_potential === 'EXTREME' || t.viral_potential === 'VERY_HIGH');
        if (extremeViralTrends.length > 0 && Math.random() < 0.5) {
            return { 
                type: 'TREND_DOMINATION', 
                trendingContext: extremeViralTrends[0] 
            };
        }

        // Weighted random selection
        const totalWeight = strategies.reduce((sum, s) => sum + s.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const strategy of strategies) {
            random -= strategy.weight;
            if (random <= 0) {
                return { type: strategy.type };
            }
        }
        
        return { type: 'STATISTICAL_EDGE' };
    }

    // Fallback content when API unavailable
    getFallbackContent(strategy) {
        const fallbacks = {
            'VIRAL_CONTROVERSY': "Position size separates winners from losers. Most risk 3-5% per trade = guaranteed failure. Professionals never exceed 0.5%. The math is brutal.",
            'STATISTICAL_EDGE': "NQ/ES spread >0.6% mean-reverts within 3 sessions 81% of the time. Current spread creates statistical opportunity. Math beats emotion.",
            'THREAD_VIRAL': "🧵 Why 90% of futures traders fail (it's not what you think) 1/8",
            'MARKET_PROPHET': "Current volatility spike in NQ signals institutional repositioning. Smart money preparing for next move while retail chases yesterday's trend.",
            'EDUCATIONAL_FIRE': "Volume Profile secret: POC acts as price magnet 87% during RTH. When futures deviate >2%, expect return within 48 hours. Institutional behavior."
        };
        
        return fallbacks[strategy] || fallbacks['STATISTICAL_EDGE'];
    }

    // Store Gemini-generated tweet
    async storeGeminiTweet(content, strategy, prompt, viralScore, tweetId = null) {
        return new Promise((resolve, reject) => {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);
            
            this.db.run(`
                INSERT INTO gemini_tweets 
                (tweet_id, content, content_strategy, gemini_prompt, viral_score, market_context, trending_hooks, expires_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                tweetId,
                content,
                strategy,
                prompt.substring(0, 500),
                viralScore,
                JSON.stringify(this.marketData),
                JSON.stringify(this.trendingTopics),
                expiresAt.toISOString()
            ], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    }

    // Calculate viral potential score
    calculateViralScore(content, strategy, trendingContext) {
        let score = 0;
        
        // Content factors
        if (content.includes('%') || content.match(/\d+%/)) score += 2; // Statistics
        if (content.includes('🧵') || content.includes('1/')) score += 3; // Thread format
        if (content.toLowerCase().includes('controversial') || content.toLowerCase().includes('unpopular')) score += 2;
        if (content.includes('$') || content.match(/\d+K|\d+M/)) score += 1; // Financial numbers
        if (content.includes('#')) score += 1; // Hashtags
        
        // Strategy factors
        const strategyScores = {
            'VIRAL_CONTROVERSY': 4,
            'THREAD_VIRAL': 4,
            'TREND_DOMINATION': 3,
            'STATISTICAL_EDGE': 2,
            'MARKET_PROPHET': 2,
            'EDUCATIONAL_FIRE': 1
        };
        score += strategyScores[strategy] || 0;
        
        // Trending boost
        if (trendingContext && trendingContext.viral_potential === 'EXTREME') score += 3;
        else if (trendingContext && trendingContext.viral_potential === 'VERY_HIGH') score += 2;
        
        return Math.min(score, 10); // Cap at 10
    }

    // Main Gemini-powered content generation
    async postGeminiContent() {
        try {
            if (this.dailyPostCount >= this.maxDailyPosts) return;

            // Gather intelligence
            await this.fetchTrendingIntelligence();
            await this.fetchMarketIntelligence();
            
            // Select viral strategy
            const strategy = this.selectViralStrategy();
            
            // Generate content with Gemini
            const content = await this.generateGeminiContent(
                strategy.type, 
                this.marketData, 
                strategy.trendingContext
            );

            // Calculate viral potential
            const viralScore = this.calculateViralScore(content, strategy.type, strategy.trendingContext);
            
            console.log(`🧠 Generated ${strategy.type} (${this.dailyPostCount + 1}/10):`);
            console.log(`📏 Length: ${content.length} chars | Viral Score: ${viralScore}/10`);
            console.log(`📝 ${content}`);
            
            if (strategy.trendingContext) {
                console.log(`🔥 Trend: ${strategy.trendingContext.topic} (${strategy.trendingContext.viral_potential})`);
            }
            
            const marketSummary = Object.values(this.marketData).map(d => 
                `${d.symbol}: ${d.changePercent}% (${d.intelligence.trend_strength})`
            ).join(', ');
            console.log(`📊 Market: ${marketSummary}`);
            console.log('---\n');

            // Store with viral analytics
            await this.storeGeminiTweet(content, strategy.type, 'Generated by Gemini', viralScore);
            
            // Uncomment to post to Twitter
            // const tweet = await this.twitter.v2.tweet(content);
            // await this.storeGeminiTweet(content, strategy.type, 'Posted', viralScore, tweet.data.id);
            
            this.dailyPostCount++;
            
        } catch (error) {
            console.error('❌ Gemini generation error:', error.message);
        }
    }

    // Test the Gemini agent
    async testGeminiAgent(count = 8) {
        console.log('🧠 Testing Gemini-Powered Twitter Growth Agent...');
        console.log('🚀 Google AI Features:');
        console.log('  - Viral content optimization with Gemini');
        console.log('  - Advanced trending topic analysis');
        console.log('  - Statistical edge highlighting');
        console.log('  - Controversial take generation');
        console.log('  - Thread creation for viral growth');
        console.log('  - Market intelligence integration\n');
        
        for (let i = 0; i < count; i++) {
            await this.postGeminiContent();
            await new Promise(resolve => setTimeout(resolve, 2500));
        }
        
        // Show viral analytics
        console.log('\n🔥 Viral Content Analytics:');
        await this.showViralAnalytics();
    }

    async showViralAnalytics() {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT content_strategy, COUNT(*) as count, AVG(viral_score) as avg_viral_score
                FROM gemini_tweets 
                WHERE posted_at > datetime('now', '-1 day')
                GROUP BY content_strategy
                ORDER BY avg_viral_score DESC
            `, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    rows.forEach(row => {
                        console.log(`${row.content_strategy}: ${row.count} posts, ${row.avg_viral_score.toFixed(1)}/10 viral score`);
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

// Test the Gemini agent
async function runGeminiTest() {
    console.log('🚀 Initializing Gemini-Powered Twitter Growth Engine...\n');
    
    // Check API key
    if (!process.env.GOOGLE_AI_API_KEY || process.env.GOOGLE_AI_API_KEY === 'your_gemini_api_key_here') {
        console.log('⚠️  GEMINI API KEY NEEDED:');
        console.log('1. Go to: https://makersuite.google.com/app/apikey');
        console.log('2. Create/login to Google account');
        console.log('3. Generate API key');
        console.log('4. Add to .env: GOOGLE_AI_API_KEY=your_key_here');
        console.log('\n📝 Running with fallback content for demo...\n');
    }
    
    const agent = new GeminiPoweredTwitterAgent();
    
    try {
        await agent.testGeminiAgent(8);
    } finally {
        agent.close();
    }
}

runGeminiTest();