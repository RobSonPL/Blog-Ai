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
      model: 'gemini-3-pro-preview', 
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
    Zadanie: Napisz kolejną sekcję (kontynuację) w Markdown, zacznij od H2, używaj dużo emoji. Język polski.
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
    Przeprowadź research w Google Search na temat trendów z okresu: ${range} dla kategorii: "${category}".
    Zaproponuj 6 chwytliwych i unikalnych tematów na artykuły blogowe.
    
    Wymagany format wyjściowy to wyłącznie surowa tablica JSON (bez komentarzy przed i po):
    [
      {
        "title": "Tytuł tematu",
        "description": "Krótkie uzasadnienie dlaczego to teraz trenduje"
      }
    ]
    Język: Polski.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview', // Szybszy model, idealny do narzędzi wyszukiwania
      contents: prompt,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    const rawText = response.text || "";
    
    // Zaawansowane wyłuskiwanie JSON-a (szukamy pierwszej tablicy)
    const jsonMatch = rawText.match(/\[\s*\{[\s\S]*\}\s*\]/);
    let topics: TopicSuggestion[] = [];
    
    if (jsonMatch) {
      try {
        topics = JSON.parse(jsonMatch[0]);
      } catch (parseError) {
        console.error("Błąd parsowania JSON trendów:", parseError);
      }
    }
    
    // Ekstrakcja źródeł Grounding (zgodnie z wytycznymi)
    const sources: { title: string, uri: string }[] = [];
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
    const chunks = groundingMetadata?.groundingChunks || [];
    
    chunks.forEach(chunk => {
      if (chunk.web?.uri) {
        sources.push({ 
          title: chunk.web.title || 'Źródło trendu', 
          uri: chunk.web.uri 
        });
      }
    });
    
    return { topics, sources };
  } catch (error) {
    console.error("Błąd w generateTrendingTopics:", error);
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