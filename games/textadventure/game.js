import {
  createJourney,
  act,
  availableItems,
  roomNPCs,
  objects,
  exits,
  describe,
  nameOf,
  dialogueTopics,
  travel,
  snapshot,
  restore,
  endingLines,
  epilogue,
} from "./engine.mjs";
import {
  rooms,
  items,
  SHARDS,
  MEMORIES,
  EVIDENCE,
  QUESTIONS,
  PUZZLES,
  ENDINGS,
  REGIONS,
  INTRO_TEXT,
  MAP_POS,
} from "./story.mjs";
import { scene, portrait } from "./art.mjs";
import { createAudio } from "./audio.mjs";
const $ = (id) => document.getElementById(id),
  audio = createAudio(),
  prefix = "shattered_crown_";
let storageOK = true;
function get(key) {
  try {
    return localStorage.getItem(prefix + key);
  } catch {
    storageOK = false;
    return null;
  }
}
function put(key, value) {
  try {
    if (value === null) localStorage.removeItem(prefix + key);
    else localStorage.setItem(prefix + key, value);
  } catch {
    storageOK = false;
  }
}
function json(key, fallback) {
  try {
    return JSON.parse(get(key)) ?? fallback;
  } catch {
    return fallback;
  }
}
let settings = {
  sound: true,
  volume: 0.3,
  fontSize: 18,
  textSpeed: "instant",
  motion: "system",
  ...json("settings_v1", {}),
};
let saved = restore(get("run_v1")),
  checkpoint = restore(get("checkpoint_v1")),
  chronicle = json("chronicle_v1", []),
  s = null,
  builder = {},
  timer = null,
  reveal = null,
  dialogMode = "",
  sceneKey = "";
if (!Array.isArray(chronicle)) chronicle = [];
chronicle = chronicle
  .filter((r) => r && Object.hasOwn(ENDINGS, r.ending))
  .slice(-12);
