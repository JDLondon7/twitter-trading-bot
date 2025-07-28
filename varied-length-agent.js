require('dotenv').config();
const { TwitterApi } = require('twitter-api-v2');
const cron = require('node-cron');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));

class VariedLengthInsightsAgent {
    constructor() {
        this.client = new TwitterApi({
            appKey: process.env.TWITTER_API_KEY,
            appSecret: process.env.TWITTER_API_SECRET,
            accessToken: process.env.TWITTER_ACCESS_TOKEN,
            accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
        });

        this.twitter = this.client.readWrite;
        this.marketData = {};
        this.marketMetrics = {};
        this.postedToday = new Set();
        this.dailyPostCount = 0;
        this.maxDailyPosts = 10;
        
        this.futuresContracts = {
            'NQ=F': { name: 'NASDAQ', symbol: 'NQ', pointValue: 20, tickSize: 0.25 },
            'ES=F': { name: 'E-mini S&P 500', symbol: 'ES', pointValue: 50, tickSize: 0.25 },
            'GC=F': { name: 'Gold', symbol: 'GC', pointValue: 100, tickSize: 0.10 },
            'CL=F': { name: 'Crude Oil', symbol: 'CL', pointValue: 1000, tickSize: 0.01 }
        };

        // Content formats: SHORT (under 100), MEDIUM (100-180), LONG (180-280)
        this.contentFormats = ['SHORT', 'MEDIUM', 'LONG'];
    }

    async fetchAdvancedMarketData() {
        try {
            console.log('🔍 Fetching market data...');
            
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
                    
                    // Calculate metrics
                    const closes = quotes.close.filter(c => c !== null).slice(-20);
                    const volumes = quotes.volume.filter(v => v !== null).slice(-10);
                    
                    let volatility = 0, rangeRatio = 1, volumeRatio = 1;
                    
                    if (closes.length >= 10) {
                        const returns = closes.slice(1).map((close, i) => Math.log(close / closes[i]));
                        volatility = Math.sqrt(returns.reduce((sum, r) => sum + r * r, 0) / returns.length) * Math.sqrt(252) * 100;
                        
                        const avgRange = closes.slice(1).reduce((sum, close, i) => sum + Math.abs(close - closes[i]), 0) / (closes.length - 1);
                        rangeRatio = Math.abs(change) / (avgRange || 1);
                        
                        if (volumes.length > 5) {
                            const avgVolume = volumes.reduce((sum, v) => sum + v, 0) / volumes.length;
                            const currentVolume = volumes[volumes.length - 1] || avgVolume;
                            volumeRatio = currentVolume / avgVolume;
                        }
                    }
                    
                    this.marketData[symbol] = {
                        ...contract,
                        price: currentPrice,
                        change: change,
                        changePercent: changePercent,
                        direction: change >= 0 ? '🟢' : '🔴',
                        volatility: volatility.toFixed(1),
                        rangeRatio: rangeRatio.toFixed(2),
                        volumeRatio: volumeRatio.toFixed(2)
                    };
                }
                
                await new Promise(resolve => setTimeout(resolve, 300));
            }
            
