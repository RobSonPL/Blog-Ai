import React, { useState, useRef, useEffect } from 'react';
import { BlogPostData, StoredArticle, BlogCategory } from '../types';
import { ChartRenderer } from './ChartRenderer';
import { generateBlogImage } from '../services/geminiService';
import { Image as ImageIcon, Download, Share2, Sparkles, AlertCircle, Copy, FileText, Printer, Check, User, Link as LinkIcon, PlusCircle, Loader2, Hash, History, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Declare html2pdf type for TypeScript (since we loaded it via script tag)
declare global {
  interface Window {
    html2pdf: any;
  }
}

interface Props {
  data: BlogPostData;
  logo: string | null;
  category: string;
  onGenerateMore: () => Promise<void>;
  isGeneratingMore: boolean;
}

const CATEGORY_TAGS: Record<string, string[]> = {
  [BlogCategory.HEALTH]: ['Zdrowie', 'Medycyna', 'Wellness', 'Profilaktyka', 'Ciało', 'Umysł'],
  [BlogCategory.TECHNOLOGY]: ['Tech', 'Innowacje', 'Gadżety', 'Przyszłość', 'Digital', 'Software'],
  [BlogCategory.AI]: ['SztucznaInteligencja', 'MachineLearning', 'LLM', 'Automatyzacja', 'Robotyka'],
  [BlogCategory.FINANCE]: ['Pieniądze', 'Inwestowanie', 'Oszczędzanie', 'Budżet', 'Giełda', 'Ekonomia'],
  [BlogCategory.MARKETING]: ['SEO', 'SocialMedia', 'Branding', 'Sprzedaż', 'Content', 'Strategia'],
  // Default fallback for others
  'default': ['Blog', 'Wiedza', 'Inspiracja', 'Porady', 'Lifestyle', 'Edukacja']
};

export const ArticleView: React.FC<Props> = ({ data, logo, category, onGenerateMore, isGeneratingMore }) => {
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const articleRef = useRef<HTMLDivElement>(null);

  // New Features State
  const [tags, setTags] = useState<string[]>([]);
  const [parallaxOffset, setParallaxOffset] = useState(0);
  const [recentArticles, setRecentArticles] = useState<StoredArticle[]>([]);

  // 1. Generate Tags on data change
  useEffect(() => {
    const categoryKey = Object.values(BlogCategory).includes(category as BlogCategory) ? category : 'default';
    const pool = CATEGORY_TAGS[categoryKey] || CATEGORY_TAGS['default'];
    
    // Shuffle and pick 3-5 tags
    const shuffled = [...pool].sort(() => 0.5 - Math.random());
    const count = Math.floor(Math.random() * 3) + 3; // 3 to 5
    setTags(shuffled.slice(0, count));
  }, [data, category]);

  // 2. Parallax Effect on Scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.innerWidth > 768) { // Only on desktop
         requestAnimationFrame(() => {
            setParallaxOffset(window.scrollY * 0.4);
         });
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // 3. LocalStorage Logic for Recent Articles
  useEffect(() => {
    // Save current article
    const saveArticle = () => {
      try {
        const stored = localStorage.getItem('bloger_history');
        let history: StoredArticle[] = stored ? JSON.parse(stored) : [];
        
        // Avoid duplicate by title
        if (!history.some(h => h.title === data.title)) {
          const newEntry: StoredArticle = {
            id: Date.now().toString(),
            title: data.title,
            category: category,
            date: new Date().toLocaleDateString(),
            thumbnail: generatedImage // Try to save image if available
          };
          
          // Add to start, keep max 3
          history.unshift(newEntry);
          if (history.length > 3) history.pop();
          
          // Try saving. If quota exceeded, save without image
          try {
            localStorage.setItem('bloger_history', JSON.stringify(history));
          } catch (e) {
            // Quota exceeded likely due to base64 image
            newEntry.thumbnail = null; 
            // Re-construct history with null thumbnail for new entry
            history[0] = newEntry;
            localStorage.setItem('bloger_history', JSON.stringify(history));
          }
        }
        setRecentArticles(history.filter(h => h.title !== data.title)); // Show others, not current
      } catch (e) {
        console.warn("Storage error", e);
      }
    };

    saveArticle();
  }, [data.title, generatedImage]); // Re-run when title or image changes

  const handleGenerateImage = async () => {
    if (!data.imagePrompt) return;
    setIsGeneratingImage(true);
    setImageError(null);
    try {
      const imageUrl = await generateBlogImage(data.imagePrompt);
      
      if (!imageUrl) {
        throw new Error("Otrzymano pusty obraz");
      }
      
      setGeneratedImage(imageUrl);
    } catch (e) {
      console.error('Błąd generowania grafiki', e);
      setImageError("Nie udało się wygenerować obrazu. Spróbuj ponownie.");
    } finally {
      setIsGeneratingImage(false);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!articleRef.current) return;
    
    try {
      const content = articleRef.current;
      const html = content.innerHTML;
      const text = content.innerText;
      
      const blobHtml = new Blob([html], { type: "text/html" });
      const blobText = new Blob([text], { type: "text/plain" });
      
      const data = [new ClipboardItem({ 
        "text/html": blobHtml,
        "text/plain": blobText
      })];
      
      await navigator.clipboard.write(data);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Copy failed", err);
      alert("Nie udało się skopiować treści. Sprawdź uprawnienia przeglądarki.");
    }
  };

  const handleShareLink = async () => {
    try {
      const generateUrl = (includeLogo: boolean) => {
        const sharePayload = {
          data: data,
          category: category,
          logo: includeLogo ? logo : null
        };
        
        const json = JSON.stringify(sharePayload);
        const encoded = btoa(encodeURIComponent(json).replace(/%([0-9A-F]{2})/g,
            function toSolidBytes(match, p1) {
                return String.fromCharCode(parseInt(p1, 16));
        }));

        return `${window.location.origin}${window.location.pathname}#share=${encoded}`;
      };

      let url = generateUrl(!!logo);
      if (url.length > 30000 && logo) {
        console.warn("Logo jest zbyt duże i zostało pominięte w linku udostępniania (przekroczono limit długości URL).");
        url = generateUrl(false);
      }
      
      await navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch (err) {
      console.error("Share creation failed", err);
      alert("Nie udało się wygenerować linku. Treść może być zbyt długa.");
    }
  };

  const handleExportWord = () => {
    if (!articleRef.current) return;
    const clone = articleRef.current.cloneNode(true) as HTMLElement;
    const noExportElements = clone.querySelectorAll('.no-export');
    noExportElements.forEach(el => el.remove());
    const imgContainer = clone.querySelector('div.relative.group');
    if (imgContainer) {
       const img = imgContainer.querySelector('img');
       if (img) {
          img.style.width = '100%';
          img.style.maxWidth = '600px';
          img.style.height = 'auto';
       }
    }
    const styles = `
      <style>
        body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; line-height: 1.5; color: #000000; }
        h1 { font-size: 24pt; font-weight: bold; margin-bottom: 20px; color: #1a1a1a; }
        h2 { font-size: 18pt; font-weight: bold; margin-top: 15px; margin-bottom: 10px; color: #2d3748; }
        h3 { font-size: 14pt; font-weight: bold; margin-top: 10px; color: #4a5568; }
        p { margin-bottom: 10px; }
        img { max-width: 100%; height: auto; display: block; margin: 10px auto; }
        .author-section { border-top: 1px solid #eee; margin-top: 30px; padding-top: 20px; color: #666; font-size: 10pt; }
      </style>
    `;
    const header = `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
    <head><meta charset='utf-8'><title>${data.title}</title>${styles}</head><body>`;
    const footer = "</body></html>";
    const sourceHTML = header + clone.innerHTML + footer;
    const source = 'data:application/vnd.ms-word;charset=utf-8,' + encodeURIComponent(sourceHTML);
    const fileDownload = document.createElement("a");
    document.body.appendChild(fileDownload);
    fileDownload.href = source;
    fileDownload.download = `${data.title.replace(/\s+/g, '_').substring(0, 30)}.doc`;
    fileDownload.click();
    document.body.removeChild(fileDownload);
  };

  const handleDownloadPDF = () => {
    if (!articleRef.current) return;
    if (typeof window.html2pdf === 'undefined') {
      alert("Biblioteka PDF nie została jeszcze załadowana. Spróbuj za chwilę.");
      return;
    }
    const element = articleRef.current;
    const controls = element.querySelectorAll('.no-export, .no-print');
    controls.forEach((el: any) => el.style.display = 'none');
    const opt = {
      margin:       10,
      filename:     `${data.title.replace(/\s+/g, '_').substring(0, 20)}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { 
          scale: 2, 
          useCORS: true,
          logging: false
      },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
      enableLinks:  true,
      pagebreak:    { mode: ['avoid-all', 'css', 'legacy'] }
    };
    window.html2pdf().from(element).set(opt).save()
      .then(() => {
         controls.forEach((el: any) => el.style.display = '');
      })
      .catch((err: any) => {
          console.error("Błąd generowania PDF", err);
          controls.forEach((el: any) => el.style.display = '');
          alert("Błąd generowania PDF. Sprawdź konsolę po więcej szczegółów.");
      });
  };

  const currentDate = new Date().toLocaleDateString('pl-PL', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <article id="printable-article" ref={articleRef} className="bg-white rounded-2xl shadow-xl overflow-hidden max-w-4xl w-full mx-auto border border-gray-100 transition-all">
      {/* Header Image Area */}
      <div className="w-full h-64 md:h-96 bg-gray-100 relative group overflow-hidden flex items-center justify-center">
        {generatedImage ? (
          <img src={generatedImage} alt={data.title} className="w-full h-full object-cover animate-fade-in" />
        ) : (
          <div className="text-center p-6 no-print no-export">
            <div className="mb-4 text-gray-400">
              <ImageIcon size={48} className="mx-auto mb-2 opacity-50" />
              <p className="text-sm">Tu pojawi się Twoja unikalna grafika</p>
            </div>
            {isGeneratingImage ? (
              <div className="flex flex-col items-center text-indigo-600">
                 <div className="w-8 h-8 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mb-2"></div>
                 <span className="text-sm font-medium animate-pulse">Tworzenie arcydzieła...</span>
              </div>
            ) : (
              <button
                onClick={handleGenerateImage}
                className="bg-white/90 backdrop-blur-sm hover:bg-white text-indigo-700 px-6 py-2 rounded-full font-semibold shadow-lg transition transform hover:scale-105 flex items-center gap-2 mx-auto border border-indigo-100"
              >
                <Sparkles size={18} />
                Generuj okładkę AI
              </button>
            )}
            {imageError && (
              <div className="mt-4 text-red-500 text-sm flex items-center justify-center gap-1">
                <AlertCircle size={14} />
                {imageError}
              </div>
            )}
          </div>
        )}
        
        {/* Category Badge */}
        <div className="absolute top-6 left-6 bg-indigo-600 text-white text-xs font-bold px-3 py-1 rounded-full uppercase tracking-wider shadow-md no-export no-print">
          {category}
        </div>
      </div>

      {/* Content Container */}
      <div className="p-8 md:p-12 relative">
        {/* Metadata & Toolbar */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between mb-8 border-b border-gray-100 pb-6 gap-4 no-export">
            <div className="flex items-center gap-3">
                <div>
                    <p className="text-sm font-bold text-gray-900 leading-tight">Autor: R | H</p>
                    <p className="text-xs text-gray-500">{currentDate} • 5 min czytania</p>
                </div>
            </div>
            
            <div className="flex gap-2 no-print relative">
                <div className="relative">
                  <button 
                    onClick={handleCopyToClipboard}
                    className="p-2 bg-white text-gray-500 border border-gray-200 rounded-lg hover:text-indigo-600 hover:border-indigo-200 transition flex items-center gap-2 active:bg-gray-50"
                  >
                      <Copy size={18} />
                      <span className="text-xs font-medium hidden md:inline">Kopiuj</span>
                  </button>
                  <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-green-600 text-white text-xs rounded-lg shadow-xl flex items-center gap-1.5 transition-all duration-300 pointer-events-none whitespace-nowrap z-50 ${copied ? 'opacity-100 transform translate-y-0 scale-100' : 'opacity-0 transform translate-y-2 scale-90'}`}>
                      <Check size={14} className="text-white" />
                      <span className="font-semibold">Skopiowano!</span>
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-green-600 rotate-45"></div>
                  </div>
                </div>

                <div className="relative">
                   <button 
                    onClick={handleShareLink}
                    className="p-2 bg-white text-gray-500 border border-gray-200 rounded-lg hover:text-indigo-600 hover:border-indigo-200 transition flex items-center gap-2 active:bg-gray-50"
                   >
                     <LinkIcon size={18} />
                   </button>
                    <div className={`absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-indigo-600 text-white text-xs rounded-lg shadow-xl flex items-center gap-1.5 transition-all duration-300 pointer-events-none whitespace-nowrap z-50 ${linkCopied ? 'opacity-100 transform translate-y-0 scale-100' : 'opacity-0 transform translate-y-2 scale-90'}`}>
                      <Check size={14} className="text-white" />
                      <span className="font-semibold">Link skopiowany!</span>
                      <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-indigo-600 rotate-45"></div>
                  </div>
                </div>

                <button 
                  onClick={handleExportWord}
                  className="p-2 bg-white text-gray-500 border border-gray-200 rounded-lg hover:text-blue-600 hover:border-blue-200 transition"
                >
                    <FileText size={18} />
                </button>
                <button 
                  onClick={handleDownloadPDF}
                  className="p-2 bg-white text-gray-500 border border-gray-200 rounded-lg hover:text-red-600 hover:border-red-200 transition flex items-center gap-2"
                >
                    <Download size={18} />
                    <span className="text-xs font-medium hidden md:inline">PDF</span>
                </button>
            </div>
        </div>

        {/* Title with Parallax */}
        <div className="mb-6 relative">
          <h1 
            style={{ transform: `translateY(${parallaxOffset}px)`, transition: 'transform 0.1s ease-out' }}
            className="text-3xl md:text-5xl font-serif font-bold text-gray-900 leading-tight will-change-transform"
          >
            {data.title}
          </h1>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-2 mb-8 no-export">
            {tags.map((tag, i) => (
                <span key={i} className="inline-flex items-center gap-1 text-xs font-medium text-indigo-500 bg-indigo-50 px-2.5 py-1 rounded-full border border-indigo-100">
                    <Hash size={12} />
                    {tag}
                </span>
            ))}
        </div>

        {/* AIDA Sections */}
        <div className="font-serif text-gray-700">
            {/* Attention */}
            <div className="text-xl md:text-2xl font-light text-gray-600 mb-8 italic border-l-4 border-indigo-500 pl-6 py-2 bg-indigo-50/50 rounded-r-lg">
                {data.introduction}
            </div>

            {/* Interest & Desire */}
            <div className="prose prose-lg prose-indigo max-w-none mb-8">
                <ReactMarkdown
                  components={{
                    code({node, inline, className, children, ...props}: any) {
                      const match = /language-(\w+)/.exec(className || '');
                      return !inline && match ? (
                        <SyntaxHighlighter
                          style={vscDarkPlus}
                          language={match[1]}
                          PreTag="div"
                          {...props}
                        >
                          {String(children).replace(/\n$/, '')}
                        </SyntaxHighlighter>
                      ) : (
                        <code className={`${className} bg-gray-100 text-red-500 px-1 py-0.5 rounded font-mono text-sm`} {...props}>
                          {children}
                        </code>
                      );
                    }
                  }}
                >
                  {data.body}
                </ReactMarkdown>
            </div>
            
            {/* Generate More Button */}
            <div className="no-print no-export my-8 flex justify-center">
               <button 
                 onClick={onGenerateMore}
                 disabled={isGeneratingMore}
                 className="group relative flex items-center gap-2 px-6 py-3 bg-white border-2 border-dashed border-indigo-200 rounded-full text-indigo-600 font-medium hover:bg-indigo-50 hover:border-indigo-400 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
               >
                 {isGeneratingMore ? (
                    <Loader2 size={18} className="animate-spin" />
                 ) : (
                    <PlusCircle size={18} className="group-hover:scale-110 transition-transform" />
                 )}
                 {isGeneratingMore ? 'Piszę kolejną część...' : 'Dopisz kolejny rozdział (AI)'}
               </button>
            </div>

            {/* Chart */}
            {data.chart && (
                <div className="my-10 break-inside-avoid">
                    <ChartRenderer chart={data.chart} />
                    <p className="text-center text-sm text-gray-400 italic mt-2">Wykres: {data.chart.title}</p>
                </div>
            )}

            {/* Action */}
            <div className="bg-gray-900 text-white p-8 rounded-2xl my-10 relative overflow-hidden break-inside-avoid">
                <div className="relative z-10">
                    <h3 className="text-2xl font-bold mb-4">Podsumowanie</h3>
                    <p className="text-gray-300 mb-0">{data.conclusion}</p>
                </div>
                <div className="absolute top-0 right-0 -mt-10 -mr-10 w-40 h-40 bg-indigo-600 rounded-full opacity-20 blur-3xl"></div>
            </div>
        </div>

        {/* Author Section */}
        <div className="mt-12 mb-8 bg-gray-50 border border-gray-100 p-6 rounded-xl flex flex-col sm:flex-row items-center sm:items-start gap-6 break-inside-avoid author-section">
            <div className="flex-shrink-0">
               {logo ? (
                    <img src={logo} alt="Logo autora" className="w-12 h-12 rounded-full object-cover border-2 border-white shadow-sm" />
                ) : (
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-sm">
                        <User size={20} />
                    </div>
                )}
            </div>
            <div className="text-center sm:text-left">
                <h4 className="text-base font-bold text-gray-900 mb-1">O Autorze: R | H</h4>
                <p className="text-gray-600 text-xs leading-relaxed">
                   Ekspert w dziedzinie {category.toLowerCase()}, pasjonat nowoczesnych technologii i skutecznej komunikacji. Od ponad dekady dzieli się wiedzą.
                </p>
            </div>
        </div>

        {/* Recent Articles (History) */}
        {recentArticles.length > 0 && (
            <div className="mt-12 border-t border-gray-100 pt-8 no-export no-print">
                 <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
                    <History size={20} className="text-indigo-500" />
                    Ostatnie artykuły
                 </h3>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {recentArticles.map((article) => (
                        <div key={article.id} className="bg-white rounded-lg border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition group">
                            <div className="h-32 bg-gray-100 relative overflow-hidden">
                                {article.thumbnail ? (
                                    <img src={article.thumbnail} alt={article.title} className="w-full h-full object-cover group-hover:scale-105 transition duration-500" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-200">
                                        <FileText size={24} className="text-gray-300" />
                                    </div>
                                )}
                            </div>
                            <div className="p-4">
                                <p className="text-xs text-indigo-600 font-semibold mb-1">{article.category}</p>
                                <h4 className="text-sm font-bold text-gray-800 line-clamp-2 mb-2 leading-tight">{article.title}</h4>
                                <div className="flex items-center text-[10px] text-gray-400 gap-1">
                                    <Clock size={10} />
                                    {article.date}
                                </div>
                            </div>
                        </div>
                    ))}
                 </div>
            </div>
        )}

        {/* Footer / Sponsored Link */}
        {data.sponsoredLink && (
            <div className="mt-8 pt-8 border-t border-gray-100 text-center break-inside-avoid no-export">
                <p className="text-xs text-gray-400 uppercase tracking-widest mb-3">Partner wpisu</p>
                <a 
                    href={data.sponsoredLink.url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-block bg-white border-2 border-indigo-600 text-indigo-600 hover:bg-indigo-600 hover:text-white px-8 py-3 rounded-full font-bold transition-colors duration-300"
                >
                    {data.sponsoredLink.anchor} <span className="font-normal text-sm opacity-80">- {data.sponsoredLink.description}</span>
                </a>
            </div>
        )}
        
        <div className="mt-12 flex justify-center pb-4 no-export">
             <span className="text-gray-300 font-serif italic">*** R | H ***</span>
        </div>
      </div>
    </article>
  );
};