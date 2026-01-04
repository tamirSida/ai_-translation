import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';
import type { TranslationEvent } from '@/types';

export const runtime = 'nodejs';

// GET /api/events - List all events
export async function GET(): Promise<NextResponse> {
  try {
    const eventsSnapshot = await adminDb
      .collection('events')
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();

    const events = eventsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ success: true, data: events });
  } catch (error) {
    console.error('Error fetching events:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// POST /api/events - Create a new event
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();
    const { name, glossary = {} } = body;

    if (!name) {
      return NextResponse.json(
        { success: false, error: 'Event name is required' },
        { status: 400 }
      );
    }

    const eventData: Omit<TranslationEvent, 'id'> = {
      name,
      status: 'idle',
      glossary,
      createdAt: Date.now(),
    };

    const docRef = await adminDb.collection('events').add(eventData);

    return NextResponse.json({
      success: true,
      data: { id: docRef.id, ...eventData },
    });
  } catch (error) {
    console.error('Error creating event:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
