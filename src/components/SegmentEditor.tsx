// src/components/SegmentEditor.tsx
import React, { useState, useEffect, useRef } from 'react';
import type { Segment } from '../types';
import { Language } from './LanguageMetaForm';

interface Props {
  segments: Segment[];
  targetLangs: string[];
  onChange: (segments: Segment[]) => void;
}

export function SegmentEditor({ segments, targetLangs, onChange }: Props) {
  // локальное состояние для редактирования
  const [arr, setArr] = useState<Segment[]>(segments);
  // оригинальные сегменты для сброса
  const origRef = useRef<Segment[]>(segments);

  // синхронизируем локальное состояние при изменении props.segments
  useEffect(() => {
    setArr(segments);
    origRef.current = segments;
  }, [segments]);

  // обновление одного поля в сегменте
  const handleField = <K extends keyof Segment>(idx: number, field: K, value: Segment[K]) => {
    setArr(prev => {
      const copy = prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s));
      onChange(copy);
      return copy;
    });
  };

  // сброс одного сегмента к оригинальному состоянию
  const resetSeg = (idx: number) => {
    setArr(prev => {
      const copy = prev.map((s, i) => (i === idx ? origRef.current[i] : s));
      onChange(copy);
      return copy;
    });
  };

  return (
    <div className="space-y-6">
      {arr.map((s, i) => (
        <div key={s.id} className="p-4 space-y-2 border rounded">
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-500">{s.start.toFixed(2)}s</span>
            <span className="text-xs text-gray-500">-</span>
            <span className="text-xs text-gray-500">{s.end.toFixed(2)}s</span>
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
              value={s.text}
              placeholder="Введите текст фразы"
              onChange={e => handleField(i, 'text', e.target.value)}
              className="w-full mt-1 border-gray-300 rounded"
            />
          </div>

          {targetLangs.map(lang => (
            <div key={lang}>
              <label className="block text-sm font-medium">Перевод ({lang})</label>
              <input
                type="text"
                value={s.translations[lang as Language] ?? ''}
                placeholder={`Перевод на ${lang}`}
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
    </div>
  );
}
