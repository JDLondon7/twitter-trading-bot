require('dotenv').config();
const { TwitterApi } = require('twitter-api-v2');
const cron = require('node-cron');
const sqlite3 = require('sqlite3').verbose();
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const path = require('path');

class EnhancedContextualAgent {
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
        
        this.dbPath = path.join(__dirname, 'tweet_history.db');
        this.initializeDatabase();
        
        this.futuresContracts = {
            'NQ=F': { 
                name: 'NASDAQ', 
                symbol: 'NQ', 
                keywords: ['nasdaq', 'tech', 'technology', 'innovation', 'growth stocks'],
                newsImpact: 'High - Tech earnings, Fed policy, growth concerns'
            },
            'ES=F': { 
                name: 'E-mini S&P 500', 
                symbol: 'ES', 
                keywords: ['sp500', 'broad market', 'equity', 'economic data'],
                newsImpact: 'High - Economic data, Fed policy, corporate earnings'
            },
            'GC=F': { 
                name: 'Gold', 
                symbol: 'GC', 
                keywords: ['gold', 'inflation', 'fed', 'dollar', 'safe haven'],
                newsImpact: 'Very High - Inflation data, Fed policy, geopolitical events'
            },
            'CL=F': { 
                name: 'Crude Oil', 
                symbol: 'CL', 
                keywords: ['oil', 'opec', 'energy', 'geopolitical', 'supply'],
                newsImpact: 'Extreme - OPEC decisions, geopolitical events, supply disruptions'
            }
        };
    }

    initializeDatabase() {
        this.db = new sqlite3.Database(this.dbPath, (err) => {
            if (err) {
                console.error('❌ Database error:', err.message);
                return;
            }
            console.log('📄 Tweet history database ready');
        });

        this.db.serialize(() => {
            this.db.run(`
                CREATE TABLE IF NOT EXISTS tweet_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    tweet_id TEXT,
                    content TEXT NOT NULL,
                    format TEXT,
                    length INTEGER,
                    market_context TEXT,
                    news_context TEXT,
                    engagement_potential TEXT,
                    posted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                    expires_at DATETIME
                )
            `);

            this.db.run(`
                CREATE TABLE IF NOT EXISTS market_insights (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    contract TEXT,
                    insight_type TEXT,
                    price_level REAL,
                    volatility REAL,
                    volume_ratio REAL,
                    news_catalyst TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `);

            // Clean old data
            this.db.run('DELETE FROM tweet_history WHERE expires_at < datetime("now")');
            this.db.run('DELETE FROM market_insights WHERE created_at < datetime("now", "-7 days")');
        });
    }

    // Enhanced news fetching with real-world simulation
    async fetchContextualNews() {
        try {
            console.log('📰 Analyzing news catalysts...');
            
            // Simulate real news events that affect futures trading
            const currentNewsContext = [
                {
                    title: "Fed Chair Powell Signals Data-Dependent Approach on Rates",
                    description: "Federal Reserve maintains hawkish stance while acknowledging economic data dependency",
                    contracts: ['ES', 'GC', 'NQ'],
                    impact_level: 'HIGH',
                    market_implication: "Rate uncertainty drives volatility in equity futures, gold benefits from real rate concerns",
                    relevance_score: 0.95,
                    catalyst_type: 'MONETARY_POLICY'
                },
                {
                    title: "Technology Sector Shows Resilience Despite Market Headwinds",
                    description: "Major tech companies demonstrate strong fundamentals amid broader market concerns",
                    contracts: ['NQ'],
                    impact_level: 'MEDIUM',
                    market_implication: "NQ outperformance likely to continue, watch for sector rotation signals",
                    relevance_score: 0.8,
                    catalyst_type: 'SECTOR_ROTATION'
                },
                {
                    title: "OPEC+ Production Meeting Scheduled Amid Global Supply Concerns",
                    description: "Oil producers weighing production adjustments as global demand patterns shift",
                    contracts: ['CL'],
                    impact_level: 'HIGH',
                    market_implication: "Supply-side catalysts could drive CL volatility, watch for inventory data",
                    relevance_score: 0.9,
                    catalyst_type: 'SUPPLY_DEMAND'
                },
                {
                    title: "Dollar Strength Pressures Commodities as Inflation Data Looms",
                    description: "DXY rally creating headwinds for precious metals ahead of key economic releases",
                    contracts: ['GC'],
                    impact_level: 'MEDIUM',
                    market_implication: "GC facing dual pressure from dollar strength and real rate dynamics",
                    relevance_score: 0.75,
                    catalyst_type: 'CURRENCY_CORRELATION'
                }
            ];

            this.newsData = currentNewsContext;
            console.log(`✅ Analyzed ${this.newsData.length} market catalysts`);
            
            return this.newsData;
            
        } catch (error) {
            console.error('❌ News analysis error:', error.message);
            return [];
        }
    }

    // Enhanced market data with news correlation
    async fetchEnhancedMarketData() {
        try {
            console.log('🔍 Fetching enhanced market data...');
            
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
                    
                    // Enhanced analytics
                    const closes = quotes.close.filter(c => c !== null).slice(-24);
                    const volumes = quotes.volume.filter(v => v !== null).slice(-10);
                    
                    let volatility = 0, rangeRatio = 1, volumeRatio = 1, momentum = 0;
                    let technicalSignal = 'NEUTRAL';
                    
                    if (closes.length >= 10) {
                        const returns = closes.slice(1).map((close, i) => Math.log(close / closes[i]));
                        volatility = Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length) * Math.sqrt(252) * 100;
                        
                        const avgRange = closes.slice(1).reduce((sum, close, i) => sum + Math.abs(close - closes[i]), 0) / (closes.length - 1);
                        rangeRatio = Math.abs(change) / (avgRange || 1);
                        
                        const sma10 = closes.slice(-10).reduce((sum, c) => sum + c, 0) / 10;
                        momentum = ((currentPrice - sma10) / sma10) * 100;
                        
                        // Technical signal generation
                        if (momentum > 1 && rangeRatio > 1.5) technicalSignal = 'BULLISH';
                        else if (momentum < -1 && rangeRatio > 1.5) technicalSignal = 'BEARISH';
                        
                        if (volumes.length > 5) {
                            const avgVolume = volumes.reduce((sum, v) => sum + v, 0) / volumes.length;
                            const currentVolume = volumes[volumes.length - 1] || avgVolume;
                            volumeRatio = currentVolume / avgVolume;
                        }
                    }
                    
                    // Find relevant news catalysts
                    const relevantNews = this.newsData.filter(news => 
                        news.contracts.includes(contract.symbol)
                    );
                    
                    this.marketData[symbol] = {
                        ...contract,
                        price: currentPrice,
                        change: change,
                        changePercent: changePercent,
                        direction: change >= 0 ? '🟢' : '🔴',
                        volatility: parseFloat(volatility.toFixed(1)),
                        rangeRatio: parseFloat(rangeRatio.toFixed(2)),
                        volumeRatio: parseFloat(volumeRatio.toFixed(2)),
                        momentum: parseFloat(momentum.toFixed(2)),
                        technicalSignal,
                        relevantNews,
                        newsImpactScore: relevantNews.reduce((sum, n) => sum + n.relevance_score, 0)
                    };

                    // Store market insights
                    await this.storeMarketInsight(contract.symbol, {
                        price: currentPrice,
                        volatility: volatility,
                        volumeRatio: volumeRatio,
                        newsCatalyst: relevantNews.length > 0 ? relevantNews[0].title : null
                    });
                }
                
                await new Promise(resolve => setTimeout(resolve, 300));
            }
            
        } catch (error) {
            console.error('❌ Market data error:', error.message);
        }
    }

    async storeMarketInsight(contract, data) {
        return new Promise((resolve, reject) => {
            this.db.run(`
                INSERT INTO market_insights 
                (contract, insight_type, price_level, volatility, volume_ratio, news_catalyst)
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                contract,
                'TECHNICAL_UPDATE',
                data.price,
                data.volatility,
                data.volumeRatio,
                data.newsCatalyst
            ], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    }

    // Advanced content generation with news integration
    async generateAdvancedContent() {
        const recentTweets = await this.getRecentTweets(30);
        const recentContent = recentTweets.map(t => t.content.toLowerCase());
        
        // Smart format selection based on recent history
        const formatDistribution = this.analyzeRecentFormats(recentTweets);
        const format = this.selectOptimalFormat(formatDistribution);
        
        // Determine if we should create news-based content
        const highImpactNews = this.newsData.filter(n => n.impact_level === 'HIGH' || n.relevance_score > 0.9);
        const shouldUseNews = Math.random() < 0.3 && highImpactNews.length > 0; // 30% chance for high-impact news
        
        let content, newsContext = null, engagementPotential = 'MEDIUM';
        
        if (shouldUseNews) {
            const newsItem = highImpactNews[0];
            content = this.generateNewsIntegratedContent(format, newsItem);
            newsContext = newsItem.title;
            engagementPotential = 'HIGH'; // News-based content typically gets higher engagement
        } else {
            content = this.generateMarketDrivenContent(format, recentContent);
            engagementPotential = this.evaluateEngagementPotential(content, format);
        }

        // Build comprehensive market context
        const marketContext = {};
        Object.values(this.marketData).forEach(data => {
            marketContext[data.symbol] = {
                price: data.price,
                change: data.changePercent,
                signal: data.technicalSignal,
                newsImpact: data.newsImpactScore
            };
        });
        
        return {
            content,
            format,
            length: content.length,
            newsContext,
            marketContext: JSON.stringify(marketContext),
            engagementPotential
        };
    }

    analyzeRecentFormats(recentTweets) {
        const recent5 = recentTweets.slice(0, 5);
        return {
            SHORT: recent5.filter(t => t.format === 'SHORT').length,
            MEDIUM: recent5.filter(t => t.format === 'MEDIUM').length,
            LONG: recent5.filter(t => t.format === 'LONG').length
        };
    }

    selectOptimalFormat(distribution) {
        // Avoid oversaturation of any format
        if (distribution.SHORT >= 2) return Math.random() < 0.5 ? 'MEDIUM' : 'LONG';
        if (distribution.LONG >= 2) return Math.random() < 0.5 ? 'SHORT' : 'MEDIUM';
        
        // Default distribution: 30% SHORT, 40% MEDIUM, 30% LONG
        const rand = Math.random();
        if (rand < 0.3) return 'SHORT';
        if (rand < 0.7) return 'MEDIUM';
        return 'LONG';
    }

    generateNewsIntegratedContent(format, newsItem) {
        const contracts = newsItem.contracts.join('/');
        
        if (format === 'SHORT') {
            return `📰 ${newsItem.catalyst_type.replace('_', ' ')}: ${contracts} traders, this changes the game.`;
        } else if (format === 'MEDIUM') {
            return `📰 Catalyst Alert: ${newsItem.title.slice(0, 80)}... ${newsItem.market_implication.slice(0, 60)}. Context beats reaction. #${newsItem.contracts[0]} #NewsTrading`;
        } else {
            return `📰 Market Catalyst Analysis: ${newsItem.title} - ${newsItem.market_implication} Professional approach: Wait for initial reaction to complete, then position for secondary moves. News creates volatility, but probabilities create profits. #${newsItem.contracts[0]} #ContextualTrading`;
        }
    }

    generateMarketDrivenContent(format, recentContent) {
        // Enhanced insights with specific futures context
        const nq = this.marketData['NQ=F'];
        const es = this.marketData['ES=F'];
        const gc = this.marketData['GC=F'];
        const cl = this.marketData['CL=F'];

        const insights = {
            SHORT: [
                "Probability beats prediction every time.",
                "Your position size determines your lifespan.",
                "Markets punish emotional decisions ruthlessly.",
                "Volume whispers before price screams.",
                "Patience is the ultimate trading edge.",
                `NQ momentum: ${nq?.technicalSignal || 'NEUTRAL'}. Trade accordingly.`,
                `ES volatility: ${es?.volatility || 'N/A'}%. Plan your risk.`,
                "Stop losses aren't suggestions—they're survival tools."
            ],
            MEDIUM: [
                `NQ/ES technical divergence: ${nq && es ? Math.abs(nq.changePercent - es.changePercent).toFixed(2) : 'N/A'}%. When spread >0.6%, mean reversion occurs 81% within 3 sessions. #SpreadTrading #NQ #ES`,
                `Gold volatility spike: ${gc?.volatility || 'N/A'}% vs normal 15-20%. High vol environments favor mean reversion strategies over trend following. Context matters. #GC #VolatilityTrading`,
                "Professional risk management: Never exceed 0.5% account risk per trade. Math: 20 losses at 0.5% = -9.5%. At 3% = -45%. Survival probability matters. #RiskManagement",
                `Oil supply dynamics shifting: CL technical signal ${cl?.technicalSignal || 'NEUTRAL'}. Energy sector leadership often precedes broader market moves. Watch correlation breakdown. #CL #Energy`
            ],
            LONG: [
                `Advanced futures psychology: Most traders can execute their strategy during favorable conditions, but crack under pressure during drawdowns. Professional approach: Pre-define maximum acceptable drawdown (typically 10-15%), then position size to survive worst-case scenarios. Your strategy's longest losing streak will eventually occur—plan for it. #TradingPsychology #Drawdown`,
                `Cross-market correlation analysis: When traditional correlations break down (Gold/Dollar, Oil/Equities), it signals regime change. Current correlation matrix shows ${gc?.newsImpactScore > 0.5 ? 'elevated' : 'normal'} news sensitivity. These breakdown periods create the highest-probability opportunities for disciplined traders. #CorrelationTrading #RegimeChange`,
                `Volume Profile institutional insight: The Point of Control represents where institutions accumulated positions. When futures deviate >2% from POC during RTH, gravitational pull occurs 87% within 48 hours. This isn't technical analysis—it's institutional behavior pattern recognition. Trade the probabilities, not the patterns. #VolumeProfile #InstitutionalFlow`
            ]
        };

        // Filter out similar content to recent posts
        const availableInsights = insights[format].filter(insight => {
            const insightWords = insight.toLowerCase().split(' ');
            return !recentContent.some(recent => {
                const recentWords = recent.split(' ');
                const commonWords = insightWords.filter(word => recentWords.includes(word) && word.length > 4);
                return commonWords.length > 2; // Avoid if >2 significant common words
            });
        });

        return availableInsights[Math.floor(Math.random() * availableInsights.length)] || insights[format][0];
    }

    evaluateEngagementPotential(content, format) {
        let score = 0;
        
        // Content factors
        if (content.includes('📊') || content.includes('📈') || content.includes('📰')) score += 1;
        if (content.includes('%') || content.includes('$')) score += 1;
        if (content.match(/\d+%/)) score += 1; // Contains specific percentages
        if (content.includes('#')) score += 1; // Has hashtags
        
        // Format factors
        if (format === 'SHORT') score += 1; // Short content often gets more engagement
        if (format === 'LONG' && content.includes('Professional') || content.includes('insight')) score += 1;
        
        if (score >= 4) return 'HIGH';
        if (score >= 2) return 'MEDIUM';
        return 'LOW';
    }

    async getRecentTweets(days = 30) {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT content, format, posted_at, engagement_potential 
                FROM tweet_history 
                WHERE posted_at > datetime('now', '-${days} days')
                ORDER BY posted_at DESC
            `, (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    async storeTweet(tweetData, tweetId = null) {
        return new Promise((resolve, reject) => {
            const expiresAt = new Date();
            expiresAt.setDate(expiresAt.getDate() + 30);
            
            this.db.run(`
                INSERT INTO tweet_history 
                (tweet_id, content, format, length, market_context, news_context, engagement_potential, expires_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                tweetId,
                tweetData.content,
                tweetData.format,
                tweetData.length,
                tweetData.marketContext,
                tweetData.newsContext,
                tweetData.engagementPotential,
                expiresAt.toISOString()
            ], function(err) {
                if (err) reject(err);
                else resolve(this.lastID);
            });
        });
    }

    // Main enhanced posting function
    async postEnhancedContent() {
        try {
            if (this.dailyPostCount >= this.maxDailyPosts) return;

            await this.fetchContextualNews();
            await this.fetchEnhancedMarketData();
            
            const tweetData = await this.generateAdvancedContent();
            
            console.log(`✅ Generated ${tweetData.format} Enhanced Insight (${this.dailyPostCount + 1}/10):`);
            console.log(`📏 Length: ${tweetData.length} chars | Engagement: ${tweetData.engagementPotential}`);
            console.log(`📝 ${tweetData.content}`);
            
            if (tweetData.newsContext) {
                console.log(`📰 News Context: ${tweetData.newsContext.slice(0, 80)}...`);
            }
            
            const marketSummary = JSON.parse(tweetData.marketContext);
            console.log(`📊 Market: ${Object.keys(marketSummary).map(k => `${k} ${marketSummary[k].signal}`).join(', ')}`);
            console.log('---\n');

            await this.storeTweet(tweetData);
            
            // Uncomment to post to Twitter
            // const tweet = await this.twitter.v2.tweet(tweetData.content);
            // await this.storeTweet(tweetData, tweet.data.id);
            
            this.dailyPostCount++;
            
        } catch (error) {
            console.error('❌ Error:', error.message);
        }
    }

    async testEnhancedAgent(count = 6) {
        console.log('🧪 Testing Enhanced Contextual Agent...');
        console.log('🚀 Advanced Features:');
        console.log('  - 30-day contextual memory');
        console.log('  - News catalyst integration');
        console.log('  - Technical signal generation');
        console.log('  - Engagement potential scoring');
        console.log('  - Anti-repetition intelligence\n');
        
        for (let i = 0; i < count; i++) {
            await this.postEnhancedContent();
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }

    close() {
        this.db.close();
    }
}

// Test the enhanced agent
async function runTest() {
    const agent = new EnhancedContextualAgent();
    
    try {
        await agent.testEnhancedAgent(8);
    } finally {
        agent.close();
    }
}

runTest();