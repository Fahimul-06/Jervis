const tools = [
  ['system.status','Read CPU, memory, disk, battery, temperature and network status',{}],
  ['screen.capture','Capture a screenshot',{}],
  ['app.open','Open an application, file, folder or URL',{target:'string'}],
  ['process.list','List running processes',{}],
  ['process.kill','Terminate a process',{name:'string'}],
  ['file.list','List files in an allowed directory',{path:'string'}],
  ['file.read','Read an allowed text file',{path:'string'}],
  ['file.write','Write an allowed text file',{path:'string',content:'string'}],
  ['file.move','Move an allowed file',{source:'string',destination:'string'}],
  ['file.delete','Delete an allowed file',{path:'string'}],
  ['clipboard.read','Read clipboard text',{}],
  ['clipboard.write','Write clipboard text',{text:'string'}],
  ['audio.volume','Set volume percentage',{percent:'number'}],
  ['audio.mute','Mute or unmute audio',{mute:'boolean'}],
  ['power.lock','Lock the computer',{}],
  ['power.sleep','Put the computer to sleep',{}],
  ['power.restart','Restart the computer',{}],
  ['power.shutdown','Shut down the computer',{}],
];
const risky = new Set(['file.delete','file.move','file.write','process.kill','power.shutdown','power.restart','power.sleep']);
const systemPrompt = `You are the command planner for JERVIS. Select at most one tool. Return ONLY JSON: {"matched":boolean,"tool":string|null,"args":object,"response":string}. Never invent a tool. If the request is conversational or ambiguous, matched=false. Available tools:\n${tools.map(([n,d,s])=>`${n}: ${d}; args ${JSON.stringify(s)}`).join('\n')}`;

function normalize(obj) {
  if (!obj || !obj.matched || !tools.some(([name]) => name === obj.tool)) return { matched: false, response: obj?.response || 'I could not map that request to a device action.' };
  return { matched: true, tool: obj.tool, args: obj.args || {}, response: obj.response || `Prepared ${obj.tool}.`, riskLevel: risky.has(obj.tool) ? 'destructive' : ['app.open','screen.capture','audio.volume','audio.mute','power.lock','clipboard.read','clipboard.write'].includes(obj.tool) ? 'moderate' : 'safe', requiresConfirmation: risky.has(obj.tool) };
}
function parseJson(text) { const m = String(text).match(/\{[\s\S]*\}/); if (!m) return null; try { return JSON.parse(m[0]); } catch { return null; } }

export async function planWithLLM(text) {
  const provider = (process.env.LLM_PROVIDER || 'none').toLowerCase();
  const model = process.env.LLM_MODEL;
  if (provider === 'none') return null;
  let response;
  if (provider === 'openai') {
    response = await fetch(process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1/responses', { method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.OPENAI_API_KEY}`}, body:JSON.stringify({ model: model || 'gpt-4.1-mini', instructions: systemPrompt, input: text }) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error?.message || 'OpenAI request failed');
    return normalize(parseJson(data.output_text || data.output?.flatMap(x=>x.content||[]).map(x=>x.text||'').join('')));
  }
  if (provider === 'anthropic') {
    response = await fetch(process.env.ANTHROPIC_BASE_URL || 'https://api.anthropic.com/v1/messages', { method:'POST', headers:{'Content-Type':'application/json','x-api-key':process.env.ANTHROPIC_API_KEY,'anthropic-version':'2023-06-01'}, body:JSON.stringify({ model:model || 'claude-sonnet-4-20250514', max_tokens:500, system:systemPrompt, messages:[{role:'user',content:text}] }) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error?.message || 'Anthropic request failed');
    return normalize(parseJson(data.content?.map(x=>x.text||'').join('')));
  }
  if (provider === 'gemini') {
    const base = process.env.GEMINI_BASE_URL || 'https://generativelanguage.googleapis.com/v1beta';
    response = await fetch(`${base}/models/${model || 'gemini-2.5-flash'}:generateContent?key=${encodeURIComponent(process.env.GEMINI_API_KEY || '')}`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ system_instruction:{parts:[{text:systemPrompt}]}, contents:[{role:'user',parts:[{text}]}], generationConfig:{responseMimeType:'application/json'} }) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error?.message || 'Gemini request failed');
    return normalize(parseJson(data.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('')));
  }
  if (provider === 'ollama') {
    response = await fetch(`${process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434'}/api/chat`, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ model:model || 'llama3.2', stream:false, format:'json', messages:[{role:'system',content:systemPrompt},{role:'user',content:text}] }) });
    const data = await response.json(); if (!response.ok) throw new Error(data.error || 'Ollama request failed');
    return normalize(parseJson(data.message?.content));
  }
  throw new Error(`Unsupported LLM_PROVIDER: ${provider}`);
}
