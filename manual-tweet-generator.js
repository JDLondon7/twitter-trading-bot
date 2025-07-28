require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
const fs = require('fs');

async function generateManualTweets() {
    console.log('🚀 Professional Trading Tweet Generator (Manual Mode)\n');
    
    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(process.env.GOOGLE_AI_API_KEY);
    const geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
    
    const tweets = [];
    
    console.log('📊 Getting current market data...');
    
    // Get market data
    const marketData = {};
    for (const symbol of ['NQ=F', 'GC=F']) {
        try {
            const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=5m&range=1d`;
            const response = await fetch(url);
            const data = await response.json();
            
            if (data.chart?.result?.[0]) {
                const meta = data.chart.result[0].meta;
                const current = meta.regularMarketPrice;
                const previous = meta.previousClose;
                const change = ((current - previous) / previous) * 100;
                
                marketData[symbol] = {
                    symbol: symbol.replace('=F', ''),
                    price: current,
                    change: change.toFixed(2)
                };
            }
        } catch (e) {
            console.log(`⚠️ ${symbol}: Using fallback data`);
        }
        await new Promise(r => setTimeout(r, 200));
    }
    
    const marketSummary = Object.values(marketData).map(d => 
        `${d.symbol}: ${d.change}%`
    ).join(', ');
    
    console.log(`📈 Market: ${marketSummary}\n`);
    
    // Generate 5 different types of tweets
    const strategies = [
        'Reality check about day trading',
        'Market observation using current data', 
        'Risk management insight',
        'Trading psychology truth',
        'Professional tip about futures'
    ];
    
    for (let i = 0; i < 5; i++) {
        console.log(`🧠 Generating tweet ${i + 1}/5...`);
        
        const prompt = `You are a professional day trader (36 years old) specializing in NQ/MNQ, ES/MES, GC/MGC, CL/MCL.

STYLE: Direct, professional, no-bullshit. No slang, no fluff.
CURRENT MARKET: ${marketSummary}

Create: ${strategies[i]}

Requirements:
- Under 280 characters
- Professional and direct
- Use current market context if relevant
- Provide real value to other traders

Make it engaging but professional.`;

        try {
            const result = await geminiModel.generateContent(prompt);
            const content = result.response.text().trim().replace(/^[\"']|[\"']$/g, '');
            
            const tweet = {
                number: i + 1,
                content: content.substring(0, 280),
                strategy: strategies[i],
                market: marketSummary,
                timestamp: new Date().toLocaleString()
            };
            
            tweets.push(tweet);
            
            console.log(`📝 Tweet ${i + 1}:`);
            console.log(`"${tweet.content}"`);
            console.log(`📏 ${tweet.content.length} characters\n`);
            
        } catch (error) {
            console.log(`❌ Error generating tweet ${i + 1}: ${error.message}`);
        }
        
        await new Promise(r => setTimeout(r, 1500));
    }
    
    // Save for manual posting
    const output = {
        generated: new Date().toISOString(),
        market_context: marketSummary,
        ready_to_post: tweets
    };
    
    fs.writeFileSync('ready-tweets.json', JSON.stringify(output, null, 2));
    
    // Create simple copy-paste format
    const copyPaste = tweets.map(t => 
        `TWEET ${t.number}:\n${t.content}\n${'='.repeat(50)}\n`
    ).join('\n');
    
    fs.writeFileSync('copy-paste-tweets.txt', copyPaste);
    
    console.log('✅ TWEETS GENERATED SUCCESSFULLY!\n');
    console.log('📁 Files created:');
    console.log('  - ready-tweets.json (full data)');
    console.log('  - copy-paste-tweets.txt (easy copy-paste)\n');
    console.log('🐦 NEXT STEPS:');
    console.log('1. Open copy-paste-tweets.txt');
    console.log('2. Copy each tweet and paste to Twitter');
    console.log('3. Post manually or use scheduling tool');
    console.log('4. Apply for Twitter Elevated access for automation\n');
    
    console.log('📊 TODAY\'S CONTENT PREVIEW:');
    tweets.forEach(t => {
        console.log(`${t.number}. "${t.content.substring(0, 60)}..."`);
    });
}

generateManualTweets().catch(console.error);