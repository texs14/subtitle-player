// routes/transcribe.js
import express from 'express';
import multer from 'multer';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { randomUUID } from 'crypto';

import ffmpeg from 'fluent-ffmpeg';
import ffmpegPath from 'ffmpeg-static';

import { SpeechClient } from '@google-cloud/speech';
import { TranslationServiceClient } from '@google-cloud/translate';
import { Storage } from '@google-cloud/storage';

ffmpeg.setFfmpegPath(ffmpegPath);

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });

const speech = new SpeechClient();
const translate = new TranslationServiceClient();

// Cloud Storage: используем my-test-app-bucket
const storage = new Storage();
const bucket = storage.bucket('my-test-app-bucket');

router.post('/transcribe', upload.single('video'), async (req, res) => {
  try {
    if (!req.file?.buffer?.length) {
      return res.status(400).send('No file uploaded');
    }

    /* 1. Video → WAV (tmp files) */
    const inPath = join(tmpdir(), `${randomUUID()}.mp4`);
    const outPath = join(tmpdir(), `${randomUUID()}.wav`);
    await fs.writeFile(inPath, req.file.buffer);

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

    /* 2. Upload WAV → Cloud Storage */
    const gcsKey = `audio/${randomUUID()}.wav`;
    await bucket.upload(outPath, {
      destination: gcsKey,
      resumable: false,
      metadata: { contentType: 'audio/wav' },
    });
    const gcsUri = `gs://${bucket.name}/${gcsKey}`;

    await Promise.all([fs.unlink(inPath), fs.unlink(outPath)]);

    /* 3. Speech-to-Text (до 480 мин) */
    const speechConfig = {
      encoding: 'LINEAR16',
      sampleRateHertz: 16000,
      languageCode: 'ru-RU',
      alternativeLanguageCodes: ['ru-RU'],
      enableWordTimeOffsets: true,
      enableAutomaticPunctuation: true,
    };

    const longReq = {
      config: speechConfig,
      audio: { uri: gcsUri }, // ← передаём URI, не base64
    };

    const [operation] = await speech.longRunningRecognize(longReq);
    const [speechResp] = await operation.promise();

    const segments = speechResp.results.map((r, id) => {
      const alt = r.alternatives?.[0] ?? {};
      return {
        id,
        text: (alt.transcript || '').trim(),
        words: (alt.words || []).map(w => ({
          word: w.word,
          start: Number(w.startTime.seconds) + w.startTime.nanos / 1e9,
          end: Number(w.endTime.seconds) + w.endTime.nanos / 1e9,
        })),
      };
    });

    /* 4. Translate */
    const parent = `projects/${process.env.GOOGLE_PROJECT_NUMBER}/locations/global`;
    const [tr] = await translate.translateText({
      contents: [segments.map(s => s.text).join(' ')],
      targetLanguageCode: 'en', // переводим на английский
      mimeType: 'text/plain',
      parent,
    });

    res.json({
      segments,
      translation: tr.translations?.[0]?.translatedText ?? '',
    });
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

export default router;
