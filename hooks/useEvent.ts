'use client';

import { useState, useEffect, useCallback } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { TranslationEvent, TranscriptionChunk } from '@/types';

export function useEvent(eventId: string | null) {
  const [event, setEvent] = useState<TranslationEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(
      doc(db, 'events', eventId),
      (doc) => {
        if (doc.exists()) {
          setEvent({ id: doc.id, ...doc.data() } as TranslationEvent);
        } else {
          setError('Event not found');
        }
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [eventId]);

  const updateStatus = useCallback(async (status: 'idle' | 'live' | 'ended') => {
    if (!eventId) return;

    const res = await fetch(`/api/events/${eventId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      throw new Error('Failed to update event status');
    }
  }, [eventId]);

  const updateGlossary = useCallback(async (glossary: Record<string, string>) => {
    if (!eventId) return;

    const res = await fetch(`/api/events/${eventId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ glossary }),
    });

    if (!res.ok) {
      throw new Error('Failed to update glossary');
    }
  }, [eventId]);

  return { event, loading, error, updateStatus, updateGlossary };
}

export function useChunks(eventId: string | null) {
  const [chunks, setChunks] = useState<TranscriptionChunk[]>([]);
  const [loading, setLoading] = useState(true);

  // Poll for new chunks every 2 seconds
  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    const fetchChunks = async () => {
      try {
        const lastIndex = chunks.length > 0 ? chunks[chunks.length - 1].chunkIndex : -1;
        const res = await fetch(`/api/events/${eventId}/chunks?after=${lastIndex}`);
        const data = await res.json();

        if (data.success && data.data.length > 0) {
          setChunks(prev => [...prev, ...data.data]);
        }
      } catch (err) {
        console.error('Failed to fetch chunks:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchChunks();
    const interval = setInterval(fetchChunks, 2000);

    return () => clearInterval(interval);
  }, [eventId, chunks.length]);

  return { chunks, loading };
}
