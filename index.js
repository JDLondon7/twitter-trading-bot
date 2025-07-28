const { TwitterApi } = require('twitter-api-v2');
const cron = require('node-cron');
require('dotenv').config();

class TwitterTradingAgent {
    constructor() {
        // Initialize Twitter API client
        this.client = new TwitterApi({
            appKey: process.env.TWITTER_API_KEY,
            appSecret: process.env.TWITTER_API_SECRET,
            accessToken: process.env.TWITTER_ACCESS_TOKEN,
            accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
        });

        this.twitter = this.client.readWrite;
        
        // Futures trading keywords - specialized for NQ/MNQ, GC/MGC, ES/MES, CL/MCL
        this.tradingKeywords = [
            'NQ', 'MNQ', 'NASDAQ', 'futures', 'GC', 'MGC', 'gold',
            'ES', 'MES', 'SPX', 'emini', 'CL', 'MCL', 'crude', 'oil',
            'futures trading', 'scalping', 'day trading', 'swing trading',
            'breakout', 'support', 'resistance', 'pivot', 'levels',
            'bullish', 'bearish', 'long', 'short', 'trend'
        ];
        
        // Store processed tweets to avoid duplicates
        this.processedTweets = new Set();
        
        // Market sentiment analysis
        this.sentimentKeywords = {
            bullish: ['bullish', 'moon', 'pump', 'buy', 'long', 'calls', 'up', 'green', 'rocket'],
            bearish: ['bearish', 'dump', 'sell', 'short', 'puts', 'down', 'red', 'crash', 'drop']
        };
    }

    // Analyze sentiment of tweet text
    analyzeSentiment(text) {
        const lowercaseText = text.toLowerCase();
        let bullishScore = 0;
        let bearishScore = 0;

        this.sentimentKeywords.bullish.forEach(keyword => {
            if (lowercaseText.includes(keyword)) bullishScore++;
        });

        this.sentimentKeywords.bearish.forEach(keyword => {
            if (lowercaseText.includes(keyword)) bearishScore++;
        });

        if (bullishScore > bearishScore) return 'bullish';
        if (bearishScore > bullishScore) return 'bearish';
        return 'neutral';
    }

    // Extract futures symbols from tweet
    extractSymbols(text) {
        const futuresSymbols = ['NQ', 'MNQ', 'ES', 'MES', 'GC', 'MGC', 'CL', 'MCL'];
        const found = [];
        
        // Look for futures symbols (with or without $ prefix)
        futuresSymbols.forEach(symbol => {
            const regex = new RegExp(`\\b\\$?${symbol}\\b`, 'gi');
            if (regex.test(text)) {
                found.push(symbol);
            }
        });
        
        // Also catch traditional $SYMBOL format
        const dollarSymbols = text.match(/\$[A-Z]{1,5}/g) || [];
        
        return [...new Set([...found, ...dollarSymbols])];
    }

    // Process and analyze a tweet
    processTweet(tweet) {
        const sentiment = this.analyzeSentiment(tweet.text);
        const symbols = this.extractSymbols(tweet.text);
        
        return {
            id: tweet.id,
            text: tweet.text,
            author: tweet.author_id,
            sentiment: sentiment,
            symbols: symbols,
            timestamp: new Date(),
            metrics: {
                retweet_count: tweet.public_metrics?.retweet_count || 0,
                like_count: tweet.public_metrics?.like_count || 0,
                reply_count: tweet.public_metrics?.reply_count || 0
            }
        };
    }

    // Search for trading-related tweets
    async searchTradingTweets() {
        try {
            console.log('🔍 Searching for trading tweets...');
            
            const searchQuery = this.tradingKeywords.join(' OR ');
            const tweets = await this.twitter.v2.search(searchQuery, {
                max_results: 10,
                'tweet.fields': ['public_metrics', 'created_at', 'author_id'],
                expansions: ['author_id']
            });

            if (tweets.data) {
                console.log(`📊 Found ${tweets.data.length} tweets`);
                
                for (const tweet of tweets.data) {
                    if (!this.processedTweets.has(tweet.id)) {
                        const analysis = this.processTweet(tweet);
                        this.processedTweets.add(tweet.id);
                        
                        console.log(`\n📈 Tweet Analysis:`);
                        console.log(`Author: ${tweet.author_id}`);
                        console.log(`Sentiment: ${analysis.sentiment}`);
                        console.log(`Symbols: ${analysis.symbols.join(', ') || 'None'}`);
                        console.log(`Text: ${tweet.text.substring(0, 100)}...`);
                        console.log(`Engagement: ${analysis.metrics.like_count} likes, ${analysis.metrics.retweet_count} retweets`);
                        
                        // Here you could add logic to:
                        // - Store analysis in database
                        // - Send trading signals
                        // - Generate alerts
                        await this.handleTradingSignal(analysis);
                    }
                }
            }
        } catch (error) {
            console.error('❌ Error searching tweets:', error);
        }
    }

    // Handle trading signals based on analysis
    async handleTradingSignal(analysis) {
        // Example logic for trading signals
        if (analysis.symbols.length > 0 && analysis.sentiment !== 'neutral') {
            console.log(`🚨 Trading Signal: ${analysis.sentiment.toUpperCase()} on ${analysis.symbols.join(', ')}`);
            
            // You could implement:
            // - Paper trading logic
            // - Alert system
            // - Database logging
            // - Integration with trading platforms
        }
    }

    // Post a tweet (example functionality)
    async postTweet(text) {
        try {
            const tweet = await this.twitter.v2.tweet(text);
            console.log('✅ Tweet posted:', tweet.data.id);
            return tweet;
        } catch (error) {
            console.error('❌ Error posting tweet:', error);
        }
    }

    // Get market update and post tweet
    async postMarketUpdate() {
        try {
            const marketStatus = this.getMarketStatus();
            const tweet = `🏦 Market Update: ${marketStatus} 
            
#Trading #Markets #AI`;
            
            await this.postTweet(tweet);
        } catch (error) {
            console.error('❌ Error posting market update:', error);
        }
    }

    // Simple market status (you could integrate with real market data APIs)
    getMarketStatus() {
        const statuses = [
            'Markets showing strong momentum',
            'Consolidation phase detected',
            'High volatility observed',
            'Bullish sentiment increasing',
            'Bearish pressure mounting'
        ];
        return statuses[Math.floor(Math.random() * statuses.length)];
    }

    // Start the trading agent
    start() {
        console.log('🚀 Twitter Trading Agent Started!');
        console.log(`📅 Monitoring keywords: ${this.tradingKeywords.join(', ')}`);
        
        // Search for tweets every 5 minutes
        cron.schedule('*/5 * * * *', () => {
            this.searchTradingTweets();
        });

        // Post market update every hour
        cron.schedule('0 * * * *', () => {
            this.postMarketUpdate();
        });

        // Initial search
        this.searchTradingTweets();
        
        console.log('⏰ Scheduled tasks activated:');
        console.log('  - Tweet monitoring: Every 5 minutes');
        console.log('  - Market updates: Every hour');
    }

    // Stop the agent
    stop() {
        console.log('🛑 Twitter Trading Agent Stopped');
        cron.destroy();
    }
}

// Error handling
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
});

// Initialize and start the agent
if (require.main === module) {
    const agent = new TwitterTradingAgent();
    agent.start();
    
    // Graceful shutdown
    process.on('SIGINT', () => {
        console.log('\n👋 Shutting down gracefully...');
        agent.stop();
        process.exit(0);
    });
}

module.exports = TwitterTradingAgent;