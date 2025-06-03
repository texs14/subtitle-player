import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { VideoMeta } from '../pages/PlayerPage';

interface Props {
  video: VideoMeta;
}

export default function VideoCard({ video }: Props) {
  const navigate = useNavigate();

  return (
    <div className="relative group">
      {/* Обёртка с кликом по превью */}
      <div
        onClick={() => navigate(`/video/${video.videoId}`, { state: { videoUrl: video.videoUrl } })}
        className="space-y-2 transition cursor-pointer hover:opacity-90"
      >
        <video
          src={video.videoUrl + '#t=0.1'}
          controls
          muted
          className="w-full rounded shadow aspect-video"
        />
        <div className="text-sm">
          <p className="font-medium truncate">{video.name}</p>
          <p className="text-gray-500">
            {(video.size / 1024 / 1024).toFixed(1)} MB ·{' '}
            {video.updated ? new Date(video.updated).toLocaleString() : '—'}
          </p>
        </div>
      </div>

      {/* Кнопка "Редактировать" */}
      <button
        onClick={() => navigate(`/upload/${video.videoId}`)}
        className="absolute px-2 py-1 text-xs text-white transition bg-blue-600 rounded opacity-0 top-2 right-2 group-hover:opacity-100"
      >
        Редактировать
      </button>
    </div>
  );
}
