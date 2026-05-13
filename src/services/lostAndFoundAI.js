import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_API_KEY } from "../utils/constants";

export async function categorizeItem(title, description) {
  try {
    if (GEMINI_API_KEY === "MOCK_GEMINI_KEY") {
      return ["General"]; // Fallback for mock
    }
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig: { responseMimeType: "application/json" } });
    
    const prompt = `Item Title: ${title}
Description: ${description || 'None provided'}

Analyze the item and return a JSON array of 1 to 3 relevant category tags (e.g., ["Electronics", "Phones"], ["Keys", "Vehicle"], ["Bags", "Luggage"], ["Jewelry", "Accessories"]). 
Return ONLY the JSON array exactly matching this format:
["Tag1", "Tag2"]`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(text);
  } catch (error) {
    console.warn("Gemini Categorization failed.", error);
    return ["General"];
  }
}

export async function findPotentialMatches(newItem, existingItems) {
  try {
    if (GEMINI_API_KEY === "MOCK_GEMINI_KEY" || existingItems.length === 0) {
      // Local fallback matching based on words and location for demo
      const oppositeType = newItem.type === 'LOST' ? 'FOUND' : 'LOST';
      const candidates = existingItems.filter(item => item.type === oppositeType && item.status === 'OPEN');
      
      const newTitleWords = newItem.title.toLowerCase().split(/\s+/);
      const newLocation = newItem.location.toLowerCase();

      const matches = [];
      candidates.forEach(cand => {
        const candTitleWords = cand.title.toLowerCase().split(/\s+/);
        const candLocation = cand.location.toLowerCase();

        // Check if they share any significant word in the title (length > 3)
        const titleMatch = newTitleWords.some(word => word.length > 3 && candTitleWords.includes(word));
        
        // Check if locations are similar
        const locationMatch = newLocation.includes(candLocation) || candLocation.includes(newLocation);

        if (titleMatch || (locationMatch && newItem.location.length > 3)) {
          matches.push(cand.itemId);
        }
      });
      return matches; 
    }

    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig: { responseMimeType: "application/json" } });
    
    // We only want to match LOST with FOUND, and FOUND with LOST.
    const oppositeType = newItem.type === 'LOST' ? 'FOUND' : 'LOST';
    const candidates = existingItems.filter(item => item.type === oppositeType && item.status === 'OPEN');

    if (candidates.length === 0) return [];

    const candidatesJson = JSON.stringify(candidates.map(c => ({
      id: c.itemId,
      title: c.title,
      description: c.description,
      location: c.location,
      date: c.timestamp
    })));

    const prompt = `New Item (${newItem.type}):
Title: ${newItem.title}
Description: ${newItem.description || 'None'}
Location: ${newItem.location}

Here is a list of open ${oppositeType} items:
${candidatesJson}

Analyze if the new item is a highly probable match with any of the existing items. A match means the LOST item is likely the exact same physical object as the FOUND item.
Return a JSON array of IDs of the existing items that are potential matches. If none match, return an empty array [].
Return ONLY the JSON array exactly matching this format:
["id1", "id2"]`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(text);
  } catch (error) {
    console.warn("Gemini Matching failed.", error);
    return [];
  }
}
