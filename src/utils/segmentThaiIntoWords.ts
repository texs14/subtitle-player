/**
 * Разбивает тайское предложение на слова, используя Intl.Segmenter('th'):
 */
export default function segmentThaiIntoWords(sentence: string): string[] {
  // @ts-ignore
  if (typeof Intl?.Segmenter !== 'function') {
    // Fallback: просто возвращаем весь текст как один элемент
    return [sentence];
  }
  // @ts-ignore
  const segmenter = new Intl.Segmenter('th', { granularity: 'word' });
  const segments = Array.from(segmenter.segment(sentence));
  // Убираем пробельные/разделительные фрагменты (если они есть)
  return segments.map((seg: any) => seg.segment).filter(word => word.trim() !== '');
}
