import { useState } from 'react';

export default function Home() {
  const [query, setQuery] = useState('');
  const [reply, setReply] = useState('');
  const [loading, setLoading] = useState(false);

  const askJarvis = async () => {
    setLoading(true);
    setReply('');
    try {
      const res = await fetch('/api/jarvis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, mode: 'general', name: 'Tom' })
      });
      const data = await res.json();
      setReply(data.summary || data.reply || JSON.stringify(data));
    } catch (err) {
      setReply('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: 20, fontFamily: 'sans-serif' }}>
      <h1>Jarvis OS</h1>
      <textarea rows={4} value={query} onChange={e => setQuery(e.target.value)} />
      <br />
      <button onClick={askJarvis} disabled={loading}>
        {loading ? 'Thinking...' : 'Ask Jarvis'}
      </button>
      <pre>{reply}</pre>
    </div>
  );
}
