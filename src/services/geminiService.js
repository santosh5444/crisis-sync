import { GoogleGenerativeAI } from "@google/generative-ai";
import { GEMINI_API_KEY } from "../utils/constants";

export async function analyzeCrisis(type, description, location) {
  try {
    if (GEMINI_API_KEY === "MOCK_GEMINI_KEY") {
      throw new Error("Using mock key");
    }
    const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash", generationConfig: { responseMimeType: "application/json" } });
    
    const prompt = `Emergency type: ${type}
Description: ${description || 'None provided'}
Location: ${location}
Building: Hotel/Hospitality venue

Analyze and return JSON exactly matching this format:
{
  "severity": "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
  "recommendedAction": "string",
  "autoCallService": "FIRE" | "POLICE" | "AMBULANCE" | "NONE",
  "broadcastMessage": "string (calm message for all building users, do not cause panic)",
  "estimatedResponseTime": 120
}`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    return JSON.parse(text);
  } catch (error) {
    console.warn("Gemini Analysis failed, using rule-based fallback.", error);
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
