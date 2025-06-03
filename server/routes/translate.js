import express from 'express';
import { TranslationServiceClient } from '@google-cloud/translate';

const router = express.Router();
const client = new TranslationServiceClient();

router.post('/translate', express.json(), async (req, res) => {
  try {
    const { segments, targetLangs, sourceLang } = req.body;
    if (!Array.isArray(segments) || !targetLangs?.length) {
      return res.status(400).send('segments and targetLangs required');
    }

    const projectId = process.env.GOOGLE_PROJECT_ID;
    console.log('translate.js projectId', projectId);
    const texts = segments.map(s => s.text);
    const parent = `projects/${projectId}/locations/global`;

    // Переводим все тексты на каждый язык
    const translationsByLang = {};
    await Promise.all(
      targetLangs.map(async lang => {
        const [response] = await client.translateText({
          parent,
          contents: texts,
          mimeType: 'text/plain',
          sourceLanguageCode: sourceLang, // Язык оригинала
          targetLanguageCode: lang, // Язык перевода
        });
        translationsByLang[lang] = response.translations.map(t => t.translatedText);
      }),
    );

    // Формируем результат
    const result = segments.map(s => ({
      id: s.id,
      translations: targetLangs.reduce((acc, lang) => {
        acc[lang] = translationsByLang[lang][s.id] || '';
        return acc;
      }, {}),
    }));

    res.json({ segments: result });
  } catch (err) {
    console.error(err);
    res.status(500).send(err.message);
  }
});

export default router;
