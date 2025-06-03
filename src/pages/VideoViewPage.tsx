import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import VideoPlayer from '../components/VideoPlayer/VideoPlayer';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import type { VideoDoc } from '../types';
import type { Language } from '../components/LanguageMetaForm';

export default function VideoViewPage() {
  const { videoId } = useParams<{ videoId: string }>();
  const [videoDoc, setVideoDoc] = useState<VideoDoc | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!videoId) return;
    (async () => {
      try {
        const docRef = doc(db, 'videos', videoId);
        const snap = await getDoc(docRef);
        if (!snap.exists()) {
          throw new Error('Видео не найдено');
        }
        const d = snap.data() as any;
        const loaded: VideoDoc = {
          src: d.src as string,
          previewSrc: d.previewSrc as string,
          originalLang: d.originalLang as Language,
          targetLangs: d.targetLangs as Language[],
          difficulty: d.difficulty as string,
          tags: d.tags as string[],
          subtitle: d.subtitle as any,
          name: d.name as string,
          size: d.size as number,
          updated: d.updated || null,
        };
        setVideoDoc(loaded);
      } catch (e: any) {
        console.error(e);
        setError(e.message);
      }
    })();
  }, [videoId]);

  if (error) {
    return <p className="text-red-600">Ошибка: {error}</p>;
  }
  if (!videoDoc) {
    return <p className="text-gray-500">Загрузка видео…</p>;
  }

  return (
    <div className="flex justify-center p-4">
      <VideoPlayer
        src={videoDoc.src}
        subtitles={videoDoc.subtitle}
        originalLang={videoDoc.originalLang}
      />
    </div>
  );
}
