import { useState, useRef } from 'react';
import type { SubtitleData } from '../components/VideoPlayer/VideoPlayer';

import { db } from '../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';

interface Props {
  onComplete: (videoUrl: string, subtitle: SubtitleData) => void;
}

export default function UploadTranscriber({ onComplete }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const busy = useRef(false);

  const push = (m: string) => setLog(p => [...p, `[${new Date().toLocaleTimeString()}] ${m}`]);

  const start = async () => {
    if (!file || busy.current) return;
    busy.current = true;

    try {
      /* ---------- 1. ➜ /api/upload → Cloud Storage ---------- */
      push(`🚀 Uploading “${file.name}”…`);
      const upFD = new FormData();
      upFD.append('video', file);

      const upRes = await fetch('http://localhost:4000/api/upload', {
        method: 'POST',
        body: upFD,
      });
      if (!upRes.ok) throw new Error(await upRes.text());

      const { videoId, videoUrl } = await upRes.json(); // сервер вернёт { videoId, videoUrl }
      push('✔ Stored in Cloud Storage');

      /* ---------- 2. ➜ /api/transcribe ---------- */
      push('🎙 Transcribing…');
      const trFD = new FormData();
      trFD.append('video', file);

      const trRes = await fetch('http://localhost:4000/api/transcribe', {
        method: 'POST',
        body: trFD,
      });
      if (!trRes.ok) throw new Error(await trRes.text());

      const subtitle: SubtitleData = await trRes.json();
      push('✔ Transcript received');

      /* ---------- 3. Firestore ---------- */
      push('💾 Saving to Firestore…');
      const docData = {
        /** VideoDoc */
        src: videoUrl,
        subtitle,
        previewSrc: `${videoUrl}#t=0.1`,
        /** meta */
        name: file.name,
        size: file.size,
        updated: serverTimestamp(),
      };
      await setDoc(doc(db, 'videos', videoId), docData);

      /* кеш офлайн */
      localStorage.setItem(`videoDoc_${videoId}`, JSON.stringify(docData));
      push('✔ Firestore + localStorage OK');

      /* ---------- 4. сообщаем родителю ---------- */
      onComplete(videoUrl, subtitle);
    } catch (e: any) {
      console.error(e);
      push('❌ ' + e.message);
      alert(e.message);
    } finally {
      busy.current = false;
    }
  };

  /* ---------- UI ---------- */
  return (
    <section className="w-full max-w-md space-y-4">
      <input
        type="file"
        accept="video/*"
        placeholder="Выберите видео"
        onChange={e => setFile(e.target.files?.[0] || null)}
        className="w-full file-input file-input-bordered file-input-sm"
      />

      <button
        onClick={start}
        disabled={!file || busy.current}
        className="w-full px-5 py-2 text-white bg-blue-600 rounded disabled:opacity-50"
      >
        {busy.current ? 'Загрузка…' : 'Старт'}
      </button>

      <pre className="p-2 overflow-y-auto text-xs whitespace-pre-wrap bg-gray-100 rounded max-h-56">
        {log.join('\n') || 'Log is empty…'}
      </pre>
    </section>
  );
}
