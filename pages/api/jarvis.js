// Jarvis API Handler – Unified GPT-Powered Intent Routing

const fs = require('fs');
const path = require('path');
const USER_ROLES = {
  Tom: 'admin',
  Oliver: 'child',
  Alex: 'child'
};

const memoryPath = path.join(__dirname, 'memory.json');
if (!fs.existsSync(memoryPath)) fs.writeFileSync(memoryPath, JSON.stringify([]));

export default async function handler(req, res) {
  const { query = '', name = 'Unknown', payload = {} } = req.body;
  const role = USER_ROLES[name] || 'guest';

  try {
    // STEP 1: Use GPT to classify intent
    const intentCheck = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: 'You are a classifier for a personal assistant. Given the user input, decide what function it is asking for.' },
          { role: 'user', content: `Input: ${query}\nClassify intent in one word from: news, football, week-summary, finance-summary, memory-log, memory-query, notion-meetings, email-summary, crm-summary, notion-journal, general.` }
        ]
      })
    });
    const intentResult = await intentCheck.json();
    const mode = intentResult.choices?.[0]?.message?.content?.trim().toLowerCase() || 'general';

    // Route to the right function
    switch (mode) {
      case 'news': {
        const news = await fetch(`https://gnews.io/api/v4/top-headlines?lang=en&country=de&token=${process.env.GNEWS_API_KEY}`);
        const data = await news.json();
        const headlines = data.articles.slice(0, 5).map(article => `📰 ${article.title} (${article.source.name})`).join('\n');
        return res.status(200).json({ summary: 'Top Local News:', headlines });
      }

      case 'football': {
        const matches = await fetch(`https://api-football-v1.p.rapidapi.com/v3/fixtures?league=78&season=2024`, {
          headers: {
            'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
            'X-RapidAPI-Host': 'api-football-v1.p.rapidapi.com'
          }
        });
        const data = await matches.json();
        const highlights = data.response.slice(0, 5).map(match => {
          const m = match.fixture;
          const home = match.teams.home.name;
          const away = match.teams.away.name;
          const score = `${match.goals.home} - ${match.goals.away}`;
          return `${home} ${score} ${away} (${new Date(m.date).toLocaleDateString()})`;
        }).join('\n');
        return res.status(200).json({ summary: 'Latest Football Scores:', highlights });
      }

      case 'week-summary':
      case 'finance-summary':
      case 'email-summary':
      case 'crm-summary':
      case 'notion-meetings':
      case 'notion-journal': {
        return res.status(200).json({ reply: `Stub for '${mode}' is active.` });
      }

      case 'memory-log': {
        const existing = JSON.parse(fs.readFileSync(memoryPath));
        existing.push({ time: Date.now(), text: query, name });
        fs.writeFileSync(memoryPath, JSON.stringify(existing, null, 2));
        return res.status(200).json({ reply: `Logged: "${query}"` });
      }

      case 'memory-query': {
        const memory = JSON.parse(fs.readFileSync(memoryPath));
        const memoryText = memory.map(m => `(${new Date(m.time).toLocaleString()}) ${m.name}: ${m.text}`).join('\n');
        const result = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4',
            messages: [
              { role: 'system', content: 'You are an assistant reviewing a user\'s memory log to retrieve insights or answers.' },
              { role: 'user', content: `Here are the logs:\n${memoryText}\n\nQuestion: ${query}` }
            ]
          })
        });
        const parsed = await result.json();
        return res.status(200).json({ reply: parsed.choices[0].message.content });
      }

      default: {
        const fallback = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4',
            messages: [
              { role: 'system', content: `You are Jarvis, a helpful and witty personal assistant for ${name} (role: ${role}). You speak informally and offer suggestions. You are capable of remembering patterns, giving creative help, and patching systems.` },
              { role: 'user', content: query }
            ]
          })
        });
        const response = await fallback.json();
        return res.status(200).json({ reply: response.choices[0].message.content });
      }
    }
  } catch (err) {
    console.error('Jarvis handler failed:', err);
    return res.status(500).json({ error: 'Jarvis internal failure' });
  }
}

