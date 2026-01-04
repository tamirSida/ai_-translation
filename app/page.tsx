import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white">
      <main className="max-w-4xl mx-auto px-8 py-20">
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold mb-4">Live Translation</h1>
          <p className="text-xl text-gray-400">
            Real-time Hebrew to English translation for keynotes and presentations
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 mb-16">
          <Link
            href="/admin"
            className="block p-8 bg-gray-800 rounded-2xl hover:bg-gray-700 transition group"
          >
            <div className="text-3xl mb-4">Admin</div>
            <p className="text-gray-400 group-hover:text-gray-300">
              Create and manage translation events. Start/stop live sessions,
              edit glossary terms, and monitor transcriptions.
            </p>
            <div className="mt-4 text-blue-400 group-hover:text-blue-300">
              Go to Admin &rarr;
            </div>
          </Link>

          <div className="p-8 bg-gray-800/50 rounded-2xl border border-gray-700">
            <div className="text-3xl mb-4">Viewer</div>
            <p className="text-gray-400">
              Access live captions at <code className="text-sm bg-gray-700 px-2 py-1 rounded">/view/[eventId]</code>
            </p>
            <p className="mt-4 text-gray-500 text-sm">
              Get the viewer link from the admin panel after creating an event.
            </p>
          </div>
        </div>

        <div className="bg-gray-800/30 rounded-2xl p-8">
          <h2 className="text-2xl font-semibold mb-6">How it works</h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div>
              <div className="text-4xl mb-3">1</div>
              <h3 className="font-semibold mb-2">Create Event</h3>
              <p className="text-gray-400 text-sm">
                Admin creates a translation event and optionally adds glossary terms for consistent translations.
              </p>
            </div>
            <div>
              <div className="text-4xl mb-3">2</div>
              <h3 className="font-semibold mb-2">Go Live</h3>
              <p className="text-gray-400 text-sm">
                Speaker starts the event. Audio is recorded in 5-second chunks and sent for transcription.
              </p>
            </div>
            <div>
              <div className="text-4xl mb-3">3</div>
              <h3 className="font-semibold mb-2">View Captions</h3>
              <p className="text-gray-400 text-sm">
                Viewers see English captions appear in near real-time on the viewer page.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
