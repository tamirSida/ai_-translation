'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface AudioRecorderProps {
  eventId: string;
  isLive: boolean;
  chunkDurationMs?: number;
  onChunkSent?: (chunkIndex: number) => void;
  onError?: (error: string) => void;
}

export function AudioRecorder({
  eventId,
  isLive,
  chunkDurationMs = 5000,
  onChunkSent,
  onError,
}: AudioRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [chunkIndex, setChunkIndex] = useState(0);
  const [status, setStatus] = useState<string>('Ready');

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunkIndexRef = useRef(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isRecordingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  const sendChunk = useCallback(async (audioBlob: Blob, index: number) => {
    // Don't send if we've stopped recording
    if (!isRecordingRef.current) {
      return;
    }

    if (audioBlob.size < 1000) {
      return; // Skip tiny chunks
    }

    const formData = new FormData();
    formData.append('audio', audioBlob, `chunk_${index}.webm`);
    formData.append('eventId', eventId);
    formData.append('chunkIndex', index.toString());
    formData.append('startTime', (index * chunkDurationMs).toString());
    formData.append('endTime', ((index + 1) * chunkDurationMs).toString());

    try {
      setStatus(`Sending chunk ${index}...`);
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
        signal: abortControllerRef.current?.signal,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to process chunk');
      }

      setStatus(`Chunk ${index} sent`);
      onChunkSent?.(index);
    } catch (err) {
      // Ignore abort errors
      if (err instanceof Error && err.name === 'AbortError') {
        return;
      }
      const message = err instanceof Error ? err.message : 'Unknown error';
      setStatus(`Error: ${message}`);
      onError?.(message);
    }
  }, [eventId, chunkDurationMs, onChunkSent, onError]);

  // Record a single chunk and send it
  const recordAndSendChunk = useCallback(async () => {
    if (!streamRef.current || !isRecordingRef.current) return;

    const currentIndex = chunkIndexRef.current;
    chunkIndexRef.current += 1;
    setChunkIndex(chunkIndexRef.current);

    return new Promise<void>((resolve) => {
      const chunks: Blob[] = [];

      const recorder = new MediaRecorder(streamRef.current!, {
        mimeType: MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm',
      });

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunks.push(e.data);
        }
      };

      recorder.onstop = () => {
        if (chunks.length > 0) {
          const audioBlob = new Blob(chunks, { type: 'audio/webm' });
          sendChunk(audioBlob, currentIndex);
        }
        resolve();
      };

      recorder.start();
      recorderRef.current = recorder;

      // Stop after chunk duration
      setTimeout(() => {
        if (recorder.state === 'recording') {
          recorder.stop();
        }
      }, chunkDurationMs);
    });
  }, [chunkDurationMs, sendChunk]);

  const startRecording = useCallback(async () => {
    try {
      console.log('[AudioRecorder] Starting recording...');
      setStatus('Requesting microphone...');
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
        }
      });

      streamRef.current = stream;
      isRecordingRef.current = true;
      abortControllerRef.current = new AbortController();
      chunkIndexRef.current = 0;
      setChunkIndex(0);
      setIsRecording(true);
      setStatus('Recording...');
      console.log(`[AudioRecorder] ✓ Recording started (chunk duration: ${chunkDurationMs}ms)`);

      // Start first chunk immediately
      recordAndSendChunk();

      // Schedule subsequent chunks
      intervalRef.current = setInterval(() => {
        if (isRecordingRef.current) {
          recordAndSendChunk();
        }
      }, chunkDurationMs);

    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start recording';
      console.error('[AudioRecorder] Failed to start:', message);
      setStatus(`Error: ${message}`);
      onError?.(message);
    }
  }, [chunkDurationMs, recordAndSendChunk, onError]);

  const stopRecording = useCallback(() => {
    console.log('[AudioRecorder] Stopping recording...');
    isRecordingRef.current = false;

    // Abort any in-flight requests
    if (abortControllerRef.current) {
      console.log('[AudioRecorder] Aborting in-flight API requests');
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    if (intervalRef.current) {
      console.log('[AudioRecorder] Clearing chunk interval');
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (recorderRef.current && recorderRef.current.state === 'recording') {
      console.log('[AudioRecorder] Stopping MediaRecorder');
      recorderRef.current.stop();
    }

    if (streamRef.current) {
      console.log('[AudioRecorder] Releasing microphone');
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setIsRecording(false);
    setStatus('Stopped');
    console.log('[AudioRecorder] ✓ Recording stopped - no more HTTP activity from recorder');
  }, []);

  // Auto-start/stop based on live status
  useEffect(() => {
    if (isLive && !isRecording) {
      startRecording();
    } else if (!isLive && isRecording) {
      stopRecording();
    }
  }, [isLive, isRecording, startRecording, stopRecording]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      isRecordingRef.current = false;
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <div className="flex items-center gap-4">
        <div className={`w-4 h-4 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-300'}`} />
        <span className="font-medium">
          {isRecording ? 'Recording' : 'Not Recording'}
        </span>
        <span className="text-gray-500 text-sm">
          Chunk: {chunkIndex} | {status}
        </span>
      </div>

      {!isLive && (
        <p className="mt-2 text-sm text-gray-500">
          Recording will start automatically when the event goes live.
        </p>
      )}
    </div>
  );
}
