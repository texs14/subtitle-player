// src/pages/PlayerPage.tsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  collection,
  query,
  orderBy,
  getDocs,
  DocumentData,
} from 'firebase/firestore';
import { db } from '../firebase'; // ваш настроенный Firestore

export type VideoMeta = {
  videoId: string;
  name: string;
  size: number;
  updated: string | null;
  videoUrl: string;
};

export default function PlayerPage() {
  const [videos, setVideos] = useState<VideoMeta[]>([]);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    (async () => {
      try {
        // 1. Создаём запрос к коллекции "videos", сортируем по полю "updated" (DESC)
        const videosRef = collection(db, 'videos');
        const q = query(videosRef, orderBy('updated', 'desc'));
        const snapshot = await getDocs(q);

        // 2. Преобразуем каждый документ в VideoMeta
        const data: VideoMeta[] = snapshot.docs.map(doc => {
          const d = doc.data() as DocumentData;
          return {
            videoId:  doc.id,
            name:     (d.name as string) || '',
            size:     (d.size as number) || 0,
            updated:  d.updated ? (d.updated as any).toDate().toISOString() : null,
            videoUrl: (d.src as string) || '',
          };
        });

        setVideos(data);
      } catch (e: any) {
        console.error(e);
        setError(e.message);
      }
    })();
  }, []);

  if (error) {
    return <p className="text-red-600">Ошибка: {error}</p>;
  }

  return (
    <div className="flex flex-col items-center w-full gap-6 px-4">
      <h1 className="text-2xl font-bold">Все видео</h1>

      <div className="grid w-full max-w-6xl gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {videos.map(v => (
          <div
            key={v.videoId}
            onClick={() =>
              navigate(`/video/${v.videoId}`, { state: { videoUrl: v.videoUrl } })
            }
            className="space-y-2 transition cursor-pointer hover:opacity-90"
          >
            <video
              src={v.videoUrl + '#t=0.1'}
              controls
              muted
              className="w-full rounded shadow aspect-video"
            />
            <div className="text-sm">
              <p className="font-medium truncate">{v.name}</p>
              <p className="text-gray-500">
                {(v.size / 1024 / 1024).toFixed(1)} MB ·{' '}
                {v.updated ? new Date(v.updated).toLocaleString() : '—'}
              </p>
            </div>
          </div>
        ))}
      </div>

      {!videos.length && <p>Нет загруженных видео…</p>}
    </div>
  );
}
