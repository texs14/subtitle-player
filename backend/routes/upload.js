import express from 'express';
import { Storage } from '@google-cloud/storage';
import multer from 'multer';
import { v4 as uuid } from 'uuid';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });

const storage = new Storage(); // creds берётся из env
const bucket = storage.bucket('my-test-app-bucket');

router.post('/upload', upload.single('video'), async (req, res) => {
  try {
    if (!req.file) return res.status(400).send('no file');

    const ext = req.file.originalname.split('.').pop();
    const fileId = uuid();
    const gcsFile = bucket.file(`videos/${fileId}.${ext}`);

    // 1. загружаем в GCS
    await gcsFile.save(req.file.buffer, { resumable: false });
    // 2. либо открываем публично
    // await gcsFile.makePublic(); // комментируйте, если хотите Signed URL

    // const publicUrl = `https://storage.googleapis.com/${bucket.name}/${gcsFile.name}`;

    // 2. выдаём временную ссылку (например на 7 дней)
    const [publicUrl] = await gcsFile.getSignedUrl({
      action: 'read',
      expires: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 дней
    });

    // 3. вернуть url + сгенерированный id (для Firestore документа)
    res.json({ videoId: fileId, videoUrl: publicUrl });
  } catch (e) {
    console.error(e);
    res.status(500).send(e.message);
  }
});

export default router;
