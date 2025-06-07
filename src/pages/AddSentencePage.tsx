import { useState } from 'react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { Sentence } from '../types';

interface SentenceForm {
  text: string;
  rightAnswers: string;
  translations: { ru: string; en: string };
  notes: { ru: string; en: string };
}

const emptyForm = (): SentenceForm => ({
  text: '',
  rightAnswers: '',
  translations: { ru: '', en: '' },
  notes: { ru: '', en: '' },
});

export default function AddSentencePage() {
  const [forms, setForms] = useState<SentenceForm[]>([emptyForm()]);
  const [saving, setSaving] = useState(false);

  const addForm = () => setForms(prev => [...prev, emptyForm()]);

  const updateForm = (
    index: number,
    updater: (form: SentenceForm) => SentenceForm,
  ) => {
    setForms(prev => {
      const updated = [...prev];
      updated[index] = updater(updated[index]);
      return updated;
    });
  };

  const handleSave = async () => {
    const payload: Sentence[] = forms.map(f => ({
      text: f.text,
      rightAnswers: f.rightAnswers
        .split('\n')
        .map(a => a.trim())
        .filter(Boolean),
      translations: { ...f.translations },
      note:
        f.notes.ru.trim() || f.notes.en.trim()
          ? {
              ru: f.notes.ru.trim() || undefined,
              en: f.notes.en.trim() || undefined,
            }
          : null,
    }));

    setSaving(true);
    try {
      await addDoc(collection(db, 'sentences'), { sentences: payload });
      setForms([emptyForm()]);
      alert('Сохранено');
    } catch (e: any) {
      alert('Ошибка: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-2xl p-4 mx-auto space-y-4">
      <h1 className="text-xl font-semibold">Добавить предложения</h1>
      {forms.map((form, idx) => (
        <div key={idx} className="p-4 space-y-4 border rounded">
          <div>
            <label className="block text-sm font-medium">Текст</label>
            <input
              value={form.text}
              onChange={e =>
                updateForm(idx, f => ({ ...f, text: e.target.value }))
              }
              className="w-full mt-1 border-gray-300 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">
              Правильные варианты (каждый на новой строке)
            </label>
            <textarea
              value={form.rightAnswers}
              onChange={e =>
                updateForm(idx, f => ({ ...f, rightAnswers: e.target.value }))
              }
              className="w-full mt-1 border-gray-300 rounded"
              rows={3}
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Перевод (RU)</label>
            <input
              value={form.translations.ru}
              onChange={e =>
                updateForm(idx, f => ({
                  ...f,
                  translations: { ...f.translations, ru: e.target.value },
                }))
              }
              className="w-full mt-1 border-gray-300 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Перевод (EN)</label>
            <input
              value={form.translations.en}
              onChange={e =>
                updateForm(idx, f => ({
                  ...f,
                  translations: { ...f.translations, en: e.target.value },
                }))
              }
              className="w-full mt-1 border-gray-300 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Примечание (RU)</label>
            <input
              value={form.notes.ru}
              onChange={e =>
                updateForm(idx, f => ({
                  ...f,
                  notes: { ...f.notes, ru: e.target.value },
                }))
              }
              className="w-full mt-1 border-gray-300 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Note (EN)</label>
            <input
              value={form.notes.en}
              onChange={e =>
                updateForm(idx, f => ({
                  ...f,
                  notes: { ...f.notes, en: e.target.value },
                }))
              }
              className="w-full mt-1 border-gray-300 rounded"
            />
          </div>
        </div>
      ))}
      <div className="flex gap-2">
        <button
          onClick={addForm}
          className="px-4 py-2 text-white bg-blue-600 rounded"
        >
          Добавить предложение
        </button>
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 text-white bg-green-600 rounded"
        >
          {saving ? 'Сохранение...' : 'Сохранить'}
        </button>
      </div>
    </div>
  );
}
