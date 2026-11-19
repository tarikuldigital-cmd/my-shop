/*
 * Voice order agent — a live spoken conversation with Google Gemini Live.
 * The browser gets a one-use token from our server (the API key stays on the server),
 * streams the microphone as 16 kHz PCM and plays the AI's 24 kHz voice.
 * The AI fills the checkout through function calls (fill_checkout, read_order, confirm_order).
 */
import { API_BASE_URL } from '../config/env'

const WS = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContentConstrained'

const TOOLS = [{
  functionDeclarations: [
    {
      name: 'fill_checkout',
      description: 'Write what the customer said into the order form. Send only the fields you are sure about.',
      parameters: {
        type: 'OBJECT',
        properties: {
          name: { type: 'STRING', description: "Customer's name, in the script they used" },
          phone: { type: 'STRING', description: 'Bangladeshi mobile number as 11 English digits starting with 01' },
          address: { type: 'STRING', description: 'Full delivery address: house/road, area, thana/upazila, district' },
          area: { type: 'STRING', enum: ['inside_dhaka', 'outside_dhaka'], description: 'inside_dhaka if the address is inside Dhaka city, else outside_dhaka' },
        },
      },
    },
    { name: 'read_order', description: 'Get the current form values, products, delivery charge and total to read back to the customer.' },
    { name: 'confirm_order', description: 'Place the order. Call ONLY after you read the summary and the customer clearly said yes.' },
  ],
}]

// mic → 16 kHz 16-bit PCM chunks (~100 ms)
const WORKLET = `class P extends AudioWorkletProcessor{constructor(){super();this.b=[];this.r=sampleRate/16000;this.p=0}
process(i){const c=i[0]&&i[0][0];if(!c)return true;let k=this.p;for(;k<c.length;k+=this.r)this.b.push(c[k|0]);this.p=k-c.length;
if(this.b.length>=1600){const o=new Int16Array(this.b.length);for(let n=0;n<o.length;n++){const v=Math.max(-1,Math.min(1,this.b[n]));o[n]=v<0?v*0x8000:v*0x7fff}this.port.postMessage(o.buffer,[o.buffer]);this.b=[]}return true}}
registerProcessor('pcm16k',P)`

const b64 = (buf) => { let s = ''; const u = new Uint8Array(buf); for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode.apply(null, u.subarray(i, i + 0x8000)); return btoa(s) }
const unb64 = (str) => { const s = atob(str); const u = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i); return u.buffer }

export async function voiceToken() {
  const r = await fetch(`${API_BASE_URL.replace(/\/$/, '')}/voice/token`, { method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' }, body: '{}' })
  const j = await r.json().catch(() => ({}))
  if (!j.ok) throw new Error(j.error || `HTTP ${r.status}`)
  return j
}

/**
 * startVoiceAgent({ context, onTool, onState, onCaption }) → { stop }
 *  onTool(name, args) → result object (sync or async)
 *  onState('connecting'|'listening'|'speaking'|'ended'|'error', info)
 */
export async function startVoiceAgent({ context, onTool, onState, onCaption }) {
  onState('connecting')
  const t = await voiceToken()
  const mic = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true } })
  const inCtx = new AudioContext()
  const outCtx = new AudioContext({ sampleRate: 24000 })
  const url = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }))
  await inCtx.audioWorklet.addModule(url)
  const src = inCtx.createMediaStreamSource(mic)
  const node = new AudioWorkletNode(inCtx, 'pcm16k')
  src.connect(node)

  let ws, playAt = 0, playing = [], stopped = false, ready = false, maxT
  const stop = (why = 'ended', info = '') => {
    if (stopped) return; stopped = true
    clearTimeout(maxT)
    try { ws?.close() } catch { /* closed */ }
    mic.getTracks().forEach((x) => x.stop())
    try { node.disconnect(); src.disconnect() } catch { /* gone */ }
    setTimeout(() => { inCtx.close().catch(() => {}); outCtx.close().catch(() => {}) }, 400)
    onState(why, info)
  }
  const flushPlayback = () => { playing.forEach((s) => { try { s.stop() } catch { /* done */ } }); playing = []; playAt = 0 }

  ws = new WebSocket(`${WS}?access_token=${encodeURIComponent(t.token)}`)
  ws.onopen = () => {
    ws.send(JSON.stringify({
      setup: {
        model: `models/${t.model}`,
        generationConfig: { responseModalities: ['AUDIO'], temperature: 0.4, speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: t.voice || 'Kore' } } } },
        systemInstruction: { parts: [{ text: context + (t.instructions ? `\n\nOwner instructions:\n${t.instructions}` : '') }] },
        tools: TOOLS,
        inputAudioTranscription: {},
        outputAudioTranscription: {},
      },
    }))
  }
  ws.onmessage = async (ev) => {
    const raw = typeof ev.data === 'string' ? ev.data : await ev.data.text()
    let m; try { m = JSON.parse(raw) } catch { return }
    if (m.setupComplete) {
      ready = true
      node.port.onmessage = (e) => { if (ready && ws.readyState === 1) ws.send(JSON.stringify({ realtimeInput: { audio: { data: b64(e.data), mimeType: 'audio/pcm;rate=16000' } } })) }
      // let the AI greet first
      ws.send(JSON.stringify({ clientContent: { turns: [{ role: 'user', parts: [{ text: '(customer pressed the talk button — greet and start)' }] }], turnComplete: true } }))
      onState('listening')
      maxT = setTimeout(() => stop('ended'), 5 * 60 * 1000) // hard cap: 5 minutes per talk
    }
    const sc = m.serverContent
    if (sc?.interrupted) { flushPlayback(); onState('listening') }
    if (sc?.inputTranscription?.text) onCaption?.('you', sc.inputTranscription.text)
    if (sc?.outputTranscription?.text) onCaption?.('ai', sc.outputTranscription.text)
    for (const part of sc?.modelTurn?.parts || []) {
      if (!part.inlineData?.data) continue
      const pcm = new Int16Array(unb64(part.inlineData.data))
      const buf = outCtx.createBuffer(1, pcm.length, 24000)
      const ch = buf.getChannelData(0)
      for (let i = 0; i < pcm.length; i++) ch[i] = pcm[i] / 0x8000
      const s = outCtx.createBufferSource(); s.buffer = buf; s.connect(outCtx.destination)
      playAt = Math.max(playAt, outCtx.currentTime + 0.03); s.start(playAt); playAt += buf.duration
      playing.push(s); s.onended = () => { playing = playing.filter((x) => x !== s); if (!playing.length) onState('listening') }
      onState('speaking')
    }
    if (m.toolCall?.functionCalls?.length) {
      const functionResponses = []
      for (const fc of m.toolCall.functionCalls) {
        let response
        try { response = (await onTool(fc.name, fc.args || {})) || { ok: true } } catch (e) { response = { ok: false, error: e.message } }
        functionResponses.push({ id: fc.id, name: fc.name, response })
      }
      if (ws.readyState === 1) ws.send(JSON.stringify({ toolResponse: { functionResponses } }))
    }
    if (m.goAway) stop('ended')
  }
  ws.onclose = (e) => { if (!stopped) stop(ready ? 'ended' : 'error', e.reason || 'connection closed') }

  return { stop: () => stop('ended') }
}
