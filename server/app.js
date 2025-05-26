import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import transcribeRoute from './routes/transcribe.js';
import uploadRoutes from './routes/upload.js';
import videosRoutes from './routes/videos.js';

const app = express();
app.use(cors()); // открываем CORS для фронта
app.use('/api', uploadRoutes); // POST /api/upload
app.use('/api', transcribeRoute); // POST /api/transcribe
app.use('/api', videosRoutes); // GET /api/videos

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`Backend listening on :${PORT}`));
