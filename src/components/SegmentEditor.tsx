// src/components/SegmentEditor.tsx
import { useState, useEffect, useRef } from 'react';
import type { Segment, Word } from '../types';
import { Language } from './LanguageMetaForm';

interface Props {
  segments: Segment[];
  originalLang: string;
  targetLangs: Language[];
  onChange: (segments: Segment[]) => void;
}

export function SegmentEditor({ segments, originalLang, targetLangs, onChange }: Props) {
  const [arr, setArr] = useState<Segment[]>([]);
  const origRef = useRef<Segment[]>([]);

  useEffect(() => {
    const sorted = [...segments]
      .sort((a, b) => a.start - b.start)
      .map((s, idx) => ({ ...s, id: idx }));
    setArr(sorted);
    origRef.current = sorted.map(s => ({ ...s }));
  }, [segments]);

  // Сегментируем текст на слова через Intl.Segmenter
  const segmentWords = (text: string): Word[] => {
    try {
      // TODO временное решение для разбивки на слова на тайском
      // @ts-ignore
      const seg = new Intl.Segmenter(originalLang, { granularity: 'word' });
      const wordsArr: Word[] = [];
      for (const { segment } of seg.segment(text)) {
        if (!segment.trim()) continue;
        wordsArr.push({ word: segment, start: 0, end: 0 });
      }
      return wordsArr;
    } catch {
      return text.trim() ? [{ word: text.trim(), start: 0, end: 0 }] : [];
    }
  };

  const handleTextChange = (idx: number, value: string) => {
    setArr(prev => {
      const newWords = segmentWords(value);
      const copy = prev.map((s, i) => (i === idx ? { ...s, text: value, words: newWords } : s));
      const renumbered = copy.map((s, i) => ({ ...s, id: i }));
      origRef.current = renumbered.map(s => ({ ...s }));
      onChange(renumbered);
      return renumbered;
    });
  };

  const handleField = <K extends keyof Segment>(idx: number, field: K, value: Segment[K]) => {
    setArr(prev => {
      const copy = prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s));
      let result: Segment[];
      if (field === 'start' || field === 'end') {
        result = copy.sort((a, b) => a.start - b.start).map((s, i) => ({ ...s, id: i }));
      } else {
        result = copy.map((s, i) => ({ ...s, id: i }));
      }
      origRef.current = result.map(s => ({ ...s }));
      onChange(result);
      return result;
    });
  };

  const handleWordField = (segIdx: number, wordIdx: number, value: string) => {
    setArr(prev => {
      const copy = prev.map((s, i) => {
        if (i === segIdx) {
          const wordsCopy = s.words.map((w, wi) => (wi === wordIdx ? { ...w, word: value } : w));
          const newText = wordsCopy.map(w => w.word).join(' ');
          return { ...s, words: wordsCopy, text: newText };
        }
        return s;
      });
      onChange(copy);
      return copy;
    });
  };

  const deleteWord = (segIdx: number, wordIdx: number) => {
    if (!window.confirm('Удалить это слово?')) return;
    setArr(prev => {
      const copy = prev.map((s, i) => {
        if (i === segIdx) {
          const wordsCopy = s.words.filter((_, wi) => wi !== wordIdx);
          const newText = wordsCopy.map(w => w.word).join(' ');
          return { ...s, words: wordsCopy, text: newText };
        }
        return s;
      });
      onChange(copy);
      return copy;
    });
  };

  const addWord = (segIdx: number) => {
    setArr(prev => {
      const copy = prev.map((s, i) => {
        if (i === segIdx) {
          const wordsCopy = [...s.words, { word: '', start: 0, end: 0 }];
          const newText = wordsCopy.map(w => w.word).join(' ');
          return { ...s, words: wordsCopy, text: newText };
        }
        return s;
      });
      onChange(copy);
      return copy;
    });
  };

  const resetSeg = (idx: number) => {
    setArr(prev => {
      const copy = prev.map((s, i) => (i === idx ? { ...origRef.current[i] } : s));
      const sorted = copy.sort((a, b) => a.start - b.start).map((s, i) => ({ ...s, id: i }));
      origRef.current = sorted.map(s => ({ ...s }));
      onChange(sorted);
      return sorted;
    });
  };

  const deleteSegment = (idx: number) => {
    if (!window.confirm('Удалить этот сегмент целиком?')) return;
    setArr(prev => {
      const filtered = prev.filter((_, i) => i !== idx);
      const renumbered = filtered.map((s, i) => ({ ...s, id: i }));
      origRef.current = renumbered.map(s => ({ ...s }));
      onChange(renumbered);
      return renumbered;
    });
  };

  const addSegment = () => {
    setArr(prev => {
      const newSeg: Segment = {
        id: prev.length,
        start: 0,
        end: 0,
        text: '',
        words: [],
        translations: targetLangs.reduce(
          (acc, lang) => ({ ...acc, [lang]: '' }),
          {} as Record<Language, string>,
        ),
      };
      const copy = [...prev, newSeg];
      const sorted = copy.sort((a, b) => a.start - b.start).map((s, i) => ({ ...s, id: i }));
      origRef.current = sorted.map(s => ({ ...s }));
      onChange(sorted);
      return sorted;
    });
  };

  return (
    <div className="space-y-6">
      {arr.map((s, i) => (
        <div key={s.id} className="p-4 space-y-2 border rounded">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold">Сегмент {s.id + 1}</h4>
            <button
              onClick={() => deleteSegment(i)}
              className="text-xs text-red-600 hover:underline"
            >
              Удалить сегмент
            </button>
          </div>

          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              <label className="text-xs text-gray-500">Start:</label>
              <input
                type="text"
                placeholder="0.00"
                value={s.start.toFixed(2)}
                onChange={e => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) handleField(i, 'start', val as any);
                }}
                className="w-20 text-xs text-gray-700 border-gray-300 rounded"
              />
            </div>
            <div className="flex items-center space-x-1">
              <label className="text-xs text-gray-500">End:</label>
              <input
                type="text"
                placeholder="0.00"
                value={s.end.toFixed(2)}
                onChange={e => {
                  const val = parseFloat(e.target.value);
                  if (!isNaN(val)) handleField(i, 'end', val as any);
                }}
                className="w-20 text-xs text-gray-700 border-gray-300 rounded"
              />
            </div>
            <button
              onClick={() => resetSeg(i)}
              className="ml-auto text-xs text-blue-600 hover:underline"
            >
              Сбросить
            </button>
          </div>

          <div>
            <label className="block text-sm font-medium">Оригинал</label>
            <input
              type="text"
              placeholder="Введите текст фразы"
              value={s.text}
              onChange={e => handleTextChange(i, e.target.value)}
              className="w-full mt-1 border-gray-300 rounded"
            />
          </div>

          {/* Секция слов */}
          <div className="pl-4 space-y-2 border-l border-gray-300">
            <h5 className="text-sm font-medium">Слова</h5>
            <div className="flex flex-wrap gap-[8px]">
              {s.words.map((w, wi) => (
                <div key={wi} className="flex items-center w-auto space-x-2">
                  <input
                    type="text"
                    placeholder="Слово"
                    value={w.word}
                    onChange={e => handleWordField(i, wi, e.target.value)}
                    className="w-auto text-xs text-gray-700 border-gray-300 rounded"
                  />
                  <button
                    onClick={() => deleteWord(i, wi)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={() => addWord(i)}
              className="px-2 py-1 text-xs text-white bg-blue-500 rounded hover:bg-blue-600"
            >
              Добавить слово
            </button>
          </div>

          {targetLangs.map(lang => (
            <div key={lang}>
              <label className="block text-sm font-medium">Перевод ({lang})</label>
              <input
                type="text"
                placeholder={`Перевод на ${lang}`}
                value={s.translations[lang] ?? ''}
                onChange={e => {
                  const trans = { ...s.translations, [lang]: e.target.value };
                  handleField(i, 'translations', trans as any);
                }}
                className="w-full mt-1 border-gray-300 rounded"
              />
            </div>
          ))}
        </div>
      ))}

      <button
        onClick={addSegment}
        className="px-4 py-2 text-white bg-blue-600 rounded hover:bg-blue-700"
      >
        Добавить сегмент
      </button>
    </div>
  );
}
