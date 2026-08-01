export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    // POST /api/chat -> forwards messages to Hugging Face Inference API
    if (url.pathname === '/api/chat' && request.method === 'POST') {
      try {
        const { messages = [], model = 'google/flan-t5-small' } = await request.json();
        const prompt = messagesToPrompt(messages);
        if (!env.HF_API_KEY) throw new Error('HF_API_KEY not set. Run: wrangler secret put HF_API_KEY');

        const hfResp = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${env.HF_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ inputs: prompt, options: { wait_for_model: true } })
        });

        const data = await hfResp.json();
        let reply = '';
        if (Array.isArray(data)) {
          reply = data[0]?.generated_text ?? JSON.stringify(data);
        } else if (data?.generated_text) {
          reply = data.generated_text;
        } else if (data?.error) {
          reply = `Hugging Face error: ${data.error}`;
        } else {
          reply = JSON.stringify(data);
        }

        return new Response(JSON.stringify({ reply }), { headers: { 'Content-Type': 'application/json' } });
      } catch (err) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500, headers: { 'Content-Type': 'application/json' } });
      }
    }

    // Serve a simple static UI at /
    if (url.pathname === '/' && request.method === 'GET') {
      return new Response(INDEX_HTML, { headers: { 'Content-Type': 'text/html' } });
    }

    return new Response('Not found', { status: 404 });
  }
};

function messagesToPrompt(messages) {
  return messages
    .map((m) => {
      if (m.role === 'system') return `[System]: ${m.content}`;
      if (m.role === 'assistant') return `[Assistant]: ${m.content}`;
      return `[User]: ${m.content}`;
    })
    .join('\n') + '\n[Assistant]:';
}

const INDEX_HTML = `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>AI Agent (Cloudflare Workers + Hugging Face)</title>
    <style>
      body{font-family: system-ui, -apple-system,Segoe UI, Roboto, Helvetica, Arial;max-width:800px;margin:24px auto;padding:0 16px}
      #messages{border:1px solid #ddd;padding:12px;height:400px;overflow:auto;background:#fafafa}
      .msg{margin-bottom:12px}
      .user{color:#0b63ce}
      .assistant{color:#333}
      textarea{width:100%;height:80px}
      button{padding:8px 12px}
    </style>
  </head>
  <body>
    <h1>AI Agent (free Cloud path)</h1>
    <div id="messages"></div>
    <div style="margin-top:12px">
      <textarea id="input" placeholder="Type a message..."></textarea>
      <div style="margin-top:8px"><button id="send">Send</button></div>
    </div>

    <script>
      const messagesEl = document.getElementById('messages');
      const inputEl = document.getElementById('input');
      const sendBtn = document.getElementById('send');

      function append(role, text){
        const d = document.createElement('div');
        d.className = 'msg ' + role;
        d.innerHTML = `<strong>${role}:</strong> ${text.replace(/\n/g, '<br/>')}`;
        messagesEl.appendChild(d);
        messagesEl.scrollTop = messagesEl.scrollHeight;
      }

      sendBtn.onclick = async () => {
        const text = inputEl.value.trim();
        if(!text) return;
        append('User', text);
        inputEl.value = '';
        append('Assistant','...');
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: {'Content-Type':'application/json'},
          body: JSON.stringify({ messages: [{role: 'user', content: text}] })
        });
        const data = await res.json();
        // remove the last '...' assistant placeholder
        const last = messagesEl.querySelectorAll('.assistant');
        if(last.length) last[last.length-1].remove();
        if(data?.reply) append('Assistant', data.reply);
        else append('Assistant', data?.error || 'No reply');
      };
    </script>
  </body>
</html>`;
