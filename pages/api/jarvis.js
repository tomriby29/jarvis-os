export default async function handler(req, res) {
  const { mode, query, name = 'Unknown' } = req.body;

  if (!mode) return res.status(400).json({ error: 'Missing mode' });

  try {
    if (mode === 'news') {
      const news = await fetch(`https://gnews.io/api/v4/top-headlines?lang=en&country=de&token=${process.env.GNEWS_API_KEY}`);
      const data = await news.json();
      const headlines = data.articles.slice(0, 5).map(article => `📰 ${article.title} (${article.source.name})`).join('\n');
      return res.status(200).json({ summary: 'Top Local News:', headlines });
    }

    if (mode === 'football') {
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

    if (mode === 'week-summary') {
      const summary = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: 'You summarize weekly activity reports for an executive.' },
            { role: 'user', content: 'Analyze my logs and prepare a summary of this week in work, habits, finances, and social activity.' }
          ]
        })
      });
      const result = await summary.json();
      return res.status(200).json({ summary: result.choices[0].message.content });
    }

    return res.status(400).json({ error: 'Unknown mode' });
  } catch (err) {
    console.error('Jarvis handler failed:', err);
    return res.status(500).json({ error: 'Jarvis internal failure' });
  }
}
