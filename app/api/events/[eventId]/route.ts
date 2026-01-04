import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

// GET /api/events/[eventId] - Get event with chunks
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
): Promise<NextResponse> {
  try {
    const { eventId } = await params;

    const eventDoc = await adminDb.collection('events').doc(eventId).get();
    if (!eventDoc.exists) {
      return NextResponse.json(
        { success: false, error: 'Event not found' },
        { status: 404 }
      );
    }

    const chunksSnapshot = await adminDb
      .collection('events')
      .doc(eventId)
      .collection('chunks')
      .orderBy('chunkIndex', 'asc')
      .get();

    const chunks = chunksSnapshot.docs.map((doc) => doc.data());

    return NextResponse.json({
      success: true,
      data: {
        id: eventDoc.id,
        ...eventDoc.data(),
        chunks,
      },
    });
  } catch (error) {
    console.error('Error fetching event:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// PATCH /api/events/[eventId] - Update event status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
): Promise<NextResponse> {
  try {
    const { eventId } = await params;
    const body = await request.json();
    const { status, glossary } = body;

    const updateData: Record<string, unknown> = {};

    if (status) {
      updateData.status = status;
      if (status === 'live') {
        updateData.startedAt = Date.now();
      } else if (status === 'ended') {
        updateData.endedAt = Date.now();
      }
    }

    if (glossary) {
      updateData.glossary = glossary;
    }

    await adminDb.collection('events').doc(eventId).update(updateData);

    const updatedDoc = await adminDb.collection('events').doc(eventId).get();

    return NextResponse.json({
      success: true,
      data: { id: updatedDoc.id, ...updatedDoc.data() },
    });
  } catch (error) {
    console.error('Error updating event:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
