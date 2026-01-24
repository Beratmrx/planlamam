
// Always use GoogleGenAI from @google/genai
import { GoogleGenAI, Type } from "@google/genai";

export const getSmartSuggestions = async (categoryName: string): Promise<string[]> => {
  // Always create a new instance right before making an API call to ensure it uses the most up-to-date API key.
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `"${categoryName}" kategorisi için 3 tane kısa ve öz yapılacak iş önerisi ver. Sadece işlerin isimlerini içeren bir liste döndür.`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.STRING,
          }
        },
      },
    });

    // The GenerateContentResponse features a .text property (not a method).
    const text = response.text;
    if (text) {
      try {
        return JSON.parse(text);
      } catch (e) {
        console.error("JSON parse error:", e);
        return [];
      }
    }
    return [];
  } catch (error) {
    console.error("Gemini Suggestion Error:", error);
    // Return empty list on failure for the UI to handle gracefully.
    return [];
  }
};
