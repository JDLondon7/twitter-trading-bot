require('dotenv').config();
const { TwitterApi } = require('twitter-api-v2');
const cron = require('node-cron');
const fetch = require('node-fetch');

class DynamicFuturesContentAgent {
    constructor() {
        // Initialize Twitter API client
        this.client = new TwitterApi({
            appKey: process.env.TWITTER_API_KEY,
            appSecret: process.env.TWITTER_API_SECRET,
            accessToken: process.env.TWITTER_ACCESS_TOKEN,
            accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
        });

        this.twitter = this.client.readWrite;
        
        // Track posted content to avoid repetition
        this.postedToday = new Set();
        this.dailyPostCount = 0;
        this.maxDailyPosts = 10;
        
        // Futures symbols for Yahoo Finance API
        this.futuresSymbols = {
            'NQ=F': 'NASDAQ',
            'ES=F': 'E-mini S&P 500',
            'GC=F': 'Gold',
            'CL=F': 'Crude Oil'
        };
        
        // Cache for market data
        this.marketData = {};
        this.lastDataUpdate = null;
        
        // Static educational content (your evergreen wisdom)
        this.staticContent = {
            psychology: [
                "🧠 Trading Psychology: Fear and greed are your biggest enemies in futures trading. The market rewards patience and discipline. #FuturesTrading #TradingPsychology",
                "💭 Mindset Check: Before you risk your capital, risk your ego. Accept that losing trades are part of the game. #TradingMindset #NQ #ES",
                "⚡ Mental Note: The best traders don't predict the market - they react to it. Stay flexible and adapt. #TradingWisdom #Futures",
                "💡 Psychology Insight: Winners focus on risk management. Losers focus on being right. Which trader are you? #ES #NQ #Psychology",
                "🔥 Reality: Your biggest losses come from revenge trading. When emotional, step away. Market will be here tomorrow. #RiskManagement"
            ],
            
            riskManagement: [
                "📊 Risk Rule #1: Never risk more than 1-2% of your account on a single futures trade. Your survival depends on it. #RiskManagement #NQ #ES",
                "🛡️ Stop losses are not suggestions - they're your lifeline. Honor every single one. No exceptions. #FuturesTrading #Discipline",
                "💰 Position Sizing: If you're sweating about a trade, your position is too big. Size down until you think clearly. #ES #MES",
                "⚖️ Risk/Reward: Every futures trade should offer at least 2:1. If it doesn't, don't take it. Period. #NQ #GC #TradingRules",
                "🔒 Capital Preservation: Takes months to build an account, minutes to blow it up. Protect capital like your life depends on it. #Futures"
            ],
            
            technicalAnalysis: [
                "📈 TA DO: Use multiple timeframes. What looks like breakout on 5-min might be noise on daily. #TA #NQ #ES #MultiTimeframe",
                "❌ TA DON'T: Don't draw support/resistance to fit your bias. Let the market show you the levels. #TechnicalAnalysis #Futures",
                "🎯 TA Tip: Best trades at confluence zones - where multiple indicators/levels align. Quality over quantity. #ES #NQ #Confluence",
                "📊 Volume confirms price action. Breakout without volume is usually fake-out. Watch participation. #VolumeAnalysis #Futures #GC",
                "⚡ TA Rule: If you need >3 indicators to justify a trade, you're overcomplicating. Keep it simple. #TechnicalAnalysis #CL"
            ],
            
            statistics: [
                "📊 Stats: 90% of futures traders lose money. The 10% who win have tested strategy and stick to it. #TradingStatistics #Futures",
                "🔢 Math: 60% win rate but avg loss > avg win = still lose money. Mathematics runs markets. #TradingMath #NQ #ES",
                "📈 Track Sharpe ratio, not just profits. Risk-adjusted returns separate pros from gamblers. #TradingMetrics #RiskAdjusted",
                "⚡ Statistical Reality: Need 100+ trades to know if strategy works. Anything less is luck. #SampleSize #Backtesting",
                "🎯 40% win rate with 3:1 RR = profitable. 70% win rate with 1:2 RR = broke. Do the math. #TradingMath #ES #GC"
            ]
        };
    }

