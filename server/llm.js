/* NVIDIA NIM chat completions (OpenAI compatible), streamed.
   Yields answer text only: reasoning fields and <think> blocks are dropped. */
'use strict';

const ENDPOINT = process.env.NIM_BASE_URL || 'https://integrate.api.nvidia.com/v1';
const THINKING = Symbol('thinking');
// Fastest model that still follows the answer format (see server/README.md).
const MODEL = process.env.NIM_MODEL || 'nvidia/nemotron-3-ultra-550b-a55b';
// Used when the main model is overloaded or silent.
const FALLBACK = process.env.NIM_FALLBACK_MODEL ?? 'minimaxai/minimax-m3.1-flash';

async function* chat(messages, { signal, model = MODEL, maxTokens = Number(process.env.NIM_MAX_TOKENS || 12000), temperature = 0.5 } = {}) {
  const key = process.env.NVIDIA_API_KEY;
  if (!key) throw Object.assign(new Error('NVIDIA_API_KEY is not set'), { code: 'no_key' });
  const res = await fetch(`${ENDPOINT}/chat/completions`, {
    method: 'POST',
    signal,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Accept: 'text/event-stream'
    },
    body: JSON.stringify({
      model, messages, max_tokens: maxTokens, temperature, top_p: 0.95, stream: true,
      // Hybrid reasoning models answer straight away with thinking off.
      chat_template_kwargs: { thinking: false, enable_thinking: false }
    })
  });
  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => '');
    // Never echo request headers; the body from NIM holds no secrets.
    throw Object.assign(new Error(`LLM ${res.status}: ${detail.slice(0, 300)}`), { code: 'upstream', status: res.status });
  }
  const decoder = new TextDecoder();
  let buf = '';
  let inThink = false;
  let pending = '';
  for await (const chunk of res.body) {
    buf += decoder.decode(chunk, { stream: true });
    let nl;
    while ((nl = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, nl).trim();
      buf = buf.slice(nl + 1);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') return;
      let json;
      try { json = JSON.parse(data); } catch { continue; }
      const delta = json.choices?.[0]?.delta || {};
      // Reasoning is never shown, only signalled, so the page can say the
      // model is thinking instead of looking stalled.
      if (delta.reasoning_content || delta.reasoning) { yield THINKING; continue; }
      const text = delta.content;
      if (!text) continue;
      // Strip <think>...</think> even when the tags are split across chunks.
      pending += text;
      let out = '';
      for (;;) {
        if (inThink) {
          const end = pending.indexOf('</think>');
          if (end < 0) { pending = pending.slice(-8); break; }
          pending = pending.slice(end + 8);
          inThink = false;
        } else {
          const start = pending.indexOf('<think>');
          if (start >= 0) { out += pending.slice(0, start); pending = pending.slice(start + 7); inThink = true; continue; }
          const lt = pending.lastIndexOf('<');
          if (lt >= 0 && pending.length - lt < 7 && '<think>'.startsWith(pending.slice(lt))) {
            out += pending.slice(0, lt); pending = pending.slice(lt);
          } else { out += pending; pending = ''; }
          break;
        }
      }
      if (out) yield out;
    }
  }
  if (!inThink && pending) yield pending;
}

module.exports = { chat, MODEL, FALLBACK, THINKING };
