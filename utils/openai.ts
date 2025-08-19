import axios from 'axios';
import { auth } from '../config/firebase';

// Firebase Functions URL - update this with your project ID
const FIREBASE_PROJECT_ID = 'balleraidashboard'; // Your project ID from .env
const OPENAI_PROXY_URL = `https://us-central1-${FIREBASE_PROJECT_ID}.cloudfunctions.net/openaiProxy`;

// Function to call OpenAI API via Firebase Functions proxy
export const askOpenAI = async (question: string, userContext: string, conversationHistory: Array<{question: string, response: string}> = []) => {
  try {
    // Get the current user's ID token for authentication
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const idToken = await currentUser.getIdToken();

    // Build messages array starting with system message
    const messages = [
      { 
        role: 'system', 
        content: `You are an AI football coach and training assistant. Keep responses under 300 characters. ${userContext}` 
      }
    ];

    // Add conversation history
    conversationHistory.forEach(({ question, response }) => {
      messages.push({ role: 'user', content: question });
      messages.push({ role: 'assistant', content: response });
    });

    // Add the current question
    messages.push({ role: 'user', content: question });

    console.log('Calling OpenAI via Firebase Functions proxy...');

    // Call our Firebase Functions proxy instead of OpenAI directly
    const response = await axios.post(
      OPENAI_PROXY_URL,
      {
        messages,
        model: 'gpt-3.5-turbo',
        max_tokens: 150,
        temperature: 0.7
      },
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${idToken}`
        },
        timeout: 30000 // 30 second timeout
      }
    );

    if (response.data.choices && response.data.choices.length > 0) {
      return response.data.choices[0].message.content.trim();
    } else {
      throw new Error('No response from OpenAI');
    }

  } catch (error: any) {
    console.error('Error calling OpenAI proxy:', error);
    
    if (error.response) {
      console.error('Response data:', error.response.data);
      console.error('Response status:', error.response.status);
      
      if (error.response.status === 401) {
        throw new Error('Authentication failed. Please sign in again.');
      } else if (error.response.data?.details) {
        throw new Error(`OpenAI Error: ${error.response.data.details}`);
      }
    }
    
    throw new Error('Failed to get response from AI assistant');
  }
};

const openAIUtils = {
  askOpenAI,
};

export default openAIUtils; 