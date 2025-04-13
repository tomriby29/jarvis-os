import { useEffect, useRef, useState } from 'react';

export default function Home() {
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const inputRef = useRef(null);

  const handleTextSubmit = async () => {
    const query = inputRef.current.value;
    if (!query) return;
    setLoading(true);
    const res = await fetch('/api/jarvis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    const data = await res.json();
    setResponse(data.reply);
    setAudioUrl(data.audioUrl);
    setLoading(false);
  };

  const handleVoiceRecord = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mediaRecorder = new MediaRecorder(stream);
    const audioChunks = [];

    mediaRecorder.ondataavailable = (event) => {
      audioChunks.push(event.data);
    };

    mediaRecorder.onstop = async () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      const formData = new FormData();
      formData.append('audio', audioBlob,'recording.webm');

      setLoading(true);
      const res = await fetch('/api/jarvis', {
        method: 'POST',
        body: formData
      });
      const data = await res.json();
      setResponse(data.reply);
      setAudioUrl(data.audioUrl);
      setLoading(false);
    };

    mediaRecorder.start();
    setTimeout(() => mediaRecorder.stop(), 4000);
  };

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold mb-4">Jarvis OS</h1>

      <div className="w-full max-w-xl space-y-4">
        <input ref={inputRef} type="text" placeholder="Type something..." className="w-full p-3 rounded text-black" />
        <button onClick={handleTextSubmit} className="w-full bg-blue-600 py-2 rounded hover:bg-blue-700">
          Ask Jarvis
        </button>
        <button onClick={handleVoiceRecord} className="w-full bg-purple-600 py-2 rounded hover:bg-purple-700">
          Speak to Jarvis
        </button>

        {loading && <p className="text-center text-gray-400">Jarvis is thinking...</p>}

        {response && (
          <div className="bg-gray-800 p-4 rounded shadow">
            <p className="text-lg">{response}</p>
            {audioUrl && (
              <audio controls className="mt-2">
                <source src={audioUrl} type="audio/mpeg" />
              </audio>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
