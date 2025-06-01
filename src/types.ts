import { Language } from './components/LanguageMetaForm';

export type Word = { word: string; start: number; end: number };
export type Segment = {
  id: number;
  start: number;
  end: number;
  text: string;
  words: Word[];
  translations: {
    en: string;
    th: string;
    ru: string;
  };
};
export type SubtitleData = {
  translation: any;
  segments: Segment[];
};
export type VideoDoc = {
  src: string;
  previewSrc: string;
  originalLang: Language;
  targetLangs: Language[];
  difficulty: string;
  tags: string[];
  subtitle: SubtitleData;
  name: string;
  size: number;
  updated: any; // Firestore Timestamp
};
