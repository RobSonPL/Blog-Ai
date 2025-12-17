import { GoogleGenAI, Type } from "@google/genai";
import { BlogCategory, WordCount, BlogPostData, TopicSuggestion, TimeRange } from "../types";

// Helper to get client with current key
const getClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// Define schema as a plain object adhering to @google/genai Type enum
const blogSchema = {
  type: Type.OBJECT,
  properties: {
    title: { type: Type.STRING, description: "Chwytliwy tytuł bloga (H1)" },
    introduction: { type: Type.STRING, description: "Sekcja 'Attention' z modelu AIDA. Wstęp emocjonalny." },
    body: { type: Type.STRING, description: "Główna treść (Interest & Desire). Używaj Markdown. Zamiast standardowych punktorów używaj emoji." },
    conclusion: { type: Type.STRING, description: "Sekcja 'Action'. Wezwanie do działania i podsumowanie." },
    imagePrompt: { type: Type.STRING, description: "Szczegółowy prompt do wygenerowania grafiki pasującej do artykułu." },
    chart: {
      type: Type.OBJECT,
      description: "Opcjonalne dane do wykresu, jeśli pasują do treści.",
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
      description: "Propozycja linku sponsorowanego (zmyślona lub generyczna).",
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
  
  const prompt = `
    Jesteś nagradzanym blogerem z 10-letnim doświadczeniem. Twoim zadaniem jest napisanie posta na bloga.
    Cechy: Profesjonalny, motywacyjny, przyjacielski, emocjonalny.
    
    Temat: ${topic}
    Kategoria: ${category}
    Długość: ${length}
    
    Wymagania:
    1. Użyj modelu AIDA (Attention, Interest, Desire, Action).
    2. Formatowanie: Używaj Markdown do strukturyzacji (H2, H3, pogrubienia).
    3. WAŻNE: W treści używaj dużo emotikonów. Zamiast zwykłych myślników w listach, używaj pasujących emoji (np. ✅, 👉, 💡).
    4. Nagłówki powinny być chwytliwe i zawierać emoji.
    5. Styl ma być bardzo wizualny i atrakcyjny ("insta-friendly").
    6. Jeśli temat pozwala, zaproponuj dane do prostego wykresu.
    7. Język: Polski.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // High intelligence model for text
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: blogSchema,
      }
    });

    const text = response.text;
    if (!text) throw new Error("Brak odpowiedzi tekstowej z modelu.");
    
    return JSON.parse(text) as BlogPostData;
  } catch (error) {
    console.error("Błąd generowania tekstu:", error);
    throw error;
  }
};

export const generateMoreContent = async (
  currentTitle: string,
  currentBodyContext: string
): Promise<string> => {
  const ai = getClient();
  
  const prompt = `
    Jesteś tym samym nagradzanym blogerem.
    
    Kontekst: Piszesz artykuł pt. "${currentTitle}".
    Ostatnia część treści (kontekst): "${currentBodyContext.slice(-500)}"
    
    Zadanie: Napisz kolejną, logiczną sekcję tego artykułu (kontynuację).
    Format: Markdown. Rozpocznij od nagłówka H2.
    Styl: Ten sam co wcześniej - emocjonalny, dużo emoji, merytoryczny.
    Długość: Około 200-300 słów.
    Nie pisz podsumowania ani zakończenia (to już mamy). Po prostu rozwiń temat o kolejny wątek.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
    });

    return response.text || "";
  } catch (error) {
    console.error("Błąd generowania kontynuacji:", error);
    throw error;
  }
};

export const generateTrendingTopics = async (
  category: string,
  range: TimeRange
): Promise<{ topics: TopicSuggestion[], sources: { title: string, uri: string }[] }> => {
  const ai = getClient();
  
  const prompt = `
    Jesteś ekspertem SEO i Content Marketingu.
    Twoim zadaniem jest zaproponowanie 6 unikalnych, chwytliwych tematów na bloga w kategorii: "${category}".
    
    Bazuj na trendach wyszukiwania w Google z okresu: ${range}.
    Użyj narzędzia Google Search aby sprawdzić co faktycznie interesuje ludzi w tej niszy.
    
    Dla każdego tematu przygotuj:
    1. Tytuł (Title)
    2. Krótki opis (Description) - do 200 słów, zachęcający do napisania, wyjaśniający dlaczego to trenduje.

    Zwróć odpowiedź w formacie czystego JSON (bez markdowna):
    [
      {
        "title": "Tytuł tematu",
        "description": "Opis..."
      }
    ]
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const text = response.text || "";
    // Clean up markdown code blocks if model adds them despite instructions
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '');
    
    let topics: TopicSuggestion[] = [];
    
    // Find the array
    const jsonMatch = cleanText.match(/\[[\s\S]*\]/);
    
    if (jsonMatch) {
      topics = JSON.parse(jsonMatch[0]) as TopicSuggestion[];
    }
    
    // Extract sources from grounding metadata as required by guidelines
    const sources: { title: string, uri: string }[] = [];
    const chunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    chunks.forEach(chunk => {
      if (chunk.web?.uri) {
        sources.push({ title: chunk.web.title || 'Źródło', uri: chunk.web.uri });
      }
    });
    
    return { topics, sources };
  } catch (error) {
    console.error("Błąd generowania tematów:", error);
    throw error;
  }
};

export const generateBlogImage = async (prompt: string): Promise<string> => {
  const ai = getClient();
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image', 
      contents: {
        parts: [{ text: prompt }]
      },
      config: {
        imageConfig: {
            aspectRatio: "16:9",
        }
      }
    });

    // Iterate through parts to find the image part as per guidelines
    for (const part of response.candidates?.[0]?.content?.parts || []) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    
    throw new Error("Nie udało się wygenerować obrazu.");
  } catch (error) {
    console.error("Błąd generowania obrazu:", error);
    throw error;
  }
};