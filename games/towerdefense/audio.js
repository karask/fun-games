// Small synthesized sound palette. Audio starts only after a player gesture.
const Sound = (() => {
  let context, master, enabled = true, active = true, voices = 0;
  const last = new Map();
  try { enabled = localStorage.getItem('kingdom_sound') !== 'off'; } catch {}
  const palette = {
    archer:[780,260,.09,'triangle',.13], magic:[420,880,.19,'sine',.16], cannon:[110,36,.25,'triangle',.3],
    ice:[1100,420,.18,'sine',.13], dragon:[160,55,.3,'sawtooth',.09],
    hit:[200,65,.06,'triangle',.07], build:[320,640,.16,'triangle',.2], upgrade:[520,1040,.3,'sine',.22],
    select:[440,520,.055,'sine',.1], sell:[620,340,.12,'sine',.15], leak:[160,90,.35,'triangle',.25],
    wave:[220,440,.45,'triangle',.2], boss:[110,55,.8,'sawtooth',.13], victory:[520,1040,.75,'triangle',.25], defeat:[220,55,.8,'triangle',.2],
  };
  function unlock() {
    if(!enabled) return;
    if(!context) {
      const Audio = window.AudioContext || window.webkitAudioContext;
      if(!Audio) return;
      try {
        context = new Audio(); master = context.createGain(); master.gain.value = .24; master.connect(context.destination);
        // A very quiet, filtered breeze under the battlefield.
        const buffer = context.createBuffer(1,context.sampleRate*3,context.sampleRate), data = buffer.getChannelData(0);
        for(let i=0;i<data.length;i++) data[i] = (Math.random()*2-1)*.08;
        const wind = context.createBufferSource(), filter = context.createBiquadFilter(), volume = context.createGain();
        wind.buffer = buffer; wind.loop = true; filter.type = 'lowpass'; filter.frequency.value = 240; volume.gain.value = .13;
        wind.connect(filter); filter.connect(volume); volume.connect(master); wind.start();
      } catch { context = null; return; }
    }
    if(context.state === 'suspended') context.resume().catch(() => {});
    sync(active);
  }
  function sync(on, tail = 0) {
    active = on;
    if(master) {
      master.gain.cancelScheduledValues(context.currentTime);
      master.gain.setTargetAtTime(enabled && active ? .24 : 0,context.currentTime+tail,.08);
    }
  }
  function play(name) {
    if(!enabled || !context || context.state !== 'running' || voices >= 12) return;
    const now = context.currentTime;
    if(now - (last.get(name) ?? -1) < .08) return;
    last.set(name,now);
    const [from,to,duration,type,volume] = palette[name] || palette.hit;
    const osc = context.createOscillator(), gain = context.createGain();
    osc.type = type; osc.frequency.setValueAtTime(from,now); osc.frequency.exponentialRampToValueAtTime(to,now+duration);
    gain.gain.setValueAtTime(.001,now); gain.gain.exponentialRampToValueAtTime(volume,now+.008); gain.gain.exponentialRampToValueAtTime(.001,now+duration);
    osc.connect(gain); gain.connect(master); voices++;
    osc.onended = () => { voices--; osc.disconnect(); gain.disconnect(); };
    osc.start(now); osc.stop(now+duration+.03);
  }
  return {get enabled(){return enabled;},unlock,play,sync,toggle(){enabled=!enabled;try{localStorage.setItem('kingdom_sound',enabled?'on':'off');}catch{}unlock();sync(active);}};
})();