            this.calculateCrossMarketInsights();
            
        } catch (error) {
            console.error('❌ Error fetching market data:', error.message);
        }
    }

    calculateCrossMarketInsights() {
        const nq = this.marketData['NQ=F'];
        const es = this.marketData['ES=F'];
        const gc = this.marketData['GC=F'];
        const cl = this.marketData['CL=F'];
        
        if (!nq || !es || !gc || !cl) return;
        
        const techBroadDivergence = Math.abs(nq.changePercent - es.changePercent);
        const riskOnSignals = [
            cl.changePercent > 0 ? 1 : 0,
            gc.changePercent < 0 ? 1 : 0,
            nq.changePercent > es.changePercent ? 1 : 0
        ].reduce((sum, signal) => sum + signal, 0);
        
        this.marketMetrics = {
            techBroadDivergence: techBroadDivergence.toFixed(2),
            riskSentiment: riskOnSignals >= 2 ? 'Risk-On' : 'Risk-Off'
        };
    }

    // Generate SHORT format insights (under 100 chars)
    generateShortInsights() {
        const shorts = [
            "90% of futures traders lose money. Don't be the 90%.",
            "Risk 0.5% per trade. Survive to trade another day.",
            "Your stop loss is your lifeline. Honor it.",
            "Patience pays. Revenge trading kills accounts.",
            "Trade the plan. Don't plan the trade.",
            "Volume confirms price. No volume = fake move.",
            "Support/resistance are zones, not lines.",
            "The market doesn't care about your opinion.",
            "Position size determines survival rate.",
            "Overnight edge beats day trading noise."
        ];

        const nq = this.marketData['NQ=F'];
        const es = this.marketData['ES=F'];
        
        // Dynamic shorts based on market data
        if (nq && parseFloat(nq.volatility) > 25) {
            shorts.push(`NQ volatility: ${nq.volatility}%. High vol = mean reversion opportunity.`);
        }
        
        if (es && parseFloat(es.rangeRatio) > 1.8) {
            shorts.push(`ES range expansion ${es.rangeRatio}x. Momentum or fade?`);
        }

        if (this.marketMetrics.techBroadDivergence > 0.6) {
            shorts.push(`NQ/ES divergence: ${this.marketMetrics.techBroadDivergence}%. Mean reversion trade.`);
        }

        return shorts[Math.floor(Math.random() * shorts.length)];
    }

    // Generate MEDIUM format insights (100-180 chars)
    generateMediumInsights() {
        const mediums = [
            "Professional traders risk <0.5% per trade. Retail traders risk 3-5%. Math: 20 losses at 3% = -45% account. At 0.5% = -9.5%. Survival matters. #RiskManagement",
            
            "84% of retail traders close winners within 4 hours. Institutions hold overnight. Guess who makes more money? #TradingPsychology #OvernightEdge",
            
            "NQ/ES spread trades work best 10-11 AM EST. Normal spread: 0.3-0.5%. Mean reversion probability: 73%. Current spread matters. #SpreadTrading",
            
            "When futures gap >0.4%, fill probability within 90 minutes: 67%. Wait for initial failure, then fade the gap. Statistics over emotions. #GapTrading",
            
            "Volume >1.5x average + >1% move = institutional flow. Direction typically persists next session. Follow the smart money. #InstitutionalFlow"
        ];

        const nq = this.marketData['NQ=F'];
        const es = this.marketData['ES=F'];
        const gc = this.marketData['GC=F'];
        const cl = this.marketData['CL=F'];

        // Dynamic medium insights
        if (nq && parseFloat(nq.volatility) > 25) {
            mediums.push(`NQ volatility spike: ${nq.volatility}%. When >25%, next session shows mean reversion 73% of time. Current: ${nq.price}. Trade the statistics. #NQ #Volatility`);
        }

        if (es && parseFloat(es.rangeRatio) > 1.8) {
            mediums.push(`ES range expansion: ${es.rangeRatio}x normal. >1.8x leads to 2-day continuation 68% of time IF volume confirms. Vol ratio: ${es.volumeRatio}x #ES #RangeExpansion`);
        }

        if (gc && Math.abs(parseFloat(gc.changePercent)) > 1.2) {
            mediums.push(`Gold moves >${Math.abs(parseFloat(gc.changePercent)).toFixed(1)}% often continue 2-3 days. Current: $${gc.price}. Watch DXY correlation for confirmation. #GC #Gold`);
        }

        return mediums[Math.floor(Math.random() * mediums.length)];
    }

    // Generate LONG format insights (180-280 chars)
    generateLongInsights() {
        const longs = [
            "Futures trading reality check: 90% lose money because they risk 3-5% per trade vs professionals at 0.5%. Simple math: 20 consecutive losses at 5% risk = -64% account destruction. At 0.5% risk = -9.5% drawdown. Position sizing determines who survives. #RiskManagement #Futures",
            
            "The overnight edge in futures: Retail traders close profitable positions before 4 PM, missing institutional flow that drives 67% of meaningful moves during overnight sessions. If your strategy has positive overnight expectancy, hold through the close. #Psychology #OvernightTrading",
            
            "NQ/ES divergence trading edge: When spread exceeds 0.6%, mean reversion occurs within 3 sessions 81% of the time. Current spread matters less than the statistical probability of convergence. Trade the math, not the narrative. Best execution during 10-11 AM window. #SpreadTrading #NQ #ES",
            
            "Volume Profile secret: The Point of Control (highest volume node) acts as a price magnet 87% of the time during Regular Trading Hours. When futures move >2% from POC, expect return within 48 hours. This isn't prediction—it's probability based on institutional behavior patterns. #VolumeProfile"
        ];

        const nq = this.marketData['NQ=F'];
        const es = this.marketData['ES=F'];
        const gc = this.marketData['GC=F'];
        const cl = this.marketData['CL=F'];

        // Dynamic long insights with comprehensive analysis
        if (nq && es && this.marketMetrics.techBroadDivergence > 0.6) {
            longs.push(`Tech/Broad market divergence alert: NQ vs ES spread at ${this.marketMetrics.techBroadDivergence}% (current prices: NQ ${nq.price}, ES ${es.price}). When this divergence exceeds 0.6%, historical analysis shows mean reversion within 3 sessions occurs 81% of the time. Trade the convergence, not the trend. #NQ #ES #DivergenceTrading`);
        }

        if (gc && Math.abs(parseFloat(gc.changePercent)) > 1.2 && parseFloat(gc.volumeRatio) > 1.3) {
            longs.push(`Gold futures context: GC moving ${gc.changePercent > 0 ? '+' : ''}${parseFloat(gc.changePercent).toFixed(2)}% to $${gc.price} on ${gc.volumeRatio}x volume. Large moves >1.2% with volume confirmation typically extend 2-3 sessions before mean reversion. Key correlation: Inverse to DXY and real yields. #GC #Gold #MacroTrading`);
        }

        if (cl && parseFloat(cl.volumeRatio) > 1.5 && Math.abs(parseFloat(cl.changePercent)) > 2.0) {
            longs.push(`Crude oil spike analysis: CL at $${cl.price} (${cl.changePercent > 0 ? '+' : ''}${parseFloat(cl.changePercent).toFixed(2)}%) with ${cl.volumeRatio}x volume surge. When crude moves >2% on high volume, geopolitical premium typically fades within 5 sessions unless sustained catalyst. Trade the fade, not the fear. #CL #Oil #GeopoliticalFade`);
        }

        return longs[Math.floor(Math.random() * longs.length)];
    }

    // Select format and generate appropriate content
    generateVariedContent() {
        // Weight the formats: 30% short, 40% medium, 30% long
        const random = Math.random();
        let format;
        
        if (random < 0.3) {
            format = 'SHORT';
        } else if (random < 0.7) {
            format = 'MEDIUM';
        } else {
            format = 'LONG';
        }

        let content;
        switch (format) {
            case 'SHORT':
                content = this.generateShortInsights();
                break;
            case 'MEDIUM':
                content = this.generateMediumInsights();
                break;
            case 'LONG':
                content = this.generateLongInsights();
                break;
            default:
                content = this.generateMediumInsights();
        }

        return { content, format, length: content.length };
    }

    async postVariedContent() {
        try {
            if (this.dailyPostCount >= this.maxDailyPosts) return;

            await this.fetchAdvancedMarketData();
            let result = this.generateVariedContent();
            
            // Avoid duplicates
            let attempts = 0;
            while (this.postedToday.has(result.content) && attempts < 10) {
                result = this.generateVariedContent();
                attempts++;
            }

            console.log(`✅ Generated ${result.format} Insight (${this.dailyPostCount + 1}/10):`);
            console.log(`📏 Length: ${result.length} characters`);
            console.log(`📝 ${result.content}`);
            console.log(`📊 Market: NQ ${this.marketData['NQ=F']?.price || 'N/A'}, ES ${this.marketData['ES=F']?.price || 'N/A'}`);
            console.log('---\n');

            // Uncomment to actually post to Twitter
            // const tweet = await this.twitter.v2.tweet(result.content);
            // console.log(`🆔 Posted: ${tweet.data.id}`);
            
            this.postedToday.add(result.content);
            this.dailyPostCount++;
            
        } catch (error) {
            console.error('❌ Error:', error.message);
        }
    }

    async testVariedInsights(count = 6) {
        console.log('🧪 Testing Varied Length Insights (SHORT/MEDIUM/LONG)...\n');
        
        for (let i = 0; i < count; i++) {
            await this.postVariedContent();
            await new Promise(resolve => setTimeout(resolve, 1500));
        }
    }

    // Schedule posts throughout the day with varied lengths
    start() {
        console.log('🚀 Varied Length Futures Content Agent Started!');
        console.log('📏 Content Formats:');
        console.log('  - SHORT: Punchy 1-liners (<100 chars)');
        console.log('  - MEDIUM: Focused insights (100-180 chars)');
        console.log('  - LONG: Comprehensive analysis (180-280 chars)');
        console.log('📊 Distribution: 30% SHORT, 40% MEDIUM, 30% LONG');
        console.log('⏰ 10 posts per day, varied timing\n');

        // Schedule posts with varied timing (not too regular)
        const postTimes = [
            '0 6 * * *',   // 6:00 AM
            '15 7 * * *',  // 7:15 AM  
            '45 8 * * *',  // 8:45 AM
            '20 10 * * *', // 10:20 AM
            '30 11 * * *', // 11:30 AM
            '10 13 * * *', // 1:10 PM
            '40 14 * * *', // 2:40 PM
            '25 16 * * *', // 4:25 PM
            '15 18 * * *', // 6:15 PM
            '45 19 * * *'  // 7:45 PM
        ];

        postTimes.forEach((cronTime, index) => {
            cron.schedule(cronTime, () => {
                console.log(`⏰ Scheduled post ${index + 1}/10 triggered`);
                this.postVariedContent();
            });
        });

        // Reset at midnight
        cron.schedule('0 0 * * *', () => {
            this.postedToday.clear();
            this.dailyPostCount = 0;
            console.log('🔄 Daily reset complete');
        });

        // Post first content immediately
        console.log('🧪 Posting initial test content...');
        this.postVariedContent();
    }
}

// Test the varied length agent
async function runTest() {
    const agent = new VariedLengthInsightsAgent();
    await agent.testVariedInsights(8);
}

runTest();