import { Segment, SubtitleData, Word } from './VideoPlayer';

const sentenceEnd = /[.!?…]+$/;

/**
 * Разбивает массив слов на сегменты‑предложения и
 * прикрепляет перевод (если он есть) к соответствующему сегменту.
 */
export function buildSentenceSegments(src: SubtitleData): SubtitleData {
  // 1) Поток всех слов (в оригинальном порядке)
  const wordsStream = src.segments.flatMap(s => s.words);

  // 2) Подготовка массива предложений перевода
  const rawSentences = (src.translation || '')
    .split(/([.!?…]+)/) // отделяем знаки препинания, сохраняя их
    .reduce<string[]>((acc, str, i, arr) => {
      if (!str.trim()) return acc;

      // Если текущий токен — знак препинания, а далее есть текст,
      // приклеиваем знак к ПРЕДЫДУЩЕМУ предложению, а не к следующему
      if (sentenceEnd.test(str) && acc.length) {
        acc[acc.length - 1] += str; // добавить знак к предыдущему
      } else {
        acc.push(str);
      }
      return acc;
    }, []);

  // 3) Чистим ведущие знаки (на случай, если split/reduce оставили их спереди)
  const ruSentences = rawSentences.map(s => s.replace(/^\s*[.!?…]+\s*/, '').trim());

  // 4) Формируем сегменты оригинала, одновремённо связывая перевод
  const sentenceSegs: Segment[] = [];
  let buff: Word[] = [];

  wordsStream.forEach((w, i) => {
    buff.push(w);
    const isSentenceEnd = sentenceEnd.test(w.word) || i === wordsStream.length - 1;
    if (isSentenceEnd) {
      sentenceSegs.push({
        id: sentenceSegs.length,
        text: buff
          .map(x => x.word)
          .join(' ')
          .trim(),
        words: [...buff],
      });
      buff = [];
    }
  });

  // 5) Возвращаем сегменты с прикреплённым переводом (по индексу)
  return {
    segments: sentenceSegs.map((s, i) => ({
      ...s,
      textTranslated: ruSentences[i] ?? '',
    })),
  };
}
