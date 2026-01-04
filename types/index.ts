export interface TranscriptionChunk {
  id: string;
  eventId: string;
  chunkIndex: number;
  hebrewText: string;
  englishText: string;
  startTime: number; // ms from event start
  endTime: number;
  createdAt: number;
}

export interface TranslationEvent {
  id: string;
  name: string;
  status: 'idle' | 'live' | 'ended';
  startedAt?: number;
  endedAt?: number;
  glossary: Record<string, string>; // Hebrew -> English term mapping
  createdAt: number;
}

export interface ProcessChunkRequest {
  eventId: string;
  chunkIndex: number;
  startTime: number;
  endTime: number;
  // Audio file sent as FormData
}

export interface ProcessChunkResponse {
  success: boolean;
  data?: TranscriptionChunk;
  error?: string;
}
