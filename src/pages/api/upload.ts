import type { NextApiRequest, NextApiResponse } from 'next';
import nextConnect from 'next-connect';
import { Storage } from '@google-cloud/storage';
import multer from 'multer';
import { v4 as uuid } from 'uuid';

const upload = multer({ storage: multer.memoryStorage() });
const storage = new Storage();
const bucket = storage.bucket('my-test-app-bucket');

const apiRoute = nextConnect<NextApiRequest, NextApiResponse>({
  onError(error, _req, res) {
    console.error(error);
    res.status(500).end(error.toString());
  },
});

apiRoute.use(upload.single('video'));

apiRoute.post(async (req: any, res) => {
  try {
    if (!req.file) return res.status(400).send('no file');

    const ext = req.file.originalname.split('.').pop();
    const fileId = uuid();
    const gcsFile = bucket.file(`videos/${fileId}.${ext}`);

    await gcsFile.save(req.file.buffer, { resumable: false });

    const [publicUrl] = await gcsFile.getSignedUrl({
      action: 'read',
      expires: Date.now() + 30 * 24 * 60 * 60 * 1000,
    });

    res.json({ videoId: fileId, videoUrl: publicUrl });
  } catch (e: any) {
    console.error(e);
    res.status(500).send(e.message);
  }
});

export default apiRoute;
export const config = {
  api: {
    bodyParser: false,
  },
};
