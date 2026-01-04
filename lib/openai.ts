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
// Common Whisper hallucinations for silence/unclear audio
const HALLUCINATION_PATTERNS = [
  /^thank you\.?$/i,
  /^thanks\.?$/i,
  /^תודה\.?$/,
  /^\.+$/,
  /^\s*$/,
  /^you$/i,
  /^bye\.?$/i,
  /^okay\.?$/i,
];

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

  // Filter out Whisper hallucinations (common when audio is silent/unclear)
  const trimmed = transcription.trim();
  if (HALLUCINATION_PATTERNS.some(pattern => pattern.test(trimmed))) {
    return ''; // Return empty for hallucinations
  }

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
  const glossarySection = glossary && Object.keys(glossary).length > 0
    ? `\n\nGlossary (use these specific translations):\n${Object.entries(glossary)
        .map(([he, en]) => `- "${he}" → "${en}"`)
        .join('\n')}`
    : '';

  const contextSection = priorContext
    ? `\nPrevious context: "${priorContext}"\n`
    : '';

  const response = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: `You are an expert Hebrew-to-English interpreter for live keynote presentations.

Your goal is to convey the MEANING and INTENT of the speaker, NOT provide a literal word-for-word translation.

Key principles:
1. UNDERSTAND THE MEANING FIRST - Think about what the speaker is trying to communicate
2. NATURAL ENGLISH - Produce fluent, idiomatic English that sounds like a native speaker
3. HEBREW SLANG & IDIOMS - Interpret colloquial Hebrew expressions into their English equivalents:
   - "יאללה" → contextual: "let's go", "come on", "alright"
   - "סבבה" → "sounds good", "okay", "cool"
   - "בכיף" → "gladly", "with pleasure", "sure thing"
   - "מה קורה" → "what's going on", "how's it going"
   - "בסדר גמור" → "absolutely", "definitely"
   - "לא נורא" → "no big deal", "it's fine"
   - "חבל על הזמן" → "amazing", "incredible" (positive context)
   - "סתם" → "just", "for no reason", "whatever"
   - Filler words like "אז", "נו", "כאילו" → use sparingly or omit
4. SPOKEN LANGUAGE - This is transcribed speech, so:
   - Clean up verbal fillers and false starts
   - Restructure run-on sentences for clarity
   - Maintain the speaker's energy and emphasis
5. INCOMPLETE SENTENCES - If cut off mid-sentence, keep it unfinished naturally

Output ONLY the English translation. No explanations, no Hebrew, no quotes.${glossarySection}`,
      },
      {
        role: 'user',
        content: `${contextSection}Translate this Hebrew speech to natural English:\n\n${hebrewText}`,
      },
    ],
    temperature: 0.4,
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

  // Skip translation if transcription is empty (silence/hallucination)
  if (!hebrewText.trim()) {
    return { hebrewText: '', englishText: '' };
  }

  const englishText = await translateToEnglish(hebrewText, glossary, priorContext);

  return { hebrewText, englishText };
}
