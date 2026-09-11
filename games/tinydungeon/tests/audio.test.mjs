import test from "node:test";
import assert from "node:assert/strict";
import { createSound } from "../audio.mjs";
function harness(stored = null) {
  const contexts = [],
    writes = [];
  const param = () => ({
    value: 0,
    setValueAtTime() {},
    exponentialRampToValueAtTime() {},
  });
  class Context {
    constructor() {
      this.currentTime = 1;
      this.state = "running";
      this.destination = {};
      this.nodes = [];
      contexts.push(this);
    }
    resume() {
      this.state = "running";
      return Promise.resolve();
    }
    createGain() {
      return { gain: param(), connect() {}, disconnect() {} };
    }
    createOscillator() {
      const node = {
        frequency: param(),
        connect() {},
        disconnect() {},
        start() {},
        stop() {},
        onended: null,
      };
      this.nodes.push(node);
      return node;
    }
  }
  const sound = createSound({
    AudioContext: Context,
    localStorage: {
      getItem: () => stored,
      setItem: (...args) => writes.push(args),
    },
  });
  return { sound, contexts, writes };
}
test("sound is enabled by default but creates audio only after a gesture", async () => {
  const { sound, contexts } = harness();
  assert.equal(sound.enabled, true);
  sound.play("hit");
  assert.equal(contexts.length, 0);
  await sound.unlock();
  sound.play("hit");
  assert.equal(contexts[0].nodes.length, 1);
});
test("mute persists and suppresses effects", async () => {
  const { sound, contexts, writes } = harness();
  await sound.unlock();
  sound.toggle();
  sound.play("hit");
  assert.equal(contexts[0].nodes.length, 0);
  assert.equal(writes[0][1], "off");
  assert.equal(harness("off").sound.enabled, false);
});
test("pause suppresses effects and resume restores them", async () => {
  const { sound, contexts } = harness();
  await sound.unlock();
  sound.setActive(false);
  sound.play("hit");
  assert.equal(contexts[0].nodes.length, 0);
  sound.setActive(true);
  sound.play("hit");
  assert.equal(contexts[0].nodes.length, 1);
});
test("Repeated attack cues are throttled and completed voices are released", async () => {
  const { sound, contexts } = harness();
  await sound.unlock();
  for (let i = 0; i < 100; i++) sound.play("hit");
  assert.equal(contexts[0].nodes.length, 1);
  contexts[0].nodes[0].onended();
  contexts[0].currentTime += 0.1;
  sound.play("hit");
  assert.equal(contexts[0].nodes.length, 2);
});
test("unsupported audio does not prevent gameplay", async () => {
  const sound = createSound({});
  await sound.unlock();
  sound.play("bolt");
  sound.toggle();
  sound.setActive(false);
});
