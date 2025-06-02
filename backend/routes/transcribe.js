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
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 500 * 1024 * 1024 },
});

const speech = new SpeechClient();
const translate = new TranslationServiceClient();
const storage = new Storage();
// Замените 'my-test-app-bucket' на ваш фактический bucket
const bucket = storage.bucket(process.env.AUDIO_BUCKET || 'my-test-app-bucket');

// POST /api/transcribe
router.post('/transcribe', upload.single('video'), async (req, res) => {
  try {
    // 1. Парсим опциональные поля формы
    const originalLang = req.body.originalLang || 'auto';
    const targetLangs = req.body.targetLangs ? JSON.parse(req.body.targetLangs) : [];

    // 2. Получаем буфер видео (либо из загруженного файла, либо по URL)
    let videoBuffer;
    if (req.file?.buffer?.length) {
      videoBuffer = req.file.buffer;
    } else if (req.body.videoUrl) {
      const response = await axios.get(req.body.videoUrl, { responseType: 'arraybuffer' });
      videoBuffer = Buffer.from(response.data);
    } else {
      return res.status(400).send('No file uploaded or videoUrl provided');
    }

    // 3. Сохраняем MP4 во временный файл, конвертируем в WAV 16 kHz
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

    // 4. Загружаем WAV в GCS и получаем URI
    const wavKey = `audio/${randomUUID()}.wav`;
    await bucket.upload(outPath, {
      destination: wavKey,
      metadata: { contentType: 'audio/wav' },
      resumable: false,
    });
    const gcsUri = `gs://${bucket.name}/${wavKey}`;

    // Удаляем временные файлы
    await Promise.all([fs.unlink(inPath), fs.unlink(outPath)]);

    // 5. Настраиваем запрос к Google Speech-to-Text
    const speechConfig = {
      encoding: 'LINEAR16',
      sampleRateHertz: 16000,
      languageCode:
        originalLang === 'auto'
          ? 'en-US'
          : originalLang + '-' + originalLang.toUpperCase(),
      alternativeLanguageCodes: originalLang === 'auto' ? ['ru-RU', 'th-TH'] : [],
      enableWordTimeOffsets: true,
      enableAutomaticPunctuation: true,
    };

    const [operation] = await speech.longRunningRecognize({
      config: speechConfig,
      audio: { uri: gcsUri },
    });
    const [speechResp] = await operation.promise();

    // 6. Формируем исходные сегменты из ответа Speech-to-Text
    const rawSegments = speechResp.results.map((r, id) => {
      const alt = r.alternatives?.[0] || {};
      const words = (alt.words || []).map((w) => ({
        word: w.word,
        start: Number(w.startTime.seconds) + w.startTime.nanos / 1e9,
        end: Number(w.endTime.seconds) + w.endTime.nanos / 1e9,
      }));
      const start = words[0]?.start ?? 0;
      const end = words[words.length - 1]?.end ?? 0;
      return { id, start, end, text: (alt.transcript || '').trim(), words, translations: {} };
    });

    // 7. Для каждого сегмента вызываем Python-сервис (/segment) для тайской сегментации
    const processedSegments = [];
    let newId = 0;

    for (const seg of rawSegments) {
      // Посылаем текст сегмента в Python для разбивки на предложения
      const pyRes = await axios.post('http://localhost:5005/segment', {
        text: seg.text,
      });
      const { sentences, words: pyWords } = pyRes.data;
      // sentences — массив строк (каждое предложение)
      // pyWords — массив массивов токенов для каждого предложения

      // Для каждого предложения создаём новый сегмент
      sentences.forEach((sentence, idx) => {
        // Если Python вернул список слов для этого предложения,
        // можно взять их, но без реальных временных меток:
        const sentenceWords = (pyWords?.[idx] || []).map((w) => ({
          word: w,
          start: seg.start, // ставим начало равным общему началу старого сегмента
          end: seg.end,     // и конец равным концу старого сегмента
        }));

        processedSegments.push({
          id: newId++,
          start: seg.start,
          end: seg.end,
          text: sentence,
          words: sentenceWords,
          translations: { en: '', th: '', ru: '' },
        });
      });
    }

    // 8. Выполняем пакетный перевод для каждого сегмента (если заданы targetLangs)
    if (targetLangs.length) {
      const textsToTranslate = processedSegments.map((s) => s.text);
      const parent = `projects/${process.env.GOOGLE_PROJECT_NUMBER}/locations/global`;

      await Promise.all(
        targetLangs.map(async (lang) => {
          const [trRes] = await translate.translateText({
            parent,
            contents: textsToTranslate,
            targetLanguageCode: lang,
            mimeType: 'text/plain',
          });
          trRes.translations?.forEach((t, i) => {
            processedSegments[i].translations[lang] = t.translatedText || '';
          });
        })
      );
    }

    // 9. Возвращаем на фронт полностью обработанный объект
    return res.json({
      originalLang,
      targetLangs,
      segments: processedSegments,
    });
  } catch (err) {
    console.error(err);
    return res.status(500).send(err.message);
  }
});

export default router;
