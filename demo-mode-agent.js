require('dotenv').config();
const { TwitterApi } = require('twitter-api-v2');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const fs = require('fs');
const path = require('path');

class DemoModeAgent {
    constructor() {
        // Initialize APIs (read-only for now)
        this.twitter = new TwitterApi({
            appKey: process.env.TWITTER_API_KEY,
            appSecret: process.env.TWITTER_API_SECRET,
            accessToken: process.env.TWITTER_ACCESS_TOKEN,
            accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
        }).readWrite;

        this.genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
        this.geminiModel = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
        
        this.tweetCount = 0;
        this.tweetsToPost = [];
    }

    async fetchMarketData() {
        console.log('📊 Getting current market data...');
        const marketData = {};
        
        for (const symbol of ['NQ=F', 'ES=F', 'GC=F', 'CL=F']) {
            try {
                const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=5m&range=1d`;
                const response = await fetch(url);
                const data = await response.json();
                
                if (data.chart && data.chart.result && data.chart.result[0]) {
                    const meta = data.chart.result[0].meta;
                    const currentPrice = meta.regularMarketPrice;
                    const previousClose = meta.previousClose;
                    const changePercent = ((currentPrice - previousClose) / previousClose) * 100;
                    
                    marketData[symbol] = {
                        symbol: symbol.replace('=F', ''),
                        price: currentPrice,
                        changePercent: changePercent.toFixed(2)
                    };
                }
                await new Promise(resolve => setTimeout(resolve, 200));
            } catch (error) {
                console.log(`⚠️ Error fetching ${symbol}: ${error.message}`);
            }
        }
        
        return marketData;
    }

    async generateContent(marketData) {
        const marketSummary = Object.values(marketData).map(d => 
            `${d.symbol}: ${d.changePercent}%`
        ).join(', ');

        const prompt = `You are a professional day trader (36 years old) specializing in NQ/MNQ, ES/MES, GC/MGC, CL/MCL futures contracts.

COMMUNICATION STYLE: Direct, professional, no-bullshit approach. No slang, no fluff.

Current market: ${marketSummary}

Create a direct, practical insight about day trading futures. Keep it real and professional. Something that demonstrates your expertise and provides value to other traders.

Make it under 280 characters for Twitter.`;

        try {
            const result = await this.geminiModel.generateContent(prompt);
            const response = await result.response;
            let content = response.text().trim().replace(/^[\"']|[\"']$/g, '');
            
            if (content.length > 280) {
                content = content.substring(0, 277) + '...';
            }
            
            return content;
        } catch (error) {
            console.error('❌ Gemini error:', error.message);
            return "Risk management separates winners from losers. Most traders risk too much per trade. Professionals never exceed 0.5% risk per position. The math doesn't lie.";
        }
    }

    async generateTweets(count = 5) {
        console.log(`🚀 Generating ${count} professional trading tweets...\n`);
        
        for (let i = 0; i < count; i++) {
            const marketData = await this.fetchMarketData();
            const content = await this.generateContent(marketData);
            const marketSummary = Object.values(marketData).map(d => 
                `${d.symbol}: ${d.changePercent}%`
            ).join(', ');
            
            const tweet = {
                id: i + 1,
                content,
                marketContext: marketSummary,
                timestamp: new Date().toISOString(),
                readyToPost: true
            };
            
            this.tweetsToPost.push(tweet);
            
            console.log(`📝 Tweet ${i + 1}:`);
            console.log(`📏 Length: ${content.length} chars`);
            console.log(`📊 Market: ${marketSummary}`);
            console.log(`🐦 Content: "${content}"`);
            console.log('---\n');
            
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
        
        // Save to file for manual posting
        this.saveTweetsForManualPosting();
    }

    saveTweetsForManualPosting() {
        const outputPath = path.join(__dirname, 'ready-to-post.json');
        const outputData = {
            generated: new Date().toISOString(),
            account: '@JBeckz007',
            totalTweets: this.tweetsToPost.length,
            tweets: this.tweetsToPost
        };
        
        fs.writeFileSync(outputPath, JSON.stringify(outputData, null, 2));
        
        console.log('💾 TWEETS SAVED FOR POSTING:');
        console.log(`📁 File: ${outputPath}`);
        console.log(`📊 Count: ${this.tweetsToPost.length} tweets ready`);
        console.log('\n🔧 NEXT STEPS:');
        console.log('1. Get Twitter write permissions (apply for Elevated access)');
        console.log('2. Or manually copy-paste these tweets to Twitter');
        console.log('3. Or use a scheduling tool like Buffer/Hootsuite');
        
        // Create simple text file too
        const textOutput = this.tweetsToPost.map((tweet, i) => 
            `Tweet ${i + 1}:\n${tweet.content}\nMarket: ${tweet.marketContext}\n---\n`
        ).join('\n');
        
        fs.writeFileSync(path.join(__dirname, 'tweets-to-copy.txt'), textOutput);
        console.log('📝 Also saved as: tweets-to-copy.txt (easy copy-paste)');
    }

    async testAccount() {
        console.log('🔍 Testing current account access...\n');
        
        try {
            const me = await this.twitter.v2.me();
            console.log(`✅ Account connected: @${me.data.username}`);
            console.log(`👤 Name: ${me.data.name}`);
            console.log(`🆔 ID: ${me.data.id}`);
            return true;
        } catch (error) {
            console.error('❌ Account access error:', error.message);
            return false;
        }
    }
}

async function runDemo() {
    console.log('🚀 DEMO MODE: Professional Trading Content Generator\n');
    
    const agent = new DemoModeAgent();
    
    // Test account access
    const accountOK = await agent.testAccount();
    if (!accountOK) {
        console.log('❌ Cannot connect to Twitter account');
        return;
    }
    
    // Generate content
    await agent.generateTweets(5);
}

runDemo();