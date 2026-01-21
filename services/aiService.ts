// AI Service for Gemini-powered billboard suggestions
// Uses Google Gemini API for intelligent field suggestions

const GEMINI_API_KEY = (window as any).process?.env?.GEMINI_API_KEY || process.env.GEMINI_API_KEY;

interface AIGenerationResult {
  success: boolean;
  data?: any;
  error?: string;
}

// Generic function to call Gemini API
async function callGemini(prompt: string): Promise<AIGenerationResult> {
  if (!GEMINI_API_KEY) {
    console.warn('[AI Service] No Gemini API key configured');
    return { success: false, error: 'AI service not configured. Please add GEMINI_API_KEY to environment.' };
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.7,
            maxOutputTokens: 500,
          }
        })
      }
    );

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[AI Service] API error:', errorData);
      return { success: false, error: `API error: ${response.status}` };
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!text) {
      return { success: false, error: 'No response from AI' };
    }

    return { success: true, data: text };
  } catch (error: any) {
    console.error('[AI Service] Request failed:', error);
    return { success: false, error: error.message || 'Failed to connect to AI service' };
  }
}

// Generate visibility notes based on location
export async function generateVisibilityNotes(
  billboardName: string,
  town: string,
  locationDetails?: string
): Promise<AIGenerationResult> {
  const prompt = `You are a billboard advertising expert in Zimbabwe. Generate a brief, professional visibility analysis for a billboard with these details:
- Billboard Name/ID: ${billboardName}
- Location/Town: ${town}
${locationDetails ? `- Additional details: ${locationDetails}` : ''}

Write 2-3 sentences describing:
1. Traffic patterns and peak viewing times
2. Target demographics in this area
3. Visibility advantages

Keep it concise and professional. Don't use bullet points, write in paragraph form. Maximum 100 words.`;

  return callGemini(prompt);
}

// Estimate daily traffic based on location
export async function estimateDailyTraffic(
  town: string,
  locationDetails?: string
): Promise<AIGenerationResult> {
  const prompt = `You are a traffic analysis expert for Zimbabwe. Estimate the daily vehicle/pedestrian traffic for a billboard location:
- Town/City: ${town}
${locationDetails ? `- Location details: ${locationDetails}` : ''}

Based on typical traffic patterns for ${town} (considering if it's a major city, town center, highway, or rural area), provide ONLY a single number representing estimated daily impressions/views.

Known traffic patterns in Zimbabwe:
- Harare CBD: 50,000-150,000 daily
- Bulawayo CBD: 30,000-80,000 daily
- Major highway junctions: 20,000-50,000 daily
- Regional towns (Gweru, Mutare, Masvingo): 15,000-40,000 daily
- Smaller towns: 5,000-20,000 daily
- Rural areas: 1,000-5,000 daily

Respond with ONLY a number (no commas, no text). Example: 45000`;

  const result = await callGemini(prompt);
  
  if (result.success && result.data) {
    // Extract number from response
    const numMatch = result.data.match(/\d+/);
    if (numMatch) {
      return { success: true, data: parseInt(numMatch[0], 10) };
    }
  }
  
  return result;
}

// Suggest coordinates based on town/location name
export async function suggestCoordinates(
  town: string,
  locationDetails?: string
): Promise<AIGenerationResult> {
  const prompt = `You are a geolocation expert for Zimbabwe. Provide approximate GPS coordinates for a billboard location:
- Town/City: ${town}
${locationDetails ? `- Specific location: ${locationDetails}` : ''}

Zimbabwe coordinates reference:
- Harare: -17.8292, 31.0522
- Bulawayo: -20.1539, 28.5871
- Gweru: -19.4500, 29.8167
- Mutare: -18.9707, 32.6709
- Masvingo: -20.0744, 30.8328
- Victoria Falls: -17.9318, 25.8325
- Kwekwe: -18.9281, 29.8147
- Kadoma: -18.3333, 29.9167
- Chinhoyi: -17.3667, 30.2000
- Marondera: -18.1833, 31.5500

Respond with ONLY coordinates in this exact format: lat,lng
Example: -17.8292,31.0522

If the specific location is mentioned (e.g., "corner of First Street"), adjust the base coordinates slightly to approximate that location within the town.`;

  const result = await callGemini(prompt);
  
  if (result.success && result.data) {
    // Parse coordinates from response
    const coordMatch = result.data.match(/-?\d+\.?\d*\s*,\s*-?\d+\.?\d*/);
    if (coordMatch) {
      const [lat, lng] = coordMatch[0].split(',').map((s: string) => parseFloat(s.trim()));
      if (!isNaN(lat) && !isNaN(lng)) {
        return { success: true, data: { lat, lng } };
      }
    }
  }
  
  return { success: false, error: 'Could not parse coordinates from AI response' };
}

// Generate all suggestions at once
export async function generateAllSuggestions(
  billboardName: string,
  town: string,
  locationDetails?: string
): Promise<{
  visibility?: string;
  dailyTraffic?: number;
  coordinates?: { lat: number; lng: number };
  errors: string[];
}> {
  const errors: string[] = [];
  
  const [visibilityResult, trafficResult, coordsResult] = await Promise.all([
    generateVisibilityNotes(billboardName, town, locationDetails),
    estimateDailyTraffic(town, locationDetails),
    suggestCoordinates(town, locationDetails)
  ]);

  const result: any = { errors };

  if (visibilityResult.success) {
    result.visibility = visibilityResult.data;
  } else if (visibilityResult.error) {
    errors.push(`Visibility: ${visibilityResult.error}`);
  }

  if (trafficResult.success) {
    result.dailyTraffic = trafficResult.data;
  } else if (trafficResult.error) {
    errors.push(`Traffic: ${trafficResult.error}`);
  }

  if (coordsResult.success) {
    result.coordinates = coordsResult.data;
  } else if (coordsResult.error) {
    errors.push(`Coordinates: ${coordsResult.error}`);
  }

  return result;
}

// Check if AI service is available
export function isAIServiceAvailable(): boolean {
  return !!GEMINI_API_KEY;
}
