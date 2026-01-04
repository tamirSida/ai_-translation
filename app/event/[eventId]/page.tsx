'use client';

import { useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useEvent, useChunks } from '@/hooks/useEvent';
import { AudioRecorder } from '@/components/AudioRecorder';

export default function EventPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params);
  const { user, loading: authLoading } = useAuth();
  const { event, loading: eventLoading, updateStatus, updateGlossary } = useEvent(eventId);
  const { chunks } = useChunks(eventId);
  const router = useRouter();

  const [glossaryInput, setGlossaryInput] = useState('');
  const [showGlossaryModal, setShowGlossaryModal] = useState(false);
  const [chunkDuration, setChunkDuration] = useState(5); // seconds

  if (authLoading || eventLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    router.push('/admin');
    return null;
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-red-500">Event not found</div>
      </div>
    );
  }

  const handleStatusChange = async (newStatus: 'live' | 'ended' | 'idle') => {
    try {
      await updateStatus(newStatus);
    } catch (err) {
      console.error('Failed to update status:', err);
    }
  };

  const handleGlossarySave = async () => {
    try {
      // Parse glossary input (format: "hebrew=english" per line)
      const glossary: Record<string, string> = {};
      glossaryInput.split('\n').forEach(line => {
        const [he, en] = line.split('=').map(s => s.trim());
        if (he && en) {
          glossary[he] = en;
        }
      });

      await updateGlossary(glossary);
      setShowGlossaryModal(false);
    } catch (err) {
      console.error('Failed to update glossary:', err);
    }
  };

  const viewerUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/view/${eventId}`
    : '';

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <button
              onClick={() => router.push('/admin')}
              className="text-blue-600 hover:underline mb-2"
            >
              &larr; Back to Events
            </button>
            <h1 className="text-3xl font-bold">{event.name}</h1>
          </div>
          <span
            className={`px-4 py-2 rounded-full text-sm font-medium ${
              event.status === 'live'
                ? 'bg-green-100 text-green-800'
                : event.status === 'ended'
                ? 'bg-gray-100 text-gray-800'
                : 'bg-yellow-100 text-yellow-800'
            }`}
          >
            {event.status.toUpperCase()}
          </span>
        </div>

        {/* Controls */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <h2 className="text-lg font-semibold mb-4">Event Controls</h2>
          <div className="flex gap-4 flex-wrap">
            {event.status === 'idle' && (
              <button
                onClick={() => handleStatusChange('live')}
                className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
              >
                Start Live
              </button>
            )}
            {event.status === 'live' && (
              <button
                onClick={() => handleStatusChange('ended')}
                className="bg-red-600 text-white px-6 py-2 rounded-lg hover:bg-red-700 transition"
              >
                End Event
              </button>
            )}
            {event.status === 'ended' && (
              <button
                onClick={() => handleStatusChange('idle')}
                className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
              >
                Reset to Idle
              </button>
            )}
            <button
              onClick={() => {
                const currentGlossary = Object.entries(event.glossary || {})
                  .map(([he, en]) => `${he}=${en}`)
                  .join('\n');
                setGlossaryInput(currentGlossary);
                setShowGlossaryModal(true);
              }}
              className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition"
            >
              Edit Glossary
            </button>
          </div>
        </div>

        {/* Viewer Link */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <h2 className="text-lg font-semibold mb-2">Viewer Link</h2>
          <p className="text-gray-500 text-sm mb-2">Share this link with viewers:</p>
          <div className="flex gap-2">
            <input
              type="text"
              value={viewerUrl}
              readOnly
              className="flex-1 px-3 py-2 border rounded-lg bg-gray-50"
            />
            <button
              onClick={() => navigator.clipboard.writeText(viewerUrl)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
            >
              Copy
            </button>
          </div>
        </div>

        {/* Audio Recorder */}
        <div className="bg-white p-6 rounded-lg shadow-sm mb-6">
          <h2 className="text-lg font-semibold mb-4">Audio Recorder</h2>

          {/* Chunk Duration Control */}
          <div className="mb-4 flex items-center gap-4">
            <label className="text-sm text-gray-600">Chunk Duration:</label>
            <div className="flex items-center gap-2">
              <input
                type="range"
                min="3"
                max="15"
                value={chunkDuration}
                onChange={(e) => setChunkDuration(Number(e.target.value))}
                disabled={event.status === 'live'}
                className="w-32"
              />
              <span className="text-sm font-medium w-12">{chunkDuration}s</span>
            </div>
            {event.status === 'live' && (
              <span className="text-xs text-gray-400">(locked during live)</span>
            )}
          </div>

          <AudioRecorder
            eventId={eventId}
            isLive={event.status === 'live'}
            chunkDurationMs={chunkDuration * 1000}
            onChunkSent={(index) => console.log(`Chunk ${index} sent`)}
            onError={(error) => console.error('Recorder error:', error)}
          />
        </div>

        {/* Live Preview */}
        <div className="bg-white p-6 rounded-lg shadow-sm">
          <h2 className="text-lg font-semibold mb-4">
            Live Preview ({chunks.length} chunks)
          </h2>
          <div className="space-y-4 max-h-96 overflow-y-auto">
            {chunks.length === 0 ? (
              <p className="text-gray-500">No transcriptions yet...</p>
            ) : (
              chunks.map((chunk) => (
                <div key={chunk.id} className="border-b pb-4">
                  <div className="text-sm text-gray-400 mb-1">
                    Chunk {chunk.chunkIndex}
                  </div>
                  <div className="text-gray-600 text-sm mb-1" dir="rtl">
                    {chunk.hebrewText}
                  </div>
                  <div className="text-lg">
                    {chunk.englishText}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Glossary Modal */}
        {showGlossaryModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-6 rounded-lg w-full max-w-md">
              <h2 className="text-xl font-bold mb-4">Edit Glossary</h2>
              <p className="text-gray-500 text-sm mb-4">
                One term per line, format: hebrew=english
              </p>
              <textarea
                value={glossaryInput}
                onChange={(e) => setGlossaryInput(e.target.value)}
                placeholder="שלום=Hello&#10;תודה=Thank you"
                className="w-full px-3 py-2 border rounded-lg mb-4 h-40 font-mono text-sm"
              />
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowGlossaryModal(false)}
                  className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGlossarySave}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
