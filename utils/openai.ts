import axios from 'axios';
import Constants from 'expo-constants';

// Get the API key from environment variables via Expo's Constants
const OPENAI_API_KEY = Constants.expoConfig?.extra?.openaiApiKey;

// Function to call OpenAI API with conversation context
export const askOpenAI = async (question: string, userContext: string, conversationHistory: Array<{question: string, response: string}> = []) => {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key is missing');
  }

  try {
    // Build messages array starting with system message
    const messages = [
      { 
        role: 'system', 
        content: `You are an AI football coach and training assistant. Keep responses under 300 characters. ${userContext}` 
      }
    ];

    // Add conversation history for context (limit to last 10 exchanges to manage token usage)
    const recentHistory = conversationHistory.slice(-10);
    recentHistory.forEach(exchange => {
      messages.push({ role: 'user', content: exchange.question });
      messages.push({ role: 'assistant', content: exchange.response });
    });

    // Add the current question
    messages.push({ role: 'user', content: question });

    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: messages,
        max_tokens: 100  // Roughly 300 characters
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        }
      }
    );
    
    // Log token usage for chat feature
    const usage = response.data.usage;
    if (usage) {
      console.log('🤖 CHAT AI TOKEN USAGE:', {
        prompt_tokens: usage.prompt_tokens,
        completion_tokens: usage.completion_tokens,
        total_tokens: usage.total_tokens,
        model: 'gpt-4o',
        feature: 'chat',
        timestamp: new Date().toISOString()
      });
    }
    
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling OpenAI API:', error);
    throw error;
  }
};

// Create a default export with all utility functions
const openAIUtils = {
  askOpenAI,
};

export default openAIUtils; 