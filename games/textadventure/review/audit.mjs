// Current regression audit. The original findings are preserved in GAMEPLAY_REVIEW.md.
import assert from "node:assert/strict";
import { validateContent, act, restore, snapshot } from "../engine.mjs";
import { journey } from "../tests/routes.mjs";
assert.deepEqual(validateContent(), []);
const { state, actions } = journey();
for (const ending of ["dark", "true", "domination"]) {
  const run = restore(snapshot(state));
  act(run, { type: "assemble" });
  act(run, { type: "talk", target: "aldric_throne" });
  assert.equal(run.ending, null);
  act(run, { type: "finish", target: ending });
  assert.equal(run.ending, ending);
}
console.log(
  `Content references valid; ${actions.length}-action journey and all three explicit endings passed.`,
);
