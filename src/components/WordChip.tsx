// src/components/WordChip.tsx
import React, { DragEvent } from 'react';
import cx from 'classnames';

interface WordChipProps {
  word: string;
  index: number;
  onDragStart: (ev: DragEvent<HTMLDivElement>, index: number) => void;
  isPlaced: boolean; // true, если слово уже помещено в “слот”
  isCorrect?: boolean; // undefined (не проверяли), true (правильно), false (неправильно)
}

export const WordChip: React.FC<WordChipProps> = ({
  word,
  index,
  onDragStart,
  isPlaced,
  isCorrect,
}) => {
  // Определяем класс для цвета фона:
  //  - если isCorrect === true → зелёный фон
  //  - если isCorrect === false → светло-красный
  //  - иначе обычный серый
  const base = 'px-3 py-1 rounded cursor-grab select-none';
  const statusClass =
    isCorrect === undefined ? 'bg-gray-200' : isCorrect ? 'bg-green-300' : 'bg-red-200';

  return (
    <div
      className={cx(base, statusClass, {
        'opacity-50 cursor-default': isPlaced, // если уже помещено, не даём повторно брать
      })}
      draggable={!isPlaced}
      onDragStart={e => {
        // Если уже помещено, не разрешаем drag
        if (!isPlaced) onDragStart(e, index);
      }}
      data-interactive="true"
    >
      {word}
    </div>
  );
};
