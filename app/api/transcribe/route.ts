import { NextRequest, NextResponse } from 'next/server';
import { processAudioChunk } from '@/lib/openai';
import { adminDb } from '@/lib/firebase-admin';
import type { TranscriptionChunk, ProcessChunkResponse } from '@/types';

export const runtime = 'nodejs';
export const maxDuration = 30; // 30 seconds max for Netlify

export async function POST(request: NextRequest): Promise<NextResponse<ProcessChunkResponse>> {
  try {
    const formData = await request.formData();

    const audioFile = formData.get('audio') as File | null;
    const eventId = formData.get('eventId') as string | null;
    const chunkIndex = parseInt(formData.get('chunkIndex') as string, 10);
    const startTime = parseInt(formData.get('startTime') as string, 10);
    const endTime = parseInt(formData.get('endTime') as string, 10);

    if (!audioFile || !eventId || isNaN(chunkIndex)) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields: audio, eventId, chunkIndex' },
        { status: 400 }
      );
    }

    // Get event to retrieve glossary and prior context
    const eventDoc = await adminDb.collection('events').doc(eventId).get();
    if (!eventDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    const eventData = eventDoc.data();
    const glossary = eventData?.glossary || {};

    // Get last chunk for context continuity
    let priorContext: string | undefined;
    if (chunkIndex > 0) {
      const lastChunkSnapshot = await adminDb
        .collection('events')
        .doc(eventId)
        .collection('chunks')
        .where('chunkIndex', '==', chunkIndex - 1)
        .limit(1)
        .get();

      if (!lastChunkSnapshot.empty) {
        const lastChunk = lastChunkSnapshot.docs[0].data();
        // Use last ~100 chars of Hebrew for context
        priorContext = lastChunk.hebrewText?.slice(-100);
      }
    }

    // Process audio: transcribe Hebrew -> translate to English
    const { hebrewText, englishText } = await processAudioChunk(
      audioFile,
      glossary,
      priorContext
    );

    // Skip saving empty chunks (silence/hallucinations)
    if (!hebrewText.trim() || !englishText.trim()) {
      return NextResponse.json({
        success: true,
        data: null, // No data saved for empty chunks
      });
    }

    // Store chunk in Firestore
    const chunkData: TranscriptionChunk = {
      id: `${eventId}_${chunkIndex}`,
      eventId,
      chunkIndex,
      hebrewText,
      englishText,
      startTime,
      endTime,
      createdAt: Date.now(),
    };

    await adminDb
      .collection('events')
      .doc(eventId)
      .collection('chunks')
      .doc(chunkData.id)
      .set(chunkData);

    return NextResponse.json({ success: true, data: chunkData });
  } catch (error) {
    console.error('Transcription error:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
