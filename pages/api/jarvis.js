const USER_ROLES = {
  Tom: 'admin',
  Oliver: 'child',
  Alex: 'child'
};

export default async function handler(req, res) {
  const { mode = 'general', query = '', name = 'Unknown' } = req.body;
  const role = USER_ROLES[name] || 'guest';

  try {
    // 🧠 Specialized Modes
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

    if (mode === 'patch-code') {
      const { filename, patchCode, reason } = req.body;
      try {
        const file = await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPO_OWNER}/${process.env.GITHUB_REPO_NAME}/contents/${filename}`, {
          headers: {
            'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }).then(r => r.json());

        const updatedContent = Buffer.from(patchCode).toString('base64');

        await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPO_OWNER}/${process.env.GITHUB_REPO_NAME}/contents/${filename}`, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json'
          },
          body: JSON.stringify({
            message: reason || 'Auto-patch by Jarvis',
            content: updatedContent,
            sha: file.sha
          })
        });

        return res.status(200).json({ message: `Patched ${filename} on GitHub with reason: ${reason}` });
      } catch (err) {
        console.error('Auto-patch failed:', err);
        return res.status(500).json({ error: 'Failed to patch file on GitHub' });
      }
    }

    if (mode === 'finance-summary') {
      const summary = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            { role: 'system', content: 'You are a financial analyst assistant helping users reflect on recent spending, subscriptions, and investments.' },
            { role: 'user', content: 'Review my financial trends and give advice.' }
          ]
        })
      });
      const result = await summary.json();
      return res.status(200).json({ summary: result.choices[0].message.content });
    }

    // 🧠 Fallback to GPT as a general assistant with memory and personality
    const fallback = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: `You are Jarvis, a helpful and witty personal assistant for ${name} (role: ${role}). You speak informally and offer suggestions when appropriate. You are capable of remembering patterns, giving creative help, and patching systems.` },
          { role: 'user', content: query }
        ]
      })
    });
    const response = await fallback.json();
    return res.status(200).json({ reply: response.choices[0].message.content });

  } catch (err) {
    console.error('Jarvis handler failed:', err);
    return res.status(500).json({ error: 'Jarvis internal failure' });
  }
}

  } catch (err) {
    console.error('Jarvis handler failed:', err);
    return res.status(500).json({ error: 'Jarvis internal failure' });
  }
}
