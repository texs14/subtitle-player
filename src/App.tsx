import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomeLayout from './layouts/HomeLayout';
import UploadPage from './pages/UploadPage';
import PlayerPage from './pages/PlayerPage';
import VideoViewPage from './pages/VideoViewPage';
import { TooltipProvider } from './contexts/TooltipContext';
import { WordTooltip } from './components/WordTooltip';
import ExercisePage from './pages/ExercisePage';
import ExercisesPage from './pages/ExercisesPage';
import AddSentencePage from './pages/AddSentencePage';

export default function App() {
  return (
    <TooltipProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<HomeLayout />}>
            <Route index element={<Navigate to="upload" replace />} />
            <Route path="exercises" element={<ExercisesPage />} />
            <Route path="exercises/new" element={<AddSentencePage />} />
            <Route path="exercises/:exerciseId" element={<ExercisePage />} />
            <Route path="exercises/:exerciseId/edit" element={<AddSentencePage />} />
            <Route path="video" element={<PlayerPage />} />
            <Route path="video/:videoId" element={<VideoViewPage />} />
            <Route path="upload" element={<UploadPage />} />
            <Route path="upload/:videoId" element={<UploadPage />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>

      <WordTooltip />
    </TooltipProvider>
  );
}
