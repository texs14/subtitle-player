// src/data/exercise.ts

import { Language } from '../components/LanguageMetaForm';

export interface SentenceItem {
  text: string;
  rightAnswers: string[]; // для тайских предложений обычно один вариант
  translations: {
    [K in Exclude<Language, 'th'>]: string;
  };
  note:
    | {
        [K in Exclude<Language, 'th'>]?: string;
      }
    | null;
}

export interface Exercise {
  name: string;
  originalLang: Language; // например 'th'
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  tags: string[];
  sentences: SentenceItem[];
}

// Пример «мокового» упражнения:
export const demoExercise: Exercise = {
  name: 'Базовая грамматика',
  originalLang: 'th',
  difficulty: 'beginner',
  tags: ['grammar', 'vocabulary'],
  sentences: [
    {
      text: 'นี่คือข้อเสนอการทดสอบสำหรับการตรวจสอบ',
      rightAnswers: ['นี่คือข้อเสนอการทดสอบสำหรับการตรวจสอบ'],
      translations: {
        ru: 'Это тестовое предложение для проверки',
        en: 'This is a test offer for verification',
      },
      note: {
        en: 'We check how it will all be displayed and look like',
        ru: 'Проверяем как это всё будет выводиться и выглядеть',
      },
    },
    {
      text: 'นี้เป็นคำแนะนำการทดสอบต่อไปที่จะตรวจสอบ',
      rightAnswers: ['นี้เป็นคำแนะนำการทดสอบต่อไปที่จะตรวจสอบ'],
      translations: {
        ru: 'Это следующее тестовое предложение для проверки',
        en: 'This is the next test suggestion to check.',
      },
      note: null,
    },
    // Можно добавить дополнительные предложения...
  ],
};
