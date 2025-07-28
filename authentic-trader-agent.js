require('dotenv').config();
const { TwitterApi } = require('twitter-api-v2');
const cron = require('node-cron');
const sqlite3 = require('sqlite3').verbose();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const { GoogleGenerativeAI } = require('@google/generative-ai');
const path = require('path');

class AuthenticTraderAgent {
    constructor() {
        // Initialize APIs
        this.twitter = new TwitterApi({
            appKey: process.env.TWITTER_API_KEY,
            appSecret: process.env.TWITTER_API_SECRET,
            accessToken: process.env.TWITTER_ACCESS_TOKEN,
            accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
        }).readWrite;

        this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
        this.geminiModel = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });

        // State management
        this.marketData = {};
        this.newsData = [];
        this.trendingTopics = [];
        this.dailyPostCount = 0;
        this.maxDailyPosts = 10;
        
        // Initialize database
        this.dbPath = path.join(__dirname, 'authentic_trader_history.db');
        this.initializeDatabase();

        // YOUR authentic trading personality
        this.traderProfile = {
            identity: "Active day trader specializing in NQ/MNQ, ES/MES, GC/MGC, CL/MCL",
            experience: "Professional futures day trader with focus on scalping and intraday moves",
            
            // Your ACTUAL communication style from our conversation
            communication_style: {
                tone: "Direct, no-bullshit, straight to the point",
                language: "Professional but conversational - no corporate fluff, no slang", 
                approach: "Practical and results-focused - 'what does this actually do?'",
                personality: "Confident 36-year-old professional day trader",
                voice: "Straightforward professional communication"
            },

            // Your actual trading expertise  
            trading_focus: {
                primary: "Day trading futures - NQ, ES, GC, CL and their micro contracts",
                style: "Scalping, intraday momentum, risk management",
                specialty: "Psychology, risk management, technical analysis do's and don'ts",
                expertise: "Trading statistics, institutional flow, market structure"
            },

            // No fluff content approach
            content_philosophy: {
                style: "Direct insights without corporate speak",
                format: "Straight talk - like explaining to another trader",
                value: "Practical shit that actually helps traders make money",
                engagement: "Real talk that cuts through the noise"
            }
        };

        this.futuresContracts = {
            'NQ=F': { symbol: 'NQ', name: 'NASDAQ', micro: 'MNQ' },
            'ES=F': { symbol: 'ES', name: 'E-mini S&P', micro: 'MES' },
            'GC=F': { symbol: 'GC', name: 'Gold', micro: 'MGC' },
            'CL=F': { symbol: 'CL', name: 'Crude', micro: 'MCL' }
        };
    }

    initializeDatabase() {
        this.db = new sqlite3.Database(this.dbPath, (err) => {
            if (err) {
                console.error('❌ Database error:', err.message);
                return;
            }
            console.log('📊 Trader database ready');
        });

        this.db.serialize(() => {
            this.db.run(`
                CREATE TABLE IF NOT EXISTS trader_posts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tweet_id TEXT,
                    content TEXT NOT NULL,
                    post_type TEXT,
                    market_context TEXT,
                    directness_score INTEGER,
                    posted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    expires_at DATETIME
                )
            `);

            // Clean old records
            this.db.run('DELETE FROM trader_posts WHERE expires_at < datetime("now")');
        });
    }

    async fetchMarketData() {
        try {
            console.log('📊 Getting market data...');
            
            for (const [symbol, contract] of Object.entries(this.futuresContracts)) {
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
                    
                    // Day trader focused metrics
                    const closes = quotes.close.filter(c => c !== null);
                    const volumes = quotes.volume.filter(v => v !== null);
                    
                    let dayTraderMetrics = {
                        range: 0,
                        volume: 'normal',
                        momentum: 'flat',
                        setup: 'none'
                    };
                    
                    if (closes.length >= 10) {
                        // Intraday range
                        const todayHigh = Math.max(...closes.slice(-20));
                        const todayLow = Math.min(...closes.slice(-20));
                        dayTraderMetrics.range = ((todayHigh - todayLow) / currentPrice * 100).toFixed(2);
                        
                        // Volume check
                        if (volumes.length >= 10) {
                            const avgVol = volumes.slice(0, -1).reduce((sum, v) => sum + v, 0) / (volumes.length - 1);
                            const currentVol = volumes[volumes.length - 1];
                            if (currentVol > avgVol * 1.5) dayTraderMetrics.volume = 'heavy';
                            else if (currentVol < avgVol * 0.7) dayTraderMetrics.volume = 'light';
                        }
                        
                        // Simple momentum
                        const recent = closes.slice(-5);
                        if (recent[recent.length - 1] > recent[0]) dayTraderMetrics.momentum = 'up';
                        else if (recent[recent.length - 1] < recent[0]) dayTraderMetrics.momentum = 'down';
                        
                        // Basic setups
                        if (Math.abs(changePercent) > 0.5 && dayTraderMetrics.volume === 'heavy') {
                            dayTraderMetrics.setup = 'breakout';
                        } else if (dayTraderMetrics.range > 1.0) {
                            dayTraderMetrics.setup = 'range';
                        }
                    }
                    
                    this.marketData[symbol] = {
                        ...contract,
                        price: currentPrice,
                        change: change,
                        changePercent: changePercent.toFixed(2),
                        direction: change >= 0 ? 'up' : 'down',
                        metrics: dayTraderMetrics
                    };
                }
                
                await new Promise(resolve => setTimeout(resolve, 200));
            }
            
        } catch (error) {
            console.error('❌ Market data error:', error.message);
        }
    }

    // Generate content in YOUR voice
    async generateAuthenticContent(contentType) {
        try {
            const prompt = this.buildAuthenticPrompt(contentType);
            
            const result = await this.geminiModel.generateContent(prompt);
            const response = await result.response;
            const content = response.text().trim();
            
            // Remove quotes if Gemini added them
            let cleanContent = content.replace(/^["']|["']$/g, '');
            
            // Ensure Twitter compliance
            if (cleanContent.length > 280) {
                cleanContent = cleanContent.substring(0, 277) + '...';
            }
            
            return cleanContent;
            
        } catch (error) {
            console.error('❌ Gemini error:', error.message);
            return this.getFallbackContent(contentType);
        }
    }

    buildAuthenticPrompt(contentType) {
        const marketSummary = Object.entries(this.marketData).map(([symbol, data]) => {
            const m = data.metrics;
            return `${data.symbol}: $${data.price} (${data.changePercent}%, range: ${m.range}%, vol: ${m.volume}, momentum: ${m.momentum})`;
        }).join('\n');

        const baseContext = `You are writing as an experienced day trader who trades NQ/MNQ, ES/MES, GC/MGC, CL/MCL futures contracts.

YOUR COMMUNICATION STYLE (this is critical):
- Direct and professional - no unnecessary words
- No corporate bullshit or fluffy language  
- Straight to the point, practical focus
- Confident 36-year-old professional trader
- Professional but conversational tone
- No slang - clear, direct communication

Current market:
${marketSummary}

Your focus: Day trading, scalping, risk management, trading psychology, technical analysis do's and don'ts.

EXAMPLES of your direct style:
- "Stop losses don't work the way you think they do"
- "Most traders risk way too much per trade. Math doesn't lie"
- "NQ moving but ES flat? That tells you something"
- "Volume confirms price. No volume = fake move"
- "The goal is to build following, not waste time with fluff"

Create content that sounds like YOU talking, not some corporate trading account.`;

        switch (contentType) {
            case 'REALITY_CHECK':
                return `${baseContext}

Write a direct reality check about day trading that cuts through the BS. Challenge something most traders believe. Keep it real and practical. Use current market data if relevant.

Write it direct and professional - cut through the BS but stay helpful.`;

            case 'MARKET_OBSERVATION':
                return `${baseContext}

Make a direct observation about what you're seeing in the markets right now. Point out something specific that other traders might miss. 

Professional observation - direct and to the point.`;

            case 'TRADING_TIP':
                return `${baseContext}

Share a practical day trading insight. Something that actually helps someone trade better. No fluff - just useful information.

Direct, professional explanation that gets to the point.`;

            case 'PSYCHOLOGY_TRUTH':
                return `${baseContext}

Drop some truth about trading psychology. Something most traders struggle with but don't want to admit.

Professional but direct about the mental game - call out what doesn't work.`;

            case 'RISK_REALITY':
                return `${baseContext}

Talk straight about risk management. Most traders suck at this. Give them the real talk about position sizing or risk control.

No sugar coating - tell them what they need to hear.`;

            default:
                return `${baseContext}

Create direct, practical content about day trading futures. Keep it real.`;
        }
    }

    selectContentType() {
        const types = [
            { type: 'REALITY_CHECK', weight: 25 },
            { type: 'MARKET_OBSERVATION', weight: 30 },
            { type: 'TRADING_TIP', weight: 20 },
            { type: 'PSYCHOLOGY_TRUTH', weight: 15 },
            { type: 'RISK_REALITY', weight: 10 }
        ];

        const totalWeight = types.reduce((sum, t) => sum + t.weight, 0);
        let random = Math.random() * totalWeight;
        
        for (const type of types) {
            random -= type.weight;
            if (random <= 0) {
                return type.type;
            }
        }
        
        return 'MARKET_OBSERVATION';
    }

    getFallbackContent(contentType) {
        const fallbacks = {
            'REALITY_CHECK': "Most traders lose because they risk 3-5% per trade. Professionals never go above 0.5%. The math is simple.",
            'MARKET_OBSERVATION': "NQ range today tells you everything about what institutions are doing. Pay attention.",
            'TRADING_TIP': "Volume confirms price action. No volume behind the move? Don't trust it.",
            'PSYCHOLOGY_TRUTH': "Your biggest enemy isn't the market. It's your need to be right instead of profitable.",
            'RISK_REALITY': "Position size determines if you survive. Everything else is just noise."
        };
        
        return fallbacks[contentType] || fallbacks['REALITY_CHECK'];
    }

    // Calculate how direct/authentic the content is
    calculateDirectnessScore(content) {
        let score = 0;
        
        // Direct language indicators
        if (content.includes("don't") || content.includes("won't") || content.includes("can't")) score += 1;
        if (content.includes("bullshit") || content.includes("BS") || content.includes("crap")) score += 2;
        if (content.includes("most traders") || content.includes("everyone") || content.includes("people")) score += 1;
        if (content.includes("reality") || content.includes("truth") || content.includes("fact")) score += 1;
        if (content.includes("%") || content.match(/\d+%/)) score += 1; // Specific numbers
        if (content.includes("?")) score += 1; // Questions engage directly
        
        // Avoid fluffy language (negative scoring)
        if (content.includes("amazing") || content.includes("incredible") || content.includes("fantastic")) score -= 2;
        if (content.includes("journey") || content.includes("passion") || content.includes("dream")) score -= 1;
        
        return Math.max(0, Math.min(10, score));
    }

    async storeTraderPost(content, postType, directnessScore, tweetId = null) {
        return new Promise((resolve, reject) => {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);
            
            this.db.run(`
                INSERT INTO trader_posts 
                (tweet_id, content, post_type, market_context, directness_score, expires_at)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                tweetId,
                content,
                postType,
                JSON.stringify(this.marketData),
                directnessScore,
                expiresAt.toISOString()
            ], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    }

    async postAuthenticContent() {
        try {
            if (this.dailyPostCount >= this.maxDailyPosts) return;

            await this.fetchMarketData();
            
            const contentType = this.selectContentType();
            const content = await this.generateAuthenticContent(contentType);
            const directnessScore = this.calculateDirectnessScore(content);
            
            console.log(`📊 Generated ${contentType} (${this.dailyPostCount + 1}/10):`);
            console.log(`📏 Length: ${content.length} chars | Directness: ${directnessScore}/10`);
            console.log(`📝 ${content}`);
            
            const marketSummary = Object.values(this.marketData).map(d => 
                `${d.symbol}: ${d.changePercent}%`
            ).join(', ');
            console.log(`📊 Market: ${marketSummary}`);
            console.log('---\n');

            await this.storeTraderPost(content, contentType, directnessScore);
            
            // Uncomment to post to Twitter
            // const tweet = await this.twitter.v2.tweet(content);
            // await this.storeTraderPost(content, contentType, directnessScore, tweet.data.id);
            
            this.dailyPostCount++;
            
        } catch (error) {
            console.error('❌ Error:', error.message);
        }
    }

    async testAuthenticAgent(count = 8) {
        console.log('📊 Testing Authentic Day Trader Agent...');
        console.log('🎯 Your Communication Style:');
        console.log('  - Direct, no-bullshit approach');
        console.log('  - Conversational but authoritative');  
        console.log('  - Practical, results-focused');
        console.log('  - Real trader language, not corporate speak');
        console.log('  - Day trading focused: NQ/MNQ, ES/MES, GC/MGC, CL/MCL\n');
        
        for (let i = 0; i < count; i++) {
            await this.postAuthenticContent();
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        console.log('\n📊 Content Authenticity Analytics:');
        await this.showAuthenticityAnalytics();
    }

    async showAuthenticityAnalytics() {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT post_type, COUNT(*) as count, AVG(directness_score) as avg_directness
                FROM trader_posts 
                WHERE posted_at > datetime('now', '-1 day')
                GROUP BY post_type
                ORDER BY avg_directness DESC
            `, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    rows.forEach(row => {
                        console.log(`${row.post_type}: ${row.count} posts, ${row.avg_directness.toFixed(1)}/10 directness`);
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

// Test the authentic trader agent
async function runAuthenticTest() {
    console.log('🚀 Initializing Authentic Day Trader Agent...\n');
    
    const agent = new AuthenticTraderAgent();
    
    try {
        await agent.testAuthenticAgent(8);
    } finally {
        agent.close();
    }
}

runAuthenticTest();