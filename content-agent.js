require('dotenv').config();
const { TwitterApi } = require('twitter-api-v2');
const cron = require('node-cron');

class FuturesContentAgent {
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
        
        // Content categories for your thought leadership
        this.contentLibrary = {
            psychology: [
                "🧠 Trading Psychology Tip: Fear and greed are your biggest enemies in futures trading. The market rewards patience and discipline. #FuturesTrading #TradingPsychology",
                
                "💭 Mindset Monday: Before you risk your capital, risk your ego. Accept that losing trades are part of the game. Focus on process over profits. #NQ #ES #TradingMindset",
                
                "🎯 Psychology Check: If you're checking your P&L every 5 minutes, you're trading with your emotions, not your strategy. Step back and trust your plan. #FuturesTrader",
                
                "⚡ Mental Note: The best traders don't predict the market - they react to it. Stay flexible and adapt your strategy as conditions change. #GC #CL #TradingWisdom",
                
                "🔥 Trader Truth: Your biggest losses will come from revenge trading. When you're emotional, step away. The market will be here tomorrow. #RiskManagement #Futures",
                
                "💡 Psychology Insight: Winners focus on risk management. Losers focus on being right. Which trader are you? #ES #NQ #TradingPsychology",
                
                "🚨 Reality Check: If you can't handle a 5% drawdown, you're not ready for futures trading. Build your risk tolerance before building your account. #MES #MNQ",
                
                "⭐ Mindset Shift: Stop trying to catch every move. Master one setup, one timeframe, one market first. Depth over breadth always wins. #FuturesTrading"
            ],
            
            riskManagement: [
                "📊 Risk Management Rule #1: Never risk more than 1-2% of your account on a single futures trade. Your survival depends on it. #RiskManagement #NQ #ES",
                
                "🛡️ Risk Control: Your stop loss is not a suggestion - it's your lifeline. Honor every single one. No exceptions, no excuses. #FuturesTrading #MGC #MCL",
                
                "💰 Position Sizing Truth: If you're sweating about a trade, your position is too big. Size down until you can think clearly. #ES #MES #RiskManagement",
                
                "⚖️ Risk vs Reward: Every futures trade should offer at least 2:1 risk/reward ratio. If it doesn't, don't take it. Period. #NQ #GC #TradingRules",
                
                "🎲 Risk Reality: Futures trading is NOT gambling when you have a plan. Without a plan, it's the most expensive casino in the world. #FuturesTrader",
                
                "📈 Account Protection: Drawdowns are inevitable. How you manage them determines if you survive to trade another day. Plan for the worst. #RiskManagement",
                
                "🔒 Capital Preservation: It takes months to build an account and minutes to blow it up. Protect your capital like your life depends on it. #Futures #ES #NQ",
                
                "⚠️ Risk Warning: If you don't have a predetermined stop loss BEFORE entering a trade, you're not trading - you're hoping. Hope is not a strategy. #CL #GC"
            ],
            
            technicalAnalysis: [
                "📈 Technical Analysis DO: Use multiple timeframes. What looks like a breakout on the 5-min might be noise on the daily. #TA #NQ #ES #MultiTimeframe",
                
                "❌ Technical Analysis DON'T: Don't draw support/resistance lines to fit your bias. Let the market show you where the levels are. #TechnicalAnalysis #Futures",
                
                "🎯 TA Tip: The best trades happen at confluence zones - where multiple indicators, levels, and timeframes align. Quality over quantity. #ES #NQ #Confluence",
                
                "📊 Chart Reading: Volume confirms price action. A breakout without volume is usually a fake-out. Watch the participation. #VolumeAnalysis #Futures #GC",
                
                "⚡ Quick TA Rule: If you need more than 3 indicators to justify a trade, you're overcomplicating it. Keep it simple and effective. #TechnicalAnalysis #CL",
                
                "🔍 Pattern Recognition: Flags, pennants, and triangles work in futures - but only when combined with proper risk management. #ChartPatterns #MES #MNQ",
                
                "📉 Support/Resistance Truth: These levels are zones, not exact prices. Give them some breathing room in your analysis. #SupportResistance #ES #NQ",
                
                "⭐ TA Wisdom: The market doesn't care about your fancy indicators. Price action and volume tell the real story. Everything else is noise. #PriceAction #Futures"
            ],
            
            statistics: [
                "📊 Trading Stats: 90% of futures traders lose money. The difference? The 10% who win have a tested strategy and stick to it. #TradingStatistics #Futures",
                
                "🔢 Numbers Don't Lie: If your win rate is 60% but your avg loss > avg win, you'll still lose money. Mathematics runs the markets. #TradingMath #NQ #ES",
                
                "📈 Performance Metric: Track your Sharpe ratio, not just profits. Risk-adjusted returns separate pros from gamblers. #TradingMetrics #RiskAdjusted",
                
                "⚡ Statistical Reality: You need at least 100 trades to know if your strategy actually works. Anything less is just luck. #SampleSize #Backtesting",
                
                "🎯 Win Rate vs Risk/Reward: 40% win rate with 3:1 RR = profitable. 70% win rate with 1:2 RR = broke. Do the math. #TradingMath #ES #GC",
                
                "📊 Expectancy Formula: (Win% × Avg Win) - (Loss% × Avg Loss) = Your edge. If it's negative, stop trading immediately. #Expectancy #Futures",
                
                "🔢 Statistical Edge: Consistency beats perfection. A mediocre strategy executed perfectly outperforms a perfect strategy executed poorly. #Consistency",
                
                "📈 Data-Driven Truth: Your gut feeling is worth exactly $0. Your backtested data is worth millions. Trust the numbers, not emotions. #DataDriven #CL"
            ],
            
            insights: [
                "💎 Futures Insight: The NQ and ES often diverge at key levels. Smart money knows which one to follow. Do you? #NQ #ES #MarketStructure",
                
                "🏆 Pro Tip: Gold (GC) often moves opposite to the dollar. But during crisis, both can rally. Context matters more than correlation. #GC #MGC #Gold",
                
                "⚡ Market Insight: Crude oil (CL) is the most emotional futures market. News drives price more than technicals. Trade accordingly. #CL #MCL #Crude",
                
                "🎯 Smart Money Move: Watch the overnight session in futures. Often, the real moves happen when retail traders are sleeping. #FuturesTrading #Overnight",
                
                "📊 Volume Profile Secret: The highest volume nodes often act as magnets. Price loves to return to these areas. Use them wisely. #VolumeProfile #NQ #ES",
                
                "🔥 Futures Edge: Micro contracts (MES, MNQ, MGC, MCL) let you trade with proper position sizing. Size matters more than ego. #MicroFutures #RiskManagement",
                
                "💡 Market Structure: Higher highs and higher lows = uptrend. Everything else is noise until proven otherwise. Keep it simple. #MarketStructure #Trend",
                
                "⚖️ Liquidity Insight: Trade during RTH (Regular Trading Hours) for best fills. Overnight sessions can be thin and choppy. #Liquidity #FuturesHours"
            ]
        };
        
