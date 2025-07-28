require('dotenv').config();
const { TwitterApi } = require('twitter-api-v2');
const cron = require('node-cron');
const sqlite3 = require('sqlite3').verbose();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const Anthropic = require('@anthropic-ai/sdk');
const path = require('path');

class ClaudePoweredTwitterAgent {
    constructor() {
        // Initialize APIs
        this.twitter = new TwitterApi({
            appKey: process.env.TWITTER_API_KEY,
            appSecret: process.env.TWITTER_API_SECRET,
            accessToken: process.env.TWITTER_ACCESS_TOKEN,
            accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
        }).readWrite;

        this.claude = new Anthropic({
            apiKey: process.env.ANTHROPIC_API_KEY,
        });

        // State management
        this.marketData = {};
        this.newsData = [];
        this.trendingTopics = [];
        this.dailyPostCount = 0;
        this.maxDailyPosts = 10;
        
        // Initialize database
        this.dbPath = path.join(__dirname, 'claude_tweet_history.db');
        this.initializeDatabase();

        // Your expertise profile for Claude
        this.expertiseProfile = {
            specialization: "Futures Trading Specialist",
            contracts: ["NQ (NASDAQ)", "ES (E-mini S&P 500)", "GC (Gold)", "CL (Crude Oil)"],
            expertise_areas: [
                "Trading Psychology & Risk Management",
                "Technical Analysis & Volume Profile",
                "Cross-Market Analysis & Correlations", 
                "Statistical Trading Edges",
                "Institutional Flow Analysis",
                "Options/Futures Spreads"
            ],
            personality: {
                tone: "Professional yet accessible",
                style: "Data-driven with specific statistics",
                approach: "Contrarian insights that challenge conventional wisdom",
                voice: "Confident thought leader who backs claims with evidence"
            },
            follower_goals: {
                target_audience: "Serious traders seeking edge",
                growth_strategy: "Educational content + controversial takes",
                engagement_tactics: "Statistical insights + specific examples"
            }
        };

        this.futuresContracts = {
            'NQ=F': { symbol: 'NQ', name: 'NASDAQ', multiplier: 20 },
            'ES=F': { symbol: 'ES', name: 'E-mini S&P 500', multiplier: 50 },
            'GC=F': { symbol: 'GC', name: 'Gold', multiplier: 100 },
            'CL=F': { symbol: 'CL', name: 'Crude Oil', multiplier: 1000 }
        };
    }

