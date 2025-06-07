import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Sentence } from '../types';

export default function AddSentencePage() {
  const [text, setText] = useState('');
  const [rightAnswers, setRightAnswers] = useState('');
  const [translations, setTranslations] = useState({ ru: '', en: '' });
  const [notes, setNotes] = useState({ ru: '', en: '' });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    const answers = rightAnswers
      .split('\n')
      .map(a => a.trim())
      .filter(Boolean);
    const payload: Sentence = {
      text,
      rightAnswers: answers,
      translations: { ...translations },
      note:
        notes.ru.trim() || notes.en.trim()
          ? { ru: notes.ru.trim() || undefined, en: notes.en.trim() || undefined }
          : null,
    };
    setSaving(true);
    try {
      await addDoc(collection(db, 'sentences'), payload);
      setText('');
      setRightAnswers('');
      setTranslations({ ru: '', en: '' });
      setNotes({ ru: '', en: '' });
      alert('Сохранено');
    } catch (e: any) {
      alert('Ошибка: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-md p-4 mx-auto space-y-4">
      <h1 className="text-xl font-semibold">Добавить предложение</h1>
      <div>
        <label className="block text-sm font-medium">Текст</label>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          className="w-full mt-1 border-gray-300 rounded"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Правильные варианты (каждый на новой строке)</label>
        <textarea
          value={rightAnswers}
          onChange={e => setRightAnswers(e.target.value)}
          className="w-full mt-1 border-gray-300 rounded"
          rows={3}
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Перевод (RU)</label>
        <input
          value={translations.ru}
          onChange={e => setTranslations({ ...translations, ru: e.target.value })}
          className="w-full mt-1 border-gray-300 rounded"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Перевод (EN)</label>
        <input
          value={translations.en}
          onChange={e => setTranslations({ ...translations, en: e.target.value })}
          className="w-full mt-1 border-gray-300 rounded"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Примечание (RU)</label>
        <input
          value={notes.ru}
          onChange={e => setNotes({ ...notes, ru: e.target.value })}
          className="w-full mt-1 border-gray-300 rounded"
        />
      </div>
      <div>
        <label className="block text-sm font-medium">Note (EN)</label>
        <input
          value={notes.en}
          onChange={e => setNotes({ ...notes, en: e.target.value })}
          className="w-full mt-1 border-gray-300 rounded"
        />
      </div>
      <button
        onClick={handleSave}
        disabled={saving}
        className="px-4 py-2 text-white bg-green-600 rounded"
      >
        {saving ? 'Сохранение...' : 'Сохранить'}
      </button>
    </div>
  );
}
