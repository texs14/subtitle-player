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

// Настройка multer: in-memory upload, размер до 500 MB
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 },
});

// Читаем из process.env (из вашего .env):
const projectId = process.env.GOOGLE_PROJECT_ID;
const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
const rawKey = process.env.GOOGLE_PRIVATE_KEY;

console.log('transcribe.js projectId', projectId);

// Проверка, что переменные заданы:
if (!projectId || !clientEmail || !rawKey) {
  console.error(
    '[transcribe.js] Ошибка: не найдены GOOGLE_PROJECT_ID, GOOGLE_CLIENT_EMAIL или GOOGLE_PRIVATE_KEY в окружении',
  );
  process.exit(1);
}

// Приводим private_key к «многострочному» виду:
const privateKey = rawKey.replace(/\\n/g, '\n');

// 1) Инициализируем Google Cloud Storage с учётными данными
const storage = new Storage({
  projectId,
  credentials: {
    client_email: clientEmail,
    private_key: privateKey,
  },
});
const bucket = storage.bucket('my-test-app-bucket');

// 2) Инициализируем Speech-to-Text
const speech = new SpeechClient({
  projectId,
  credentials: {
    client_email: clientEmail,
    private_key: privateKey,
  },
});

// 3) Инициализируем Translate
const translate = new TranslationServiceClient({
  projectId,
  credentials: {
    client_email: clientEmail,
    private_key: privateKey,
  },
});

router.post('/transcribe', upload.single('video'), async (req, res) => {
  try {
    // 1. Считываем опциональные поля
    const originalLang = (req.body.originalLang || 'auto').toString();
    const targetLangs = req.body.targetLangs ? JSON.parse(req.body.targetLangs) : [];

    // 2. Получаем видео-буфер: либо файл, либо URL
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

    // 3. Сохраняем временный MP4
    const inPath = join(tmpdir(), `${randomUUID()}.mp4`);
    const outPath = join(tmpdir(), `${randomUUID()}.wav`);
    await fs.writeFile(inPath, videoBuffer);

    // 4. Конвертируем MP4 → WAV 16 kHz mono PCM
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

    // 5. Загружаем WAV в GCS
    const wavKey = `audio/${randomUUID()}.wav`;
    await bucket.upload(outPath, {
      destination: wavKey,
      metadata: { contentType: 'audio/wav' },
      resumable: false,
    });
    const gcsUri = `gs://${bucket.name}/${wavKey}`;

    // Удаляем временные файлы
    await Promise.all([fs.unlink(inPath), fs.unlink(outPath)]);

    // 6. Подготавливаем запрос к Speech-to-Text
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

    // 7. Вызываем Google Speech-to-Text
    const [operation] = await speech.longRunningRecognize(longReq);
    const [speechResp] = await operation.promise();

    // 8. Собираем массив сегментов
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
        translations: {}, // позже заполним, если targetLangs непустой
      };
    });
    console.log('projectId', projectId);
    // 9. Если требуются переводы, делаем batch-запрос к Translate
    if (targetLangs.length) {
      // Используем PROJECT_ID (строку), а не project number
      const parent = `projects/${projectId}/locations/global`;
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
    }

    // 10. Отправляем результат клиенту
    return res.json({ originalLang, targetLangs, segments });
  } catch (err) {
    console.error('[transcribe.js] Error:', err);
    return res.status(500).send(err.message);
  }
});

export default router;
