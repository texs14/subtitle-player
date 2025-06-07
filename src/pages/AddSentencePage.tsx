import { useEffect, useState } from 'react';
import { collection, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { useParams } from 'react-router-dom';
import { db } from '../firebase';
import type { Sentence, Exercise } from '../types';

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
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [topic, setTopic] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const { exerciseId } = useParams<{ exerciseId?: string }>();

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

  const removeForm = (index: number) =>
    setForms(prev => prev.filter((_, i) => i !== index));

  const moveForm = (from: number, to: number) => {
    setForms(prev => {
      const arr = [...prev];
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return arr;
    });
  };

  useEffect(() => {
    if (!exerciseId) return;
    const load = async () => {
      const snap = await getDoc(doc(db, 'exercises', exerciseId));
      if (snap.exists()) {
        const data = snap.data() as Exercise;
        setTitle(data.title);
        setDescription(data.description);
        setTopic(data.topic);
        setDifficulty(data.difficulty);
        setForms(
          data.sentences.map(s => ({
            text: s.text,
            rightAnswers: s.rightAnswers.join('\n'),
            translations: { ...s.translations },
            notes: { ru: s.note?.ru || '', en: s.note?.en || '' },
          })),
        );
      }
    };
    load();
  }, [exerciseId]);

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
      const exercise: Exercise = {
        title,
        description,
        topic,
        difficulty,
        sentences: payload,
      };
      if (exerciseId) {
        await updateDoc(doc(db, 'exercises', exerciseId), exercise);
      } else {
        await addDoc(collection(db, 'exercises'), exercise);
        setForms([emptyForm()]);
        setTitle('');
        setDescription('');
        setTopic('');
        setDifficulty('');
      }
      alert('Сохранено');
    } catch (e: any) {
      alert('Ошибка: ' + e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="w-full max-w-2xl p-4 mx-auto space-y-4">
      <h1 className="text-xl font-semibold">
        {exerciseId ? 'Редактировать упражнение' : 'Добавить упражнение'}
      </h1>
      <div className="p-4 space-y-4 border rounded">
        <div>
          <label className="block text-sm font-medium">Заголовок</label>
          <input
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="w-full mt-1 border-gray-300 rounded"
          />
        </div>
        <div>
          <label className="block text-sm font-medium">Описание</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full mt-1 border-gray-300 rounded"
            rows={3}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium">Тема</label>
            <input
              value={topic}
              onChange={e => setTopic(e.target.value)}
              className="w-full mt-1 border-gray-300 rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium">Сложность</label>
            <input
              value={difficulty}
              onChange={e => setDifficulty(e.target.value)}
              className="w-full mt-1 border-gray-300 rounded"
            />
          </div>
        </div>
      </div>
      {forms.map((form, idx) => (
        <div key={idx} className="p-4 space-y-4 border rounded">
          <div className="flex justify-end gap-2">
            <button
              onClick={() => moveForm(idx, idx - 1)}
              disabled={idx === 0}
              className="px-2 text-sm text-white bg-gray-500 rounded disabled:opacity-50"
            >
              ↑
            </button>
            <button
              onClick={() => moveForm(idx, idx + 1)}
              disabled={idx === forms.length - 1}
              className="px-2 text-sm text-white bg-gray-500 rounded disabled:opacity-50"
            >
              ↓
            </button>
            <button
              onClick={() => removeForm(idx)}
              className="px-2 text-sm text-white bg-red-600 rounded"
            >
              Удалить
            </button>
          </div>
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
