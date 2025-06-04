// src/components/exercises/SentenceExercise.tsx
import React, { useEffect, useState, useRef } from 'react';
import { useDrag, useDrop, useDragLayer } from 'react-dnd';
import { getEmptyImage } from 'react-dnd-html5-backend';

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

// Элемент перетаскивания с указанием его текущего списка
type DragItem = DraggableWord & { fromList: boolean };

const ITEM_TYPE = 'WORD';

// Компонент для кастомного слоя перетаскивания
const DragPreview: React.FC = () => {
  const { itemType, item, isDragging, currentOffset } = useDragLayer(monitor => ({
    itemType: monitor.getItemType(),
    item: monitor.getItem() as DragItem | null,
    isDragging: monitor.isDragging(),
    currentOffset: monitor.getSourceClientOffset(),
  }));

  if (!isDragging || itemType !== ITEM_TYPE || !currentOffset || !item) return null;

  const { x, y } = currentOffset;

  return (
    <div
      style={{
        position: 'fixed',
        pointerEvents: 'none',
        left: x,
        top: y,
        transform: 'translate(-50%, -50%)',
        zIndex: 1000,
      }}
    >
      <div className="px-3 py-1 bg-gray-200 rounded shadow">
        {item.text}
      </div>
    </div>
  );
};

interface WordChipProps {
  word: DraggableWord;
  fromList: boolean; // где находится слово в данный момент
  disabled: boolean;
  colorClass?: string; // цвет фона
}

// Универсальный чип, который может перетаскиваться между двумя списками
const WordChip: React.FC<WordChipProps> = ({ word, fromList, disabled, colorClass }) => {
  const [{ isDragging }, drag, preview] = useDrag<DragItem, void, { isDragging: boolean }>(
    () => ({
      type: ITEM_TYPE,
      item: { ...word, fromList },
      canDrag: !disabled,
    }),
    [word, fromList, disabled],

  );

  // Скрываем стандартный drag preview
  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, [preview]);

  return (
    <div
      ref={node => {
        drag(node as HTMLDivElement);
      }}
      style={{ opacity: isDragging ? 0 : 1 }}
      className={`px-3 py-1 rounded cursor-move select-none ${colorClass || 'bg-gray-200'}`}
      data-interactive="true"
    >
      {word.text}
    </div>
  );
};

export default function SentenceExercise({ sentence, onComplete, isActive, index }: Props) {
  const [shuffled, setShuffled] = useState<DraggableWord[]>([]);
  const [userOrder, setUserOrder] = useState<DraggableWord[]>([]);
  const [isChecked, setIsChecked] = useState(false);
  const [feedback, setFeedback] = useState<boolean[]>([]); // true = правильно, false = неправильно

  const dropZoneRef = useRef<HTMLDivElement>(null);

  // Зона для составления предложения
  const [, dropToUser] = useDrop(
    () => ({
      accept: ITEM_TYPE,
      drop: (item: DragItem) => {
        if (item.fromList && !userOrder.find(w => w.id === item.id)) {
          // перенос из общего списка
          setShuffled(prev => prev.filter(w => w.id !== item.id));
          setUserOrder(prev => [...prev, item]);
        }
      },
    }),
    [userOrder, shuffled],
  );

  // Зона со всеми словами
  const [, dropToList] = useDrop(
    () => ({
      accept: ITEM_TYPE,
      drop: (item: DragItem) => {
        if (!item.fromList) {
          // перенос из пользовательского поля обратно в список
          setUserOrder(prev => prev.filter(w => w.id !== item.id));
          setShuffled(prev => [...prev, item]);
        }
      },
    }),
    [userOrder, shuffled],
  );

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
          <div
            ref={node => {
              dropToList(node as HTMLDivElement);
            }}
            className="flex flex-wrap gap-2 mb-4"
          >
            {shuffled.map(wordObj => (
              <WordChip
                key={wordObj.id}
                word={wordObj}
                fromList={true}
                disabled={isChecked}
              />
            ))}
          </div>

          {/* Поле пользователя (куда перетаскивают слова) */}
          <div
            ref={node => {
              dropToUser(node as HTMLDivElement);
              dropZoneRef.current = node;
            }}
            className="min-h-[48px] border-2 border-dashed border-gray-300 rounded p-2 mb-4 flex flex-wrap gap-2"
          >
            {userOrder.length === 0 && (
              <span className="text-gray-400">Перетащите сюда слова...</span>
            )}
            {userOrder.map((w, idx) => {
              const color = isChecked
                ? feedback[idx]
                  ? 'bg-green-300'
                  : 'bg-red-300'
                : 'bg-yellow-100';
              return (
                <WordChip
                  key={w.id}
                  word={w}
                  fromList={false}
                  disabled={isChecked}
                  colorClass={color}
                />
              );
            })}
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
        <DragPreview />
      </>
      )}
    </div>
  );
}
