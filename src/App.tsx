import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import HomeLayout from './layouts/HomeLayout';
import UploadPage from './pages/UploadPage';
import PlayerPage from './pages/PlayerPage';
import VideoViewPage from './pages/VideoViewPage';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomeLayout />}>
          <Route index element={<Navigate to="upload" replace />} />
          <Route path="upload" element={<UploadPage />} />
          <Route path="video" element={<PlayerPage />} />
          {/* динамический просмотр одного ролика */}
          <Route path="video/:id" element={<VideoViewPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
