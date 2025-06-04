// src/components/exercises/SentenceExercise.tsx
import React, { useEffect, useState, useRef } from 'react';

interface Sentence {
  text: string; // Полное предложение на тайском, например: "นี่คือข้อเสนอการทดสอบสำหรับการตรวจสอบ"
  rightAnswers: string[]; // Массив «правильных ответов» (в данном случае часто это будет одно и то же предложение)
  translations: {
    ru: string;
    en: string;
  };
  note: {
    ru?: string;
    en?: string;
  } | null;
}

interface Props {
  sentence: Sentence;
  onComplete: () => void; // Callback при успешной проверке
  isActive: boolean; // Является ли это текущее (или уже пройденное) задание
  index: number; // Порядковый номер задания (0-based)
}

type DraggableWord = {
  id: string; // Уникальный идентификатор слова (чтобы не было коллизий)
  text: string; // Само слово
  correctIndex: number; // Позиция в «правильном ответе»
};

export default function SentenceExercise({ sentence, onComplete, isActive, index }: Props) {
  const [shuffled, setShuffled] = useState<DraggableWord[]>([]);
  const [userOrder, setUserOrder] = useState<DraggableWord[]>([]);
  const [isChecked, setIsChecked] = useState(false);
  const [feedback, setFeedback] = useState<boolean[]>([]); // true = правильно, false = неправильно

  const dropZoneRef = useRef<HTMLDivElement>(null);

  // При инициализации разбиваем текст на тайские «слова» через Intl.Segmenter
  useEffect(() => {
    if (!isActive) return;

    // Разбиваем тайский текст на слова
    const segmenter = new (Intl as any).Segmenter('th', { granularity: 'word' });
    const segments = Array.from(segmenter.segment(sentence.text))
      .map((seg: any) => seg.segment.trim())
      .filter((w: string) => w.length > 0);

    // Создаём массив объектов с уникальными id и правильным порядком
    const correctSequence: DraggableWord[] = segments.map((w: string, idx: number) => ({
      id: `${index}-${idx}-${w}`,
      text: w,
      correctIndex: idx,
    }));

    // Перемешиваем этот массив для Drag&Drop-поля
    const shuffledCopy = [...correctSequence].sort(() => Math.random() - 0.5);
    setShuffled(shuffledCopy);
    setUserOrder([]); // очищаем поле пользователя
    setIsChecked(false);
    setFeedback([]);
  }, [sentence.text, isActive, index]);

  // Обработчики Drag&Drop
  const handleDragStart = (e: React.DragEvent<HTMLDivElement>, draggedWord: DraggableWord) => {
    e.dataTransfer.setData('application/json', JSON.stringify(draggedWord));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('application/json');
    if (!data) return;
    const droppedWord: DraggableWord = JSON.parse(data);

    // Если слово уже добавлено пользователем — не добавляем снова
    if (userOrder.find(w => w.id === droppedWord.id)) return;

    setUserOrder(prev => [...prev, droppedWord]);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  // Проверка: нажали «Проверить»
  const handleCheck = () => {
    // Собираем текст из userOrder и отдаем в rightAnswers (массив строк)
    const assembled = userOrder.map(w => w.text).join('');
    const isCorrect = sentence.rightAnswers.includes(assembled);

    // Проверяем по-словно: слова на тех же позициях, что и в правильном массиве
    const feedbackArr = userOrder.map((w, idx) => {
      return w.correctIndex === idx;
    });

    setFeedback(feedbackArr);
    setIsChecked(true);

    if (isCorrect) {
      // через небольшой таймаут даём пользователю увидеть зелёные слова
      setTimeout(() => {
        onComplete();
      }, 800);
    }
  };

  // Сброс текущего поля (например, перед проверкой нового предложения)
  const handleReset = () => {
    setUserOrder([]);
    setIsChecked(false);
    setFeedback([]);
  };

  return (
    <div className={`border rounded p-4 mb-6 ${!isActive ? 'opacity-50' : ''}`}>
      {/* Если задание не активно (future), просто скрываем */}
      {!isActive && <p className="text-gray-400">Задание #{index + 1} ещё не доступно</p>}

      {isActive && (
        <>
          <h3 className="mb-2 text-lg font-semibold">Задание {index + 1}</h3>
          {/* Оригинальный текст (на тайском) */}
          <p className="mb-2">Соберите предложение:</p>

          {/* Зона со словарными чипсами (перемешано) */}
          <div className="flex flex-wrap gap-2 mb-4">
            {shuffled.map(wordObj => (
              <div
                key={wordObj.id}
                draggable={!isChecked}
                onDragStart={e => handleDragStart(e, wordObj)}
                className="px-3 py-1 bg-gray-200 rounded cursor-move select-none"
              >
                {wordObj.text}
              </div>
            ))}
          </div>

          {/* Поле пользователя (куда перетаскивают слова) */}
          <div
            ref={dropZoneRef}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            className="min-h-[48px] border-2 border-dashed border-gray-300 rounded p-2 mb-4 flex flex-wrap gap-2"
          >
            {userOrder.length === 0 && (
              <span className="text-gray-400">Перетащите сюда слова...</span>
            )}
            {userOrder.map((w, idx) => (
              <span
                key={w.id}
                className={`
                  px-3 py-1 rounded select-none
                  ${isChecked ? (feedback[idx] ? 'bg-green-300' : 'bg-red-300') : 'bg-yellow-100'}
                `}
              >
                {w.text}
              </span>
            ))}
          </div>

          {/* Кнопки «Проверить» и «Сброс» */}
          <div className="flex items-center gap-4">
            <button
              onClick={handleCheck}
              disabled={isChecked || userOrder.length === 0}
              className="px-4 py-2 text-white bg-blue-600 rounded disabled:opacity-50"
            >
              Проверить
            </button>
            <button
              onClick={handleReset}
              disabled={userOrder.length === 0}
              className="px-4 py-2 text-white bg-gray-400 rounded disabled:opacity-50"
            >
              Сбросить
            </button>
          </div>

          {/* Если есть перевод или примечание, показываем под заданием */}
          <div className="mt-3 text-sm text-gray-600">
            {sentence.translations.ru && (
              <p>
                <strong>Перевод (RU):</strong> {sentence.translations.ru}
              </p>
            )}
            {sentence.translations.en && (
              <p>
                <strong>Перевод (EN):</strong> {sentence.translations.en}
              </p>
            )}
            {sentence.note && sentence.note.ru && (
              <p className="mt-1">
                <strong>Примечание (RU):</strong> {sentence.note.ru}
              </p>
            )}
            {sentence.note && sentence.note.en && (
              <p>
                <strong>Note (EN):</strong> {sentence.note.en}
              </p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