function element(tag, text, cls) {
  const e = document.createElement(tag);
  if (text !== undefined) e.textContent = text;
  if (cls) e.className = cls;
  return e;
}
function button(text, fn, id, cls) {
  const b = element("button", text, cls);
  if (id) b.id = id;
  b.addEventListener("click", fn);
  return b;
}
function clear(id) {
  const e = $(id);
  e.replaceChildren();
  return e;
}
function stopText() {
  clearInterval(timer);
  timer = null;
  if (reveal) reveal();
  reveal = null;
  $("reveal-text").hidden = true;
}
function applySettings() {
  settings.fontSize = [16, 18, 20, 22].includes(Number(settings.fontSize))
    ? Number(settings.fontSize)
    : 18;
  settings.volume = Math.max(0, Math.min(1, Number(settings.volume) || 0));
  document.documentElement.style.setProperty(
    "--narrative-size",
    settings.fontSize + "px",
  );
  document.body.dataset.motion = settings.motion === "off" ? "off" : "system";
  audio.configure(settings);
}
function save() {
  if (s && !s.ending) {
    saved = restore(snapshot(s));
    put("run_v1", snapshot(s));
  }
  $("autosave-label").textContent = storageOK
    ? "Journey saved automatically."
    : "Storage unavailable: this journey lasts for this session.";
}
function saveCheckpoint() {
  checkpoint = restore(snapshot(s));
  put("checkpoint_v1", snapshot(s));
}
function closeDialog() {
  if ($("dialog").open) $("dialog").close();
  dialogMode = "";
  if (s?.conversation) {
    s.conversation = null;
    save();
  }
}
function modal(title, eyebrow = "", mode = "") {
  stopText();
  dialogMode = mode;
  $("dialog-title").textContent = title;
  $("dialog-eyebrow").textContent = eyebrow;
  const body = clear("dialog-body");
  if (!$("dialog").open) $("dialog").showModal();
  return body;
}
function screen(id) {
  stopText();
  for (const name of ["menu-screen", "game-screen", "ending-screen"])
    $(name).hidden = name !== id;
  audio.setActive(id === "game-screen" && !document.hidden);
}
function menu() {
  closeDialog();
  save();
  screen("menu-screen");
  $("continue-btn").hidden = !saved || !!saved.ending;
  $("menu-checkpoint").hidden = !checkpoint;
  $("save-status").textContent = !storageOK
    ? "Storage is unavailable. You can still play this session."
    : saved && !saved.ending
      ? `Saved at ${rooms[saved.room].title}.`
      : "Your journey saves automatically as you explore.";
  const collection = clear("menu-collection");
  for (const [id, end] of Object.entries(ENDINGS)) {
    const reached = chronicle.some((r) => r.ending === id);
    collection.append(
      element(
        "div",
        reached ? end.title : "An unwritten ending",
        `ending-card ${reached ? "unlocked" : ""}`,
      ),
    );
  }
}
function start(state) {
  closeDialog();
  s = restore(snapshot(state));
  builder = {};
  screen("game-screen");
  audio.unlock().then(() => audio.play("start"));
  save();
  render();
}
function perform(action) {
  const focusedId = document.activeElement?.id;
  stopText();
  audio.unlock();
  if (
    !s.flags.crown_assembled &&
    (["assemble", "unmake"].includes(action.type) ||
      (action.type === "use" && action.target === "crown_shards"))
  )
    saveCheckpoint();
  const before = s.room;
  act(s, action);
  builder = {};
  if (before !== s.room && s.room === "throne_room" && !s.flags.crown_assembled)
    saveCheckpoint();
  if (s.ending) {
    complete();
    return;
  }
  save();
  render();
  const kind = s.history.at(-1)?.kind;
  audio.play(
    {
      arrival: "step",
      memory: "discovery",
      special: "discovery",
      reading: "dialogue",
    }[kind] ||
      kind ||
      "action",
  );
  if (s.conversation) conversation();
  const focusTarget =
    $(focusedId) || (s.conversation ? $("dialog-close") : $("narrative"));
  if (focusTarget) {
    focusTarget.tabIndex = focusTarget.tagName === "BUTTON" ? 0 : -1;
    focusTarget.focus({ preventScroll: true });
  }
  if (before !== s.room)
    document.querySelector(".scene-frame").scrollIntoView({ block: "start" });
}
function render() {
  const room = rooms[s.room],
    region = REGIONS[room.region] || { name: room.region, index: 0 };
  audio.setRegion(region.index);
  $("region-title").textContent = region.name;
  $("location-title").textContent = room.title;
  $("chapter-number").textContent =
    `${s.visited.length} / 18 places discovered`;
  $("action-count").textContent = `${s.actions} actions`;
  const artFlags = { ...s.flags, taken: s.taken };
  const key = s.room + JSON.stringify(artFlags);
  if (key !== sceneKey) {
    $("room-art").innerHTML = scene(s.room, artFlags);
    sceneKey = key;
  }
  $("room-description").textContent = describe(s);
  const paths = clear("exit-list");
  for (const e of exits(s)) {
    const b = button(
      `${e.direction.toUpperCase()} · ${rooms[e.to].title}${e.open ? "" : " — " + e.reason}`,
      () => perform({ type: "move", target: e.direction }),
      "move-" + e.direction,
      e.open ? "exit-btn" : "exit-btn blocked",
    );
    paths.append(b);
  }
  const log = clear("narrative");
  const entries = s.history.filter((h) => h.room === s.room).slice(-4);
  for (const h of entries) {
    const p = element(
      "p",
      `${h.speaker ? h.speaker + ": " : ""}${h.text}`,
      `log-entry ${h.kind}`,
    );
    log.append(p);
  }
  if (
    settings.textSpeed === "animated" &&
    settings.motion !== "off" &&
    !matchMedia("(prefers-reduced-motion: reduce)").matches &&
    log.lastChild
  ) {
    const p = log.lastChild,
      text = p.textContent;
    let n = 0;
    p.textContent = "";
    reveal = () => (p.textContent = text);
    $("reveal-text").hidden = false;
    timer = setInterval(() => {
      n += 6;
      p.textContent = text.slice(0, n);
      if (n >= text.length) stopText();
    }, 24);
  }
  const tracker = clear("shard-tracker");
  SHARDS.forEach((id, i) => {
    const b = button(
      s.shards.includes(id) ? "◆" : "◇",
      () => memories(id),
      `memory-${i + 1}`,
      s.shards.includes(id) ? "shard recovered" : "shard",
    );
    b.setAttribute(
      "aria-label",
      s.shards.includes(id)
        ? MEMORIES[id].title
        : "Missing fragment " + (i + 1),
    );
    b.title = b.getAttribute("aria-label");
    tracker.append(b);
  });
  const nearby = clear("nearby-items");
  nearby.append(element("p", "Objects to carry", "group-label"));
  for (const id of availableItems(s)) {
    const row = element("div", undefined, "object-row");
    row.append(
      button(
        nameOf(id),
        () => perform({ type: "examine", target: id }),
        "examine-" + id,
      ),
      button("Take", () => perform({ type: "take", target: id }), "take-" + id),
    );
    if (items[id].readText)
      row.append(
        button(
          "Read",
          () => perform({ type: "read", target: id }),
          "read-" + id,
        ),
      );
    nearby.append(row);
  }
  if (!availableItems(s).length)
    nearby.append(element("p", "Nothing loose within reach.", "muted small"));
  const people = clear("nearby-people");
  for (const id of roomNPCs(s)) {
    const b = button(
      "",
      () => perform({ type: "talk", target: id }),
      "talk-" + id,
      "person-btn",
    );
    const art = element("span");
    art.innerHTML = portrait(id, s.flags);
    art.setAttribute("aria-hidden", "true");
    b.append(art, element("span", "Talk to " + nameOf(id)));
    people.append(b);
  }
  const scenery = clear("nearby-objects");
  scenery.append(element("p", "Look closer", "group-label"));
  for (const id of objects(s)) {
    const row = element("div", undefined, "object-row");
    row.append(
      button(
        nameOf(id),
        () => perform({ type: "examine", target: id }),
        "examine-" + id,
      ),
      button(
        "Search",
        () => perform({ type: "search", target: id }),
        "search-" + id,
      ),
    );
    scenery.append(row);
  }
  const special = clear("special-actions");
  if (
    s.room === "dragons_pass" &&
    !s.flags.heat_survived &&
    s.evidence.includes("shrine")
  )
    special.append(
      button("Speak “Hearth”", () => perform({ type: "hearth" }), "hearth"),
    );
  if (
    s.room === "citadel_gate" &&
    !s.flags.citadel_open &&
    s.evidence.includes("wrist")
  )
    special.append(
      button("Acknowledge the mark", () => perform({ type: "ward" }), "ward"),
    );
  const puzzle = PUZZLES[s.room],
    panel = clear("puzzle-panel");
  panel.hidden =
    !puzzle ||
    s.flags[puzzle.flag] ||
    (s.room === "sunken_temple" && !s.flags.drain_found);
  if (!panel.hidden) {
    panel.append(
      element("h2", puzzle.name),
      element("p", s.puzzles[s.room].join(" → ") || "Choose the first symbol."),
    );
    for (const symbol of puzzle.options)
      panel.append(
        button(
          nameOf(symbol),
          () => perform({ type: "puzzle", target: symbol }),
          "symbol-" + symbol,
        ),
      );
  }
  const final = clear("finale-panel");
  final.hidden = s.room !== "throne_room";
  if (!final.hidden) {
    final.append(element("h2", "The fate of the Crown"));
    if (!s.flags.crown_assembled) {
      final.append(
        element(
          "p",
          "The empty frame can contain the fragments. No one will wear them until you choose.",
        ),
        button(
          "Bind the five fragments",
          () => perform({ type: "assemble" }),
          "assemble",
          "primary",
        ),
      );
      if (s.flags.unbinding_known)
        final.append(
          button(
            "Release the fragments with Yarrow’s vow",
            () => perform({ type: "unmake" }),
            "unmake",
          ),
        );
      else
        final.append(
          element(
            "p",
            "A trusted witness and the old records may reveal another way.",
            "muted small",
          ),
        );
    } else {
      final.append(
        element(
          "p",
          "These choices end your journey. A checkpoint lets you replay this chapter.",
        ),
      );
      for (const [id, label] of [
        ["dark", "Let Aldric wear the Crown"],
        ["true", "Shatter the bound Crown"],
        ["domination", "Strike Aldric and claim the Crown"],
      ]) {
        const b = button(
          label,
          () => perform({ type: "finish", target: id }),
          "finish-" + id,
        );
        b.disabled = id !== "dark" && !s.inventory.includes("sword");
        final.append(b);
      }
      if (!s.inventory.includes("sword"))
        final.append(
          element(
            "p",
            "Take the blade from the wall to choose either armed action.",
          ),
        );
    }
  }
  $("current-question").textContent =
    QUESTIONS[
      !s.evidence.includes("banners")
        ? "identity"
        : !s.evidence.includes("ritual")
          ? "crown"
          : "aldric"
    ];
  if (["banners", "ritual", "aldric"].every((id) => s.evidence.includes(id)))
    $("current-question").textContent =
      "You know your name, the Crown’s purpose and Aldric’s design. What will you choose to do with that knowledge?";
  renderBuilder();
}
function conversation() {
  const id = s.conversation;
  if (!id) return;
  const body = modal(nameOf(id), "A CONVERSATION", "conversation"),
    layout = element("div", undefined, "dialogue-layout"),
    art = element("div", undefined, "portrait");
  art.innerHTML = portrait(id, s.flags);
  const copy = element("div");
  copy.append(
    element(
      "p",
      s.history
        .filter((h) => h.kind === "dialogue" && h.speaker === nameOf(id))
        .at(-1)?.text || "What will you ask?",
    ),
  );
  layout.append(art, copy);
  body.append(layout);
  const topics = element("div", undefined, "topic-list");
  for (const t of dialogueTopics(s, id))
    topics.append(
      button(
        t.label,
        () => perform({ type: "reply", npc: id, target: t.id }),
        "topic-" + t.id,
      ),
    );
  body.append(topics);
}
function memories(id) {
  const body = modal("Fragments of memory", "THE CROWN REMEMBERS");
  for (const shard of SHARDS.filter((shard) => !id || shard === id)) {
    const card = element("article", undefined, "journal-card");
    card.append(
      element(
        "h3",
        s.shards.includes(shard)
          ? MEMORIES[shard].title
          : "A memory still missing",
      ),
      element(
        "p",
        s.shards.includes(shard)
          ? MEMORIES[shard].text
          : "Recover this fragment to hear its memory.",
      ),
    );
    body.append(card);
  }
}
function journal(tab = "evidence") {
  const body = modal("Your journal", "CLUES, MEMORIES & CONVERSATIONS");
  const tabs = element("div", undefined, "tabs");
  for (const t of ["evidence", "memories", "history"])
    tabs.append(
      button(nameOf(t), () => (t === "memories" ? memories() : journal(t))),
    );
  body.append(tabs);
  if (tab === "history") {
    for (const h of s.history) {
      const card = element("article", undefined, "journal-card");
      card.append(
        element(
          "small",
          `${rooms[h.room].title}${h.speaker ? " · " + h.speaker : ""}`,
        ),
        element("p", h.text),
      );
      body.append(card);
    }
    return;
  }
  for (const [group, question] of Object.entries(QUESTIONS)) {
    body.append(element("h3", nameOf(group)), element("p", question, "muted"));
    const found = s.evidence.filter((id) => EVIDENCE[id].group === group);
    if (!found.length)
      body.append(
        element(
          "p",
          "No evidence recorded yet. Inspect places and ask questions.",
          "muted small",
        ),
      );
    for (const id of found) {
      const e = EVIDENCE[id],
        card = element("article", undefined, "journal-card");
      card.append(
        element("h4", e.title),
        element("small", e.source),
        element("p", e.text),
      );
      body.append(card);
    }
  }
}
function pack() {
  const body = modal("Your pack", "TOOLS & RECORDS");
  const carried = s.inventory.filter((id) => !SHARDS.includes(id));
  if (!carried.length)
    body.append(
      element(
        "p",
        "Your pack is empty. Crown memories are kept in the tracker.",
      ),
    );
  for (const id of carried) {
    const row = element("div", undefined, "pack-row");
    row.append(
      element("strong", nameOf(id)),
      button("Inspect", () => {
        closeDialog();
        perform({ type: "examine", target: id });
      }),
      button("Read", () => {
        closeDialog();
        perform({ type: "read", target: id });
      }),
      button("Use", () => {
        closeDialog();
        builder = { verb: "use", source: id };
        $("classic-panel").open = true;
        renderBuilder();
        $("classic-panel").scrollIntoView({ block: "nearest" });
      }),
    );
    body.append(row);
  }
}
function map() {
  const body = modal("The roads you know", "EXPLORED MAP");
  body.append(
    element(
      "p",
      "Travel between explored places along open paths. Unexplored destinations remain hidden.",
    ),
  );
  const diagram = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  diagram.setAttribute("viewBox", "0 0 720 360");
  diagram.setAttribute("class", "map-diagram");
  diagram.setAttribute("aria-hidden", "true");
  let drawing = "";
  for (const id of s.visited) {
    const [x, y] = MAP_POS[id];
    for (const e of exits(s, id)) {
      if (!s.visited.includes(e.to)) continue;
      const [tx, ty] = MAP_POS[e.to];
      drawing += `<path d="M${60 + x * 120} ${40 + y * 95} L${60 + tx * 120} ${40 + ty * 95}" stroke="${e.open ? "#8c9d88" : "#59625f"}" stroke-dasharray="${e.open ? "0" : "4 5"}"/>`;
    }
  }
  for (const id of s.visited) {
    const [x, y] = MAP_POS[id];
    drawing += `<circle cx="${60 + x * 120}" cy="${40 + y * 95}" r="7" fill="${id === s.room ? "#edcd8b" : "#7f9d93"}"/><text x="${60 + x * 120}" y="${60 + y * 95}" fill="#e6deca" font-size="9" text-anchor="middle">${rooms[id].title}</text>`;
  }
  diagram.innerHTML = drawing;
  body.append(diagram);
  const grid = element("div", undefined, "map-grid");
  for (const id of s.visited) {
    const b = button(
      rooms[id].title,
      () => {
        closeDialog();
        stopText();
        if (travel(s, id)) {
          if (id === "throne_room" && !s.flags.crown_assembled)
            saveCheckpoint();
          save();
          render();
          audio.play("step");
        } else {
          render();
        }
      },
      "travel-" + id,
    );
    b.disabled = id === s.room;
    grid.append(b);
  }
  body.append(grid);
}
function renderBuilder() {
  const verbs = clear("verb-list");
  for (const verb of ["examine", "take", "read", "search", "talk", "use"])
    verbs.append(
      button(
        nameOf(verb),
        () => {
          stopText();
          builder = { verb };
          renderBuilder();
        },
        "verb-" + verb,
      ),
    );
  $("command-line").textContent = builder.verb
    ? `${nameOf(builder.verb)} ${builder.source ? nameOf(builder.source) + " on…" : "…"}`
    : "Choose a verb.";
  const targets = clear("command-targets");
  if (!builder.verb) return;
  let ids =
    builder.verb === "talk"
      ? roomNPCs(s)
      : builder.verb === "take"
        ? availableItems(s)
        : builder.verb === "search"
          ? objects(s)
          : builder.verb === "use" && !builder.source
            ? [
                ...s.inventory,
                ...(SHARDS.every((id) => s.inventory.includes(id))
                  ? ["crown_shards"]
                  : []),
              ]
            : [
                ...objects(s),
                ...availableItems(s),
                ...s.inventory,
                ...(builder.verb === "use" ? roomNPCs(s) : []),
              ];
  for (const id of [...new Set(ids)])
    targets.append(
      button(
        nameOf(id),
        () => {
          if (builder.verb === "use" && !builder.source) {
            builder.source = id;
            renderBuilder();
          } else
            perform({
              type: builder.verb,
              target: builder.source || id,
              ...(builder.source ? { on: id } : {}),
            });
        },
        "target-" + id,
      ),
    );
}
function options() {
  const body = modal("Reading & sound", "MAKE YOURSELF COMFORTABLE");
  const form = element("div", undefined, "settings-form");
  function select(label, key, values) {
    const row = element("label", label),
      input = element("select");
    input.id = "setting-" + key;
    for (const [value, title] of values) {
      const option = element("option", title);
      option.value = value;
      input.append(option);
    }
    input.value = String(settings[key]);
    input.onchange = () => {
      stopText();
      settings[key] = input.value;
      applySettings();
      put("settings_v1", JSON.stringify(settings));
    };
    row.append(input);
    form.append(row);
  }
  select(
    "Text size",
    "fontSize",
    [16, 18, 20, 22].map((n) => [n, n + " px"]),
  );
  select("Text appearance", "textSpeed", [
    ["instant", "Instant"],
    ["animated", "Gentle reveal"],
  ]);
  select("Illustration motion", "motion", [
    ["system", "Follow device preference"],
    ["off", "Still illustrations"],
  ]);
  const label = element("label", "Sound and regional ambience"),
    sound = document.createElement("input");
  sound.type = "checkbox";
  sound.id = "setting-sound";
  sound.checked = !!settings.sound;
  sound.onchange = () => {
    settings.sound = sound.checked;
    applySettings();
    put("settings_v1", JSON.stringify(settings));
    audio.unlock().then(() => audio.play("discovery"));
  };
  label.append(sound);
  form.append(label);
  const volumeLabel = element("label", "Volume"),
    volume = document.createElement("input");
  volume.id = "setting-volume";
  volume.type = "range";
  volume.min = 0;
  volume.max = 1;
  volume.step = 0.05;
  volume.value = settings.volume;
  volume.oninput = () => {
    settings.volume = Number(volume.value);
    applySettings();
    put("settings_v1", JSON.stringify(settings));
  };
  volumeLabel.append(volume);
  form.append(volumeLabel);
  body.append(form);
}
function decisions(state) {
  return [
    state.flags.knight_healed
      ? "You healed the knight."
      : "The knight received no aid.",
    state.flags.yarrow_trust
      ? "You earned Yarrow’s trust."
      : state.flags.yarrow_intimidated
        ? "You threatened Yarrow."
        : "Yarrow remained a stranger.",
    state.flags.dragon_repaid
      ? "You returned the dragon’s seal."
      : state.flags.dragon_truth
        ? "You shared your memories with Pyraxis."
        : state.flags.dragon_intimidated
          ? "You demanded the dragon’s shard."
          : "You gave Pyraxis your promise.",
    state.flags.aldric_confronted
      ? "You exposed Aldric’s design."
      : "Aldric’s design remained unchallenged.",
  ];
}
function complete() {
  closeDialog();
  stopText();
  chronicle.push({
    ending: s.ending,
    unbound: !!s.flags.unbound,
    actions: s.actions,
    places: s.visited.length,
    clues: s.evidence.length,
    decisions: decisions(s),
    date: new Date().toISOString(),
  });
  chronicle = chronicle.slice(-12);
  put("chronicle_v1", JSON.stringify(chronicle));
  put("run_v1", null);
  saved = null;
  screen("ending-screen");
  $("ending-art").innerHTML = scene("throne_room", s.flags);
  $("ending-title").textContent = ENDINGS[s.ending].title;
  $("ending-subtitle").textContent = ENDINGS[s.ending].subtitle;
  const narrative = clear("ending-narrative");
  for (const line of endingLines(s).filter(
    (line) =>
      line.trim() && !/^[-═=*_\s]+$/.test(line) && !line.includes("GAME OVER"),
  ))
    narrative.append(element("p", line));
  const after = clear("epilogue");
  for (const line of epilogue(s)) after.append(element("p", line));
  $("journey-recap").textContent =
    `${s.visited.length} places explored · ${s.evidence.length} clues recorded · ${s.shards.length} memories recovered · ${s.actions} actions${s.flags.unbound ? " · The Crown was never restored." : ""}`;
  for (const choice of decisions(s))
    $("journey-recap").append(element("p", choice));
  $("ending-replay").hidden = !checkpoint;
  window.scrollTo(0, 0);
  audio.setActive(true);
  audio.play("ending");
}
$("cover-art").innerHTML = scene("cover");
applySettings();
$("new-btn").onclick = () => {
  checkpoint = null;
  put("checkpoint_v1", null);
  start(createJourney());
};
$("continue-btn").onclick = () => saved && start(saved);
for (const id of ["menu-checkpoint", "ending-replay"])
  $(id).onclick = () => checkpoint && start(checkpoint);
