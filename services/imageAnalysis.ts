import * as FileSystem from 'expo-file-system';
import { auth } from '../config/firebase';

// Firebase Functions URL
const FIREBASE_PROJECT_ID = 'love-b6fe6';
const OPENAI_PROXY_URL = `https://us-central1-${FIREBASE_PROJECT_ID}.cloudfunctions.net/openaiProxy`;

const analyzeImage = async (imageUri: string) => {
  try {
    console.log('Starting image analysis with local URI:', imageUri.substring(0, 50) + '...');
    
    // Get the current user's ID token for authentication
    const currentUser = auth().currentUser;
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    const idToken = await currentUser.getIdToken();
    
    // Convert local file URI to base64 - this is crucial for OpenAI to read local images
    let base64Image: string;
    try {
      console.log('Converting image to base64...');
      // Read the image with high quality
      base64Image = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      console.log('Successfully converted image to base64 string of length:', base64Image.length);
    } catch (encodingError) {
      console.error('Error encoding image to base64:', encodingError);
      throw new Error('Failed to encode image. Please try another image.');
    }

    // Format as data URI with proper MIME type
    const mimeType = imageUri.endsWith('.png') ? 'image/png' : 'image/jpeg';
    const dataUri = `data:${mimeType};base64,${base64Image}`;
    
    const messages = [
      {
        role: "system",
        content: "You are a professional nutritionist with expertise in analyzing food images with extreme accuracy. Your task is to carefully identify ALL food items in the image, provide precise portion size estimates, and calculate detailed macronutrient content. Even with unclear images, use your expert knowledge of food composition to make accurate estimates. Your analysis should be comprehensive and precise, focusing on providing the most accurate nutritional information possible. Return your analysis as valid JSON only."
      },
      {
        role: "user",
        content: `Analyze this food image in extreme detail. Identify each visible food item, estimate realistic portion sizes based on standard nutritional references, and calculate precise macronutrient content for each item. Think step by step before finalizing your calculations.

IMPORTANT: Provide your detailed analysis ONLY as a properly formatted JSON object with this exact structure: {"items":[{"name":"food name","portion":"portion size","macros":{"calories":100,"protein":20,"carbs":30,"fats":10}}]}

IMAGE_DATA: ${dataUri}`
      }
    ];
    
    console.log('Sending request to OpenAI via Firebase Functions proxy...');
    
    const response = await fetch(OPENAI_PROXY_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${idToken}`,
      },
      body: JSON.stringify({
        messages,
        model: 'gpt-4o',
        max_tokens: 3000,
        temperature: 0.3
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.details || `HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    
    console.log('API Response status:', response.status);
    
    if (data.choices && data.choices.length > 0) {
      const analysisText = data.choices[0].message.content.trim();
      console.log('Raw analysis text:', analysisText);
      
      // Parse the JSON response
      try {
        // Find JSON in the response (in case there's extra text)
        const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
        if (!jsonMatch) {
          throw new Error('No JSON found in response');
        }
        
        const analysisJson = JSON.parse(jsonMatch[0]);
        console.log('Parsed analysis JSON:', analysisJson);
        
        // Validate the structure
        if (!analysisJson.items || !Array.isArray(analysisJson.items)) {
          throw new Error('Invalid analysis format - items array missing');
        }
        
        return analysisJson;
      } catch (parseError) {
        console.error('Failed to parse analysis JSON:', parseError);
        throw new Error('Failed to parse nutrition analysis. Please try again.');
      }
    } else {
      throw new Error('No response from OpenAI');
    }
  } catch (error: any) {
    console.error('Error in image analysis:', error);
    
    if (error.message.includes('401')) {
      throw new Error('Authentication failed. Please sign in again.');
    }
    
    throw new Error(error.message || 'Failed to analyze image');
  }
};

export { analyzeImage };