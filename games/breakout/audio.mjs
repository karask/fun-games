// Short synthesized arcade cues; no downloads or audio before player interaction.
const CUES = {
    start: [330, 660, .18, 'triangle', .16],
    launch: [440, 880, .1, 'sine', .2],
    wall: [400, 270, .045, 'sine', .12],
    paddle: [220, 540, .075, 'triangle', .2],
    brick: [780, 430, .065, 'triangle', .16],
    armor: [170, 110, .07, 'triangle', .15],
    steel: [1100, 800, .04, 'sine', .1],
    explosion: [130, 35, .24, 'sawtooth', .12],
    pickup: [600, 1200, .2, 'sine', .2],
    laser: [1400, 220, .09, 'sawtooth', .08],
    lost: [300, 75, .45, 'triangle', .2],
    clear: [440, 1320, .5, 'triangle', .2],
    victory: [520, 1560, .8, 'triangle', .2],
    gameover: [220, 45, .7, 'triangle', .2],
};

export function createSound(host = globalThis) {
    let context, master, enabled = true, active = true;
    const voices = new Set(), last = new Map();
    try { enabled = host.localStorage?.getItem('breakout_sound') !== 'off'; } catch {}
    function sync() {
        if (master) master.gain.value = enabled && active ? .35 : 0;
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
            if (context.state === 'suspended') await context.resume();
        } catch { /* Audio is optional; blocked devices still get a playable game. */ }
    }
    function play(name) {
        if (!enabled || !active || !context || context.state !== 'running' || !master || voices.size >= 10) return;
        const cue = CUES[name];
        if (!cue) return;
        const now = context.currentTime;
        if (now - (last.get(name) ?? -1) < .045) return;
        last.set(name, now);
        const [from,to,duration,type,volume] = cue;
        const oscillator = context.createOscillator(), gain = context.createGain();
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(from,now);
        oscillator.frequency.exponentialRampToValueAtTime(to,now+duration);
        gain.gain.setValueAtTime(.0001,now);
        gain.gain.exponentialRampToValueAtTime(volume,now+.006);
        gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
        oscillator.connect(gain);gain.connect(master);voices.add(oscillator);
        oscillator.onended = () => { voices.delete(oscillator);oscillator.disconnect();gain.disconnect(); };
        oscillator.start(now);oscillator.stop(now+duration+.015);
    }
    return {
        get enabled() { return enabled; },
        unlock, play,
        setActive(value) { active=value;sync(); },
        toggle() {
            enabled=!enabled;
            try { host.localStorage?.setItem('breakout_sound',enabled?'on':'off'); } catch {}
            sync();
            return unlock();
        }
    };
}
