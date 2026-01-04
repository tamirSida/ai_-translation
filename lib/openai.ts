import OpenAI, { toFile } from 'openai';

if (!process.env.OPENAI_API_KEY) {
  throw new Error('Missing OPENAI_API_KEY environment variable');
}

export const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Transcribe Hebrew audio to text
 * Supports: mp3, wav, m4a, webm, ogg
 */
export async function transcribeHebrew(audioFile: File): Promise<string> {
  // Convert File to a format OpenAI SDK can handle
  const arrayBuffer = await audioFile.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Create a file object that OpenAI SDK can process
  const file = await toFile(buffer, audioFile.name || 'audio.webm', {
    type: audioFile.type || 'audio/webm',
  });

  const transcription = await openai.audio.transcriptions.create({
    file: file,
    model: 'whisper-1',
    language: 'he',
    response_format: 'text',
  });

  return transcription;
}

/**
 * Translate Hebrew text to English
 * Uses GPT-4o-mini for speed (good for NRT)
 */
export async function translateToEnglish(
  hebrewText: string,
  glossary?: Record<string, string>,
  priorContext?: string
): Promise<string> {
  const glossarySection = glossary
    ? `\nGlossary (use these translations for consistency):\n${Object.entries(glossary)
        .map(([he, en]) => `- "${he}" → "${en}"`)
        .join('\n')}`
    : '';

  const contextSection = priorContext
    ? `\nPrevious context for continuity:\n"${priorContext}"`
    : '';

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are a live keynote translator from Hebrew to English.
Rules:
- Output ONLY the English translation, nothing else
- Preserve names, acronyms, and technical terms as-is unless there's an obvious English equivalent
- If a sentence is cut off at the end, keep it unfinished - do not hallucinate the ending
- Maintain natural, professional English suitable for a keynote presentation
- Keep the same tone and emphasis as the original${glossarySection}`,
      },
      {
        role: 'user',
        content: `${contextSection}\n\nTranslate this Hebrew text to English:\n\n${hebrewText}`,
      },
    ],
    temperature: 0.3,
    max_tokens: 2000,
  });

  return response.choices[0]?.message?.content || '';
}

/**
 * Combined: transcribe Hebrew audio and translate to English
 */
export async function processAudioChunk(
  audioFile: File,
  glossary?: Record<string, string>,
  priorContext?: string
): Promise<{ hebrewText: string; englishText: string }> {
  const hebrewText = await transcribeHebrew(audioFile);
  const englishText = await translateToEnglish(hebrewText, glossary, priorContext);

  return { hebrewText, englishText };
}
