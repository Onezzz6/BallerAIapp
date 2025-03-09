import axios from 'axios';
import Constants from 'expo-constants';

// Get the API key from environment variables via Expo's Constants
const OPENAI_API_KEY = Constants.expoConfig?.extra?.openaiApiKey;

// Function to call OpenAI API
export const askOpenAI = async (question: string, userContext: string) => {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key is missing');
  }

  try {
    const response = await axios.post(
      'https://api.openai.com/v1/chat/completions',
      {
        model: 'gpt-4o',
        messages: [
          { 
            role: 'system', 
            content: `You are BallerAI, a football training assistant. Keep responses under 300 characters. ${userContext}` 
          },
          { 
            role: 'user', 
            content: question 
          }
        ],
        max_tokens: 100  // Roughly 300 characters
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${OPENAI_API_KEY}`
        }
      }
    );
    
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