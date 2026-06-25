import { GROQ_API_KEY } from "../utils/constants";

export async function analyzeCrisis(type, description, location, facilityType = 'Hospital') {
  try {
    if (!GROQ_API_KEY || GROQ_API_KEY === "MOCK_GEMINI_KEY" || GROQ_API_KEY === "MOCK_GROQ_KEY") {
      throw new Error("No Groq API key configured");
    }

    const prompt = `Emergency type: ${type}
Description: ${description || 'None provided'}
Location: ${location}
Building: ${facilityType}

Analyze and return JSON exactly matching this format:
{
  "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "recommendedAction": "string",
  "autoCallService": "FIRE" | "POLICE" | "AMBULANCE" | "NONE",
  "broadcastMessage": "string (calm message for all building users, do not cause panic)",
  "estimatedResponseTime": 120
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
          { role: "system", content: "You are an emergency response AI assistant. Respond ONLY with a valid JSON object matching the requested schema." },
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
    console.warn("Groq Analysis failed, using rule-based fallback.", error);
    // Fallback logic
    let severity = "MEDIUM";
    let autoCallService = "NONE";
    
    if (type.includes("FIRE") || type.includes("TERRORIST")) severity = "CRITICAL";
    if (type.includes("MEDICAL")) severity = "HIGH";
    
    if (type.includes("FIRE")) autoCallService = "FIRE";
    if (type.includes("MEDICAL")) autoCallService = "AMBULANCE";
    if (type.includes("TERRORIST") || type.includes("ROBBERY")) autoCallService = "POLICE";

    return {
      severity,
      recommendedAction: "Dispatch nearest available personnel immediately.",
      autoCallService,
      broadcastMessage: "We are responding to a situation on the premises. Please stay alert and await instructions.",
      estimatedResponseTime: 60
    };
  }
}

export async function analyzeServiceRequest(text) {
  try {
    if (!GROQ_API_KEY || GROQ_API_KEY === "MOCK_GEMINI_KEY" || GROQ_API_KEY === "MOCK_GROQ_KEY") {
      throw new Error("No Groq API key configured");
    }

    const prompt = `Service request text: "${text}"

Analyze this hospital patient/visitor service request and return JSON exactly matching this format:
{
  "isEmergency": true | false,
  "suggestedCategory": "NURSE" | "WHEELCHAIR" | "WATER" | "BATHROOM" | "MEDS" | "MEAL" | "COMFORT" | "CLEAN" | "OTHER",
  "urgency": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "englishTranslation": "string (translate to English if input is in another language, otherwise repeat input)",
  "flagReason": "string (brief reason for categorization/urgency)"
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
          { role: "system", content: "You are a hospital triage assistant. Respond ONLY with a valid JSON object matching the requested schema." },
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
    const textResult = data.choices[0].message.content;
    return JSON.parse(textResult);
  } catch (error) {
    console.warn("Groq Triage failed, using fallback.", error);
    const lower = text.toLowerCase();
    let isEmergency = false;
    let suggestedCategory = "OTHER";
    let urgency = "LOW";

    if (lower.includes("pain") || lower.includes("chest") || lower.includes("breath") || lower.includes("bleed") || lower.includes("hurt") || lower.includes("fall")) {
      isEmergency = true;
      urgency = "CRITICAL";
      suggestedCategory = "NURSE";
    } else if (lower.includes("pill") || lower.includes("med") || lower.includes("medicine")) {
      suggestedCategory = "MEDS";
      urgency = "MEDIUM";
    } else if (lower.includes("food") || lower.includes("meal") || lower.includes("eat") || lower.includes("diet")) {
      suggestedCategory = "MEAL";
      urgency = "LOW";
    } else if (lower.includes("clean") || lower.includes("spill") || lower.includes("dirty") || lower.includes("sweep")) {
      suggestedCategory = "CLEAN";
      urgency = "MEDIUM";
    } else if (lower.includes("blanket") || lower.includes("pillow") || lower.includes("cold")) {
      suggestedCategory = "COMFORT";
      urgency = "LOW";
    } else if (lower.includes("water") || lower.includes("drink")) {
      suggestedCategory = "WATER";
      urgency = "LOW";
    } else if (lower.includes("toilet") || lower.includes("bathroom") || lower.includes("washroom")) {
      suggestedCategory = "BATHROOM";
      urgency = "MEDIUM";
    } else if (lower.includes("wheelchair") || lower.includes("walk")) {
      suggestedCategory = "WHEELCHAIR";
      urgency = "MEDIUM";
    }

    return {
      isEmergency,
      suggestedCategory,
      urgency,
      englishTranslation: text,
      flagReason: `Local matching rule-based fallback (Error: ${error.message || error})`
    };
  }
}
