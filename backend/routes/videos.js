import express from 'express';
import { Storage } from '@google-cloud/storage';

const router = express.Router();
const storage = new Storage();
const bucket = storage.bucket('my-test-app-bucket');

// GET /api/videos  →  [{ videoId, videoUrl, name, size, updated }, …]
router.get('/videos', async (_req, res) => {
  try {
    // берём только объекты внутри videos/
    const [files] = await bucket.getFiles({ prefix: 'videos/' });

    const data = files.map(f => ({
      videoId: f.name.split('/')[1]?.split('.')[0], // uuid из пути
      name: f.metadata.name,
      size: Number(f.metadata.size),
      updated: f.metadata.updated,
      videoUrl: `https://storage.googleapis.com/${bucket.name}/${f.name}`,
    }));

    res.json(data);
  } catch (e) {
    console.error(e);
    res.status(500).send(e.message);
  }
});

export default router;
