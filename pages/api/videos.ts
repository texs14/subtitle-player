import type { NextApiRequest, NextApiResponse } from 'next';
import { Storage } from '@google-cloud/storage';

const storage = new Storage();
const bucket = storage.bucket('my-test-app-bucket');

export default async function handler(_req: NextApiRequest, res: NextApiResponse) {
  try {
    const [files] = await bucket.getFiles({ prefix: 'videos/' });
    const data = files.map(f => ({
      videoId: f.name.split('/')[1]?.split('.')[0],
      name: f.metadata.name,
      size: Number(f.metadata.size),
      updated: f.metadata.updated,
      videoUrl: `https://storage.googleapis.com/${bucket.name}/${f.name}`,
    }));
    res.status(200).json(data);
  } catch (e: any) {
    console.error(e);
    res.status(500).send(e.message);
  }
}
