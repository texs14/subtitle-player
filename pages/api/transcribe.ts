import type { NextApiRequest, NextApiResponse } from 'next';
import { createRouter } from 'next-connect';
import multer from 'multer';
import axios from 'axios';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';
import { SpeechClient } from '@google-cloud/speech';
import { TranslationServiceClient } from '@google-cloud/translate';
import { Storage } from '@google-cloud/storage';

ffmpeg.setFfmpegPath(ffmpegPath as string);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 },
});

const projectId = process.env.GOOGLE_PROJECT_ID as string;
const clientEmail = process.env.GOOGLE_CLIENT_EMAIL as string;
const rawKey = process.env.GOOGLE_PRIVATE_KEY as string;

const privateKey = rawKey?.replace(/\\n/g, '\n');

const storage = new Storage({
  projectId,
  credentials: { client_email: clientEmail, private_key: privateKey },
});
const bucket = storage.bucket('my-test-app-bucket');

const speech = new SpeechClient({
  projectId,
  credentials: { client_email: clientEmail, private_key: privateKey },
});

const translate = new TranslationServiceClient({
  projectId,
  credentials: { client_email: clientEmail, private_key: privateKey },
});

const apiRoute = createRouter<NextApiRequest, NextApiResponse>();

// Multer middleware is typed for Express. Cast to `any` for use here.
apiRoute.use(upload.single('video') as any);

apiRoute.post(async (req: any, res) => {
  try {
    const originalLang = (req.body.originalLang || 'auto').toString();
    const targetLangs = req.body.targetLangs ? JSON.parse(req.body.targetLangs) : [];

    let videoBuffer: Buffer;
    if (req.file?.buffer?.length) {
      videoBuffer = req.file.buffer;
    } else if (req.body.videoUrl) {
      const response = await axios.get(req.body.videoUrl, { responseType: 'arraybuffer' });
      videoBuffer = Buffer.from(response.data);
    } else {
      return res.status(400).send('No file uploaded or videoUrl provided');
    }

    const inPath = join(tmpdir(), `${randomUUID()}.mp4`);
    const outPath = join(tmpdir(), `${randomUUID()}.wav`);
    await fs.writeFile(inPath, videoBuffer);

    await new Promise((resolve, reject) => {
      ffmpeg(inPath)
        .audioChannels(1)
        .audioFrequency(16000)
        .audioCodec('pcm_s16le')
        .format('wav')
        .on('error', reject)
        .on('end', resolve)
        .save(outPath);
    });

    const wavKey = `audio/${randomUUID()}.wav`;
    await bucket.upload(outPath, {
      destination: wavKey,
      metadata: { contentType: 'audio/wav' },
      resumable: false,
    });
    const gcsUri = `gs://${bucket.name}/${wavKey}`;

    await Promise.all([fs.unlink(inPath), fs.unlink(outPath)]);

    const speechConfig = {
      encoding: 'LINEAR16',
      sampleRateHertz: 16000,
      languageCode:
        originalLang === 'auto' ? 'en-US' : `${originalLang}-${originalLang.toUpperCase()}`,
      alternativeLanguageCodes: originalLang === 'auto' ? ['ru-RU', 'th-TH'] : [],
      enableWordTimeOffsets: true,
      enableAutomaticPunctuation: true,
    };
    const longReq = { config: speechConfig, audio: { uri: gcsUri } };

    // @ts-ignore - Google client types are incompatible
    const [operation] = (await speech.longRunningRecognize(longReq)) as any;
    // @ts-ignore
    const [speechResp] = (await operation.promise()) as any;

    const segments = speechResp.results.map((r, idx) => {
      const alt = r.alternatives?.[0] || {};
      const words = (alt.words || []).map(w => ({
        word: w.word,
        start: Number(w.startTime.seconds) + w.startTime.nanos / 1e9,
        end: Number(w.endTime.seconds) + w.endTime.nanos / 1e9,
      }));
      const start = words[0]?.start ?? 0;
      const end = words[words.length - 1]?.end ?? 0;
      return {
        id: idx,
        start,
        end,
        text: alt.transcript?.trim() || '',
        words,
        translations: {},
      };
    });

    if (targetLangs.length) {
      const parent = `projects/${projectId}/locations/global`;
      const texts = segments.map((seg: any) => seg.text);

      await Promise.all(
        targetLangs.map(async (lang: string) => {
          const [trRes] = await translate.translateText({
            parent,
            contents: texts,
            targetLanguageCode: lang,
            mimeType: 'text/plain',
          });
          trRes.translations?.forEach((t, i) => {
            segments[i].translations[lang] = t.translatedText || '';
          });
        })
      );
    }

    return res.json({ originalLang, targetLangs, segments });
  } catch (err: any) {
    console.error('[transcribe.js] Error:', err);
    return res.status(500).send(err.message);
  }
});

export default apiRoute.handler({
  onError(err, _req, res) {
    console.error(err);
    res.status(500).end(err.toString());
  },
});
export const config = {
  api: {
    bodyParser: false,
    responseLimit: false,
  },
};