    // Fetch market data from Yahoo Finance
    async fetchMarketData() {
        try {
            console.log('📊 Fetching live market data...');
            
            for (const [symbol, name] of Object.entries(this.futuresSymbols)) {
                const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
                const response = await fetch(url);
                const data = await response.json();
                
                if (data.chart && data.chart.result && data.chart.result[0]) {
                    const result = data.chart.result[0];
                    const meta = result.meta;
                    const quote = result.indicators.quote[0];
                    const timestamps = result.timestamp;
                    
                    // Get latest price data
                    const latestIndex = timestamps.length - 1;
                    const currentPrice = quote.close[latestIndex] || meta.regularMarketPrice;
                    const previousClose = meta.previousClose;
                    const change = currentPrice - previousClose;
                    const changePercent = (change / previousClose) * 100;
                    
                    this.marketData[symbol] = {
                        name: name,
                        symbol: symbol.replace('=F', ''),
                        price: currentPrice.toFixed(2),
                        change: change.toFixed(2),
                        changePercent: changePercent.toFixed(2),
                        direction: change >= 0 ? '🟢' : '🔴',
                        trend: change >= 0 ? 'UP' : 'DOWN',
                        volume: meta.regularMarketVolume || 'N/A'
                    };
                }
                
                // Rate limiting
                await new Promise(resolve => setTimeout(resolve, 100));
            }
            
            this.lastDataUpdate = new Date();
            console.log('✅ Market data updated successfully');
            
        } catch (error) {
            console.error('❌ Error fetching market data:', error.message);
        }
    }

    // Create dynamic market insight posts
    createMarketInsight() {
        if (!this.marketData || Object.keys(this.marketData).length === 0) {
            return this.getRandomStaticContent('insights');
        }

        const insights = [];
        
        // Pre-market overview
        const symbols = Object.values(this.marketData);
        const bullishCount = symbols.filter(s => parseFloat(s.change) > 0).length;
        const bearishCount = symbols.filter(s => parseFloat(s.change) < 0).length;
        
        if (bullishCount > bearishCount) {
            insights.push(`🟢 Pre-Market: ${bullishCount}/${symbols.length} futures showing strength. Risk-on sentiment emerging. Watch for continuation or fade. #PreMarket #Futures`);
        } else if (bearishCount > bullishCount) {
            insights.push(`🔴 Pre-Market: ${bearishCount}/${symbols.length} futures under pressure. Risk-off tone developing. Key levels to watch for bounces. #PreMarket #Futures`);
        } else {
            insights.push(`⚖️ Pre-Market: Mixed signals across futures. Waiting for direction. Patience pays in choppy conditions. #PreMarket #Futures`);
        }

        // Individual symbol insights
        Object.values(this.marketData).forEach(data => {
            const absChange = Math.abs(parseFloat(data.changePercent));
            
            if (absChange > 1.0) {
                insights.push(`${data.direction} ${data.name} (${data.symbol}): ${data.price} (${data.change > 0 ? '+' : ''}${data.changePercent}%) - Significant move pre-market. Watch for institutional response at key levels. #${data.symbol} #Futures`);
            } else if (absChange > 0.5) {
                insights.push(`📊 ${data.name} (${data.symbol}): ${data.price} (${data.change > 0 ? '+' : ''}${data.changePercent}%) - Moderate movement. Look for confirmation above/below overnight range. #${data.symbol} #PreMarket`);
            }
        });

        // Market structure insights
        const nqData = this.marketData['NQ=F'];
        const esData = this.marketData['ES=F'];
        
        if (nqData && esData) {
            const nqChange = parseFloat(nqData.changePercent);
            const esChange = parseFloat(esData.changePercent);
            const divergence = Math.abs(nqChange - esChange);
            
            if (divergence > 0.3) {
                const leader = nqChange > esChange ? 'NQ leading ES higher' : 'ES outperforming NQ';
                insights.push(`⚡ Market Structure: ${leader} - ${divergence.toFixed(2)}% divergence. Watch which index the institutions follow. #NQ #ES #MarketStructure`);
            }
        }

        return insights[Math.floor(Math.random() * insights.length)] || this.getRandomStaticContent('insights');
    }

    // Get random static content
    getRandomStaticContent(category) {
        const content = this.staticContent[category] || this.staticContent.psychology;
        return content[Math.floor(Math.random() * content.length)];
    }

