document.addEventListener('DOMContentLoaded', () => {
  const input = document.getElementById('query');
  const askBtn = document.getElementById('ask');
  const output = document.getElementById('output');

  askBtn.addEventListener('click', async () => {
    const query = input.value;
    output.textContent = 'Jarvis is thinking...';

    try {
      const res = await fetch('/api/jarvis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Unknown error');

      output.textContent = data.reply || 'No response.';
      if (data.audioUrl) {
        const audio = new Audio(data.audioUrl);
        audio.play();
      }
    } catch (err) {
      console.error('Jarvis error:', err);
      output.textContent = `Jarvis ran into a problem: ${err.message}`;
    }
  });
});