for (const id of ["menu-btn", "ending-menu", "title-home"])
  $(id).onclick = (e) => {
    e.preventDefault();
    menu();
  };
for (const id of ["menu-settings", "settings-btn"]) $(id).onclick = options;
$("prologue-btn").onclick = () => {
  const body = modal("Before the ashes", "THE PROLOGUE");
  for (const line of INTRO_TEXT) body.append(element("p", line));
};
$("chronicle-btn").onclick = () => {
  const body = modal("Journey records", "YOUR CHRONICLE");
  if (!chronicle.length)
    body.append(element("p", "Complete a journey to begin your chronicle."));
  for (const r of [...chronicle].reverse())
    body.append(
      element(
        "p",
        `${ENDINGS[r.ending].title}${r.unbound ? " · Unbound release" : ""} — ${r.places} places, ${r.clues} clues, ${r.actions} actions. ${Array.isArray(r.decisions) ? r.decisions.join(" ") : ""}`,
      ),
    );
};
$("quick-read").onclick = () =>
  document.querySelector(".scene-frame").scrollIntoView({ block: "start" });
$("quick-actions").onclick = () =>
  document
    .querySelector(".interaction-column")
    .scrollIntoView({ block: "start" });
$("quick-paths").onclick = () =>
  $("exit-list").scrollIntoView({ block: "center" });
