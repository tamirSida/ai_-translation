import { NextRequest, NextResponse } from 'next/server';
import { adminDb } from '@/lib/firebase-admin';

export const runtime = 'nodejs';

// GET /api/events/[eventId]/chunks - Get chunks for SSE/polling
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
): Promise<NextResponse> {
  try {
    const { eventId } = await params;
    const { searchParams } = new URL(request.url);
    const afterIndex = parseInt(searchParams.get('after') || '-1', 10);

    const chunksSnapshot = await adminDb
      .collection('events')
      .doc(eventId)
      .collection('chunks')
      .where('chunkIndex', '>', afterIndex)
      .orderBy('chunkIndex', 'asc')
      .get();

    const chunks = chunksSnapshot.docs.map((doc) => doc.data());

    return NextResponse.json({ success: true, data: chunks });
  } catch (error) {
    console.error('Error fetching chunks:', error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
