import test from "node:test";
import assert from "node:assert/strict";
import { createAudio } from "../audio.mjs";
test("audio is gesture-created, bounded, muted immediately and supports missing audio", async () => {
  let contexts = 0,
    oscillators = [];
  const param = () => ({
    value: 0,
    setValueAtTime() {},
    exponentialRampToValueAtTime() {},
  });
  class AudioContext {
    constructor() {
      contexts++;
      this.state = "suspended";
      this.currentTime = 0;
      this.destination = {};
    }
    async resume() {
      this.state = "running";
    }
    createGain() {
      return { gain: param(), connect() {}, disconnect() {} };
    }
    createOscillator() {
      const o = {
        frequency: param(),
        connect() {},
        disconnect() {},
        start() {
          this.started = true;
        },
        stop(when) {
          if (when === undefined) this.stopped = true;
        },
      };
      oscillators.push(o);
      return o;
    }
  }
  const audio = createAudio({ AudioContext });
  audio.play("start");
  assert.equal(contexts, 0);
  await audio.unlock();
  assert.equal(contexts, 1);
  assert.equal(oscillators.length, 2);
  for (let i = 0; i < 20; i++) audio.play("pickup");
  assert.equal(oscillators.length, 3, "repeated cues are throttled");
  audio.setRegion(2);
  assert.ok(oscillators[0].stopped);
  audio.configure({ sound: false, volume: 0.5 });
  assert.ok(oscillators.every((o) => o.stopped));
  const count = oscillators.length;
  audio.play("ending");
  assert.equal(oscillators.length, count);
  await createAudio({}).unlock();
});
