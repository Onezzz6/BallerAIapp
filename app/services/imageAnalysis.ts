import { OPENAI_API_KEY } from '@env';
import * as FileSystem from 'expo-file-system';

console.log('Attempting to access env variables...');
console.log('OPENAI_API_KEY status:', OPENAI_API_KEY ? 'exists' : 'undefined');

const analyzeImage = async (imageUri: string) => {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API Key not found in environment variables');
  }

  try {
    console.log('Starting image analysis with local URI:', imageUri.substring(0, 50) + '...');
    
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
    
    const requestBody = {
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a professional nutritionist with expertise in analyzing food images with extreme accuracy. Your task is to carefully identify ALL food items in the image, provide precise portion size estimates, and calculate detailed macronutrient content. Even with unclear images, use your expert knowledge of food composition to make accurate estimates. Your analysis should be comprehensive and precise, focusing on providing the most accurate nutritional information possible. Return your analysis as valid JSON only."
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Analyze this food image in extreme detail. Identify each visible food item, estimate realistic portion sizes based on standard nutritional references, and calculate precise macronutrient content for each item. Think step by step before finalizing your calculations.\n\nIMPORTANT: Provide your detailed analysis ONLY as a properly formatted JSON object with this exact structure: {\"items\":[{\"name\":\"food name\",\"portion\":\"portion size\",\"macros\":{\"calories\":100,\"protein\":20,\"carbs\":30,\"fats\":10}}]}"
            },
            {
              type: "image_url",
              image_url: {
                url: dataUri // Use the base64 data URI instead of the local file URI
              }
            }
          ]
        }
      ],
      max_tokens: 1000, // Increased token limit for more detailed analysis
      temperature: 0.2, // Slightly lower temperature for more precision
      top_p: 0.95, // Add top_p parameter for better quality
      presence_penalty: 0.0, // Add presence_penalty to maintain focus
      frequency_penalty: 0.0 // Add frequency_penalty for consistency
    };
    
    console.log('Sending request to OpenAI API with base64-encoded image...');
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();
    
    console.log('API Response status:', response.status);
    console.log('API Response headers:', JSON.stringify(response.headers));
    
    if (data.error) {
      console.error('OpenAI API error:', JSON.stringify(data.error));
      throw new Error(data.error.message);
    }

    // Full API response log (without including the base64 data again to avoid huge logs)
    console.log('Full API response:', JSON.stringify({
      ...data,
      base64ImageIncluded: "Omitted from logs for brevity"
    }));
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid API response structure:', JSON.stringify(data));
      throw new Error('Invalid API response structure');
    }

    // Raw content from API
    const rawContent = data.choices[0].message.content;
    console.log('Raw GPT response content:', rawContent);

    // Clean the response string
    const cleanedContent = rawContent.trim();
    console.log('Cleaned content:', cleanedContent);
    
    // Try to extract JSON if it's wrapped in backticks
    let jsonContent = cleanedContent;
    if (cleanedContent.includes('```json')) {
      console.log('Detected JSON code block with language specifier');
      jsonContent = cleanedContent.split('```json')[1].split('```')[0].trim();
    } else if (cleanedContent.includes('```')) {
      console.log('Detected JSON code block without language specifier');
      jsonContent = cleanedContent.split('```')[1].split('```')[0].trim();
    }
    
    console.log('Processing content for JSON parsing:', jsonContent);
    
    try {
      // Parse the response content as JSON
      const analysisResult = JSON.parse(jsonContent);
      console.log('Successfully parsed JSON:', JSON.stringify(analysisResult));
      
      // Validate the structure of the result
      if (!analysisResult.items || !Array.isArray(analysisResult.items)) {
        console.error('Invalid response format: missing items array');
        throw new Error('Invalid response format: missing items array');
      }
      
      // Check if there are any items
      if (analysisResult.items.length === 0) {
        console.error('Empty items array in response');
        throw new Error('No food items detected in the image');
      }
      
      // Validate each item has the required fields
      for (const item of analysisResult.items) {
        console.log('Validating item:', JSON.stringify(item));
        
        if (!item.name || !item.portion || !item.macros) {
          console.error('Invalid item format, missing required fields:', JSON.stringify(item));
          throw new Error('Invalid item format: missing required fields');
        }
        
        if (typeof item.macros.calories !== 'number' ||
            typeof item.macros.protein !== 'number' ||
            typeof item.macros.carbs !== 'number' ||
            typeof item.macros.fats !== 'number') {
          console.error('Invalid macros format, values must be numbers:', JSON.stringify(item.macros));
          throw new Error('Invalid macros format: values must be numbers');
        }
      }
      
      console.log('Validation successful, returning analysis result');
      return analysisResult;
    } catch (parseError) {
      console.error('Error parsing JSON response:', parseError);
      console.error('Attempted to parse content:', jsonContent);
      
      // Last resort attempt - try to find any JSON object in the content
      try {
        console.log('Attempting last-resort JSON extraction...');
        const jsonMatches = jsonContent.match(/{.*}/s);
        if (jsonMatches && jsonMatches[0]) {
          console.log('Found potential JSON object:', jsonMatches[0]);
          const extractedJson = JSON.parse(jsonMatches[0]);
          
          if (extractedJson.items && Array.isArray(extractedJson.items)) {
            console.log('Successfully extracted valid JSON from content!');
            return extractedJson;
          }
        }
      } catch (extractError) {
        console.error('Last-resort extraction also failed:', extractError);
      }
      
      throw new Error('Failed to parse the AI response. The model didn\'t return valid JSON.');
    }
  } catch (error: any) {
    console.error('Error analyzing image:', error);
    throw new Error(error.message || 'Failed to analyze image');
  }
};

export default {
  analyzeImage
};