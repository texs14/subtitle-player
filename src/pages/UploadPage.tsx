import { useState } from 'react';
import UploadTranscriber from '../components/UploadTranscriber';
import VideoPlayer from '../components/VideoPlayer/VideoPlayer';
import type { SubtitleData } from '../components/VideoPlayer/VideoPlayer';

export default function UploadPage() {
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [subtitle, setSubtitle] = useState<SubtitleData | null>(null);

  return (
    <div className="flex flex-col items-center w-full gap-6 mt-6">
      <UploadTranscriber
        onComplete={(url, data) => {
          setVideoUrl(url);
          setSubtitle(data);
        }}
      />

      {videoUrl && subtitle && (
        <div className="w-full max-w-4xl">
          <VideoPlayer src={videoUrl} subtitles={subtitle} />
        </div>
      )}
    </div>
  );
}
