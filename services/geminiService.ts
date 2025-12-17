import { GoogleGenAI, Type } from "@google/genai";
import { BlogCategory, WordCount, BlogPostData, TopicSuggestion, TimeRange } from "../types";

// Helper to get client with current key
const getClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

const blogSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING },
    introduction: { type: Type.STRING },
    body: { type: Type.STRING },
    conclusion: { type: Type.STRING },
    imagePrompt: { type: Type.STRING },
    chart: {
      type: Type.OBJECT,
      properties: {
        title: { type: Type.STRING },
        type: { type: Type.STRING },
        data: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              value: { type: Type.NUMBER }
            }
          }
        }
      }
    },
    sponsoredLink: {
      type: Type.OBJECT,
      properties: {
        anchor: { type: Type.STRING },
        url: { type: Type.STRING },
        description: { type: Type.STRING }
      }
    }
  },
  required: ["title", "introduction", "body", "conclusion", "imagePrompt"]
};

export const generateBlogPost = async (
  topic: string,
  category: BlogCategory,
  length: WordCount
): Promise<BlogPostData> => {
  const ai = getClient();
  const prompt = `Jesteś nagradzanym blogerem. Napisz post: ${topic} (${category}, ok. ${length}). Użyj Markdown, AIDA, dużo emoji. Język polski.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', 
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: blogSchema as any,
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Content generation failed:", error);
    throw error;
  }
};

export const generateTrendingTopics = async (
  category: string,
  range: TimeRange
): Promise<{ topics: TopicSuggestion[], sources: { title: string, uri: string }[] }> => {
  const ai = getClient();
  const prompt = `Wyszukaj aktualne trendy (${range}) dla kategorii: "${category}". Zwróć 6 tematów w JSON: [{"title": "...", "description": "..."}]. Język polski.`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] }
    });

    const raw = response.text || "[]";
    const jsonMatch = raw.match(/\[\s*\{[\s\S]*\}\s*\]/);
    const topics = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    
    const sources: { title: string, uri: string }[] = [];
    const grounding = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    grounding.forEach(c => {
      if (c.web?.uri) sources.push({ title: c.web.title || 'Źródło', uri: c.web.uri });
    });
    
    return { topics, sources };
  } catch (error) {
    console.error("Trends failed, trying fallback...", error);
    // Fallback if Google Search is restricted
    const fallbackAi = getClient();
    const fallbackResponse = await fallbackAi.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Zaproponuj 6 ponadczasowych tematów dla: ${category}. Zwróć JSON: [{"title": "...", "description": "..."}]`,
    });
    const raw = fallbackResponse.text || "[]";
    const jsonMatch = raw.match(/\[\s*\{[\s\S]*\}\s*\]/);
    return { topics: jsonMatch ? JSON.parse(jsonMatch[0]) : [], sources: [] };
  }
};

export const generateBlogImage = async (prompt: string): Promise<string> => {
  const ai = getClient();
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', 
      contents: { parts: [{ text: prompt }] },
      config: { imageConfig: { aspectRatio: "16:9" } }
    });
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) return `data:image/png;base64,${part.inlineData.data}`;
    }
    throw new Error("No image data");
  } catch (error) {
    console.error("Image generation failed:", error);
    throw error;
  }
};

export const generateMoreContent = async (title: string, context: string): Promise<string> => {
  const ai = getClient();
  const prompt = `Kontynuuj artykuł "${title}". Kontekst: ${context.slice(-500)}. Markdown, emoji. Język polski.`;
  const response = await ai.models.generateContent({ model: 'gemini-3-pro-preview', contents: prompt });
  return response.text || "";
};