        // Posting schedule: 10 posts spread throughout trading day (6 AM - 8 PM EST)
        this.postTimes = [
            '0 6 * * *',   // 6:00 AM - Pre-market insight
            '30 7 * * *',  // 7:30 AM - Market open prep
            '0 9 * * *',   // 9:00 AM - Morning psychology
            '30 10 * * *', // 10:30 AM - Risk management
            '0 12 * * *',  // 12:00 PM - Midday TA tip
            '30 13 * * *', // 1:30 PM - Statistics insight
            '0 15 * * *',  // 3:00 PM - Market structure
            '30 16 * * *', // 4:30 PM - Psychology check
            '0 18 * * *',  // 6:00 PM - Day wrap insights
            '0 20 * * *'   // 8:00 PM - Tomorrow prep
        ];
    }

    // Get random content from a category
    getRandomContent(category) {
        const content = this.contentLibrary[category];
        const availableContent = content.filter(post => !this.postedToday.has(post));
        
        if (availableContent.length === 0) {
            // If all content used, refresh for the day
            return content[Math.floor(Math.random() * content.length)];
        }
        
        return availableContent[Math.floor(Math.random() * availableContent.length)];
    }

    // Select content category based on time of day
    selectContentCategory() {
        const hour = new Date().getHours();
        
        if (hour >= 6 && hour < 9) return 'insights';      // Pre-market insights
        if (hour >= 9 && hour < 12) return 'psychology';   // Morning psychology
        if (hour >= 12 && hour < 15) return 'technicalAnalysis'; // Midday TA
        if (hour >= 15 && hour < 18) return 'riskManagement'; // Afternoon risk mgmt
        if (hour >= 18 && hour < 21) return 'statistics';  // Evening statistics
        
        return 'insights'; // Default fallback
    }

    // Post educational content
    async postEducationalContent() {
        try {
            if (this.dailyPostCount >= this.maxDailyPosts) {
                console.log('📊 Daily post limit reached. Waiting for next day.');
                return;
            }

            const category = this.selectContentCategory();
            const content = this.getRandomContent(category);
            
            const tweet = await this.twitter.v2.tweet(content);
            
            this.postedToday.add(content);
            this.dailyPostCount++;
            
            console.log(`✅ Posted (${this.dailyPostCount}/10): ${category.toUpperCase()}`);
            console.log(`📝 Content: ${content.substring(0, 100)}...`);
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
        console.log('🚀 Futures Content Agent Started!');
        console.log('📋 Content Categories:');
        console.log('  - Trading Psychology');
        console.log('  - Risk Management');
        console.log('  - Technical Analysis');
        console.log('  - Trading Statistics');
        console.log('  - Market Insights');
        console.log(`📅 Scheduled: ${this.maxDailyPosts} posts per day`);
        console.log('⏰ Posting throughout trading hours (6 AM - 8 PM EST)\n');

        // Schedule posts throughout the day
        this.postTimes.forEach((cronTime, index) => {
            cron.schedule(cronTime, () => {
                console.log(`⏰ Scheduled post ${index + 1}/10 triggered`);
                this.postEducationalContent();
            });
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
        console.log('🛑 Content Agent Stopped');
        cron.destroy();
    }

    // Manual post for testing
    async manualPost(category = null) {
        const selectedCategory = category || this.selectContentCategory();
        console.log(`📝 Manual post - Category: ${selectedCategory}`);
        await this.postEducationalContent();
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
    const agent = new FuturesContentAgent();
    agent.start();
    
    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n👋 Shutting down content agent...');
        agent.stop();
        process.exit(0);
    });
}

module.exports = FuturesContentAgent;