    // Select content based on time and create appropriate post
    async createContentPost() {
        const hour = new Date().getHours();
        let content;

        // Update market data if stale (older than 15 minutes)
        if (!this.lastDataUpdate || (new Date() - this.lastDataUpdate) > 15 * 60 * 1000) {
            await this.fetchMarketData();
        }

        if (hour >= 5 && hour < 9) {
            // Pre-market hours: Dynamic market insights
            content = this.createMarketInsight();
        } else if (hour >= 9 && hour < 12) {
            // Morning: Psychology + some market context
            content = this.getRandomStaticContent('psychology');
        } else if (hour >= 12 && hour < 15) {
            // Midday: Technical Analysis
            content = this.getRandomStaticContent('technicalAnalysis');
        } else if (hour >= 15 && hour < 18) {
            // Afternoon: Risk Management
            content = this.getRandomStaticContent('riskManagement');
        } else {
            // Evening: Statistics and insights
            content = this.getRandomStaticContent('statistics');
        }

        return content;
    }

    // Post educational content
    async postEducationalContent() {
        try {
            if (this.dailyPostCount >= this.maxDailyPosts) {
                console.log('📊 Daily post limit reached. Waiting for next day.');
                return;
            }

            const content = await this.createContentPost();
            
            if (this.postedToday.has(content)) {
                console.log('⚠️ Content already posted today, skipping...');
                return;
            }

            const tweet = await this.twitter.v2.tweet(content);
            
            this.postedToday.add(content);
            this.dailyPostCount++;
            
            console.log(`✅ Posted (${this.dailyPostCount}/10):`);
            console.log(`📝 ${content}`);
            console.log(`🆔 Tweet ID: ${tweet.data.id}\n`);
            
        } catch (error) {
            console.error('❌ Error posting content:', error.message);
        }
    }

    // Reset daily counters at midnight
    resetDailyCounters() {
        this.postedToday.clear();
        this.dailyPostCount = 0;
        console.log('🔄 Daily counters reset. Ready for new day of content!');
    }

    // Start the content agent
    start() {
        console.log('🚀 Dynamic Futures Content Agent Started!');
        console.log('📊 Features:');
        console.log('  - Live Yahoo Finance market data');
        console.log('  - Dynamic pre-market insights');
        console.log('  - Educational thought leadership');
        console.log('  - 10 posts per day schedule');
        console.log('⏰ Posting throughout trading hours\n');

        // Fetch initial market data
        this.fetchMarketData();

        // Schedule posts throughout the day (every 90 minutes from 6 AM to 8 PM)
        const postTimes = [
            '0 6 * * *',   // 6:00 AM - Pre-market with live data
            '30 7 * * *',  // 7:30 AM - Market prep
            '0 9 * * *',   // 9:00 AM - Psychology
            '30 10 * * *', // 10:30 AM - Risk management
            '0 12 * * *',  // 12:00 PM - Technical analysis
            '30 13 * * *', // 1:30 PM - Market insights
            '0 15 * * *',  // 3:00 PM - Risk management
            '30 16 * * *', // 4:30 PM - Psychology
            '0 18 * * *',  // 6:00 PM - Statistics
            '0 20 * * *'   // 8:00 PM - Evening wrap
        ];

        postTimes.forEach((cronTime, index) => {
            cron.schedule(cronTime, () => {
                console.log(`⏰ Scheduled post ${index + 1}/10 triggered`);
                this.postEducationalContent();
            });
        });

        // Update market data every 15 minutes during market hours
        cron.schedule('*/15 6-20 * * *', () => {
            this.fetchMarketData();
        });

        // Reset counters at midnight
        cron.schedule('0 0 * * *', () => {
            this.resetDailyCounters();
        });

        // Post first content immediately for testing
        console.log('🧪 Posting test content...');
        this.postEducationalContent();
    }

    // Stop the agent
    stop() {
        console.log('🛑 Dynamic Content Agent Stopped');
        cron.destroy();
    }

    // Manual test post
    async testMarketInsight() {
        await this.fetchMarketData();
        const insight = this.createMarketInsight();
        console.log('📊 Generated Market Insight:');
        console.log(insight);
        return insight;
    }
}

// Error handling
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection:', promise, reason);
});

// Initialize and start the agent
if (require.main === module) {
    const agent = new DynamicFuturesContentAgent();
    agent.start();
    
    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n👋 Shutting down dynamic content agent...');
        agent.stop();
        process.exit(0);
    });
}

module.exports = DynamicFuturesContentAgent;