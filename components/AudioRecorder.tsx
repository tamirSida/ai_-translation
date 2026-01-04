'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

interface AudioRecorderProps {
  eventId: string;
  isLive: boolean;
  chunkDurationMs?: number; // Default 5000ms (5 seconds)
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

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const startTimeRef = useRef<number>(0);
  const chunkStartTimeRef = useRef<number>(0);

  const sendChunk = useCallback(async (audioBlob: Blob, index: number, start: number, end: number) => {
    const formData = new FormData();
    formData.append('audio', audioBlob, `chunk_${index}.webm`);
    formData.append('eventId', eventId);
    formData.append('chunkIndex', index.toString());
    formData.append('startTime', start.toString());
    formData.append('endTime', end.toString());

    try {
      setStatus(`Sending chunk ${index}...`);
      const res = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to process chunk');
      }

      setStatus(`Chunk ${index} sent`);
      onChunkSent?.(index);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      setStatus(`Error: ${message}`);
      onError?.(message);
    }
  }, [eventId, onChunkSent, onError]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus',
      });

      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      startTimeRef.current = Date.now();
      chunkStartTimeRef.current = Date.now();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Send final chunk if any data
        if (chunksRef.current.length > 0) {
          const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
          const endTime = Date.now() - startTimeRef.current;
          const startTime = chunkStartTimeRef.current - startTimeRef.current;
          sendChunk(audioBlob, chunkIndex, startTime, endTime);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);
      setStatus('Recording...');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start recording';
      setStatus(`Error: ${message}`);
      onError?.(message);
    }
  }, [chunkIndex, sendChunk, onError]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      setIsRecording(false);
      setStatus('Stopped');
    }
  }, []);

  // Handle chunk intervals
  useEffect(() => {
    if (!isRecording || !mediaRecorderRef.current) return;

    const interval = setInterval(() => {
      const mediaRecorder = mediaRecorderRef.current;
      if (!mediaRecorder || mediaRecorder.state !== 'recording') return;

      // Stop to trigger ondataavailable, then restart
      mediaRecorder.stop();

      const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
      const endTime = Date.now() - startTimeRef.current;
      const startTime = chunkStartTimeRef.current - startTimeRef.current;

      if (audioBlob.size > 0) {
        sendChunk(audioBlob, chunkIndex, startTime, endTime);
        setChunkIndex(prev => prev + 1);
      }

      // Reset for next chunk
      chunksRef.current = [];
      chunkStartTimeRef.current = Date.now();

      // Restart recording
      mediaRecorder.start();
    }, chunkDurationMs);

    return () => clearInterval(interval);
  }, [isRecording, chunkIndex, chunkDurationMs, sendChunk]);

  // Auto-start/stop based on live status
  useEffect(() => {
    if (isLive && !isRecording) {
      startRecording();
    } else if (!isLive && isRecording) {
      stopRecording();
    }
  }, [isLive, isRecording, startRecording, stopRecording]);

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
