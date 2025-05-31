// routes/transcribe.js
import express from 'express';
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

ffmpeg.setFfmpegPath(ffmpegPath);

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });

const speech = new SpeechClient();
const translate = new TranslationServiceClient();
const storage = new Storage();
const bucket = storage.bucket('my-test-app-bucket');

router.post('/transcribe', upload.single('video'), async (req, res) => {
  try {
    // Parse optional form fields
    const originalLang = req.body.originalLang || 'auto';
    const targetLangs = req.body.targetLangs ? JSON.parse(req.body.targetLangs) : [];
    // Determine video buffer: uploaded file or fetch by URL
    let videoBuffer;
    if (req.file?.buffer?.length) {
      videoBuffer = req.file.buffer;
    } else if (req.body.videoUrl) {
      const url = req.body.videoUrl;
      const response = await axios.get(url, { responseType: 'arraybuffer' });
      videoBuffer = Buffer.from(response.data);
    } else {
      return res.status(400).send('No file uploaded or videoUrl provided');
    }
    // 1. Save buffer to tmp MP4 file
    const inPath = join(tmpdir(), `${randomUUID()}.mp4`);
    const outPath = join(tmpdir(), `${randomUUID()}.wav`);
    await fs.writeFile(inPath, videoBuffer);
    // 2. Convert to WAV 16kHz mono
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
    // 3. Upload WAV to GCS and get URI
    const wavKey = `audio/${randomUUID()}.wav`;
    await bucket.upload(outPath, {
      destination: wavKey,
      metadata: { contentType: 'audio/wav' },
      resumable: false,
    });
    const gcsUri = `gs://${bucket.name}/${wavKey}`;
    await Promise.all([fs.unlink(inPath), fs.unlink(outPath)]);
    // 4. Configure Speech-to-Text request
    const speechConfig = {
      encoding: 'LINEAR16',
      sampleRateHertz: 16000,
      languageCode:
        originalLang === 'auto' ? 'en-US' : originalLang + '-' + originalLang.toUpperCase(),
      alternativeLanguageCodes: originalLang === 'auto' ? ['ru-RU', 'th-TH'] : [],
      enableWordTimeOffsets: true,
      enableAutomaticPunctuation: true,
    };
    const longReq = { config: speechConfig, audio: { uri: gcsUri } };
    const [operation] = await speech.longRunningRecognize(longReq);
    const [speechResp] = await operation.promise();
    // 5. Build segments
    const segments = speechResp.results.map((r, id) => {
      const alt = r.alternatives?.[0] || {};
      const words = (alt.words || []).map(w => ({
        word: w.word,
        start: Number(w.startTime.seconds) + w.startTime.nanos / 1e9,
        end: Number(w.endTime.seconds) + w.endTime.nanos / 1e9,
      }));
      const start = words[0]?.start ?? 0;
      const end = words[words.length - 1]?.end ?? 0;
      return { id, start, end, text: (alt.transcript || '').trim(), words, translations: {} };
    });
    // 6. Batch translation for each targetLang
    const parent = `projects/${process.env.GOOGLE_PROJECT_NUMBER}/locations/global`;
    const texts = segments.map(seg => seg.text);
    await Promise.all(
      targetLangs.map(async lang => {
        const [trRes] = await translate.translateText({
          parent,
          contents: texts,
          targetLanguageCode: lang,
          mimeType: 'text/plain',
        });
        trRes.translations?.forEach((t, i) => {
          segments[i].translations[lang] = t.translatedText || '';
        });
      }),
    );
    // 7. Respond with structured SubtitleData
    res.json({ originalLang, targetLangs, segments });
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

export default router;
