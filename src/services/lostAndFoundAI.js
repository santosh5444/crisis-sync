import { GROQ_API_KEY } from "../utils/constants";

export async function categorizeItem(title, description) {
  try {
    if (!GROQ_API_KEY || GROQ_API_KEY === "MOCK_GEMINI_KEY" || GROQ_API_KEY === "MOCK_GROQ_KEY") {
      return ["General"];
    }

    const prompt = `Item Title: ${title}
Description: ${description || 'None provided'}

Analyze the item and return a JSON array of 1 to 3 relevant category tags (e.g., ["Electronics", "Phones"], ["Keys", "Vehicle"], ["Bags", "Luggage"], ["Jewelry", "Accessories"]). 
Return ONLY the JSON array exactly matching this format:
["Tag1", "Tag2"]`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You are an AI categorization assistant. Respond ONLY with a valid JSON array of category strings." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const text = data.choices[0].message.content;
    return JSON.parse(text);
  } catch (error) {
    console.warn("Groq Categorization failed, using default 'General'.", error);
    return ["General"];
  }
}

export function runLocalMatchingFallback(newItem, existingItems) {
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

export async function findPotentialMatches(newItem, existingItems) {
  try {
    if (!GROQ_API_KEY || GROQ_API_KEY === "MOCK_GEMINI_KEY" || GROQ_API_KEY === "MOCK_GROQ_KEY" || existingItems.length === 0) {
      return runLocalMatchingFallback(newItem, existingItems);
    }

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
Note: Patients often misremember where they lost an item, or items can be carried to other floors/areas by staff. Therefore, prioritize title and description matches (especially unique physical features like colors, brands, or zippers) over strict location matches.

Return a JSON object containing an array of matching item IDs under the key "matches". If none match, return an empty array under "matches".
Return ONLY the JSON object matching this format:
{
  "matches": ["id1", "id2"]
}`;

    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${GROQ_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          { role: "system", content: "You are an AI matching assistant for lost and found items. Respond ONLY with a valid JSON object containing a 'matches' array." },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.1
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Groq API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();
    const text = data.choices[0].message.content;
    const parsed = JSON.parse(text);
    
    // Support both direct array output and the wrapped object format
    if (parsed && Array.isArray(parsed.matches)) {
      return parsed.matches;
    }
    if (Array.isArray(parsed)) {
      return parsed;
    }
    return [];
  } catch (error) {
    console.warn("Groq Matching failed, using local matching fallback.", error);
    return runLocalMatchingFallback(newItem, existingItems);
  }
}
