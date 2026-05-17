export interface AudioManager {
  playMusic(): void;
  stopMusic(): void;
  playEffect(name: 'boost' | 'jump' | 'land' | 'rock-hit' | 'box-open'): void;
  setEngineSpeed(speed: number): void;
  startEngine(): void;
  stopEngine(): void;
  setMuted(muted: boolean): void;
  isMuted(): boolean;
  setVolume(volume: number): void;
  dispose(): void;
}

const AUDIO_FILES: Record<string, string> = {
  'music': '/audio/music-driving.mp3',
  'engine': '/audio/engine-loop.mp3',
  'boost': '/audio/boost.mp3',
  'jump': '/audio/jump.mp3',
  'land': '/audio/land.mp3',
  'rock-hit': '/audio/rock-hit.mp3',
  'box-open': '/audio/box-open.mp3',
};

export async function createAudioManager(): Promise<AudioManager> {
  const rawBuffers = new Map<string, ArrayBuffer>();
  const audioBuffers = new Map<string, AudioBuffer>();

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

  let ctx: AudioContext | null = null;
  let masterGain: GainNode;
  let musicGain: GainNode;
  let engineGain: GainNode;
  let musicSource: AudioBufferSourceNode | null = null;
  let engineSource: AudioBufferSourceNode | null = null;
  let muted = localStorage.getItem('audio-muted') === 'true';
  let volume = 1;

  function ensureContext(): AudioContext {
    if (ctx) return ctx;
    ctx = new AudioContext();
    masterGain = ctx.createGain();
    masterGain.gain.value = muted ? 0 : volume;
    masterGain.connect(ctx.destination);
    musicGain = ctx.createGain();
    musicGain.gain.value = 0.3;
    musicGain.connect(masterGain);
    engineGain = ctx.createGain();
    engineGain.gain.value = 0.5;
    engineGain.connect(masterGain);

    const decodePromises: Array<Promise<void>> = [];
    for (const [name, raw] of rawBuffers) {
      const copy = raw.slice(0);
      decodePromises.push(
        ctx.decodeAudioData(copy)
          .then(decoded => { audioBuffers.set(name, decoded); })
          .catch(() => { /* skip undecodable */ })
      );
    }
    Promise.all(decodePromises).catch(() => {});
    return ctx;
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
    playMusic() {
      if (musicSource) return;
      ensureContext();
      musicGain.gain.value = 0.3;
      musicSource = playBuffer('music', musicGain, true);
    },
    stopMusic() {
      rampAndStop(musicGain, musicSource, 500);
      musicSource = null;
    },
    startEngine() {
      if (engineSource) return;
      ensureContext();
      engineGain.gain.value = 0.5;
      engineSource = playBuffer('engine', engineGain, true);
    },
    stopEngine() {
      rampAndStop(engineGain, engineSource, 100);
      engineSource = null;
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
      musicSource = null;
      engineSource = null;
      if (ctx) { ctx.close().catch(() => {}); ctx = null; }
    },
  };
}
