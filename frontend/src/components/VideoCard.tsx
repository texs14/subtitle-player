// src/components/VideoCard.tsx
import React, { MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { VideoMeta } from '../pages/PlayerPage';

interface VideoCardProps {
  video: VideoMeta;
}

/**
 * Карточка-превью для каждого видео:
 * - При клике на всю карточку навигируем на страницу просмотра: /video/:videoId
 * - Кнопка "Редактировать" ведёт на /upload/:videoId
 */
export function VideoCard({ video }: VideoCardProps) {
  const navigate = useNavigate();

  const handleCardClick = () => {
    navigate(`/video/${video.videoId}`);
  };

  const handleEditClick = (e: MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation();
    navigate(`/upload/${video.videoId}`);
  };

  return (
    <div className="relative space-y-2 cursor-pointer hover:opacity-90" onClick={handleCardClick}>
      <video
        src={video.videoUrl + '#t=0.1'}
        muted
        controls={false}
        className="object-cover w-full rounded shadow aspect-video"
      />
      <button
        onClick={handleEditClick}
        className="absolute z-10 px-2 py-1 text-xs text-white bg-blue-600 rounded top-2 right-2 hover:bg-blue-700 focus:outline-none"
      >
        Редактировать
      </button>
      <div className="px-1 text-sm">
        <p className="font-medium truncate">{video.name}</p>
        <p className="text-gray-500">
          {(video.size / 1024 / 1024).toFixed(1)} MB ·{' '}
          {video.updated ? new Date(video.updated).toLocaleString() : '—'}
        </p>
      </div>
    </div>
  );
}
