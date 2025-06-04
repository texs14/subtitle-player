// src/components/DropSlot.tsx
import React, { DragEvent, useCallback } from 'react';
import cx from 'classnames';

interface DropSlotProps {
  slotIndex: number;
  placedWordIndex: number | null; // индекс из массива слов, или null
  placedWordText: string;
  onDropWord: (slotIdx: number, wordIdx: number) => void;
  isCorrect?: boolean; // для подсветки: true / false / undefined
}

export const DropSlot: React.FC<DropSlotProps> = ({
  slotIndex,
  placedWordIndex,
  placedWordText,
  onDropWord,
  isCorrect,
}) => {
  // Делаем слот реагирующим на drop
  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      // извлекаем индекс слова из dataTransfer
      const wordIdxString = e.dataTransfer.getData('text/plain');
      if (!wordIdxString) return;
      const wordIdx = Number(wordIdxString);
      onDropWord(slotIndex, wordIdx);
    },
    [slotIndex, onDropWord],
  );

  // Выбираем цвет фона:
  //  - если isCorrect === true → зелёный обвод
  //  - если false → красный обвод
  //  - иначе обычный серый пунктир
  const borderClass =
    isCorrect === undefined
      ? 'border-2 border-gray-300 border-dashed'
      : isCorrect
        ? 'border-2 border-green-500'
        : 'border-2 border-red-500';

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className={cx(
        'min-w-[4rem] min-h-[2rem] flex items-center justify-center m-1 p-2',
        borderClass,
        'rounded',
      )}
    >
      {placedWordText || <span className="text-gray-400">…</span>}
    </div>
  );
};
