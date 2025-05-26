import { useRef, useState, useEffect, PointerEvent as PE, ChangeEvent } from 'react';
import { buildSentenceSegments } from './halpers';
import { VideoMeta } from '../../pages/PlayerPage';

export type Word = { word: string; start: number; end: number };
export type Segment = { id: number; text: string; words: Word[]; textTranslated?: string };
export type SubtitleData = { segments: Segment[]; translation?: string };

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
  subtitles: SubtitleData;
  src: string;
}

export default function VideoPlayer({ subtitles, src }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null); // видимый контейнер

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [volume, setVolume] = useState(1);

  const [sentenceSubs] = useState<SubtitleData>(() => buildSentenceSegments(subtitles));

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
    const start = segs[i].words[0].start;
    const nextStart = segs[i + 1]?.words[0]?.start ?? Infinity;
    if (currentTime >= start && currentTime < nextStart) {
      currentSeg = segs[i];
      break;
    }
  }

  let translatedSentence = '';

  let words: Word[] = [];
  if (currentSeg) {
    words = currentSeg.words;
    translatedSentence = currentSeg?.textTranslated ?? '';
  }

  console.log('currentSeg', currentSeg);

  /* ――― 1. ФУНКЦИЯ-ПОМОЩНИК ――― */
  const jumpToSegment = (dir: 'prev' | 'next') => {
    const segs = sentenceSubs.segments;
    if (!segs.length) return;

    // какой сегмент звучит сейчас?
    let idx = segs.findIndex((s, i) => {
      const start = s.words[0].start;
      const next = segs[i + 1]?.words[0]?.start ?? Infinity;
      return currentTime >= start && currentTime < next;
    });
    if (idx === -1) idx = dir === 'next' ? 0 : segs.length - 1;

    idx = dir === 'next' ? Math.min(idx + 1, segs.length - 1) : Math.max(idx - 1, 0);

    const t = segs[idx].words[0].start + 0.001; // маленький сдвиг внутрь сегмента
    if (videoRef.current) videoRef.current.currentTime = t;
    setCurrentTime(t);
  };

  const SubtitleOverlay = () => {
    if (!words.length) return null;
    return (
      <div className="bg-[rgba(0,0,0,0.9)] flex flex-col justify-center p-[15px] w-full">
        <p className="text-white  text-[26px] font-bold leading-snug w-full flex justify-center flex-wrap  gap-[5px]">
          {words.map((w, i) => {
            const past = currentTime >= w.end;
            const active = currentTime >= w.start && currentTime < w.end;
            const cls = past
              ? 'text-blue-400'
              : active
                ? 'underline decoration-blue-300'
                : 'opacity-60';
            return (
              <span key={i} className={cls + ' mr-1'}>
                {w.word}
              </span>
            );
          })}
        </p>
        {translatedSentence && (
          <p className="mt-2 text-xl font-medium text-center text-white opacity-90">
            {translatedSentence}
          </p>
        )}
      </div>
    );
  };

  /* -------- render -------- */
  return (
    <div className="relative w-full text-gray-800 select-none">
      <video
        ref={videoRef}
        src={src}
        className="relative z-0 w-full rounded shadow"
        controls={false}
        preload="metadata"
      />

      {/* subtitle container (100 px height, padding 15) */}
      <div
        ref={overlayRef}
        className="absolute bottom-24 left-0 w-full h-[120px] px-[15px] flex justify-center pointer-events-auto  z-10"
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
          placeholder="Volume"
          value={volume}
          onChange={(e: ChangeEvent<HTMLInputElement>) => setVolume(parseFloat(e.target.value))}
          className="w-24 cursor-pointer"
        />
      </div>
    </div>
  );
}
