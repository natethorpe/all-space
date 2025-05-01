// test-xai.js
const axios = require('axios');

async function testXAI() {
  try {
    const response = await axios.post(
      'https://api.x.ai/v1/chat/completions',
      {
        model: 'grok-2-latest',
        messages: [{ role: 'user', content: 'Test message' }],
        max_tokens: 500,
        stream: false,
        temperature: 0
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer xai-Of1Mms5FxczdY2ntrSbncP2awUtfDajc1NhtTD48OAmKBUlg9P5Nr8M5sijA5w1I7QuGrULLwzjus1vs`
        }
      }
    );
    console.log('Response:', response.data);
  } catch (error) {
    console.error('Error:', error.message, error.response?.data);
  }
}

testXAI();
