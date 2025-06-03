import { useState, useRef } from 'react';
import type { SubtitleData } from '../types';

interface Props {
  originalLang: string;
  targetLangs: string[];
  difficulty: string;
  tags: string[];
  onComplete: (videoUrl: string, subtitle: SubtitleData) => void;
  disabled?: boolean;
}

export default function UploadTranscriber({
  originalLang,
  targetLangs,
  difficulty,
  tags,
  onComplete,
  disabled = false,
}: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const busy = useRef(false);

  const push = (msg: string) =>
    setLog(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);

  const start = async () => {
    if (!file || busy.current || disabled) return;
    busy.current = true;

    try {
      // 1. Загрузка видео на backend → Cloud Storage
      push(`🚀 Uploading “${file.name}” to server…`);
      const upFD = new FormData();
      upFD.append('video', file);
      const upRes = await fetch('http://localhost:4000/api/upload', {
        method: 'POST',
        body: upFD,
      });
      if (!upRes.ok) throw new Error(await upRes.text());
      const { videoUrl } = await upRes.json();
      push('✔ Uploaded to Cloud Storage');

      // 2. Транскрибация через backend
      push('🎙 Transcribing…');
      const trFD = new FormData();
      trFD.append('videoUrl', videoUrl);
      trFD.append('originalLang', originalLang);
      trFD.append('targetLangs', JSON.stringify(targetLangs));
      trFD.append('difficulty', difficulty);
      trFD.append('tags', JSON.stringify(tags));
      const trRes = await fetch('http://localhost:4000/api/transcribe', {
        method: 'POST',
        body: trFD,
      });
      if (!trRes.ok) throw new Error(await trRes.text());
      const subtitle: SubtitleData = await trRes.json();
      console.log('subtitle', subtitle);
      push('✔ Transcription received');

      // 3. Сообщаем родителю (сохранение в Firestore выполняется вручную позже)
      onComplete(videoUrl, subtitle);
    } catch (e: any) {
      console.error(e);
      push('❌ ' + e.message);
      alert(e.message);
    } finally {
      busy.current = false;
    }
  };

  return (
    <section className="w-full max-w-md space-y-4">
      <input
        type="file"
        placeholder="Upload video"
        accept="video/*"
        onChange={e => setFile(e.target.files?.[0] || null)}
        disabled={disabled}
        className="w-full file-input file-input-bordered file-input-sm"
      />

      <button
        onClick={start}
        disabled={!file || busy.current || disabled}
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
