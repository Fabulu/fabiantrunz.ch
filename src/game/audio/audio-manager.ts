export interface AudioManager {
  ensureReady(): Promise<void>;
  playMusic(): Promise<void>;
  stopMusic(): void;
  playEffect(name: 'boost' | 'jump' | 'land' | 'rock-hit' | 'box-open'): void;
  setEngineSpeed(speed: number): void;
  startEngine(): Promise<void>;
  stopEngine(): void;
  startBoostLoop(): void;
  stopBoostLoop(): void;
  setBoostIntensity(intensity: number): void;
  setMuted(muted: boolean): void;
  isMuted(): boolean;
  setVolume(volume: number): void;
  dispose(): void;
}

export const AUDIO_FILES: Record<string, string> = {
  'music': '/audio/music-driving.mp3',
  'engine': '/audio/engine-loop.mp3',
  'boost': '/audio/boost.mp3',
  'jump': '/audio/jump.mp3',
  'land': '/audio/land.mp3',
  'rock-hit': '/audio/rock-hit.mp3',
  'box-open': '/audio/box-open.mp3',
};

export async function fetchAudioBuffers(): Promise<Map<string, ArrayBuffer>> {
  const rawBuffers = new Map<string, ArrayBuffer>();
  const entries = Object.entries(AUDIO_FILES);
  const results = await Promise.all(
    entries.map(([, url]) =>
      fetch(url).then(r => r.arrayBuffer()).catch(() => null)
    )
  );
  for (let i = 0; i < entries.length; i++) {
    const buf = results[i];
    if (buf) rawBuffers.set(entries[i][0], buf);
  }
  return rawBuffers;
}

export function createAudioManager(rawBuffers: Map<string, ArrayBuffer>): AudioManager {
  const audioBuffers = new Map<string, AudioBuffer>();

  let ctx: AudioContext | null = null;
  let masterGain: GainNode;
  let musicGain: GainNode;
  let engineGain: GainNode;
  let boostGain: GainNode;
  let musicSource: AudioBufferSourceNode | null = null;
  let engineSource: AudioBufferSourceNode | null = null;
  let boostSource: AudioBufferSourceNode | null = null;
  let muted = localStorage.getItem('audio-muted') === 'true';
  let volume = 1;

  let decodeReady: Promise<void> | null = null;

  function ensureContext(): AudioContext {
    if (ctx) return ctx;
    ctx = new AudioContext();
    masterGain = ctx.createGain();
    masterGain.gain.value = muted ? 0 : volume;
    masterGain.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.6;
    musicGain.connect(masterGain);
    engineGain = ctx.createGain();
    engineGain.gain.value = 0.15;
    engineGain.connect(masterGain);
    boostGain = ctx.createGain();
    boostGain.gain.value = 0.4;
    boostGain.connect(masterGain);

    const decodePromises: Array<Promise<void>> = [];
    for (const [name, raw] of rawBuffers) {
      const copy = raw.slice(0);
      decodePromises.push(
        ctx.decodeAudioData(copy)
          .then(decoded => { audioBuffers.set(name, decoded); })
          .catch(() => { /* skip undecodable */ })
      );
    }
    decodeReady = Promise.all(decodePromises).then(() => {}).catch(() => {});
    return ctx;
  }

  async function waitForDecode(): Promise<void> {
    ensureContext();
    if (decodeReady) await decodeReady;
  }

  function playBuffer(name: string, dest: GainNode, loop: boolean): AudioBufferSourceNode | null {
    const c = ensureContext();
    const buf = audioBuffers.get(name);
    if (!buf) return null;
    const src = c.createBufferSource();
    src.buffer = buf;
    src.loop = loop;
    src.connect(dest);
    src.start();
    return src;
  }

  function rampAndStop(gain: GainNode, source: AudioBufferSourceNode | null, ms: number) {
    if (!source || !ctx) return;
    const now = ctx.currentTime;
    gain.gain.setValueAtTime(gain.gain.value, now);
    gain.gain.linearRampToValueAtTime(0, now + ms / 1000);
    const s = source;
    setTimeout(() => { try { s.stop(); } catch { /* already stopped */ } }, ms + 50);
  }

  return {
    async ensureReady() {
      await waitForDecode();
    },
    async playMusic() {
      if (musicSource) return;
      await waitForDecode();
      musicGain.gain.value = 0.6;
      musicSource = playBuffer('music', musicGain, true);
    },
    stopMusic() {
      rampAndStop(musicGain, musicSource, 500);
      musicSource = null;
    },
    async startEngine() {
      if (engineSource) return;
      await waitForDecode();
      engineGain.gain.value = 0.15;
      engineSource = playBuffer('engine', engineGain, true);
    },
    stopEngine() {
      rampAndStop(engineGain, engineSource, 100);
      engineSource = null;
    },
    startBoostLoop() {
      if (boostSource) return;
      boostGain.gain.value = 0.4;
      boostSource = playBuffer('boost', boostGain, true);
    },
    stopBoostLoop() {
      rampAndStop(boostGain, boostSource, 150);
      boostSource = null;
    },
    setBoostIntensity(intensity: number) {
      if (!boostSource) return;
      const i = Math.max(0, Math.min(1, intensity));
      // Lower pitch at start (bassy), higher as intensity builds
      boostSource.playbackRate.value = 0.7 + i * 0.5; // 0.7 → 1.2
      // Louder as intensity builds
      boostGain.gain.value = 0.25 + i * 0.35; // 0.25 → 0.6
    },
    setEngineSpeed(speed: number) {
      if (!engineSource) return;
      const s = Math.max(0, Math.min(1, speed));
      engineSource.playbackRate.value = 0.5 + s * 1.5;
    },
    playEffect(name) {
      ensureContext();
      const src = playBuffer(name, masterGain, false);
      if (src) src.onended = () => src.disconnect();
    },
    setMuted(m: boolean) {
      muted = m;
      localStorage.setItem('audio-muted', String(m));
      if (ctx) masterGain.gain.value = m ? 0 : volume;
    },
    isMuted() {
      return muted;
    },
    setVolume(v: number) {
      volume = Math.max(0, Math.min(1, v));
      if (ctx && !muted) masterGain.gain.value = volume;
    },
    dispose() {
      try { musicSource?.stop(); } catch { /* */ }
      try { engineSource?.stop(); } catch { /* */ }
      try { boostSource?.stop(); } catch { /* */ }
      musicSource = null;
      engineSource = null;
      boostSource = null;
      if (ctx) { ctx.close().catch(() => {}); ctx = null; }
    },
  };
}
