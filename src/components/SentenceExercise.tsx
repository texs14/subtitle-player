// src/components/exercises/SentenceExercise.tsx
import React, { useEffect, useState, useRef, useCallback } from 'react';
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
type DragItem = DraggableWord & { fromList: boolean; width: number };

const ITEM_TYPE = 'WORD';

// Компонент для кастомного слоя перетаскивания
const DragPreview: React.FC = () => {
  const { itemType, item, isDragging, currentOffset } = useDragLayer(monitor => ({
    itemType: monitor.getItemType(),
    item: monitor.getItem() as DragItem | null,
    isDragging: monitor.isDragging(),
    currentOffset: monitor.getClientOffset(),
  }));

  if (!isDragging || itemType !== ITEM_TYPE || !currentOffset || !item) return null;

  const { x = 0, y = 0 } = currentOffset;

  return (
    <div
      style={{
        position: 'fixed',
        pointerEvents: 'none',
        left: 0,
        top: 0,
        transform: `translate(${x}px, ${y}px)`,
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
  index?: number; // позиция слова в пользовательской зоне или списке
  moveWord?: (dragIndex: number, hoverIndex: number) => void; // перестановка
  insertWordFromList?: (word: DraggableWord, at: number) => void; // вставка слова из списка
  onDragStart: (item: DragItem) => void; // уведомить родителя о начале drag
  onDragEnd: (item: DragItem, didDrop: boolean) => void; // уведомить о завершении
}

// Универсальный чип, который может перетаскиваться между двумя списками
const WordChip: React.FC<WordChipProps> = ({
  word,
  fromList,
  disabled,
  colorClass,
  index,
  moveWord,
  insertWordFromList,
  onDragStart,
  onDragEnd,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [hoverPos, setHoverPos] = useState<'left' | 'right' | null>(null);
  const [dragWidth, setDragWidth] = useState(0);

  const [{ isDragging }, drag, preview] = useDrag<DragItem & { index?: number }, void, { isDragging: boolean }>(
    () => ({
      type: ITEM_TYPE,
      item: () => {
        const width = ref.current?.offsetWidth || 0;
        const item = { ...word, fromList, index, width };
        onDragStart(item);
        return item;
      },
      canDrag: !disabled,
      end: (item, monitor) => {
        setHoverPos(null);
        if (item) onDragEnd(item as DragItem, monitor.didDrop());
      },
    }),
    [word, fromList, disabled, index, onDragStart, onDragEnd],
  );

  const [{ isOver }, drop] = useDrop<
    DragItem & { index?: number },
    { handled?: boolean },
    { isOver: boolean }
  >(

    () => ({
      accept: ITEM_TYPE,
      drop: (item, monitor) => {
        setHoverPos(null);
        if (!monitor.isOver({ shallow: true })) return;
        if (!fromList && item.fromList && insertWordFromList && index !== undefined) {
          const at = hoverPos === 'right' ? index + 1 : index;
          insertWordFromList(item, at);
          item.fromList = false;
          item.index = at;
          return { handled: true };
        }
      },
      hover: (item, monitor) => {
        if (!ref.current) return;
        const rect = ref.current.getBoundingClientRect();
        const middleX = (rect.right - rect.left) / 2;
        const client = monitor.getClientOffset();
        if (!client) return;
        const offsetX = client.x - rect.left;
        const pos = offsetX < middleX ? 'left' : 'right';
        setHoverPos(pos);
        setDragWidth(item.width);

        if (!moveWord || fromList || item.fromList) return;
        if (item.index === undefined || index === undefined) return;
        const targetIndex = pos === 'left' ? index : index + 1;
        if (targetIndex === item.index || targetIndex - 1 === item.index) return;
        const newIndex = targetIndex > item.index ? targetIndex - 1 : targetIndex;
        moveWord(item.index, newIndex);
        item.index = newIndex;
      },
      collect: monitor => ({
        isOver: monitor.isOver({ shallow: true }),
      }),
    }),
    [moveWord, fromList, index, insertWordFromList, hoverPos],
  );

  useEffect(() => {
    if (!isOver) setHoverPos(null);
  }, [isOver]);

  // Скрываем стандартный drag preview
  useEffect(() => {
    preview(getEmptyImage(), { captureDraggingState: true });
  }, [preview]);

  return (
    <div
      ref={node => {
        ref.current = node;
        if (fromList) {
          drag(node as HTMLDivElement);
        } else {
          drag(drop(node as HTMLDivElement));
        }
      }}
      style={{
        opacity: isDragging ? 0 : 1,
        display: isDragging ? 'none' : undefined,

        pointerEvents: isDragging ? 'none' : 'auto',
        transform:
          hoverPos === 'left'
            ? `translateX(-${dragWidth}px)`
            : hoverPos === 'right'
              ? `translateX(${dragWidth}px)`
              : 'none',
        transition: hoverPos ? 'transform 0.3s ease-out' : undefined,
      }}
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

  const handleChipDragStart = useCallback((_item: DragItem) => {
    /* no-op */
  }, []);


  const handleChipDragStart = useCallback((item: DragItem) => {
    if (item.fromList) {
      setShuffled(prev => prev.filter(w => w.id !== item.id));
    } else {
      setUserOrder(prev => prev.filter(w => w.id !== item.id));
    }
  }, []);

  const handleChipDragEnd = useCallback(
    (item: DragItem, didDrop: boolean) => {
      if (didDrop) return;
      if (item.fromList) {
        setShuffled(prev => [...prev, item]);
      } else {
        setUserOrder(prev => [...prev, item]);
      }
    },
    [],
  );

  const moveWord = useCallback(
    (from: number, to: number) => {
      setUserOrder(prev => {
        const updated = [...prev];
        const [moved] = updated.splice(from, 1);
        updated.splice(to, 0, moved);
        return updated;
      });
    },
    [],
  );

  const insertWordFromList = useCallback((word: DraggableWord, at: number) => {
    setShuffled(prev => prev.filter(w => w.id !== word.id));
    setUserOrder(prev => {
      const updated = [...prev];
      updated.splice(at, 0, word);
      return updated;
    });
  }, []);

  // Зона для составления предложения
  const [{ isOver }, dropToUser] = useDrop<DragItem, void, { isOver: boolean }>(
    () => ({
      accept: ITEM_TYPE,
      drop: (item, monitor) => {
        if (monitor.didDrop()) return;
        if (item.fromList && !userOrder.find(w => w.id === item.id)) {
          // перенос из общего списка в конец, если не попали на слово
          setShuffled(prev => prev.filter(w => w.id !== item.id));
          setUserOrder(prev => [...prev, item]);
        }
      },
      collect: monitor => ({
        isOver: monitor.isOver({ shallow: true }),
      }),
    }),
    [userOrder, shuffled],
  );

  // Зона со всеми словами
  const [{ isOver: isOverList }, dropToList] = useDrop<DragItem, void, { isOver: boolean }>(
    () => ({
      accept: ITEM_TYPE,
      drop: (item: DragItem) => {
        if (!item.fromList) {
          // перенос из пользовательского поля обратно в список
          setUserOrder(prev => prev.filter(w => w.id !== item.id));
          setShuffled(prev => [...prev, item]);
        }
      },
      collect: monitor => ({
        isOver: monitor.isOver({ shallow: true }),
      }),
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
    setShuffled(prev => [...prev, ...userOrder]);
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
            className={`flex flex-wrap gap-2 mb-4 border-2 border-dashed rounded ${isOverList ? 'border-yellow-400' : 'border-transparent'}`}
          >
            {shuffled.map((wordObj, idx) => (
              <WordChip
                key={wordObj.id}
                word={wordObj}
                fromList={true}
                disabled={isChecked}
                index={idx}
                onDragStart={handleChipDragStart}
                onDragEnd={handleChipDragEnd}
              />
            ))}
          </div>

          {/* Поле пользователя (куда перетаскивают слова) */}
          <div
            ref={node => {
              dropToUser(node as HTMLDivElement);
              dropZoneRef.current = node;
            }}
            className={`min-h-[48px] border-2 border-dashed rounded p-2 mb-4 flex flex-wrap gap-2 ${isOver ? 'border-yellow-400' : 'border-gray-300'}`}
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
                  index={idx}
                  moveWord={moveWord}
                  insertWordFromList={insertWordFromList}
                  onDragStart={handleChipDragStart}
                  onDragEnd={handleChipDragEnd}
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
