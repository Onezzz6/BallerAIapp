import { OPENAI_API_KEY } from '@env';

console.log('Attempting to access env variables...');
console.log('OPENAI_API_KEY status:', OPENAI_API_KEY ? 'exists' : 'undefined');

const analyzeImage = async (imageUri: string) => {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API Key not found in environment variables');
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Analyze this food image and return ONLY a JSON object in this exact format, with no backticks or additional text: {\"items\":[{\"name\":\"food name\",\"portion\":\"portion size\",\"macros\":{\"calories\":100,\"protein\":20,\"carbs\":30,\"fats\":10}}]}"
              },
              {
                type: "image_url",
                image_url: {
                  url: imageUri
                }
              }
            ]
          }
        ],
        max_tokens: 300
      })
    });

    const data = await response.json();
    
    if (data.error) {
      throw new Error(data.error.message);
    }

    // Add debug log
    console.log('Raw GPT response:', data.choices[0].message.content);

    // Clean the response string
    const cleanedContent = data.choices[0].message.content.trim();
    
    // Parse the response content as JSON
    const analysisResult = JSON.parse(cleanedContent);
    
    return analysisResult;

  } catch (error: any) {
    console.error('Error analyzing image:', error);
    throw new Error(error.message || 'Failed to analyze image');
  }
};

export default {
  analyzeImage
};