$("map-btn").onclick = map;
$("journal-btn").onclick = () => journal();
$("clue-btn").onclick = () => journal();
$("pack-btn").onclick = pack;
$("hint-btn").onclick = () => perform({ type: "hint" });
$("reveal-text").onclick = stopText;
$("cancel-command").onclick = () => {
  builder = {};
  renderBuilder();
};
$("dialog-close").onclick = closeDialog;
$("dialog").addEventListener("cancel", (e) => {
  e.preventDefault();
  closeDialog();
});
addEventListener("keydown", (e) => {
  if (e.key === "Escape" && $("dialog").open) {
    e.preventDefault();
    closeDialog();
    return;
  }
  if (
    $("dialog").open ||
    !s ||
    s.ending ||
    $("game-screen").hidden ||
    /INPUT|SELECT|TEXTAREA/.test(e.target.tagName) ||
    e.ctrlKey ||
    e.metaKey ||
    e.altKey
  )
    return;
  const key = e.key.toLowerCase();
  if (key === "escape") {
    builder = {};
    renderBuilder();
    return;
  }
  const shortcuts = {
    m: map,
    j: () => journal(),
    i: pack,
    c: () => {
      $("classic-panel").open = !$("classic-panel").open;
    },
    "?": () => perform({ type: "hint" }),
  };
  const directions = {
    arrowup: "north",
    arrowdown: "south",
    arrowleft: "west",
    arrowright: "east",
    n: "north",
    s: "south",
    w: "west",
    e: "east",
    u: "up",
    d: "down",
  };
  if (shortcuts[key]) {
    e.preventDefault();
    shortcuts[key]();
  } else if (directions[key]) {
    e.preventDefault();
    perform({ type: "move", target: directions[key] });
  }
});
document.addEventListener("visibilitychange", () => {
  audio.setActive(!document.hidden && !$("game-screen").hidden);
  if (document.hidden) save();
});
addEventListener("pagehide", save);
menu();
