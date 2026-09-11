// Gesture-unlocked, bounded synthesized dungeon cues.
const CUES = {
  start: [220, 660, 0.3, "triangle", 0.16],
  step: [95, 70, 0.045, "triangle", 0.04],
  wait: [140, 120, 0.05, "sine", 0.03],
  hit: [180, 65, 0.12, "triangle", 0.2],
  hurt: [110, 45, 0.2, "sawtooth", 0.08],
  block: [750, 310, 0.13, "triangle", 0.12],
  bolt: [850, 170, 0.18, "sawtooth", 0.06],
  dodge: [320, 670, 0.12, "sine", 0.1],
  heal: [420, 850, 0.4, "sine", 0.14],
  loot: [660, 990, 0.18, "triangle", 0.14],
  stairs: [260, 780, 0.45, "triangle", 0.16],
  danger: [190, 150, 0.18, "sine", 0.08],
  level: [440, 1320, 0.45, "triangle", 0.14],
  strike: [120, 50, 0.16, "triangle", 0.12],
  death: [200, 40, 0.65, "triangle", 0.18],
  victory: [440, 1760, 0.8, "triangle", 0.16],
};
export function createSound(host = globalThis) {
  let context,
    master,
    enabled = true,
    active = true;
  const voices = new Set(),
    last = new Map();
  try {
    enabled = host.localStorage?.getItem("tinydungeon_sound") !== "off";
  } catch {}
  function sync() {
    if (master) master.gain.value = enabled && active ? 0.35 : 0;
    if (!enabled || !active) {
      for (const voice of voices) voice.stop();
      voices.clear();
    }
  }
  async function unlock() {
    if (!enabled) return;
    const Audio = host.AudioContext || host.webkitAudioContext;
    if (!Audio) return;
    try {
      if (!context) {
        context = new Audio();
        master = context.createGain();
        master.connect(context.destination);
        sync();
      }
      if (context.state === "suspended") await context.resume();
    } catch {
      /* Audio is optional; blocked devices still get a playable game. */
    }
  }
  function play(name) {
    if (
      !enabled ||
      !active ||
      !context ||
      context.state !== "running" ||
      !master ||
      voices.size >= 10
    )
      return;
    const cue = CUES[name];
    if (!cue) return;
    const now = context.currentTime;
    if (now - (last.get(name) ?? -1) < 0.045) return;
    last.set(name, now);
    const [from, to, duration, type, volume] = cue;
    const oscillator = context.createOscillator(),
      gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(from, now);
    oscillator.frequency.exponentialRampToValueAtTime(to, now + duration);
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.006);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);
    oscillator.connect(gain);
    gain.connect(master);
    voices.add(oscillator);
    oscillator.onended = () => {
      voices.delete(oscillator);
      oscillator.disconnect();
      gain.disconnect();
    };
    oscillator.start(now);
    oscillator.stop(now + duration + 0.015);
  }
  return {
    get enabled() {
      return enabled;
    },
    unlock,
    play,
    setActive(value) {
      active = value;
      sync();
    },
    toggle() {
      enabled = !enabled;
      try {
        host.localStorage?.setItem("tinydungeon_sound", enabled ? "on" : "off");
      } catch {}
      sync();
      return unlock();
    },
  };
}
