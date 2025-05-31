import { useEffect, useState } from 'react';
import { useLocation, useParams, useNavigate } from 'react-router-dom';
import VideoPlayer from '../components/VideoPlayer/VideoPlayer';
import { db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { SubtitleData } from '../types';

type Loc = { videoUrl?: string };

export default function VideoViewPage() {
  const { id } = useParams<{ id: string }>();
  const nav = useNavigate();
  const loc = useLocation();
  const [url, setUrl] = useState<string | null>((loc.state as Loc)?.videoUrl || null);
  const [sub, setSub] = useState<SubtitleData | null>(null);

  /* пробуем взять из localStorage */
  useEffect(() => {
    if (!id) return;
    const cached = localStorage.getItem(`videoDoc_${id}`);
    if (cached) {
      const obj = JSON.parse(cached);
      setSub(obj.subtitle);
      setUrl(obj.src);
    }
  }, [id]);

  /* если всё ещё пусто — тянем из Firestore */
  useEffect(() => {
    if (!id || sub) return; // уже есть
    (async () => {
      const snap = await getDoc(doc(db, 'videos', id));
      if (snap.exists()) {
        const data: any = snap.data();
        setSub(data.subtitle);
        setUrl(data.src);
      }
    })();
  }, [id, sub]);

  if (!url || !sub)
    return (
      <div className="flex flex-col items-center gap-4 mt-8">
        <p className="text-red-600">Данные не найдены…</p>
        <button onClick={() => nav(-1)} className="px-4 py-2 text-white bg-blue-600 rounded">
          Назад
        </button>
      </div>
    );

  return (
    <div className="flex flex-col items-center w-full gap-6 px-4 mt-8">
      <h1 className="text-xl font-bold">Просмотр видео</h1>
      <div className="w-full max-w-4xl">
        <VideoPlayer src={url} subtitles={sub} />
      </div>
    </div>
  );
}
