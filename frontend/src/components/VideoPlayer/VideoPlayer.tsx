// src/components/VideoPlayer/VideoPlayer.tsx
import { useRef, useState, useEffect, PointerEvent as PE, ChangeEvent, MouseEvent } from 'react';
import type { Segment, SubtitleData, Word } from '../../types';
import type { Language } from '../LanguageMetaForm';
import { useTooltipContext } from '../../contexts/TooltipContext';

export type VideoDoc = {
  src: string; // URL или blob-URL
  subtitle: SubtitleData;
  prewiewSrc?: string;
};

const toTime = (s: number) =>
  isNaN(s)
    ? '00:00'
    : `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.floor(s % 60)).padStart(
        2,
        '0',
      )}`;

interface VideoPlayerProps {
  subtitles: SubtitleData; // готовые сегменты с text, words, translations
  src: string;
  originalLang: Language; // язык оригинала, чтобы знать, откуда брать перевод
}

export default function VideoPlayer({ subtitles, src, originalLang }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);

  const { showTooltip } = useTooltipContext();

  // Используем готовые сегменты напрямую
  const sentenceSubs = subtitles;

  /* -------- sync time -------- */
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    const onTime = () => !isScrubbing.current && setCurrentTime(v.currentTime);
    const onMeta = () => setDuration(v.duration);
    v.addEventListener('timeupdate', onTime);
    v.addEventListener('loadedmetadata', onMeta);
    return () => {
      v.removeEventListener('timeupdate', onTime);
      v.removeEventListener('loadedmetadata', onMeta);
    };
  }, []);

  useEffect(() => {
    if (videoRef.current) videoRef.current.volume = volume;
  }, [volume]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    isPlaying ? v.pause() : v.play();
    setIsPlaying(!isPlaying);
  };

  /* -------- scrubbing -------- */
  const isScrubbing = useRef(false);
  const wasPlaying = useRef(false);
  const posToTime = (x: number) => {
    const rect = trackRef.current!.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(x - rect.left, rect.width)) / rect.width;
    return ratio * duration;
  };
  const handlePointerDown = (e: PE<HTMLDivElement>) => {
    if (!duration) return;
    isScrubbing.current = true;
    wasPlaying.current = isPlaying;
    if (isPlaying) togglePlay();
    const t = posToTime(e.clientX);
    videoRef.current!.currentTime = t;
    setCurrentTime(t);
    trackRef.current!.setPointerCapture(e.pointerId);
  };
  const handlePointerMove = (e: PE<HTMLDivElement>) => {
    if (!isScrubbing.current) return;
    const t = posToTime(e.clientX);
    videoRef.current!.currentTime = t;
    setCurrentTime(t);
  };
  const handlePointerUp = (e: PE<HTMLDivElement>) => {
    if (!isScrubbing.current) return;
    trackRef.current!.releasePointerCapture(e.pointerId);
    isScrubbing.current = false;
    if (wasPlaying.current) togglePlay();
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;

  /* -------- subtitle selection -------- */
  const segs = sentenceSubs.segments;
  let currentSeg: Segment | null = null;
  for (let i = 0; i < segs.length; i++) {
    const start = segs[i].start;
    const nextStart = segs[i + 1]?.start ?? Infinity;
    if (currentTime >= start && currentTime < nextStart) {
      currentSeg = segs[i];
      break;
    }
  }

  // Слова текущего сегмента (в простой отрисовке)
  let words: Word[] = [];
  let translations: Record<Language, string> = {
    en: '',
    th: '',
    ru: '',
  };
  if (currentSeg) {
    words = currentSeg.words;
    translations = { ...currentSeg.translations } as Record<Language, string>;
  }

  const jumpToSegment = (dir: 'prev' | 'next') => {
    const segsArr = sentenceSubs.segments;
    if (!segsArr.length) return;

    // Найти индекс текущего сегмента
    let idx = segsArr.findIndex((s, i) => {
      const start = s.start;
      const next = segsArr[i + 1]?.start ?? Infinity;
      return currentTime >= start && currentTime < next;
    });
    if (idx === -1) {
      // Если в текущий момент не в сегменте, просто переключаемся на крайний
      idx = dir === 'next' ? 0 : segsArr.length - 1;
    }

    if (dir === 'prev') {
      // Если текущий сегмент найден
      if (idx >= 0) {
        const start = segsArr[idx].start;
        // Если мы находимся более чем в 1 секунде внутри текущего сегмента,
        // просто возвращаемся в его начало
        if (currentTime - start > 1) {
          const t = start + 0.001;
          if (videoRef.current) videoRef.current.currentTime = t;
          setCurrentTime(t);
          return;
        }
      }
      // Иначе переходим на предыдущий
      idx = idx > 0 ? idx - 1 : 0;
      const tPrev = segsArr[idx].start + 0.001;
      if (videoRef.current) videoRef.current.currentTime = tPrev;
      setCurrentTime(tPrev);
    } else {
      // Для "next" всегда переключаемся на следующий сегмент
      if (idx === -1) {
        idx = 0;
      } else {
        idx = Math.min(idx + 1, segsArr.length - 1);
      }
      const tNext = segsArr[idx].start + 0.001;
      if (videoRef.current) videoRef.current.currentTime = tNext;
      setCurrentTime(tNext);
    }
  };

  const SubtitleOverlay = () => {
    if (!currentSeg) return null;
    return (
      <div className="bg-[rgba(0,0,0,0.9)] flex flex-col justify-center p-[15px] w-full">
        <p
          className={`text-white text-[26px] font-bold leading-snug w-full flex justify-center flex-wrap ${originalLang === 'th' ? '' : 'gap-[5px]'}`}
        >
          {words.map((w, i) => (
            <span
              data-interactive="true"
              key={i}
              onClick={(e: MouseEvent<HTMLSpanElement>) => showTooltip(w.word, e, originalLang)}
              className={`text-white cursor-pointer hover:text-blue-300 ${w.word === ' ' ? 'mr-3' : ''}`}
            >
              {w.word}
            </span>
          ))}
        </p>
        {Object.entries(translations).map(([lang, text]) => {
          if (!text) return null;
          return (
            <p key={lang} className="mt-2 text-xl font-medium text-center text-white opacity-90">
              {text}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="relative w-full text-gray-800 select-none">
      <video
        ref={videoRef}
        src={src}
        className="relative z-0 w-full rounded shadow"
        controls={false}
        preload="metadata"
      />

      {/* subtitle container */}
      <div
        ref={overlayRef}
        className="absolute bottom-24 left-0 w-full h-[120px] px-[15px] flex justify-center pointer-events-auto z-10"
      >
        <button
          onClick={() => jumpToSegment('prev')}
          className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 active:bg-gray-400"
        >
          ⏮
        </button>
        <SubtitleOverlay />
        <button
          onClick={() => jumpToSegment('next')}
          className="px-2 py-1 bg-gray-200 rounded hover:bg-gray-300 active:bg-gray-400"
        >
          ⏭
        </button>
      </div>

      {/* controls */}
      <div className="absolute bottom-0 left-0 flex items-center w-full gap-2 p-2 bg-black/70">
        <button
          onClick={togglePlay}
          className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 active:bg-gray-400"
        >
          {isPlaying ? '⏸' : '▶️'}
        </button>

        <div
          ref={trackRef}
          className="relative w-full h-2 bg-gray-300 rounded cursor-pointer"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
        >
          <div
            className="absolute top-0 left-0 h-full bg-blue-500 rounded"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="w-24 text-xs text-center text-white">
          {toTime(currentTime)} / {toTime(duration)}
        </div>

        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          placeholder="Volume"
          onChange={(e: ChangeEvent<HTMLInputElement>) => setVolume(parseFloat(e.target.value))}
          className="w-24 cursor-pointer"
        />
      </div>
    </div>
  );
}
