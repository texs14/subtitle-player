// src/helpers/buildSentenceSegments.ts
import { Segment, SubtitleData, Word } from '../../types';

const sentenceEnd = /[.!?…]+$/;
const thaiChar = /[\u0E00-\u0E7F]/;

/**
 * Разбивает поток слов на предложения и прикрепляет переводы из исходных сегментов.
 * Для тайского языка дополнительно разбивает по пробелам между тайскими символами.
 * Переводы сохраняются в ключах { en, th, ru }.
 */
export function buildSentenceSegments(src: SubtitleData): SubtitleData {
  // 1) Поток всех слов
  const wordsStream: Word[] = src.segments.flatMap(s => s.words);

  // 2) Соединяем переводы всех исходных сегментов в единые тексты
  const fullEn = src.segments.map(s => s.translations.en).join(' ');
  const fullTh = src.segments.map(s => s.translations.th).join(' ');
  const fullRu = src.segments.map(s => s.translations.ru).join(' ');

  // 3) Разбиение английского текста на предложения по знакам
  const enSentences = fullEn
    .split(/([.!?…]+)/)
    .reduce<string[]>((acc, tok) => {
      if (!tok.trim()) return acc;
      if (sentenceEnd.test(tok) && acc.length) acc[acc.length - 1] += tok;
      else acc.push(tok);
      return acc;
    }, [])
    .map(s => s.replace(/^\s*[.!?…]+\s*/, '').trim());

  const ruSentences = fullRu
    .split(/([.!?…]+)/)
    .reduce<string[]>((acc, tok) => {
      if (!tok.trim()) return acc;
      if (sentenceEnd.test(tok) && acc.length) acc[acc.length - 1] += tok;
      else acc.push(tok);
      return acc;
    }, [])
    .map(s => s.replace(/^\s*[.!?…]+\s*/, '').trim());

  // 4) Разбиение тайского текста на предложения по пробелам между тайскими символами
  const thSentences = thaiChar.test(fullTh)
    ? fullTh.split(/(?<=[\u0E00-\u0E7F])\s+(?=[\u0E00-\u0E7F])/).map(s => s.trim())
    : [];

  // 5) Формируем новые сегменты-предложения по оригинальным словам и таймингам
  const sentenceSegs: Segment[] = [];
  let buff: Word[] = [];

  wordsStream.forEach((w, i) => {
    buff.push(w);
    const isEnd = sentenceEnd.test(w.word) || i === wordsStream.length - 1;
    if (isEnd) {
      const start = buff[0].start;
      const end = buff[buff.length - 1].end;
      sentenceSegs.push({
        id: sentenceSegs.length,
        start,
        end,
        text: buff
          .map(x => x.word)
          .join(' ')
          .trim(),
        words: [...buff],
        translations: {
          en: enSentences[sentenceSegs.length] || '',
          th: thSentences[sentenceSegs.length] || '',
          ru: ruSentences[sentenceSegs.length] || '',
        },
      });
      buff = [];
    }
  });

  return { segments: sentenceSegs };
}
