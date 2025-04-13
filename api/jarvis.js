// Jarvis Expansion Hooks
// Connects to News, Football Scores, WhatsApp & Social Context

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

// Imported for real-time voice enhancement

export default async function handler(req, res) {
  const { mode, query, name = 'Unknown' } = req.body;
  const role = USER_ROLES[name] || 'guest';

  if (!mode) return res.status(400).json({ error: 'Missing mode (news, football, whatsapp, birthday-card, reservation-call)' });

  try {
    if (mode === 'news') {
      const news = await fetch(`https://gnews.io/api/v4/top-headlines?lang=en&country=de&token=${process.env.GNEWS_API_KEY}`);
      const data = await news.json();
      const headlines = data.articles.slice(0, 5).map(article => `📰 ${article.title} (${article.source.name})`).join('
');
      return res.status(200).json({ summary: 'Top Local News:', headlines });
    }
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
      }).join('
');
      return res.status(200).json({ summary: 'Latest Football Scores:', highlights });
    }
    }

    if (mode === 'whatsapp') {

    // Incoming WhatsApp webhook simulation
    if (req.headers['x-twilio-signature'] || req.body.From) {
      const from = req.body.From || 'unknown';
      const body = req.body.Body || 'No content';

      try {
        await fetch(`${process.env.NOTION_API_URL}/v1/pages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.NOTION_API_KEY}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            parent: { database_id: process.env.NOTION_SOCIAL_DB_ID },
            properties: {
              Name: { title: [{ text: { content: `Incoming WhatsApp from ${from}` } }] },
              Date: { date: { start: new Date().toISOString() } },
              Summary: { rich_text: [{ text: { content: body } }] },
              Person: { rich_text: [{ text: { content: from } }] },
              Tags: { multi_select: [{ name: 'whatsapp' }, { name: 'incoming' }] }
            }
          })
        });
      } catch (err) {
        console.error('Failed to log incoming WhatsApp message:', err);
      }

      return res.status(200).json({ message: 'WhatsApp message received', from, body });
    }
      // This section assumes use of Twilio for WhatsApp messaging
      const message = query || 'Reminder: Follow up with Jane about her birthday dinner tomorrow.';
      const personMatch = message.match(/with ([A-Z][a-z]+)/);
      const person = personMatch ? personMatch[1] : 'Unknown';

      // Send message
      await fetch('https://api.twilio.com/2010-04-01/Accounts/' + process.env.TWILIO_ACCOUNT_SID + '/Messages.json', {
        method: 'POST',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64'),
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams({
          From: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
          To: `whatsapp:${process.env.MY_WHATSAPP_NUMBER}`,
          Body: message
        })
      });

      // Log to Notion memory for people/context
      try {
        await fetch(`${process.env.NOTION_API_URL}/v1/pages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.NOTION_API_KEY}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            parent: { database_id: process.env.NOTION_SOCIAL_DB_ID },
            properties: {
              Name: { title: [{ text: { content: `WhatsApp Message - ${new Date().toLocaleDateString()}` } }] },
              Date: { date: { start: new Date().toISOString() } },
              Summary: { rich_text: [{ text: { content: message } }] },
              Person: { rich_text: [{ text: { content: person } }] },
              Tags: { multi_select: [{ name: 'whatsapp' }, { name: 'outgoing' }] }
            }
          })
        });
      } catch (err) {
        console.error('Failed to log WhatsApp message to Notion:', err);
      }

      return res.status(200).json({ message: 'WhatsApp message sent by Jarvis', content: message });
    }

    // Weekly Notion log for summary if provided
    if (query && (mode === 'news' || mode === 'football')) {
      try {
        await fetch(`${process.env.NOTION_API_URL}/v1/pages`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.NOTION_API_KEY}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            parent: { database_id: process.env.NOTION_SOCIAL_DB_ID },
            properties: {
              Name: { title: [{ text: { content: `Weekly ${mode.toUpperCase()} Summary - ${new Date().toLocaleDateString()}` } }] },
              Date: { date: { start: new Date().toISOString() } },
              Summary: { rich_text: [{ text: { content: query.slice(0, 2000) } }] }
            }
          })
        });
      } catch (e) {
        console.error('Failed to log weekly social summary to Notion:', e);
      }
    }

    if (mode === 'query-social') {
      if (!query) return res.status(400).json({ error: 'Missing person name to search' });
      try {
        const search = await fetch(`${process.env.NOTION_API_URL}/v1/databases/${process.env.NOTION_SOCIAL_DB_ID}/query`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.NOTION_API_KEY}`,
            'Notion-Version': '2022-06-28',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            filter: {
              property: 'Person',
              rich_text: {
                contains: query
              }
            },
            sorts: [{ property: 'Date', direction: 'descending' }]
          })
        });
        const result = await search.json();
        const messages = result.results.map(p => {
          const name = p.properties?.Name?.title?.[0]?.text?.content || 'Untitled';
          const summary = p.properties?.Summary?.rich_text?.[0]?.text?.content || '';
          const date = p.properties?.Date?.date?.start || '';
          return `🗓 ${date} — ${name}: ${summary}`;
        });
        return res.status(200).json({ history: messages });
      } catch (err) {
        console.error('Social memory query failed:', err);
        return res.status(500).json({ error: 'Failed to query social memory' });
      }
    }

    if (mode === 'birthday-card') {
      const { name, address, message } = req.body;
      try {
        const orderResponse = await fetch('https://moonpig.com/api/card-order', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.MOONPIG_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            recipient_name: name,
            delivery_address: address,
            card_message: message || `Happy Birthday, ${name}! - From Jarvis`
          })
        });
        const result = await orderResponse.json();
        return res.status(200).json({ message: 'Card order placed via Moonpig', confirmation: result });
      } catch (err) {
        console.error('Moonpig card order failed:', err);
        return res.status(500).json({ error: 'Failed to place birthday card order' });
      }
    }

    if (mode === 'reservation-call') {
      const { phone, lang, script } = req.body;
      try {
        const voice = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${process.env.ELEVENLABS_VOICE_ID}`, {
          method: 'POST',
          headers: {
            'xi-api-key': process.env.ELEVENLABS_API_KEY,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            text: script,
            voice_settings: { stability: 0.3, similarity_boost: 0.8 }
          })
        });
        const audio = await voice.arrayBuffer();

        await fetch(`https://api.twilio.com/2010-04-01/Accounts/${process.env.TWILIO_ACCOUNT_SID}/Calls.json`, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + Buffer.from(`${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`).toString('base64'),
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: new URLSearchParams({
            To: phone,
            From: process.env.TWILIO_CALLER_ID,
            Url: process.env.JARVIS_CALL_MP3_HOST + '/playback.xml' // This should point to an XML that plays audio
          })
        });

        return res.status(200).json({ message: 'Jarvis is placing the call with voice playback.' });
      } catch (err) {
        console.error('Voice call failed:', err);
        return res.status(500).json({ error: 'Reservation voice call failed' });
      }
    }

    if (mode === 'email-draft') {
      const { subject, body } = req.body;
      try {
        const draft = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4',
            messages: [
              { role: 'system', content: 'You are a helpful assistant writing professional email drafts.' },
              { role: 'user', content: `Subject: ${subject}
Body context: ${body}` }
            ]
          })
        });
        const result = await draft.json();
        const reply = result.choices[0].message.content;
        return res.status(200).json({ draft: reply });
      } catch (err) {
        console.error('Email draft error:', err);
        return res.status(500).json({ error: 'Email drafting failed' });
      }
    }

    if (mode === 'gift-idea') {
      const { recipient, occasion, interests } = req.body;
      try {
        const giftIdeas = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4',
            messages: [
              { role: 'system', content: 'You are an expert gift advisor.' },
              { role: 'user', content: `Suggest thoughtful, creative gifts for ${recipient} for ${occasion}. They are interested in: ${interests}` }
            ]
          })
        });
        const result = await giftIdeas.json();
        return res.status(200).json({ ideas: result.choices[0].message.content });
      } catch (err) {
        console.error('Gift suggestion error:', err);
        return res.status(500).json({ error: 'Failed to generate gift ideas' });
      }
    }

    if (mode === 'travel-plan') {
      const { destination, duration, preferences } = req.body;
      try {
        const plan = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4',
            messages: [
              { role: 'system', content: 'You are a high-end travel planner.' },
              { role: 'user', content: `Plan a ${duration}-day trip to ${destination} with preferences: ${preferences}` }
            ]
          })
        });
        const result = await plan.json();
        return res.status(200).json({ itinerary: result.choices[0].message.content });
      } catch (err) {
        console.error('Travel planning error:', err);
        return res.status(500).json({ error: 'Failed to generate travel plan' });
      }
    }

    if (mode === 'week-summary') {
      try {
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
      } catch (err) {
        console.error('Week summary failed:', err);
        return res.status(500).json({ error: 'Failed to generate weekly summary' });
      }
    }

    if (mode === 'patch-code') {
      const { filename, patchCode, reason } = req.body;
      try {
        await fetch(`https://api.github.com/repos/${process.env.GITHUB_REPO_OWNER}/${process.env.GITHUB_REPO_NAME}/contents/${filename}`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
            'Accept': 'application/vnd.github.v3+json'
          }
        }).then(res => res.json()).then(async file => {
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
        });

        return res.status(200).json({ message: `Patched ${filename} on GitHub with reason: ${reason}` });
      } catch (err) {
        console.error('Auto-patch failed:', err);
        return res.status(500).json({ error: 'Failed to patch file on GitHub' });
      }
    }

    if (mode === 'finance-summary') {
      try {
        const summary = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4',
            messages: [
              { role: 'system', content: 'You are a financial analyst assistant helping users reflect on their recent spending, investments, and financial decisions.' },
              { role: 'user', content: 'Review my recent expenses, subscriptions, and investment movements. Provide trends, warnings, and suggestions.' }
            ]
          })
        });
        const result = await summary.json();
        return res.status(200).json({ summary: result.choices[0].message.content });
      } catch (err) {
        console.error('Finance summary failed:', err);
        return res.status(500).json({ error: 'Failed to generate financial insight' });
      }
    }

    if (mode === 'real-time-transcription') {
      // Example placeholder: Real-time transcription logic via Whisper API
      // In a real-time voice frontend, this would stream audio and return transcripts progressively
      return res.status(200).json({ message: 'Voice transcription placeholder activated.' });
    }

    if (mode === 'spotify-now-playing') {
      try {
        const response = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
          headers: {
            'Authorization': `Bearer ${process.env.SPOTIFY_ACCESS_TOKEN}`
          }
        });

        if (response.status === 204) {
          return res.status(200).json({ track: 'No song currently playing.' });
        }

        const data = await response.json();
        const track = `${data.item.name} by ${data.item.artists.map(a => a.name).join(', ')}`;
        return res.status(200).json({ track });
      } catch (err) {
        console.error('Spotify now playing fetch failed:', err);
        return res.status(500).json({ error: 'Failed to fetch currently playing track' });
      }
    }

    if (mode === 'karray-project') {
      const { roomType, size, useCase, budget } = req.body;
      try {
        const project = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model: 'gpt-4',
            messages: [
              { role: 'system', content: 'You are an expert in pro audio systems, especially K-array. Based on the use case and room info, generate a professional proposal including suitable products from the K-framework, acoustic advice, and a rough simulation concept.' },
              { role: 'user', content: `Room Type: ${roomType}
Size: ${size}
Use Case: ${useCase}
Budget: ${budget}` }
            ]
          })
        });
        const result = await project.json();
        return res.status(200).json({ proposal: result.choices[0].message.content });
      } catch (err) {
        console.error('K-array project generation failed:', err);
        return res.status(500).json({ error: 'Failed to generate K-array project' });
      }
    }

    return res.status(400).json({ error: 'Unknown mode' });
  } catch (err) {
    console.error('Jarvis social context hook failed:', err);
    return res.status(500).json({ error: 'Jarvis failed to fetch context' });
  }
}
