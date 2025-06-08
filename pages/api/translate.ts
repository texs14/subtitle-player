import type { NextApiRequest, NextApiResponse } from 'next';
import { TranslationServiceClient } from '@google-cloud/translate';

const client = new TranslationServiceClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  try {
    const { segments, targetLangs, sourceLang } = req.body;
    if (!Array.isArray(segments) || !targetLangs?.length) {
      return res.status(400).send('segments and targetLangs required');
    }

    const projectId = process.env.GOOGLE_PROJECT_ID;
    console.log('translate.js projectId', projectId);
    const texts = segments.map((s: any) => s.text);
    const parent = `projects/${projectId}/locations/global`;

    const translationsByLang: Record<string, string[]> = {};
    await Promise.all(
      targetLangs.map(async (lang: string) => {
        const [response] = await client.translateText({
          parent,
          contents: texts,
          mimeType: 'text/plain',
          sourceLanguageCode: sourceLang,
          targetLanguageCode: lang,
        });
        translationsByLang[lang] = (response.translations || []).map(t => t.translatedText || '');
      })
    );

    const result = segments.map((s: any) => ({
      id: s.id,
      translations: targetLangs.reduce((acc: any, lang: string) => {
        acc[lang] = translationsByLang[lang][s.id] || '';
        return acc;
      }, {}),
    }));

    res.status(200).json({ segments: result });
  } catch (err: any) {
    console.error(err);
    res.status(500).send(err.message);
  }
}
