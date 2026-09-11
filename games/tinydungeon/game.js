import { CLASSES, ITEMS, PERKS, BIOMES } from "./data.mjs";
import {
  createRun,
  act,
  stats,
  capacity,
  perkOptions,
  message,
  choose,
  snapshot,
  restore,
  distance,
} from "./engine.mjs";
import { createRenderer } from "./renderer.mjs";
import { createSound } from "./audio.mjs";
import {
  getHighScores,
  isHighScore,
  saveHighScore,
} from "../../assets/highscore.js";
const $ = (id) => document.getElementById(id),
  renderer = createRenderer($("gameCanvas")),
  sound = createSound();
const SAVE = "tinydungeon_run_v1",
  PROGRESS = "tinydungeon_progress_v1";
let run = null,
  aim = null,
  ended = false,
  saved = null,
  progress = { depth: 1, guardians: 0, wins: 0 },
  lastFocus = null;
function store(key, value) {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
function remove(key) {
  try {
    localStorage.removeItem(key);
  } catch {}
}
try {
  saved = restore(localStorage.getItem(SAVE));
  const p = JSON.parse(localStorage.getItem(PROGRESS));
  if (p && [p.depth, p.guardians, p.wins].every(Number.isFinite)) progress = p;
} catch {}
function unlockLevel() {
  return progress.guardians > 0 ? 5 : progress.depth >= 4 ? 4 : 0;
}
function button(text, fn) {
  const b = document.createElement("button");
  b.type = "button";
  b.textContent = text;
  b.addEventListener("click", fn);
  return b;
}
function safeScores() {
  try {
    return getHighScores("tinydungeon").filter(
      (s) => s && typeof s.name === "string" && Number.isFinite(s.score),
    );
  } catch {
    return [];
  }
}
function qualifies() {
  try {
    return isHighScore("tinydungeon", run.totalXp);
  } catch {
    return false;
  }
}
function records(id) {
  const el = $(id);
  el.replaceChildren();
  const scores = safeScores();
  if (!scores.length) {
    el.textContent = "The ledger awaits your first adventurer.";
    return;
  }
  for (const [i, score] of scores.entries()) {
    const row = document.createElement("p");
    row.style.cssText =
      "display:flex;justify-content:space-between;gap:12px;font-size:12px";
    const name = document.createElement("span"),
      value = document.createElement("strong");
    name.textContent = `${i + 1}. ${score.name}`;
    value.textContent = `${score.score} XP`;
    row.append(name, value);
    el.append(row);
  }
}
function syncSound() {
  $("sound-toggle").textContent = sound.enabled ? "Sound on" : "Sound off";
  $("sound-toggle").setAttribute("aria-pressed", String(sound.enabled));
}
function save() {
  if (!run || run.status !== "playing") return;
  const ok = store(SAVE, snapshot(run));
  saved = ok ? restore(snapshot(run)) : null;
  $("save-status").textContent = ok
    ? "Progress saved on this device."
    : "Saving unavailable in this browser.";
}
function perkSummary(perks) {
  const counts = new Map();
  for (const id of perks) counts.set(id, (counts.get(id) || 0) + 1);
  return [...counts]
    .map(([id, count]) => PERKS[id].name + (count > 1 ? " ×" + count : ""))
    .join(", ");
}
function updateProgress() {
  const before = unlockLevel();
  progress.depth = Math.max(progress.depth, run.floor);
  progress.guardians = Math.max(progress.guardians, run.guardians);
  if (run.status === "won") progress.wins++;
  store(PROGRESS, JSON.stringify(progress));
  return before < unlockLevel();
}
function refreshMenu() {
  records("start-leaderboard");
  $("resume-run").hidden = !saved;
  $("resume-run").textContent = saved
    ? `Continue ${saved.player.class} · floor ${saved.floor}`
    : "Continue run";
  $("unlock-status").textContent =
    unlockLevel() >= 5
      ? "Unlocked: Second wind & Finisher. Available in future perk choices."
      : unlockLevel() >= 4
        ? "Second wind unlocked. Defeat a guardian to unlock Finisher."
        : "Reach floor 4 to unlock Second wind. Defeat a guardian to unlock Finisher.";
}
function closeDialogs() {
  for (const id of ["inventory-screen", "choice-screen"])
    if ($(id).open) $(id).close();
}
function begin(s) {
  closeDialogs();
  run = s;
  aim = null;
  ended = false;
  renderer.reset();
  $("start-screen").style.display = "none";
  $("adventure").hidden = false;
  sound.unlock().then(() => sound.play("start"));
  update();
  $("gameCanvas").focus({ preventScroll: true });
}
window.startGame = (className) =>
  begin(
    createRun(
      className,
      $("run-seed").value.trim() || String(Date.now()),
      unlockLevel(),
    ),
  );
window.backToMenu = () => {
  closeDialogs();
  if (run?.status === "playing") save();
  renderer.pause();
  run = null;
  aim = null;
  $("adventure").hidden = true;
  $("start-screen").style.display = "flex";
  $("class-select").style.display = "block";
  for (const id of [
    "death-msg",
    "end-score-display",
    "end-leaderboard",
    "end-hs-input",
    "end-button-container",
  ])
    $(id).style.display = "none";
  $("run-recap").hidden = true;
  refreshMenu();
  $("resume-run").hidden
    ? document
        .querySelector(".class-btn.Fighter")
        .focus({ preventScroll: true })
    : $("resume-run").focus({ preventScroll: true });
};
$("resume-run").addEventListener("click", () => {
  if (saved) begin(restore(snapshot(saved)));
});
$("daily-seed").addEventListener("click", () => {
  $("run-seed").value = `daily-${new Date().toISOString().slice(0, 10)}`;
  $("save-status").textContent =
    "Daily seed uses the UTC date. Choose a class to begin.";
});
$("suspend-run").addEventListener("click", window.backToMenu);
$("sound-toggle").addEventListener("click", () =>
  sound.toggle().then(syncSound),
);
function finish() {
  if (ended) return;
  ended = true;
  closeDialogs();
  remove(SAVE);
  saved = null;
  const unlocked = updateProgress();
  $("adventure").hidden = true;
  $("start-screen").style.display = "flex";
  $("class-select").style.display = "none";
  renderer.pause();
  $("death-msg").style.display = "block";
  $("death-msg").style.color = run.status === "won" ? "#d7cc91" : "#e6ac96";
  $("death-msg").textContent =
    run.status === "won" ? "The darkness is broken." : "Your story ends here.";
  $("end-score-display").style.display = "block";
  $("final-score-val").textContent = run.totalXp;
  const p = run.player;
  $("run-recap").hidden = false;
  $("run-recap").textContent =
    `${p.class} · Floor ${run.floor}/10 · Level ${p.level} · ${run.turn} turns · ${run.kills} foes\n${run.cause}\nBuild: ${Object.values(
      p.equipment,
    )
      .filter(Boolean)
      .map((id) => ITEMS[id].name)
      .join(
        ", ",
      )}${p.perks.length ? " · " + perkSummary(p.perks) : ""}\nSeed: ${run.seed}${unlocked ? "\nNew perk unlocked for your next adventure." : ""}`;
  $("end-button-container").style.display = "block";
  $("end-leaderboard").style.display = "block";
  records("end-leaderboard");
  const input = $("end-hs-input");
  input.style.display = qualifies() ? "flex" : "none";
  $("end-hs-initials").value = "";
  // Main menu is always available: entering initials is optional.
  $("end-button-container").querySelector("button").textContent =
    "Skip / Main menu";
  if (input.style.display === "flex")
    $("end-hs-initials").focus({ preventScroll: true });
  else
    $("end-button-container")
      .querySelector("button")
      .focus({ preventScroll: true });
}
function submitScore() {
  if (!run || !ended || $("end-hs-input").style.display === "none") return;
  const name =
    $("end-hs-initials")
      .value.toUpperCase()
      .replace(/[^A-Z0-9]/g, "")
      .slice(0, 3) || "YOU";
  try {
    saveHighScore("tinydungeon", name, run.totalXp);
  } catch {
    $("run-recap").textContent +=
      "\nScore storage is unavailable in this browser.";
  }
  $("end-hs-input").style.display = "none";
  records("end-leaderboard");
  $("end-button-container").querySelector("button").textContent = "Main menu";
}
$("end-hs-submit").addEventListener("click", submitScore);
$("end-hs-initials").addEventListener("keydown", (e) => {
  if (e.key === "Enter") submitScore();
});
function showChoice() {
  if (run.pendingPerks && !run.choice) perkOptions(run);
  if (!run.choice) return;
  const isPerk = run.choice.type === "perk";
  $("choice-eyebrow").textContent = isPerk
    ? "A NEW CHAPTER"
    : "CHOOSE ONE RELIC";
  $("choice-title").textContent = isPerk
    ? "Shape your adventurer."
    : "What will you carry?";
  $("choice-note").textContent = isPerk
    ? "Choose one upgrade. The dungeon waits while you decide."
    : "One item goes into your pack. Equipping it later costs one turn.";
  const list = $("choice-options");
  list.replaceChildren();
  run.choice.options.forEach((id, i) => {
    const entry = (isPerk ? PERKS : ITEMS)[id];
    const b = button(`${i + 1}. ${entry.name}`, () => {
      if (choose(run, i)) {
        $("choice-screen").close();
        update();
        if (!$("choice-screen").open)
          $("gameCanvas").focus({ preventScroll: true });
      }
    });
    const desc = document.createElement("small");
    desc.textContent = entry.description;
    b.append(desc);
    list.append(b);
  });
  if (!$("choice-screen").open) $("choice-screen").showModal();
}
$("choice-screen").addEventListener("cancel", (e) => e.preventDefault());
function update() {
  if (!run) return;
  for (const e of run.events) sound.play(e.type);
  renderer.ingest(run);
  if (run.status !== "playing") {
    finish();
    return;
  }
  if (run.floor > progress.depth || run.guardians > progress.guardians) {
    if (updateProgress()) {
      message(run, "A new perk is unlocked for future adventurers.", "good");
    }
  }
  const p = run.player,
    st = stats(run);
  $("biome-name").textContent =
    BIOMES[Math.min(3, Math.floor((run.floor - 1) / 3))].name;
  $("floor-name").textContent =
    `Floor ${String(run.floor).padStart(2, "0")} / 10`;
  $("player-stats").textContent =
    `${p.class} · Lv ${p.level}                 ${p.hp} / ${st.maxHp} HP`;
  $("health-bar").max = st.maxHp;
  $("health-bar").value = p.hp;
  $("xp-stats").textContent =
    `${p.xp} / ${p.nextXp} XP · ATK ${st.attack} · DEF ${st.defense}`;
  $("turn-count").textContent = `Turn ${run.turn}`;
  $("ability-btn").textContent =
    `${{ Fighter: "Guard", Mage: "Bolt", Priest: "Ward", Rogue: "Step" }[p.class]} · ${["Mage", "Priest"].includes(p.class) ? p.charges + "/" + capacity(run) : p.cooldown ? p.cooldown + " turns" : "Q"}`;
  $("ability-btn").title = CLASSES[p.class].help;
  $("potion-btn").textContent =
    `Potion ${p.inventory.filter((id) => ITEMS[id].heal).length} · H`;
  const near = run.features.find((f) => !f.used && distance(f, p) <= 1),
    stairs = distance(run.stairs, p) === 0;
  $("interact-btn").textContent = stairs
    ? "Descend · E"
    : near
      ? `${near.type} · E`
      : "Interact · E";
  const threats = run.enemies.filter(
    (e) => e.intent && run.visible[e.y * 30 + e.x],
  );
  $("action-hint").textContent = aim
    ? `${aim === "ability" ? CLASSES[p.class].ability : "Weapon attack"}: choose a direction. Esc cancels.`
    : threats.length
      ? "Marked tiles are struck next turn. Move to safety."
      : stairs
        ? "E to descend. Guardians must be defeated."
        : near
          ? `${near.type === "treasure" ? "Blood chest: costs 6 HP. " : ""}E to use ${near.type}.`
          : p.empowered
            ? "Your next attack is empowered."
            : CLASSES[p.class].help;
  const log = $("msg-log");
  log.replaceChildren();
  for (const m of run.messages) {
    const row = document.createElement("p");
    row.className = `msg-${m.tone}`;
    row.textContent = m.text;
    log.append(row);
  }
  const boss = run.enemies.find((e) => e.boss && run.visible[e.y * 30 + e.x]);
  $("boss-bar").hidden = !boss;
  if (boss) {
    $("boss-bar").replaceChildren(
      document.createTextNode(
        `${boss.name} · Phase ${boss.phase} · ${boss.hp}/${boss.maxHp}`,
      ),
    );
    const hp = document.createElement("progress");
    hp.max = boss.maxHp;
    hp.value = boss.hp;
    hp.setAttribute("aria-label", `${boss.name} health`);
    $("boss-bar").append(hp);
  }
  showChoice();
  save();
}
function action(value) {
  if (!run || $("inventory-screen").open || $("choice-screen").open) return;
  sound.unlock();
  act(run, value);
  update();
}
function direction(dx, dy) {
  const type = aim || "move";
  aim = null;
  action({ type, dx, dy });
}
function ability() {
  if (!run) return;
  if (["Mage", "Rogue"].includes(run.player.class)) {
    aim = aim === "ability" ? null : "ability";
    update();
  } else action({ type: "ability" });
}
function inventory() {
  if (!run || run.status !== "playing" || $("choice-screen").open) return;
  if ($("inventory-screen").open) {
    $("inventory-screen").close();
    (lastFocus || $("gameCanvas")).focus({ preventScroll: true });
    return;
  }
  aim = null;
  lastFocus = document.activeElement;
  const p = run.player,
    st = stats(run);
  $("equipment-list").replaceChildren();
  for (const [slot, id] of Object.entries(p.equipment)) {
    const el = document.createElement("div"),
      label = document.createElement("small");
    label.textContent = slot;
    el.append(label, document.createTextNode(id ? ITEMS[id].name : "None"));
    $("equipment-list").append(el);
  }
  $("inv-stats-panel").textContent =
    `ATK ${st.attack} · DEF ${st.defense} · HP ${p.hp}/${st.maxHp} · Reach ${st.reach}\n${p.perks.length ? "Perks: " + perkSummary(p.perks) : "Choose perks at even levels."}`;
  const list = $("backpack-list");
  list.replaceChildren();
  if (!p.inventory.length) list.textContent = "Your pack is empty.";
  p.inventory.forEach((id, index) => {
    const item = ITEMS[id],
      row = document.createElement("div");
    row.className = "item-row";
    const use = button(`${item.heal ? "Drink" : "Equip"} ${item.name}`, () =>
        inventoryAction({ type: "use", index }),
      ),
      desc = document.createElement("small");
    const old = ITEMS[p.equipment[item.type]] || {},
      comparison = item.heal
        ? ""
        : ["attack", "defense", "maxHp"]
            .map((k) => {
              const delta = (item[k] || 0) - (old[k] || 0);
              return delta
                ? `${delta > 0 ? "+" : ""}${delta} ${k === "maxHp" ? "max HP" : k}`
                : "";
            })
            .filter(Boolean)
            .join(" · ");
    desc.textContent = `${item.description}${item.heal && p.class === "Priest" ? " Priest blessing: +4 HP." : ""}${comparison ? " Compared with equipped: " + comparison : ""}`;
    use.append(desc);
    row.append(
      use,
      button("Drop", () => inventoryAction({ type: "drop", index })),
    );
    list.append(row);
  });
  $("inventory-screen").showModal();
}
function inventoryAction(value) {
  $("inventory-screen").close();
  action(value);
  if (!ended && !$("choice-screen").open)
    $("gameCanvas").focus({ preventScroll: true });
}
window.toggleInventory = inventory;
$("inventory-btn").addEventListener("click", inventory);
$("close-inventory").addEventListener("click", inventory);
$("ability-btn").addEventListener("click", ability);
$("reach-btn").addEventListener("click", () => {
  aim = aim === "reach" ? null : "reach";
  update();
});
$("interact-btn").addEventListener("click", () => action({ type: "interact" }));
$("potion-btn").addEventListener("click", () => action({ type: "potion" }));
$("wait-btn").addEventListener("click", () => action({ type: "wait" }));
for (const b of document.querySelectorAll("[data-dir]"))
  b.addEventListener("click", () =>
    direction(...b.dataset.dir.split(",").map(Number)),
  );
const directions = {
  ArrowUp: [0, -1],
  w: [0, -1],
  ArrowDown: [0, 1],
  s: [0, 1],
  ArrowLeft: [-1, 0],
  a: [-1, 0],
  ArrowRight: [1, 0],
  d: [1, 0],
};
document.addEventListener("keydown", (e) => {
  if (
    !run ||
    run.status !== "playing" ||
    e.target.matches("input") ||
    e.ctrlKey ||
    e.altKey ||
    e.metaKey
  )
    return;
  if ($("choice-screen").open) {
    if (["1", "2", "3"].includes(e.key)) {
      e.preventDefault();
      $("choice-options").children[Number(e.key) - 1].click();
    }
    return;
  }
  const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
  if ($("inventory-screen").open) {
    if (k === "i") {
      e.preventDefault();
      inventory();
    }
    return;
  }
  if (e.repeat) return;
  if (k === "Escape") {
    aim = null;
    update();
    return;
  }
  if (directions[k]) {
    e.preventDefault();
    direction(...directions[k]);
    return;
  }
  const commands = {
    q: ability,
    f: () => {
      aim = aim === "reach" ? null : "reach";
      update();
    },
    e: () => action({ type: "interact" }),
    h: () => action({ type: "potion" }),
    i: inventory,
    " ": () => action({ type: "wait" }),
  };
  if (commands[k]) {
    if (k === " " && e.target.tagName === "BUTTON") return;
    e.preventDefault();
    commands[k]();
  }
});
document.addEventListener("visibilitychange", () => {
  sound.setActive(!document.hidden);
  if (document.hidden) save();
});
window.addEventListener("pagehide", save);
syncSound();
refreshMenu();
