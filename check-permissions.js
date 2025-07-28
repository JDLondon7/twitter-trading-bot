require('dotenv').config();
const { TwitterApi } = require('twitter-api-v2');

async function checkPermissions() {
    console.log('🔍 Checking Twitter API permissions...\n');
    
    try {
        const twitter = new TwitterApi({
            appKey: process.env.TWITTER_API_KEY,
            appSecret: process.env.TWITTER_API_SECRET,
            accessToken: process.env.TWITTER_ACCESS_TOKEN,
            accessSecret: process.env.TWITTER_ACCESS_TOKEN_SECRET,
        });

        // Test read permissions
        console.log('📖 Testing READ permissions...');
        const me = await twitter.v2.me();
        console.log(`✅ READ permissions working - Account: @${me.data.username}`);
        
        // Check if we can write
        console.log('\n✍️ Testing WRITE permissions...');
        
        // Try to get rate limits (this might show write capabilities)
        const rateLimits = await twitter.v1.rateLimitStatuses();
        console.log('✅ API access confirmed');
        
        // The real test - try to post
        console.log('\n🐦 Testing actual tweet posting...');
        await twitter.v2.tweet({ text: 'Test tweet - please ignore' });
        console.log('✅ WRITE permissions confirmed!');
        
    } catch (error) {
        console.error('❌ Permission Error:', error.message);
        
        if (error.code === 403) {
            console.log('\n🔧 SOLUTION:');
            console.log('1. Go to: https://developer.twitter.com/en/portal/dashboard');
            console.log('2. Click on your app');
            console.log('3. Go to "App permissions"');
            console.log('4. Change from "Read" to "Read and Write"');
            console.log('5. Regenerate your Access Token and Secret');
            console.log('6. Update your .env file with new tokens');
        }
    }
}

checkPermissions();