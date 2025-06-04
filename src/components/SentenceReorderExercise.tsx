// src/components/SentenceReorderExercise.tsx
import React, { useState, useEffect, DragEvent } from 'react';
import { tokenizeThaiSentence } from '../utils/thaiTokenizer';

export interface ExerciseSentence {
  text: string;
  // The “correct” full sentence(s) as joined tokens
  rightAnswers: string[];
  translations: { [lang: string]: string };
  note: { [lang: string]: string } | null;
}

export interface ReorderExerciseData {
  name: string;
  originalLang: 'th' | string;
  difficulty: string;
  tags: string[];
  sentences: ExerciseSentence[];
}

interface TokenState {
  id: string; // unique ID per token (e.g. sentenceIdx + '-' + tokenIdx)
  text: string; // the token itself
}

interface SentenceReorderExerciseProps {
  data: ReorderExerciseData;
}

export default function SentenceReorderExercise({ data }: SentenceReorderExerciseProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [tokens, setTokens] = useState<TokenState[]>([]);
  const [shuffledTokens, setShuffledTokens] = useState<TokenState[]>([]);
  const [dropZone, setDropZone] = useState<TokenState[]>([]);
  const [feedback, setFeedback] = useState<{ id: string; correct: boolean }[] | null>(null);

  // Whenever currentIndex changes, re-tokenize & shuffle
  useEffect(() => {
    const sentenceObj = data.sentences[currentIndex];
    // Tokenize
    const rawTokens = tokenizeThaiSentence(sentenceObj.text);
    // Build TokenState array
    const keyed: TokenState[] = rawTokens.map((tok, idx) => ({
      id: `${currentIndex}-${idx}`,
      text: tok,
    }));

    setTokens(keyed);
    // Shuffle (Fisher–Yates)
    const copy = [...keyed];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    setShuffledTokens(copy);
    // Reset drop area & feedback
    setDropZone([]);
    setFeedback(null);
  }, [currentIndex]);

  // When user drags a token out of shuffledTokens → dropZone
  const onDragStart = (
    e: DragEvent<HTMLDivElement>,
    token: TokenState,
    source: 'shuffled' | 'drop',
  ) => {
    e.dataTransfer.setData('application/json', JSON.stringify({ token, source }));
    // For Firefox compatibility
    e.dataTransfer.effectAllowed = 'move';
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const onDropToDropZone = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const payload = JSON.parse(e.dataTransfer.getData('application/json')) as {
      token: TokenState;
      source: 'shuffled' | 'drop';
    };

    // Remove token from its source list
    if (payload.source === 'shuffled') {
      setShuffledTokens(prev => prev.filter(t => t.id !== payload.token.id));
      setDropZone(prev => [...prev, payload.token]);
    } else {
      // If dragging from dropZone back to dropZone? ignore
    }
    setFeedback(null);
  };

  const onDropToShuffled = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    const payload = JSON.parse(e.dataTransfer.getData('application/json')) as {
      token: TokenState;
      source: 'shuffled' | 'drop';
    };

    if (payload.source === 'drop') {
      setDropZone(prev => prev.filter(t => t.id !== payload.token.id));
      setShuffledTokens(prev => [...prev, payload.token]);
      setFeedback(null);
    }
    // If dragging within shuffled, ignore
  };

  const checkAnswer = () => {
    const sentenceObj = data.sentences[currentIndex];
    // Build user string by concatenating dropZone tokens in order:
    const userJoined = dropZone.map(t => t.text).join('');
    // Compare against each rightAnswers (they are strings)
    const isCorrect = sentenceObj.rightAnswers.includes(userJoined);

    // prepare feedback: for each token in dropZone, mark correct position/incorrect
    const correctTokens: { id: string; correct: boolean }[] = dropZone.map((t, idx) => {
      // Check if t.text in the “correct token list” at this idx.
      // We need to split the “rightAnswers[0]” into tokens in identical fashion, then compare text by position.
      const rightTokens = tokenizeThaiSentence(sentenceObj.rightAnswers[0]);
      const isTokenCorrect = idx < rightTokens.length && t.text === rightTokens[idx];
      return { id: t.id, correct: isCorrect && isTokenCorrect };
    });

    setFeedback(correctTokens);
  };

  const goToNext = () => {
    if (currentIndex + 1 < data.sentences.length) {
      setCurrentIndex(i => i + 1);
    }
  };
  const goToPrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(i => i - 1);
    }
  };

  const sentenceObj = data.sentences[currentIndex];

  return (
    <div className="max-w-2xl p-6 mx-auto space-y-6">
      <h2 className="text-2xl font-bold">{data.name}</h2>
      <p className="text-sm text-gray-600">
        Упражнение: предложение {currentIndex + 1} из {data.sentences.length}
      </p>
      <div className="p-4 space-y-4 border border-gray-300 rounded">
        {/* Translation/note */}
        <div className="text-sm italic text-gray-700">
          <div>RU: {sentenceObj.translations.ru}</div>
          <div>EN: {sentenceObj.translations.en}</div>
          {sentenceObj.note && (
            <div className="mt-2 text-gray-500">Note: {sentenceObj.note.en}</div>
          )}
        </div>

        {/* Shuffled tokens container */}
        <div
          className="flex flex-wrap gap-2 p-2 border border-dashed border-gray-400 rounded min-h-[3rem]"
          onDragOver={onDragOver}
          onDrop={onDropToShuffled}
        >
          {shuffledTokens.map(tok => {
            const isWrong = feedback?.find(fb => fb.id === tok.id && fb.correct === false);
            const isRight = feedback?.find(fb => fb.id === tok.id && fb.correct === true);
            return (
              <div
                key={tok.id}
                draggable
                onDragStart={e => onDragStart(e, tok, 'shuffled')}
                className={`px-2 py-1 rounded cursor-move select-none border ${
                  isRight
                    ? 'bg-green-200 border-green-400'
                    : isWrong
                      ? 'bg-red-200 border-red-400'
                      : 'bg-white border-gray-300'
                }`}
              >
                {tok.text}
              </div>
            );
          })}
        </div>

        {/* Drop zone */}
        <div
          className="flex flex-wrap gap-2 p-2 border border-dashed border-blue-400 rounded min-h-[3rem] bg-blue-50"
          onDragOver={onDragOver}
          onDrop={onDropToDropZone}
        >
          {dropZone.map((tok, idx) => {
            const fb = feedback?.find(fb => fb.id === tok.id);
            const isRight = fb?.correct === true;
            const isWrong = fb?.correct === false;
            return (
              <div
                key={tok.id}
                draggable
                onDragStart={e => onDragStart(e, tok, 'drop')}
                className={`px-2 py-1 rounded cursor-move select-none border ${
                  isRight
                    ? 'bg-green-200 border-green-400'
                    : isWrong
                      ? 'bg-red-200 border-red-400'
                      : 'bg-white border-blue-300'
                }`}
              >
                {tok.text}
              </div>
            );
          })}
        </div>

        <div className="flex space-x-4">
          <button onClick={checkAnswer} className="px-4 py-2 text-white bg-blue-600 rounded">
            Проверить
          </button>
          <button
            onClick={goToPrev}
            disabled={currentIndex === 0}
            className="px-4 py-2 text-gray-700 bg-gray-300 rounded disabled:opacity-50"
          >
            Назад
          </button>
          <button
            onClick={goToNext}
            disabled={currentIndex === data.sentences.length - 1}
            className="px-4 py-2 text-gray-700 bg-gray-300 rounded disabled:opacity-50"
          >
            Вперёд
          </button>
        </div>
      </div>
    </div>
  );
}
