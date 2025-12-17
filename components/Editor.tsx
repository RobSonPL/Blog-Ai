import React, { useState } from 'react';
import { BlogCategory, WordCount, TimeRange, TopicSuggestion } from '../types';
import { PenTool, Upload, Sparkles, X, ChevronRight, Loader2, TrendingUp, RefreshCw } from 'lucide-react';
import { generateTrendingTopics } from '../services/geminiService';

interface Props {
  onGenerate: (topic: string, category: BlogCategory, length: WordCount) => void;
  onLogoUpload: (file: File) => void;
  isLoading: boolean;
  logo: string | null;
}

export const Editor: React.FC<Props> = ({ onGenerate, onLogoUpload, isLoading, logo }) => {
  const [topic, setTopic] = useState('');
  const [category, setCategory] = useState<BlogCategory>(BlogCategory.HEALTH);
  const [length, setLength] = useState<WordCount>(WordCount.TWO_K);
  
  // Widget State
  const [suggestions, setSuggestions] = useState<TopicSuggestion[]>([]);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [suggestionError, setSuggestionError] = useState<string | null>(null);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onLogoUpload(e.target.files[0]);
    }
  };

  const handleFetchTrends = async () => {
    setIsSuggesting(true);
    setSuggestionError(null);
    setSuggestions([]);
    try {
      // Using WEEK as requested for the "last 7 days" requirement
      const results = await generateTrendingTopics(category, TimeRange.WEEK);
      if (results.length === 0) {
        setSuggestionError("Nie udało się znaleźć tematów. Spróbuj później.");
      } else {
        // Limit to 5 as requested
        setSuggestions(results.slice(0, 5));
      }
    } catch (e) {
      setSuggestionError("Błąd pobierania trendów.");
    } finally {
      setIsSuggesting(false);
    }
  };

  const selectSuggestion = (suggestionTitle: string) => {
    setTopic(suggestionTitle);
  };

  return (
    <div className="bg-white p-6 md:p-8 rounded-2xl shadow-xl border border-gray-100 max-w-xl w-full mx-auto sticky top-4 relative">
      <div className="flex items-center gap-3 mb-6">
        <div className="p-3 bg-indigo-100 text-indigo-600 rounded-lg">
          <PenTool size={24} />
        </div>
        <div>
          <h2 className="text-xl font-bold text-gray-800">Warsztat Blogera</h2>
          <p className="text-xs text-gray-500">Stwórz viralową treść w kilka sekund</p>
        </div>
      </div>

      <div className="space-y-4">
        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Kategoria</label>
          <select
            value={category}
            onChange={(e) => {
                setCategory(e.target.value as BlogCategory);
                setSuggestions([]); // Clear old suggestions on category change
            }}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none bg-white"
          >
            {Object.values(BlogCategory).map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        {/* Popular Topics Widget */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-xl p-4 border border-indigo-100">
            <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-2 text-indigo-900">
                    <TrendingUp size={16} />
                    <h3 className="font-bold text-sm">Popularne tematy</h3>
                </div>
                <button 
                    onClick={handleFetchTrends}
                    disabled={isSuggesting}
                    title="Odśwież trendy (ostatnie 7 dni)"
                    className="p-1.5 bg-white rounded-full text-indigo-600 hover:text-indigo-800 shadow-sm hover:shadow transition disabled:opacity-50"
                >
                    <RefreshCw size={14} className={isSuggesting ? "animate-spin" : ""} />
                </button>
            </div>
            
            {isSuggesting && (
                <div className="text-center py-4 text-xs text-indigo-400">
                    <Loader2 size={20} className="animate-spin mx-auto mb-2" />
                    Analizuję Google Search...
                </div>
            )}

            {suggestionError && (
                 <p className="text-xs text-red-500 text-center py-2">{suggestionError}</p>
            )}

            {!isSuggesting && suggestions.length === 0 && !suggestionError && (
                <div className="text-center py-2">
                    <p className="text-xs text-gray-500 mb-2">Sprawdź co jest na topie w kategorii <strong>{category}</strong></p>
                    <button 
                        onClick={handleFetchTrends}
                        className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded-md hover:bg-indigo-700 transition"
                    >
                        Pobierz trendy
                    </button>
                </div>
            )}

            {!isSuggesting && suggestions.length > 0 && (
                <div className="space-y-2 max-h-[220px] overflow-y-auto custom-scrollbar pr-1">
                    {suggestions.map((s, idx) => (
                        <div 
                            key={idx}
                            onClick={() => selectSuggestion(s.title)}
                            className="bg-white p-2.5 rounded-lg border border-indigo-50 hover:border-indigo-300 hover:shadow-md cursor-pointer transition group"
                        >
                            <p className="text-xs font-semibold text-gray-800 group-hover:text-indigo-600 mb-0.5 line-clamp-2 leading-tight">
                                {s.title}
                            </p>
                            <p className="text-[10px] text-gray-400 line-clamp-1">
                                {s.description}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>

        {/* Topic Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Temat posta</label>
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Wpisz temat lub wybierz z trendów"
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition"
          />
        </div>

        {/* Word Count */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Długość tekstu (słowa)</label>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {Object.values(WordCount).map((wc) => (
              <button
                key={wc}
                onClick={() => setLength(wc)}
                className={`text-xs py-2 px-2 rounded-md border font-medium transition ${
                  length === wc
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
                    : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300'
                }`}
              >
                {wc}
              </button>
            ))}
          </div>
        </div>

        {/* Logo Upload */}
        <div>
           <label className="block text-sm font-medium text-gray-700 mb-1">Logo Autora (opcjonalne)</label>
           <label className="flex items-center gap-3 px-4 py-3 border border-dashed border-gray-300 rounded-lg cursor-pointer hover:bg-gray-50 transition group">
              <input type="file" accept="image/*" onChange={handleLogoChange} className="hidden" />
              <div className={`p-2 rounded-full ${logo ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400 group-hover:text-indigo-500'}`}>
                 <Upload size={20} />
              </div>
              <div className="flex-1">
                 <p className="text-sm font-medium text-gray-700">{logo ? 'Logo załadowane' : 'Wybierz plik'}</p>
                 <p className="text-xs text-gray-400">{logo ? 'Kliknij, aby zmienić' : 'PNG, JPG (max 2MB)'}</p>
              </div>
           </label>
        </div>

        {/* Generate Button */}
        <button
          onClick={() => onGenerate(topic, category, length)}
          disabled={isLoading || !topic}
          className={`w-full py-4 rounded-xl text-white font-bold text-lg shadow-lg hover:shadow-xl transition transform hover:scale-[1.02] flex items-center justify-center gap-2 mt-6 ${
             isLoading || !topic ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-indigo-600 to-purple-600'
          }`}
        >
          {isLoading ? (
             <>
               <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
               <span>Piszę...</span>
             </>
          ) : (
             <>
               <Sparkles size={20} />
               <span>Generuj Post</span>
             </>
          )}
        </button>
      </div>
    </div>
  );
};