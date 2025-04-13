import { useState } from 'react';

export default function Home() {
  const [input, setInput] = useState('');
  const [reply, setReply] = useState('');
  const [thinking, setThinking] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);

  const askJarvis = async () => {
    if (!input.trim()) return;
    setThinking(true);
    setReply('Jarvis is thinking...');
    setAudioUrl(null);

    try {
      const res = await fetch('/api/jarvis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: input })
      });
      const data = await res.json();
      setReply(data.reply || 'No response.');
      if (data.audioUrl) setAudioUrl(data.audioUrl);
    } catch (err) {
      console.error('Jarvis error:', err);
      setReply('Something went wrong.');
    } finally {
      setThinking(false);
    }
  };

  return (
    <div style={{ padding: '2rem' }}>
      <h1>Jarvis OS</h1>
      <input value={input} onChange={(e) => setInput(e.target.value)} />
      <button onClick={askJarvis}>Ask</button>
      <p>{thinking ? 'Thinking...' : reply}</p>
      {audioUrl && <audio controls autoPlay src={audioUrl} />}
    </div>
  );
}