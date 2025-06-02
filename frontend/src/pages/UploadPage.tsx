// src/pages/UploadPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Language, LanguageMetaForm } from '../components/LanguageMetaForm';
import UploadTranscriber from '../components/UploadTranscriber';
import { SegmentEditor } from '../components/SegmentEditor';
import VideoPlayer from '../components/VideoPlayer/VideoPlayer';
import type { Segment, SubtitleData, VideoDoc } from '../types';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { buildSentenceSegments } from '../components/VideoPlayer/halpers';

type Meta = {
  originalLang: Language;
  targetLangs: Language[];
  difficulty: string;
  tags: string;
};

export default function UploadPage() {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();

  const [meta, setMeta] = useState<Meta>({
    originalLang: 'th',
    targetLangs: [],
    difficulty: 'Beginner',
    tags: '',
  });
  const [videoDoc, setVideoDoc] = useState<VideoDoc | null>(null);
  const [editedSubs, setEditedSubs] = useState<SubtitleData | null>(null);
  const [translating, setTranslating] = useState(false);
  const [loadingDoc, setLoadingDoc] = useState(false);

  /** Если есть videoId, тянем из Firestore документ и заполняем state */
  useEffect(() => {
    if (!videoId) return;
    setLoadingDoc(true);
    (async () => {
      try {
        const docRef = doc(db, 'videos', videoId);
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
          alert('Видео для редактирования не найдено');
          navigate('/');
          return;
        }
        const d = snap.data() as any;

        // Сразу используем сохранённые метаданные
        const loadedMeta: Meta = {
          originalLang: d.originalLang || 'auto',
          targetLangs: d.targetLangs || [],
          difficulty: d.difficulty || 'Beginner',
          tags: Array.isArray(d.tags) ? d.tags.join(', ') : '',
        };
        setMeta(loadedMeta);

        const loadedDoc: VideoDoc = {
          src: d.src as string,
          previewSrc: d.previewSrc as string,
          originalLang: d.originalLang,
          targetLangs: d.targetLangs,
          difficulty: d.difficulty,
          tags: d.tags,
          subtitle: d.subtitle as SubtitleData,
          name: d.name as string,
          size: d.size as number,
          updated: d.updated || null,
        };
        setVideoDoc(loadedDoc);

        // ВАЖНО: сразу берём subtitle из Firestore целиком,
        // а не делаем buildSentenceSegments, чтобы увидеть последние правки
        setEditedSubs(d.subtitle as SubtitleData);
      } catch (e: any) {
        console.error(e);
        alert('Ошибка при загрузке видео для редактирования: ' + e.message);
        navigate('/');
      } finally {
        setLoadingDoc(false);
      }
    })();
  }, [videoId]);

  /** При успешной загрузке нового файла через UploadTranscriber */
  const handleUploadComplete = (url: string, subtitle: SubtitleData) => {
    const docData: VideoDoc = {
      src: url,
      previewSrc: `${url}#t=0.1`,
      originalLang: meta.originalLang,
      targetLangs: meta.targetLangs,
      difficulty: meta.difficulty,
      tags: meta.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t),
      subtitle,
      name: 'uploaded',
      size: 0,
      updated: null,
    };
    setVideoDoc(docData);

    if (meta.originalLang !== 'th') {
      // Для нового видео делаем разбиение на предложения
      setEditedSubs(buildSentenceSegments(subtitle));
    } else {
      setEditedSubs(subtitle);
    }
  };

  /** Batch-перевод всех сегментов */
  const handleTranslate = async () => {
    if (!editedSubs || !videoDoc) return;
    setTranslating(true);
    try {
      const res = await fetch('http://localhost:4000/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          segments: editedSubs.segments.map(s => ({ id: s.id, text: s.text })),
          targetLangs: videoDoc.targetLangs,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { segments: trSegments } = await res.json();
      // Сливаем полученные переводы в наши сегменты
      setEditedSubs((prev: any) => {
        if (!prev) return prev;
        const merged = prev.segments.map((s: Segment) => {
          const tr = trSegments.find((t: any) => t.id === s.id);
          return tr ? { ...s, translations: tr.translations } : s;
        });
        return { segments: merged };
      });
    } catch (e: any) {
      alert('Ошибка перевода: ' + e.message);
    } finally {
      setTranslating(false);
    }
  };

  /** Сохранить новое или отредактированное видео в Firestore */
  const handleSave = async () => {
    if (!videoDoc || !editedSubs) return;
    const idToUse = videoId || new URL(videoDoc.src).pathname.split('/').pop()?.split('.')[0] || '';
    const updatedData: any = {
      src: videoDoc.src,
      previewSrc: videoDoc.previewSrc,
      originalLang: meta.originalLang,
      targetLangs: meta.targetLangs,
      difficulty: meta.difficulty,
      tags: meta.tags
        .split(',')
        .map(t => t.trim())
        .filter(t => t),
      subtitle: editedSubs, // уже содержит последние правки
      name: videoDoc.name,
      size: videoDoc.size,
      updated: new Date(),
    };
    try {
      await setDoc(doc(db, 'videos', idToUse), updatedData);
      localStorage.setItem(`videoDoc_${idToUse}`, JSON.stringify(updatedData));
      alert('Сохранено!');
      navigate(`/video/${idToUse}`);
    } catch (e: any) {
      console.error(e);
      alert('Ошибка при сохранении: ' + e.message);
    }
  };

  return (
    <div className="p-4 space-y-8">
      {/* Форма метаданных */}
      <LanguageMetaForm
        {...meta}
        onChange={async fields => {
          await setMeta((prev: any) => ({ ...prev, ...fields }));
          if (!videoDoc) return;
          setVideoDoc(prev => {
            if (!prev) return prev;
            return { ...prev, targetLangs: fields.targetLangs ?? [] };
          });
        }}
      />

      {/* Компонент загрузки (и первичного транскриба) */}
      <UploadTranscriber
        originalLang={meta.originalLang}
        targetLangs={meta.targetLangs}
        difficulty={meta.difficulty}
        tags={meta.tags
          .split(',')
          .map(t => t.trim())
          .filter(t => t)}
        onComplete={handleUploadComplete}
        disabled={!!videoId} /* если редактируем, загрузка файла запрещена */
      />

      {/* Если есть либо только что загруженное видео, либо загружено из Firestore */}
      {videoDoc && editedSubs && !loadingDoc && (
        <>
          <div className="w-full max-w-4xl mx-auto">
            <VideoPlayer
              src={videoDoc.src}
              subtitles={editedSubs}
              originalLang={videoDoc.originalLang as Language}
            />
          </div>

          <button
            onClick={handleTranslate}
            disabled={translating}
            className="px-6 py-2 text-white bg-blue-600 rounded"
          >
            {translating ? 'Перевод...' : 'Перевести'}
          </button>

          <SegmentEditor
            segments={editedSubs.segments}
            originalLang={videoDoc.originalLang as Language}
            targetLangs={videoDoc.targetLangs}
            onChange={newSegments =>
              setEditedSubs(prev => (prev ? { ...prev, segments: newSegments } : null))
            }
          />

          <button onClick={handleSave} className="px-6 py-2 mt-6 text-white bg-green-600 rounded">
            {videoId ? 'Сохранить изменения' : 'Сохранить новое видео'}
          </button>
        </>
      )}

      {loadingDoc && <p className="text-gray-500">Загрузка данных видео для редактирования…</p>}
    </div>
  );
}
