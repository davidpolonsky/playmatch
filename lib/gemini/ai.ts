import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

export const analyzePlayerCard = async (imageBase64: string) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `Analyze this soccer/football player card image and extract the following information in JSON format:
    {
      "name": "player full name",
      "position": "position (GK, DEF, MID, FWD)",
      "rating": number between 1-99,
      "isHistorical": boolean (true if retired/historical player),
      "year": "year or era if historical"
    }

    For the rating field:
    - Generate a realistic FIFA-style overall rating (1-99) based on the player's skill level during that specific year
    - Consider the player's peak performance, achievements, and abilities during that time period
    - Use knowledge of actual FIFA ratings if available, or estimate based on the player's real-world performance
    - Examples: Prime Messi (2010-2015) = 94-96, Prime Ronaldo = 94-96, World-class players = 85-93, Good players = 75-84, Average = 65-74

    If you cannot read the card clearly or it's not a soccer player card, return:
    {
      "error": "description of the issue"
    }

    IMPORTANT: Always provide a numeric rating, never null or undefined. Only return valid JSON, no additional text.`;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          mimeType: 'image/jpeg',
          data: imageBase64,
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();

    // Debug logging
    console.log('Raw Gemini response:', text);

    // Remove markdown code blocks if present
    const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();

    // Debug logging
    console.log('Cleaned text before parsing:', cleanText);

    return JSON.parse(cleanText);
  } catch (error) {
    console.error('Error analyzing card:', error);
    throw error;
  }
};

export const simulateMatch = async (
  team1Name: string,
  team1Players: any[],
  team2Name: string,
  team2Players: any[]
) => {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const prompt = `You are a soccer match simulator. Simulate a realistic match between two teams.

Team 1: ${team1Name}
Formation & Players:
${team1Players.map((p, i) => `${i + 1}. ${p.name} (${p.position}, Rating: ${p.rating}${p.isHistorical ? ', Historical' : ''})`).join('\n')}

Team 2: ${team2Name}
Formation & Players:
${team2Players.map((p, i) => `${i + 1}. ${p.name} (${p.position}, Rating: ${p.rating}${p.isHistorical ? ', Historical' : ''})`).join('\n')}

Simulate a complete match and provide results in the following JSON format:
{
  "team1Score": number,
  "team2Score": number,
  "summary": "A detailed, exciting 200-300 word match summary including key moments, goals, standout players, and how the match unfolded. Make it narrative and engaging like a sports commentator.",
  "keyMoments": [
    "Notable moment or goal description",
    "Another key moment"
  ],
  "manOfTheMatch": "Player name and brief reason"
}

Consider player ratings and positions when determining the outcome. Historical players should be evaluated at their peak performance. Make the match realistic and entertaining. Only return valid JSON.`;

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Remove markdown code blocks if present
    const cleanText = text.replace(/```json\n?|\n?```/g, '').trim();
    
    return JSON.parse(cleanText);
  } catch (error) {
    console.error('Error simulating match:', error);
    throw error;
  }
};
