// src/pages/ExercisePage.tsx
import React, { useState } from 'react';
import SentenceExercise from '../components/SentenceExercise';

// Пример «замоканных» данных урока:
const mockLesson = {
  name: 'Базовая грамматика',
  originalLang: 'th' as const,
  difficulty: 'beginner',
  tags: ['grammar', 'vocabulary'],
  sentences: [
    {
      text: 'นี่คือข้อเสนอการทดสอบสำหรับการตรวจสอบ',
      rightAnswers: ['นี่คือข้อเสนอการทดสอบสำหรับการตรวจสอบ'],
      translations: {
        ru: 'Это тестовое предложение для проверки',
        en: 'This is a test offer for verification',
      },
      note: {
        en: 'We check how it will all be displayed and look like',
        ru: 'Проверяем как это всё будет выводиться и выглядеть',
      },
    },
    {
      text: 'นี้เป็นคำแนะนำการทดสอบต่อไปที่จะตรวจสอบ',
      rightAnswers: ['นี้เป็นคำแนะนำการทดสอบต่อไปที่จะตรวจสอบ'],
      translations: {
        ru: 'Это следующее тестовое предложение для проверки',
        en: 'This is the next test suggestion to check.',
      },
      note: null,
    },
    // Можно добавить ещё предложения по тому же шаблону
  ],
};

export default function ExercisePage() {
  const [currentIndex, setCurrentIndex] = useState(0);

  const total = mockLesson.sentences.length;

  const handleComplete = () => {
    setCurrentIndex(prev => Math.min(prev + 1, total));
  };

  return (
    <div className="max-w-2xl p-6 mx-auto space-y-6">
      <h1 className="text-2xl font-bold">{mockLesson.name}</h1>
      <p className="mb-4 text-gray-600">
        Уровень: <span className="font-semibold capitalize">{mockLesson.difficulty}</span>; Язык
        оригинала: {mockLesson.originalLang.toUpperCase()}
      </p>

      {/* Прогресс-бар */}
      <div className="w-full h-4 mb-2 overflow-hidden bg-gray-200 rounded">
        <div
          className="h-full transition-all bg-green-500"
          style={{ width: `${(currentIndex / total) * 100}%` }}
        />
      </div>
      <p className="text-sm text-right text-gray-700">
        Задание {Math.min(currentIndex + 1, total)} из {total}
      </p>

      {/* Перебираем все предложения и рендерим только пройденные (<= currentIndex) */}
      {mockLesson.sentences.map((sent, idx) => (
        <SentenceExercise
          key={idx}
          sentence={sent}
          index={idx}
          isActive={idx <= currentIndex}
          onComplete={handleComplete}
        />
      ))}

      {/* Если все задания сделаны, показываем финальное сообщение */}
      {currentIndex >= total && (
        <div className="p-4 text-blue-900 bg-blue-100 rounded">
          <p className="font-medium">Поздравляем! Вы прошли все задания урока.</p>
        </div>
      )}
    </div>
  );
}