    initializeDatabase() {
        this.db = new sqlite3.Database(this.dbPath, (err) => {
            if (err) {
                console.error('❌ Database error:', err.message);
                return;
            }
            console.log('🤖 Claude-powered database ready');
        });

        this.db.serialize(() => {
            this.db.run(`
                CREATE TABLE IF NOT EXISTS claude_tweets (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tweet_id TEXT,
                    content TEXT NOT NULL,
                    content_type TEXT,
                    claude_prompt TEXT,
                    engagement_score INTEGER DEFAULT 0,
                    market_context TEXT,
                    trending_context TEXT,
                    posted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    expires_at DATETIME
                )
            `);

            this.db.run(`
                CREATE TABLE IF NOT EXISTS performance_analytics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    content_type TEXT,
                    avg_engagement REAL,
                    best_performing_elements TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Clean old records
            this.db.run('DELETE FROM claude_tweets WHERE expires_at < datetime("now")');
        });
    }

    // Fetch trending topics for content inspiration
    async fetchTrendingTopics() {
        try {
            // Simulate trending topics analysis (in production, use Twitter API trends)
            this.trendingTopics = [
                { topic: "#AI", relevance: 0.8, connection: "AI trading algorithms, machine learning in markets" },
                { topic: "#Inflation", relevance: 0.9, connection: "Fed policy, gold correlation, market impacts" },
                { topic: "#TechEarnings", relevance: 0.7, connection: "NASDAQ futures, sector rotation signals" },
                { topic: "#Recession", relevance: 0.85, connection: "Safe haven flows, risk management strategies" },
                { topic: "#CryptoRegulation", relevance: 0.6, connection: "Risk-on sentiment, correlation breakdown" }
            ];
            
            console.log(`📈 Identified ${this.trendingTopics.length} trending opportunities`);
        } catch (error) {
            console.error('❌ Trending topics error:', error.message);
        }
    }

    // Enhanced market data collection
    async fetchMarketDataForClaude() {
        try {
            console.log('📊 Collecting market intelligence for Claude...');
            
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
                    
                    // Advanced metrics for Claude analysis
                    const closes = quotes.close.filter(c => c !== null).slice(-48); // 48 hours
                    const volumes = quotes.volume.filter(v => v !== null).slice(-24);
                    
                    let insights = {
                        volatility: 0,
                        momentum: 0,
                        volumeAnomaly: false,
                        keyLevels: [],
                        institutionalSignals: []
                    };
                    
                    if (closes.length >= 20) {
                        // Volatility calculation
                        const returns = closes.slice(1).map((close, i) => Math.log(close / closes[i]));
                        insights.volatility = Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length) * Math.sqrt(252) * 100;
                        
                        // Momentum analysis
                        const sma20 = closes.slice(-20).reduce((sum, c) => sum + c, 0) / 20;
                        insights.momentum = ((currentPrice - sma20) / sma20) * 100;
                        
                        // Volume analysis
                        if (volumes.length > 10) {
                            const avgVolume = volumes.slice(0, -1).reduce((sum, v) => sum + v, 0) / (volumes.length - 1);
                            const currentVolume = volumes[volumes.length - 1];
                            insights.volumeAnomaly = currentVolume > avgVolume * 1.5;
                        }
                        
                        // Key levels (simplified)
                        const recentHigh = Math.max(...closes.slice(-10));
                        const recentLow = Math.min(...closes.slice(-10));
                        insights.keyLevels = [
                            { level: recentHigh, type: 'resistance', distance: ((recentHigh - currentPrice) / currentPrice * 100).toFixed(2) },
                            { level: recentLow, type: 'support', distance: ((currentPrice - recentLow) / currentPrice * 100).toFixed(2) }
                        ];
                    }
                    
                    this.marketData[symbol] = {
                        ...contract,
                        price: currentPrice,
                        change: change,
                        changePercent: changePercent.toFixed(2),
                        direction: change >= 0 ? 'UP' : 'DOWN',
                        insights: insights
                    };
                }
                
                await new Promise(resolve => setTimeout(resolve, 300));
            }
            
        } catch (error) {
            console.error('❌ Market data error:', error.message);
        }
    }

    // Generate content with Claude AI
    async generateClaudeContent(contentType, marketContext, trendingContext = null) {
        try {
            const prompt = this.buildClaudePrompt(contentType, marketContext, trendingContext);
            
            const response = await this.claude.messages.create({
                model: 'claude-3-haiku-20240307',
                max_tokens: 300,
                messages: [{
                    role: 'user',
                    content: prompt
                }]
            });

            const content = response.content[0].text.trim();
            
            // Ensure content fits Twitter limits
            if (content.length > 280) {
                return content.substring(0, 277) + '...';
            }
            
            return content;
            
        } catch (error) {
            console.error('❌ Claude API error:', error.message);
            return this.getFallbackContent(contentType);
        }
    }

    // Build sophisticated prompts for Claude
    buildClaudePrompt(contentType, marketContext, trendingContext) {
        const baseContext = `You are a professional futures trading expert specializing in NQ, ES, GC, and CL contracts. 
Your personality: Data-driven thought leader who challenges conventional wisdom with specific statistics and contrarian insights.
Your goal: Create engaging Twitter content that builds authority and grows following among serious traders.

Current Market Context:
${Object.entries(marketContext).map(([symbol, data]) => 
    `${data.symbol}: $${data.price} (${data.changePercent}%, Vol: ${data.insights.volatility.toFixed(1)}%)`
).join('\n')}

Your expertise areas: Trading psychology, risk management, statistical edges, institutional flow analysis, cross-market correlations.`;

        const trendingInfo = trendingContext ? 
            `\nTrending Topic Context: ${trendingContext.topic} - ${trendingContext.connection}` : '';

        switch (contentType) {
            case 'VIRAL_INSIGHT':
                return `${baseContext}${trendingInfo}

Create a controversial but accurate trading insight that will generate discussion. Include specific statistics or percentages. Format for maximum engagement. Keep under 280 characters.

Examples of your style:
- "90% of futures traders lose money because they risk 3% per trade. Math: 20 losses = -45% account. Professionals risk 0.5% = -9% drawdown."
- "NQ/ES spread >0.6% mean-reverts 81% within 3 sessions. Current: [data]. Trade probabilities, not predictions."

Generate similar high-impact content with current market data.`;

            case 'THREAD_OPENER':
                return `${baseContext}${trendingInfo}

Create the opening tweet for an educational thread about futures trading. Make it intriguing enough that people want to read the rest. Include "🧵" and "1/X" format. Focus on a counterintuitive insight that challenges common beliefs.

Thread topic ideas: Psychology of drawdowns, Statistical edges in futures, Why most traders fail, Institutional vs retail behavior.`;

            case 'TREND_HIJACK':
                return `${baseContext}${trendingInfo}

Connect the trending topic to futures trading in a natural, valuable way. Don't force it - find genuine connections. Provide unique insight that only a futures expert would know. Use the trending hashtag naturally.`;

            case 'MARKET_COMMENTARY':
                return `${baseContext}

Provide sharp, professional commentary on current market conditions. Focus on what most traders are missing. Include specific price levels, statistical probabilities, or institutional behavior patterns. Be contrarian but accurate.`;

            case 'EDUCATIONAL_NUGGET':
                return `${baseContext}

Share a specific, actionable trading insight that demonstrates your expertise. Include numbers, percentages, or concrete examples. Make it valuable enough to save/share. Focus on psychology, risk management, or statistical edges.`;

            default:
                return `${baseContext}

Create engaging futures trading content that showcases your expertise and builds authority. Be specific, data-driven, and contrarian when appropriate.`;
        }
    }

    // Fallback content when Claude is unavailable
    getFallbackContent(contentType) {
        const fallbacks = {
            'VIRAL_INSIGHT': "Position size determines survival rate. Most risk 3-5% per trade and wonder why they fail. Professionals never exceed 0.5%. The math is brutal but simple.",
            'THREAD_OPENER': "🧵 Why 90% of futures traders fail (and it's not what you think) 1/8",
            'MARKET_COMMENTARY': "Markets reward patience and punish emotion. Today's volatility is tomorrow's opportunity for the prepared trader.",
            'EDUCATIONAL_NUGGET': "Volume Profile secret: POC acts as price magnet 87% of the time during RTH. When futures deviate >2%, expect return within 48 hours."
        };
        
        return fallbacks[contentType] || fallbacks['EDUCATIONAL_NUGGET'];
    }

    // Advanced content strategy selector
    selectContentStrategy() {
        const strategies = [
            { type: 'VIRAL_INSIGHT', weight: 25, description: 'Controversial take with statistics' },
            { type: 'EDUCATIONAL_NUGGET', weight: 30, description: 'Specific trading insight' },
            { type: 'MARKET_COMMENTARY', weight: 20, description: 'Current market analysis' },
            { type: 'THREAD_OPENER', weight: 15, description: 'Multi-tweet educational series' },
            { type: 'TREND_HIJACK', weight: 10, description: 'Connect trending topic to trading' }
        ];

        // Check for high-relevance trending topics
        const highRelevanceTrends = this.trendingTopics.filter(t => t.relevance > 0.8);
        if (highRelevanceTrends.length > 0 && Math.random() < 0.4) {
            return { 
                type: 'TREND_HIJACK', 
                trendingContext: highRelevanceTrends[0] 
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
        
        return { type: 'EDUCATIONAL_NUGGET' };
    }

    // Store tweet with Claude metadata
    async storeClaudeTweet(content, contentType, claudePrompt, tweetId = null) {
        return new Promise((resolve, reject) => {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);
            
            this.db.run(`
                INSERT INTO claude_tweets 
                (tweet_id, content, content_type, claude_prompt, market_context, trending_context, expires_at)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            `, [
                tweetId,
                content,
                contentType,
                claudePrompt.substring(0, 500), // Store truncated prompt
                JSON.stringify(this.marketData),
                JSON.stringify(this.trendingTopics),
                expiresAt.toISOString()
            ], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    }

    // Main content generation and posting
    async postClaudePoweredContent() {
        try {
            if (this.dailyPostCount >= this.maxDailyPosts) return;

            // Gather all context
            await this.fetchTrendingTopics();
            await this.fetchMarketDataForClaude();
            
            // Select content strategy
            const strategy = this.selectContentStrategy();
            
            // Generate content with Claude
            const content = await this.generateClaudeContent(
                strategy.type, 
                this.marketData, 
                strategy.trendingContext
            );
            
            console.log(`🤖 Generated ${strategy.type} (${this.dailyPostCount + 1}/10):`);
            console.log(`📏 Length: ${content.length} characters`);
            console.log(`📝 ${content}`);
            
            if (strategy.trendingContext) {
                console.log(`📈 Trend: ${strategy.trendingContext.topic} (${strategy.trendingContext.relevance})`);
            }
            
            const marketSummary = Object.values(this.marketData).map(d => 
                `${d.symbol}: ${d.changePercent}%`
            ).join(', ');
            console.log(`📊 Market: ${marketSummary}`);
            console.log('---\n');

            // Store in database
            await this.storeClaudeTweet(content, strategy.type, 'Generated by Claude API');
            
            // Uncomment to actually post to Twitter
            // const tweet = await this.twitter.v2.tweet(content);
            // await this.storeClaudeTweet(content, strategy.type, 'Posted to Twitter', tweet.data.id);
            // console.log(`🆔 Posted: ${tweet.data.id}`);
            
            this.dailyPostCount++;
            
        } catch (error) {
            console.error('❌ Error in Claude-powered posting:', error.message);
        }
    }

    // Test the Claude-powered agent
    async testClaudeAgent(count = 6) {
        console.log('🤖 Testing Claude-Powered Twitter Growth Agent...');
        console.log('🚀 Advanced AI Features:');
        console.log('  - Dynamic content generation with Claude');
        console.log('  - Trending topic integration');
        console.log('  - Viral content optimization');
        console.log('  - Thread generation capability');
        console.log('  - Market context awareness');
        console.log('  - Strategic content distribution\n');
        
        for (let i = 0; i < count; i++) {
            await this.postClaudePoweredContent();
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
        // Show content type distribution
        console.log('\n📊 Content Strategy Distribution:');
        await this.showContentAnalytics();
    }

    async showContentAnalytics() {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT content_type, COUNT(*) as count
                FROM claude_tweets 
                WHERE posted_at > datetime('now', '-1 day')
                GROUP BY content_type
                ORDER BY count DESC
            `, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    rows.forEach(row => {
                        console.log(`${row.content_type}: ${row.count} posts`);
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

// Test the Claude-powered agent
async function runClaudeTest() {
    console.log('🚀 Initializing Claude-Powered Twitter Growth Agent...\n');
    
    // Check if Claude API key is configured
    if (!process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY === 'your_claude_api_key_here') {
        console.log('⚠️  CLAUDE API KEY NEEDED:');
        console.log('1. Go to: https://console.anthropic.com/');
        console.log('2. Create account and get API key');
        console.log('3. Add to .env file: ANTHROPIC_API_KEY=your_key_here');
        console.log('\n📝 Running with fallback content for demo...\n');
    }
    
    const agent = new ClaudePoweredTwitterAgent();
    
    try {
        await agent.testClaudeAgent(8);
    } finally {
        agent.close();
    }
}

runClaudeTest();