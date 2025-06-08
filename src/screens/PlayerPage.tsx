import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, orderBy, getDocs, DocumentData } from 'firebase/firestore';
import { db } from '../firebase'; // ваш настроенный Firestore
import VideoCard from '../components/VideoCard';

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
        // 1. Запрос к коллекции "videos", сортировка по полю "updated" (DESC)
        const videosRef = collection(db, 'videos');
        const q = query(videosRef, orderBy('updated', 'desc'));
        const snapshot = await getDocs(q);

        // 2. Преобразуем каждый документ в VideoMeta
        const data: VideoMeta[] = snapshot.docs.map(doc => {
          const d = doc.data() as DocumentData;
          return {
            videoId: doc.id,
            name: (d.name as string) || '',
            size: (d.size as number) || 0,
            updated: d.updated ? (d.updated as any).toDate().toISOString() : null,
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
          <VideoCard key={v.videoId} video={v} />
        ))}
      </div>

      {!videos.length && <p>Нет загруженных видео…</p>}
    </div>
  );
}
