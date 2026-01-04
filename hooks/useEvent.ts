'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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

export function useChunks(eventId: string | null, isLive: boolean = false) {
  const [chunks, setChunks] = useState<TranscriptionChunk[]>([]);
  const [loading, setLoading] = useState(true);
  const lastIndexRef = useRef(-1);

  // Fetch chunks once on mount, then poll only when live
  useEffect(() => {
    if (!eventId) {
      setLoading(false);
      return;
    }

    const fetchChunks = async () => {
      try {
        const res = await fetch(`/api/events/${eventId}/chunks?after=${lastIndexRef.current}`);
        const data = await res.json();

        if (data.success && data.data.length > 0) {
          setChunks(prev => [...prev, ...data.data]);
          lastIndexRef.current = data.data[data.data.length - 1].chunkIndex;
        }
      } catch (err) {
        console.error('Failed to fetch chunks:', err);
      } finally {
        setLoading(false);
      }
    };

    // Always fetch once to load existing chunks
    fetchChunks();

    // Only poll if live
    if (!isLive) {
      console.log('[useChunks] Not live - polling disabled');
      return;
    }

    console.log('[useChunks] Live - polling enabled');
    const interval = setInterval(fetchChunks, 2000);

    return () => {
      console.log('[useChunks] Polling stopped');
      clearInterval(interval);
    };
  }, [eventId, isLive]);

  return { chunks, loading };
}
