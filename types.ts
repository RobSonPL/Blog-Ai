export enum BlogCategory {
  HEALTH = 'Zdrowie',
  PSYCHOLOGY = 'Psychologia',
  TECHNOLOGY = 'Technologia',
  AI = 'Sztuczna Inteligencja',
  GUIDE = 'Poradnik',
  FINANCE = 'Finanse',
  TRAVEL = 'Podróże',
  CULINARY = 'Kulinaria',
  LIFESTYLE = 'Lifestyle',
  DIY = 'Zrób to sam (DIY)',
  PARENTING = 'Rodzicielstwo',
  BUSINESS = 'Biznes',
  MARKETING = 'Marketing',
  SPORT = 'Sport',
  BEAUTY = 'Uroda',
  GARDENING = 'Ogrodnictwo',
  INTERIOR_DESIGN = 'Wystrój Wnętrz',
  HISTORY = 'Historia',
  GAMING = 'Gaming',
  AUTOMOTIVE = 'Motoryzacja'
}

export enum WordCount {
  SHORT = '500 słów',
  MEDIUM = '1000 słów',
  LONG = '2000 słów',
  EPIC = '3000 słów'
}

export enum TimeRange {
  WEEK = 'Ostatnie 7 dni',
  MONTH = 'Ostatni miesiąc',
  QUARTER = 'Ostatni kwartał',
  YEAR = 'Ostatni rok'
}

export interface ChartDataPoint {
  name: string;
  value: number;
}

export interface BlogChart {
  title: string;
  type: 'bar' | 'pie' | 'line';
  data: ChartDataPoint[];
}

export interface SponsoredLink {
  anchor: string;
  url: string;
  description: string;
}

export interface BlogPostData {
  title: string;
  introduction: string; // Attention
  body: string; // Interest & Desire
  conclusion: string; // Action
  chart?: BlogChart;
  imagePrompt: string;
  sponsoredLink?: SponsoredLink;
}

export interface GeneratedImage {
  url: string;
  prompt: string;
}

export interface TopicSuggestion {
  title: string;
  description: string;
}

export interface StoredArticle {
  id: string;
  title: string;
  category: string;
  date: string;
  thumbnail: string | null; // Base64 or null
}