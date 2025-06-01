// src/pages/UploadPage.tsx
import React, { useState } from 'react';
import { Language, LanguageMetaForm } from '../components/LanguageMetaForm';
import UploadTranscriber from '../components/UploadTranscriber';
import { SegmentEditor } from '../components/SegmentEditor';
import VideoPlayer from '../components/VideoPlayer/VideoPlayer';
import type { Segment, SubtitleData, VideoDoc } from '../types';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';
import { buildSentenceSegments } from '../components/VideoPlayer/halpers';

type Meta = {
  originalLang: string;
  targetLangs: Language[];
  difficulty: string;
  tags: string;
};

export default function UploadPage() {
  const [meta, setMeta] = useState<Meta>({
    originalLang: 'auto',
    targetLangs: [],
    difficulty: 'Beginner',
    tags: '',
  });
  const [videoDoc, setVideoDoc] = useState<VideoDoc | null>(null);
  const [editedSubs, setEditedSubs] = useState<SubtitleData | null>(null);
  const [translating, setTranslating] = useState(false);

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
    // разбиваем на предложения
    setEditedSubs(buildSentenceSegments(subtitle));
  };

  const handleTranslate = async () => {
    if (!editedSubs || !videoDoc) return;
    setTranslating(true);
    try {
      console.log('videoDoc', videoDoc);
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
      console.log('trSegments', trSegments);
      // merge translations
      await setEditedSubs((prev: any) => {
        if (!prev) return prev;
        const merged = prev.segments.map((s: Segment) => {
          const tr = trSegments.find((t: any) => t.id === s.id);
          return tr ? { ...s, translations: tr.translations } : s;
        });
        return { segments: merged };
      });

      console.log('editedSubs', editedSubs);
    } catch (e: any) {
      alert('Translation error: ' + e.message);
    } finally {
      setTranslating(false);
    }
  };

  const handleSave = async () => {
    if (!videoDoc || !editedSubs) return;
    const id = new URL(videoDoc.src).pathname.split('/').pop()?.split('.')[0] || '';
    const updated: VideoDoc = { ...videoDoc, subtitle: editedSubs };
    await setDoc(doc(db, 'videos', id), updated);
    localStorage.setItem(`videoDoc_${id}`, JSON.stringify(updated));
    alert('Сохранено!');
  };

  return (
    <div className="p-4 space-y-8">
      <LanguageMetaForm
        {...meta}
        onChange={async fields => {
          await setMeta(prev => ({ ...prev, ...fields }));
          if (!videoDoc) return;
          setVideoDoc(prev => {
            if (!prev) return prev;
            return { ...prev, targetLangs: fields.targetLangs ?? [] };
          });
        }}
      />

      <UploadTranscriber
        originalLang={meta.originalLang}
        targetLangs={meta.targetLangs}
        difficulty={meta.difficulty}
        tags={meta.tags
          .split(',')
          .map(t => t.trim())
          .filter(t => t)}
        onComplete={handleUploadComplete}
      />

      {videoDoc && editedSubs && (
        <>
          <div className="w-full max-w-4xl mx-auto">
            <VideoPlayer src={videoDoc.src} subtitles={editedSubs} />
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
            originalLang={videoDoc.originalLang}
            targetLangs={videoDoc.targetLangs}
            onChange={newSegments =>
              setEditedSubs(prev => (prev ? { ...prev, segments: newSegments } : null))
            }
          />

          <button onClick={handleSave} className="px-6 py-2 mt-6 text-white bg-green-600 rounded">
            Сохранить изменения
          </button>
        </>
      )}
    </div>
  );
}
