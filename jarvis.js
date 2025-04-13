import fs from 'fs';
import path from 'path';
import formidable from 'formidable';

export const config = {
  api: { bodyParser: false }
};

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

    let body = '';
    if (req.headers['content-type']?.includes('application/json')) {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    }

    const query = body.query || 'Hello, Jarvis here.';
    const reply = `Jarvis received: "${query}"`;

    // Mock audio reply file path
    const audioPath = path.join(process.cwd(), 'public', 'response.mp3');
    fs.writeFileSync(audioPath, Buffer.from([])); // empty audio for placeholder

    res.status(200).json({ reply, audioUrl: '/response.mp3' });

  } catch (err) {
    console.error('[Jarvis API Error]', err);
    res.status(500).json({ message: 'Internal Server Error', detail: err.message });
  }
}
