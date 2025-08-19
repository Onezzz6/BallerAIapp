import { auth } from '../config/firebase';

// Firebase Functions URL - update this with your project ID
const FIREBASE_PROJECT_ID = 'balleraidashboard';
const OPENAI_PROXY_URL = `https://us-central1-${FIREBASE_PROJECT_ID}.cloudfunctions.net/openaiProxy`;

// Base function to call OpenAI via Firebase Functions proxy
const callOpenAI = async (messages: Array<{role: string, content: string}>, options: {
  model?: string;
  max_tokens?: number;
  temperature?: number;
} = {}) => {
  try {
    // Get the current user's ID token for authentication
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const idToken = await currentUser.getIdToken();

    console.log('Calling OpenAI via Firebase Functions proxy...');

    const response = await fetch(OPENAI_PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`
      },
      body: JSON.stringify({
        messages,
        model: options.model || 'gpt-3.5-turbo',
        max_tokens: options.max_tokens || 150,
        temperature: options.temperature || 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();

    if (data.choices && data.choices.length > 0) {
      return data.choices[0].message.content.trim();
    } else {
      throw new Error('No response from OpenAI');
    }

  } catch (error: any) {
    console.error('Error calling OpenAI proxy:', error);
    
    if (error.message.includes('401')) {
      throw new Error('Authentication failed. Please sign in again.');
    }
    
    throw new Error(error.message || 'Failed to get response from AI assistant');
  }
};

// Chat function (for home screen)
export const askOpenAI = async (question: string, userContext: string, conversationHistory: Array<{question: string, response: string}> = []) => {
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

  return callOpenAI(messages, { max_tokens: 150 });
};

// Training plan generation (for training screen)
export const generateTrainingPlan = async (userProfile: any, preferences: any) => {
  const messages = [
    {
      role: 'system',
      content: 'You are an expert football/soccer training coach. Generate personalized training plans based on user data.'
    },
    {
      role: 'user',
      content: `Generate a training plan for: ${JSON.stringify({ userProfile, preferences })}`
    }
  ];

  return callOpenAI(messages, { 
    model: 'gpt-3.5-turbo',
    max_tokens: 800,
    temperature: 0.7 
  });
};

// Recovery plan generation (for recovery screen)
export const generateRecoveryPlan = async (userProfile: any, recoveryNeeds: any) => {
  const messages = [
    {
      role: 'system',
      content: 'You are an expert sports recovery and wellness coach. Generate personalized recovery plans.'
    },
    {
      role: 'user',
      content: `Generate a recovery plan for: ${JSON.stringify({ userProfile, recoveryNeeds })}`
    }
  ];

  return callOpenAI(messages, { 
    model: 'gpt-3.5-turbo',
    max_tokens: 600,
    temperature: 0.7 
  });
};

const openAIBackendService = {
  askOpenAI,
  generateTrainingPlan,
  generateRecoveryPlan,
  callOpenAI
};

export default openAIBackendService; 