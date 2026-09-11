const CUES = {
  start: [220, 440, 0.5],
  step: [110, 90, 0.07],
  discovery: [440, 880, 0.35],
  pickup: [330, 660, 0.18],
  action: [180, 260, 0.15],
  dialogue: [210, 260, 0.09],
  notice: [160, 130, 0.12],
  ending: [330, 990, 0.8],
};
export function createAudio(host = globalThis) {
  let ctx,
    master,
    enabled = true,
    volume = 0.3,
    active = true,
    region = 0,
    ambient = [];
  const voices = new Set(),
    last = new Map();
  function stopAmbient() {
    for (const o of ambient) {
      o.stop();
      o.disconnect();
    }
    ambient = [];
  }
  function ambience() {
    stopAmbient();
    if (!ctx || ctx.state !== "running" || !enabled || !active || !volume)
      return;
    const root = [65.41, 73.42, 55, 61.74, 49][region];
    for (const factor of [1, 1.5]) {
      const o = ctx.createOscillator(),
        g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = root * factor;
      g.gain.value = 0.018;
      o.connect(g);
      g.connect(master);
      o.onended = () => g.disconnect();
      o.start();
      ambient.push(o);
    }
  }
  function sync() {
    if (master) master.gain.value = enabled && active ? volume : 0;
    if (!enabled || !active) {
      stopAmbient();
      for (const o of voices) o.stop();
      voices.clear();
    } else if (ctx && !ambient.length) ambience();
  }
  async function unlock() {
    if (!enabled) return;
    try {
      const Audio = host.AudioContext || host.webkitAudioContext;
      if (!Audio) return;
      if (!ctx) {
        ctx = new Audio();
        master = ctx.createGain();
        master.connect(ctx.destination);
        sync();
      }
      if (ctx.state === "suspended") await ctx.resume();
      if (!ambient.length) ambience();
    } catch {}
  }
  function play(kind) {
    if (
      !ctx ||
      ctx.state !== "running" ||
      !enabled ||
      !active ||
      !volume ||
      voices.size >= 8
    )
      return;
    const cue = CUES[kind] || CUES.action,
      now = ctx.currentTime;
    if (now - (last.get(kind) ?? -1) < 0.08) return;
    last.set(kind, now);
    const [from, to, duration] = cue,
      o = ctx.createOscillator(),
      g = ctx.createGain();
    o.type = "triangle";
    o.frequency.setValueAtTime(from, now);
    o.frequency.exponentialRampToValueAtTime(to, now + duration);
    g.gain.setValueAtTime(0.001, now);
    g.gain.exponentialRampToValueAtTime(0.13, now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, now + duration);
    o.connect(g);
    g.connect(master);
    voices.add(o);
    o.onended = () => {
      voices.delete(o);
      o.disconnect();
      g.disconnect();
    };
    o.start();
    o.stop(now + duration + 0.02);
  }
  return {
    unlock,
    play,
    configure(options) {
      enabled = !!options.sound;
      volume = Math.max(0, Math.min(1, Number(options.volume) || 0));
      sync();
    },
    setRegion(value) {
      if (region === value) return;
      region = value;
      ambience();
    },
    setActive(value) {
      active = value;
      sync();
    },
  };
}
