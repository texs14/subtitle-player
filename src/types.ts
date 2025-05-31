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
export type SubtitleData = { segments: Segment[] };
export type VideoDoc = {
  src: string;
  previewSrc: string;
  originalLang: string;
  targetLangs: string[];
  difficulty: string;
  tags: string[];
  subtitle: SubtitleData;
  name: string;
  size: number;
  updated: any; // Firestore Timestamp
};
