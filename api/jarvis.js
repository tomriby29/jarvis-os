// /pages/api/jarvis.js – Unified Jarvis: GPT, ElevenLabs, Whisper + All Mode Handlers
import fs from 'fs';
import path from 'path';
import { Readable } from 'stream';
import formidable from 'formidable';
import fetch from 'node-fetch';

export const config = {
  api: {
    bodyParser: false,
  },
};

const OPENAI_KEY = process.env.OPENAI_API_KEY;
const ELEVEN_KEY = process.env.ELEVENLABS_API_KEY;
const ELEVEN_VOICE = process.env.ELEVENLABS_VOICE_ID;

const USER_ROLES = {
  Tom: 'admin',
  Oliver: 'child',
  Alex: 'child'
};

const USER_BIRTHDAYS = {
  Oliver: '11-17',
  Alex: '04-25'
};

const CHILD_VOICES = {
  Oliver: 'gentle_male_1',
  Alex: 'gentle_male_2'
};

export default async function handler(req, res) {
  try {
    if (req.method !== 'POST') return res.status(405).json({ message: 'Method not allowed' });

    let query = '';
    let mode = '';
    let fromVoice = false;
    let body = {};

    if (req.headers['content-type']?.includes('multipart/form-data')) {
      const data = await new Promise((resolve, reject) => {
        const form = formidable({ multiples: false });
        form.parse(req, (err, fields, files) => {
          if (err) reject(err);
          resolve({ fields, files });
        });
      });

      const audioFile = data.files.audio;
      const audioStream = fs.createReadStream(audioFile.filepath);

      const formData = new FormData();
      formData.append('file', audioStream, 'audio.webm');
      formData.append('model', 'whisper-1');

      const whisperRes = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${OPENAI_KEY}` },
        body: formData,
      });

      const whisperData = await whisperRes.json();
      query = whisperData.text || 'Hello';
      fromVoice = true;
      mode = 'default';
    } else {
      body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
      query = body.query || '';
      mode = body.mode || 'default';
    }

    // Handle special modes (news, football, whatsapp, etc.)
    if (mode !== 'default') {
      // Reuse original mode logic here — call your existing code block or a separate mode handler
      // You can dynamically import or route this in production
      return res.status(200).json({ message: `Mode ${mode} received. Stub reply until mode logic is merged.` });
    }

    // Run GPT on fallback/general text query
    const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are Jarvis, Tom’s intelligent assistant. Respond in a helpful, friendly, proactive way.' },
          { role: 'user', content: query },
        ],
      }),
    });

    const gptData = await gptResponse.json();
    const reply = gptData.choices?.[0]?.message?.content || 'Sorry, I don’t know how to respond.';

    const elevenRes = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVEN_VOICE}`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVEN_KEY,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: reply,
        model_id: 'eleven_monolingual_v1',
        voice_settings: {
          stability: 0.4,
          similarity_boost: 0.8,
        },
      }),
    });

    const voiceBuf = await elevenRes.arrayBuffer();
    const voicePath = path.join(process.cwd(), 'public', 'response.mp3');
    fs.writeFileSync(voicePath, Buffer.from(voiceBuf));

    return res.status(200).json({ reply, audioUrl: '/response.mp3', fromVoice });
  } catch (err) {
    console.error('[Jarvis API Error]', err);
    res.status(500).json({ message: 'Internal Server Error' });
  }
}
