// /pages/api/jarvis.js – Full Jarvis OS + Memory Recall + Summary + Child Awareness
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
const NOTION_API_KEY = process.env.NOTION_API_KEY;
const NOTION_MEMORY_DB_ID = process.env.NOTION_MEMORY_DB_ID;

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

async function saveToNotionMemory(content) {
  return await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${NOTION_API_KEY}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28'
    },
    body: JSON.stringify({
      parent: { database_id: NOTION_MEMORY_DB_ID },
      properties: {
        Name: { title: [{ text: { content: content.slice(0, 50) } }] },
        Tags: { multi_select: [{ name: 'journal' }] },
      },
      children: [{ object: 'block', type: 'paragraph', paragraph: { text: [{ type: 'text', text: { content } }] } }]
    })
  });
}

async function queryMemoryFromNotion(prompt) {
  const res = await fetch(`https://api.openai.com/v1/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${OPENAI_KEY}`,
    },
    body: JSON.stringify({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'Summarize or find relevant memory based on prompt.' },
        { role: 'user', content: prompt }
      ]
    })
  });
  const json = await res.json();
  return json.choices?.[0]?.message?.content || 'Nothing found.';
}

async function handleMode(mode, query) {
  switch (mode) {
    case 'spotify':
      return { reply: 'You are currently listening to Imagine Dragons – Believer 🎵' };
    case 'birthday':
      return { reply: 'Alex’s birthday is April 25th. Would you like me to send a card or plan something?' };
    case 'summary':
      return { reply: await queryMemoryFromNotion('Summarize this week’s memory log.') };
    case 'finance':
      return { reply: 'Your budget is balanced. You saved 12% this month over last month.' };
    case 'notion.memory':
      await saveToNotionMemory(query);
      return { reply: 'Memory stored successfully in Notion.' };
    case 'recall.memory':
      return { reply: await queryMemoryFromNotion(`Find memory related to: ${query}`) };
    case 'reasoning.memory':
      return { reply: await queryMemoryFromNotion(`Reflect on these thoughts: ${query}. Are there contradictions, important tasks, or repeated needs?`) };
    case 'patch.myself':
      return { reply: await queryMemoryFromNotion(`Based on recent interactions and capabilities, suggest code or logic improvements Jarvis should apply:`) };

      return null;
  }
}

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
if (!audioFile || !audioFile.filepath) {
  return res.status(400).json({ message: 'No audio file uploaded.' });
}

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

    const modeResult = await handleMode(mode, query);
    if (modeResult) return res.status(200).json({ ...modeResult, fromVoice });

    const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_KEY}`,
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are Jarvis, Tom’s intelligent assistant. Be helpful, kind to children, and respectful of user memory and context.' },
          { role: 'user', content: query },
        ],
      }),
    });

    const gptData = await gptResponse.json();
    const reply = gptData.choices?.[0]?.message?.content || 'Sorry, I don’t know how to respond.';

    await saveToNotionMemory(`Q: ${query}\nA: ${reply}`);

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

