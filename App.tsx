
import React, { useState, useEffect } from 'react';
import { Editor } from './components/Editor';
import { ArticleView } from './components/ArticleView';
import { generateBlogPost, generateMoreContent } from './services/geminiService';
import { BlogCategory, WordCount, BlogPostData } from './types';
import { Feather, Key, AlertCircle } from 'lucide-react';

declare global {
  interface Window {
    // Fix: Using any to avoid modifier and type mismatch errors with pre-existing AIStudio declarations in the environment.
    aistudio: any;
  }
}

const App: React.FC = () => {
  const [blogData, setBlogData] = useState<BlogPostData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingMore, setIsGeneratingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [logo, setLogo] = useState<string | null>(null);
  const [currentCategory, setCurrentCategory] = useState<string>('');
  const [hasKey, setHasKey] = useState<boolean>(true);

  useEffect(() => {
    const checkKey = async () => {
      if (window.aistudio) {
        const selected = await window.aistudio.hasSelectedApiKey();
        setHasKey(selected || !!process.env.API_KEY);
      }
    };
    checkKey();
  }, []);

  const handleOpenKeyModal = async () => {
    if (window.aistudio) {
      await window.aistudio.openSelectKey();
      setHasKey(true); // Assume success per instructions
    }
  };

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith('#share=')) {
        try {
          const encoded = hash.replace('#share=', '');
          const decoded = decodeURIComponent(atob(encoded).split('').map(function(c) {
              return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));
          
          const payload = JSON.parse(decoded);
          if (payload && payload.data) {
            setBlogData(payload.data);
            setCurrentCategory(payload.category || '');
            setLogo(payload.logo || null);
          }
        } catch (e) {
          console.error("Failed to parse shared content", e);
        }
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const handleGenerate = async (topic: string, category: BlogCategory, length: WordCount) => {
    setIsLoading(true);
    setError(null);
    setBlogData(null);
    setCurrentCategory(category);
    
    try {
      window.history.pushState("", document.title, window.location.pathname + window.location.search);
    } catch (e) {
      console.warn("History push state failed", e);
    }

    try {
      const data = await generateBlogPost(topic, category, length);
      setBlogData(data);
    } catch (err: any) {
      const msg = err?.message || "";
      if (msg.includes("Requested entity was not found") || msg.includes("API_KEY")) {
        setHasKey(false);
        setError("Klucz API wygasł lub jest nieprawidłowy. Wybierz klucz ponownie.");
      } else {
        setError("Ups! Wena twórcza chwilowo zniknęła (błąd API). Spróbuj ponownie za chwilę lub sprawdź klucz.");
      }
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGenerateMore = async () => {
    if (!blogData) return;
    setIsGeneratingMore(true);
    try {
      const newContent = await generateMoreContent(blogData.title, blogData.body);
      setBlogData(prev => {
        if (!prev) return null;
        return { ...prev, body: prev.body + "\n\n" + newContent };
      });
    } catch (err) {
      console.error("Failed to extend article", err);
    } finally {
      setIsGeneratingMore(false);
    }
  };

  const handleLogoUpload = (file: File) => {
    const reader = new FileReader();
    reader.onloadend = () => setLogo(reader.result as string);
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen bg-[#Fdfdfd] text-gray-800 font-sans selection:bg-indigo-100 selection:text-indigo-900">
      <div className="fixed inset-0 z-0 pointer-events-none opacity-40">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-purple-200 rounded-full blur-[100px]"></div>
        <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-indigo-100 rounded-full blur-[120px]"></div>
      </div>

      {!hasKey && (
        <div className="fixed inset-0 z-[100] bg-white/80 backdrop-blur-md flex items-center justify-center p-4 text-center">
          <div className="max-w-md bg-white p-8 rounded-3xl shadow-2xl border border-indigo-100">
            <div className="w-16 h-16 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <Key size={32} />
            </div>
            <h2 className="text-2xl font-bold mb-2">Wymagany Klucz API</h2>
            <p className="text-gray-600 mb-6">Aby korzystać z modeli Gemini 3 Pro i generowania obrazów, musisz wybrać własny klucz API z płatnego projektu Google Cloud.</p>
            <button 
              onClick={handleOpenKeyModal}
              className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold hover:bg-indigo-700 transition shadow-lg"
            >
              Wybierz Klucz API
            </button>
            <p className="mt-4 text-xs text-gray-400">
              Twoje dane są bezpieczne. Klucz jest używany tylko lokalnie w Twojej przeglądarce. 
              <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" className="underline ml-1">Dokumentacja bilingu</a>
            </p>
          </div>
        </div>
      )}

      <div className="relative z-10 container mx-auto px-4 py-8 md:py-12">
        <header className="text-center mb-12">
          <div className="inline-flex items-center justify-center p-4 bg-white rounded-full shadow-sm mb-4">
             <Feather className="text-indigo-600 w-8 h-8" />
          </div>
          <h1 className="text-4xl md:text-5xl font-serif font-black text-gray-900 mb-3 tracking-tight">
            Mistrzowski<span className="text-indigo-600">Bloger</span> AI
          </h1>
          <p className="text-lg text-gray-500 max-w-2xl mx-auto">
            Twórz emocjonalne, nagradzane treści w sekundę. Od zdrowia po finanse, z profesjonalnym formatowaniem AIDA.
          </p>
        </header>

        <div className="flex flex-col lg:flex-row gap-8 items-start justify-center">
          <div className="w-full lg:w-1/3 lg:sticky lg:top-8 z-20">
            <Editor 
              onGenerate={handleGenerate} 
              onLogoUpload={handleLogoUpload} 
              isLoading={isLoading}
              logo={logo}
            />
            <div className="mt-6 text-center text-xs text-gray-400 flex items-center justify-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
              System AI Gotowy
            </div>
          </div>

          <div className="w-full lg:w-2/3">
            {error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl border border-red-100 mb-6 flex items-center gap-3">
                <AlertCircle size={20} className="shrink-0" />
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}

            {blogData ? (
              <ArticleView 
                data={blogData} 
                logo={logo} 
                category={currentCategory}
                onGenerateMore={handleGenerateMore}
                isGeneratingMore={isGeneratingMore}
              />
            ) : (
              !isLoading && (
                <div className="flex flex-col items-center justify-center h-[400px] bg-white/50 backdrop-blur-sm rounded-3xl border-2 border-dashed border-gray-200 text-gray-400">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                    <Feather size={32} className="opacity-30" />
                  </div>
                  <p className="text-lg font-medium">Twój artykuł pojawi się tutaj</p>
                  <p className="text-sm opacity-60">Wybierz temat i długość po lewej stronie</p>
                </div>
              )
            )}
            
            {isLoading && !blogData && (
              <div className="flex flex-col items-center justify-center h-[400px]">
                <div className="relative w-24 h-24 mb-6">
                    <div className="absolute top-0 left-0 w-full h-full border-4 border-indigo-100 rounded-full"></div>
                    <div className="absolute top-0 left-0 w-full h-full border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
                </div>
                <h3 className="text-xl font-bold text-gray-800 mb-2 font-serif italic">Piszę Twój Bestseller...</h3>
                <p className="text-gray-500 text-sm italic">Analizuję trendy • Buduję napięcie AIDA • Dobieram słownictwo</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;
