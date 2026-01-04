'use client';

import { use, useEffect, useRef } from 'react';
import { useEvent, useChunks } from '@/hooks/useEvent';

export default function ViewerPage({ params }: { params: Promise<{ eventId: string }> }) {
  const { eventId } = use(params);
  const { event, loading: eventLoading } = useEvent(eventId);
  const { chunks, loading: chunksLoading } = useChunks(eventId);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new chunks arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [chunks.length]);

  if (eventLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-white text-2xl">Loading...</div>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="text-red-500 text-2xl">Event not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white flex flex-col">
      {/* Header */}
      <header className="p-4 border-b border-gray-800 flex justify-between items-center">
        <h1 className="text-xl font-semibold">{event.name}</h1>
        <div className="flex items-center gap-3">
          <span
            className={`w-3 h-3 rounded-full ${
              event.status === 'live' ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
            }`}
          />
          <span className="text-sm text-gray-400">
            {event.status === 'live' ? 'LIVE' : event.status.toUpperCase()}
          </span>
        </div>
      </header>

      {/* Captions Area */}
      <main
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-8"
      >
        {event.status === 'idle' && chunks.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 text-2xl">Waiting for event to start...</p>
          </div>
        )}

        {event.status === 'ended' && chunks.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 text-2xl">Event has ended</p>
          </div>
        )}

        {chunks.length > 0 && (
          <div className="max-w-4xl mx-auto space-y-6">
            {chunks.map((chunk, index) => (
              <div
                key={chunk.id}
                className={`transition-all duration-500 ${
                  index === chunks.length - 1
                    ? 'opacity-100 scale-100'
                    : 'opacity-60 scale-[0.98]'
                }`}
              >
                <p className="text-3xl md:text-4xl leading-relaxed">
                  {chunk.englishText}
                </p>
              </div>
            ))}
            {/* Scroll anchor */}
            <div className="h-4" />
          </div>
        )}

        {chunksLoading && chunks.length === 0 && (
          <div className="flex items-center justify-center h-full">
            <p className="text-gray-500 text-xl">Loading captions...</p>
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="p-4 border-t border-gray-800 text-center text-gray-500 text-sm">
        Live translation powered by AI
      </footer>
    </div>
  );
}
