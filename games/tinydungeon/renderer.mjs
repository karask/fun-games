import { WIDTH, HEIGHT, BIOMES, ITEMS } from "./data.mjs";
import { distance } from "./engine.mjs";
const TILE = 32;
const CROPS = {
  Fighter: [108, 108, 449, 437],
  Mage: [87, 114, 368, 399],
  Priest: [184, 69, 297, 534],
  Rogue: [127, 76, 398, 481],
  Goblin: [134, 134, 366, 430],
  Skeleton: [95, 63, 501, 577],
  Orc: [121, 65, 501, 511],
  Wraith: [153, 116, 295, 409],
  Giant: [39, 7, 482, 633],
  Lich: [128, 79, 384, 472],
  "Orc Chieftain": [95, 34, 530, 596],
};
export function createRenderer(canvas) {
  const ctx = canvas.getContext("2d");
  canvas.width = WIDTH * TILE;
  canvas.height = HEIGHT * TILE;
  const images = {};
  for (const name of Object.keys(CROPS)) {
    const img = new Image();
    img.src = `assets/${name.toLowerCase().replaceAll(" ", "_")}.png`;
    images[name] = img;
  }
  let camera = { x: 0, y: 0 },
    cameraReady = false;
  new ResizeObserver(() => {
    const narrow = canvas.getBoundingClientRect().width < 550;
    canvas.width = (narrow ? 12 : 20) * TILE;
    canvas.height = (narrow ? 10 : 13) * TILE;
  }).observe(canvas);
  const motion = matchMedia("(prefers-reduced-motion: reduce)");
  let effects = [],
    positions = new Map(),
    last = 0,
    state = null,
    pointer = null,
    shake = 0;
  function ingest(s) {
    state = s;
    for (const e of s.events) {
      effects.push({ ...e, age: 0 });
      if (e.type === "hurt") shake = motion.matches ? 0 : 3;
    }
    s.events = [];
  }
  function rounded(x, y, w, h, r, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, r);
    ctx.fill();
  }
  function glyph(type, x, y, color = "#ddc78b") {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    ctx.lineWidth = 2;
    if (type === "potion" || type === "greater") {
      rounded(-5, -4, 10, 13, 3, "#a74e68");
      ctx.fillStyle = "#e49bac";
      ctx.fillRect(-3, 0, 3, 6);
      ctx.fillStyle = "#d1b991";
      ctx.fillRect(-3, -9, 6, 5);
    } else if (type === "stairs") {
      for (let i = 0; i < 4; i++) {
        ctx.fillStyle = ["#615d5a", "#7d796e", "#a39e89", "#cfbf98"][i];
        ctx.fillRect(-11 + i * 2, -9 + i * 5, 22 - i * 4, 4);
      }
    } else if (type === "shrine") {
      ctx.fillStyle = "#678c9c";
      ctx.fillRect(-9, 7, 18, 4);
      ctx.fillRect(-6, 2, 12, 5);
      ctx.fillStyle = "#afe0d6";
      ctx.beginPath();
      ctx.moveTo(0, -13);
      ctx.lineTo(6, -3);
      ctx.lineTo(0, 4);
      ctx.lineTo(-6, -3);
      ctx.fill();
    } else if (type === "camp") {
      ctx.strokeStyle = "#b28355";
      ctx.beginPath();
      ctx.moveTo(-8, 7);
      ctx.lineTo(8, 3);
      ctx.moveTo(-8, 3);
      ctx.lineTo(8, 7);
      ctx.stroke();
      ctx.fillStyle = "#ffc975";
      ctx.beginPath();
      ctx.moveTo(-5, 2);
      ctx.lineTo(0, -11);
      ctx.lineTo(5, 2);
      ctx.fill();
    } else if (type === "treasure" || type === "armory") {
      rounded(-10, -5, 20, 15, 2, type === "treasure" ? "#835154" : "#8f7550");
      ctx.strokeStyle = "#dbc18a";
      ctx.strokeRect(-10, -5, 20, 15);
      ctx.beginPath();
      ctx.moveTo(-10, 1);
      ctx.lineTo(10, 1);
      ctx.stroke();
      ctx.fillStyle = "#e8d69a";
      ctx.fillRect(-2, -1, 4, 5);
    } else if (type === "staff" || type === "runestaff") {
      ctx.beginPath();
      ctx.moveTo(-5, 11);
      ctx.lineTo(5, -8);
      ctx.stroke();
      ctx.fillStyle = "#acbdea";
      ctx.beginPath();
      ctx.arc(6, -9, 4, 0, Math.PI * 2);
      ctx.fill();
    } else if (type === "spear" || type === "glaive") {
      ctx.beginPath();
      ctx.moveTo(-7, 12);
      ctx.lineTo(5, -8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(2, -6);
      ctx.lineTo(8, -14);
      ctx.lineTo(8, -5);
      ctx.fill();
    } else if (type === "axe") {
      ctx.beginPath();
      ctx.moveTo(-5, 12);
      ctx.lineTo(5, -10);
      ctx.stroke();
      ctx.fillStyle = "#b7c3be";
      ctx.beginPath();
      ctx.moveTo(3, -9);
      ctx.lineTo(12, -6);
      ctx.lineTo(9, 1);
      ctx.lineTo(0, -3);
      ctx.fill();
    } else if (ITEMS[type]?.type === "weapon") {
      ctx.beginPath();
      ctx.moveTo(-7, 10);
      ctx.lineTo(7, -10);
      ctx.moveTo(-6, 2);
      ctx.lineTo(2, 8);
      ctx.stroke();
      ctx.fillStyle = "#b6ccd0";
      ctx.beginPath();
      ctx.moveTo(0, 1);
      ctx.lineTo(6, -12);
      ctx.lineTo(10, -13);
      ctx.lineTo(8, -8);
      ctx.fill();
    } else if (ITEMS[type]?.type === "armor") {
      ctx.beginPath();
      ctx.moveTo(-8, -8);
      ctx.lineTo(0, -5);
      ctx.lineTo(8, -8);
      ctx.lineTo(7, 6);
      ctx.lineTo(0, 11);
      ctx.lineTo(-7, 6);
      ctx.closePath();
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, 7, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillRect(-2, -10, 4, 5);
    }
    ctx.restore();
  }
  function creature(e, x, y, size, time) {
    const name = e.sprite || e.class,
      img = images[name],
      crop = CROPS[name];
    ctx.fillStyle = "#0006";
    ctx.beginPath();
    ctx.ellipse(x, y + 12, size * 0.36, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    const hit = effects.some(
      (f) =>
        ["hit", "hurt"].includes(f.type) &&
        f.x === e.x &&
        f.y === e.y &&
        f.age < 0.15,
    );
    ctx.save();
    if (hit) ctx.filter = "brightness(2) saturate(.4)";
    if (img?.complete && img.naturalWidth) {
      const [sx, sy, sw, sh] = crop,
        scale = size / Math.max(sw, sh);
      ctx.drawImage(
        img,
        sx,
        sy,
        sw,
        sh,
        x - (sw * scale) / 2,
        y + 13 - sh * scale,
        sw * scale,
        sh * scale,
      );
    } else {
      const color = e.color || "#c69c71",
        bob = motion.matches ? 0 : Math.sin(time * 2 + e.id) * 1.3;
      ctx.translate(x, y + bob);
      ctx.fillStyle = color;
      ctx.strokeStyle = "#1b2029";
      ctx.lineWidth = 1.5;
      if (/Dragon/.test(name)) {
        ctx.beginPath();
        ctx.moveTo(-4, -5);
        ctx.lineTo(-size / 2, -15);
        ctx.lineTo(-size / 2 + 2, 5);
        ctx.lineTo(0, 3);
        ctx.lineTo(size / 2 - 2, 5);
        ctx.lineTo(size / 2, -15);
        ctx.lineTo(4, -5);
        ctx.fill();
      } else if (/Bat|Ghost|Wraith/.test(name)) {
        ctx.beginPath();
        ctx.moveTo(-12, -9);
        ctx.lineTo(-17, 5);
        ctx.lineTo(-4, 0);
        ctx.lineTo(0, 10);
        ctx.lineTo(4, 0);
        ctx.lineTo(17, 5);
        ctx.lineTo(12, -9);
        ctx.lineTo(0, -3);
        ctx.fill();
      } else if (/Spider/.test(name)) {
        for (let i = 0; i < 3; i++) {
          ctx.beginPath();
          ctx.moveTo(-13, -8 + i * 7);
          ctx.lineTo(0, 0);
          ctx.lineTo(13, -8 + i * 7);
          ctx.strokeStyle = color;
          ctx.stroke();
        }
      } else if (/Demon|Minotaur/.test(name)) {
        ctx.beginPath();
        ctx.moveTo(-8, -7);
        ctx.lineTo(-12, -19);
        ctx.lineTo(-2, -11);
        ctx.lineTo(2, -11);
        ctx.lineTo(12, -19);
        ctx.lineTo(8, -7);
        ctx.fill();
      }
      if (/Rat|Wolf/.test(name)) {
        rounded(-11, -2, 19, 11, 4, color);
        ctx.beginPath();
        ctx.moveTo(5, -1);
        ctx.lineTo(4, -10);
        ctx.lineTo(9, -7);
        ctx.lineTo(12, -10);
        ctx.lineTo(12, 1);
        ctx.lineTo(16, 3);
        ctx.lineTo(8, 5);
        ctx.fill();
        ctx.fillRect(-8, 7, 3, 6);
        ctx.fillRect(5, 7, 3, 6);
        ctx.strokeStyle = color;
        ctx.beginPath();
        ctx.moveTo(-10, 3);
        ctx.lineTo(-16, -2);
        ctx.stroke();
        ctx.fillStyle = "#f5e2ae";
        ctx.fillRect(10, -3, 2, 2);
        ctx.restore();
        return;
      }
      if (/Slime/.test(name)) {
        ctx.beginPath();
        ctx.ellipse(0, 4, 12, 9, 0, Math.PI, Math.PI * 2);
        ctx.lineTo(12, 11);
        ctx.lineTo(-12, 11);
        ctx.fill();
      } else {
        rounded(-8, -9, 16, 19, 5, color);
        if (/heavy|slam|charge/.test(e.kind)) {
          ctx.fillStyle = "#30323b";
          ctx.fillRect(-10, -2, 20, 5);
        }
        ctx.fillStyle = color;
        ctx.fillRect(-8, 7, 5, 6);
        ctx.fillRect(3, 7, 5, 6);
      }
      ctx.fillStyle = e.boss ? "#ffea9a" : "#f4eacb";
      ctx.fillRect(-5, -5, 3, 3);
      ctx.fillRect(3, -5, 3, 3);
      ctx.fillStyle = "#202631";
      ctx.fillRect(-3, 3, 6, 2);
      if (name === "Archlich" || /Vampire/.test(name)) {
        ctx.strokeStyle = "#d2b1fa";
        ctx.beginPath();
        ctx.moveTo(11, -14);
        ctx.lineTo(11, 12);
        ctx.stroke();
        ctx.fillStyle = "#d2b1fa";
        ctx.fillRect(8, -15, 6, 6);
      }
    }
    ctx.restore();
  }
  function draw(now) {
    requestAnimationFrame(draw);
    const dt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    if (!state || document.hidden) return;
    const s = state,
      time = now / 1000,
      p = s.player,
      b = BIOMES[Math.min(3, Math.floor((s.floor - 1) / 3))];
    effects = effects
      .map((e) => ({ ...e, age: e.age + dt }))
      .filter((e) => e.age < 0.65);
    shake = Math.max(0, shake - dt * 18);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = "#0a1112";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    if (shake)
      ctx.translate(Math.sin(now * 0.12) * shake, Math.cos(now * 0.1) * shake);
    const targetCamera = {
      x: Math.max(
        0,
        Math.min(
          WIDTH * TILE - canvas.width,
          p.x * TILE + 16 - canvas.width / 2,
        ),
      ),
      y: Math.max(
        0,
        Math.min(
          HEIGHT * TILE - canvas.height,
          p.y * TILE + 16 - canvas.height / 2,
        ),
      ),
    };
    const cameraT = motion.matches || !cameraReady ? 1 : 1 - Math.exp(-dt * 16);
    camera = {
      x: camera.x + (targetCamera.x - camera.x) * cameraT,
      y: camera.y + (targetCamera.y - camera.y) * cameraT,
    };
    cameraReady = true;
    ctx.translate(-camera.x, -camera.y);
    ctx.imageSmoothingEnabled = false;
    for (let y = 0; y < HEIGHT; y++)
      for (let x = 0; x < WIDTH; x++) {
        const i = y * WIDTH + x;
        if (!s.explored[i]) continue;
        const px = x * TILE,
          py = y * TILE,
          wall = s.map[y][x] === 1,
          noise = (x * 17 + y * 31 + s.floor * 13) % 13;
        ctx.fillStyle = wall ? b.wall : b.floor;
        ctx.fillRect(px, py, TILE, TILE);
        if (wall) {
          ctx.fillStyle = "#0003";
          ctx.fillRect(px, py + 25, 32, 7);
          ctx.strokeStyle = "#10181b88";
          ctx.strokeRect(px + 0.5, py + 0.5, 31, 24);
          ctx.beginPath();
          ctx.moveTo(px, py + 12);
          ctx.lineTo(px + 32, py + 12);
          ctx.moveTo(px + 16, py);
          ctx.lineTo(px + 16, py + 12);
          ctx.moveTo(px + 8, py + 12);
          ctx.lineTo(px + 8, py + 24);
          ctx.stroke();
          if (s.map[y + 1]?.[x] === 0) {
            ctx.fillStyle = b.edge;
            ctx.fillRect(px, py + 25, 32, 2);
          }
        } else {
          ctx.strokeStyle = "#0003";
          ctx.strokeRect(px + 0.5, py + 0.5, 31, 31);
          ctx.fillStyle = "#ffffff06";
          ctx.fillRect(px + 2, py + 2, 28, 1);
          if (noise < 3) {
            ctx.fillStyle = "#b0b2a217";
            ctx.fillRect(px + 5 + noise * 4, py + 12, 3, 2);
            ctx.fillRect(px + 17, py + 22, 5, 2);
          }
          if (noise === 5) {
            ctx.strokeStyle = "#0003";
            ctx.beginPath();
            ctx.moveTo(px + 2, py + 20);
            ctx.lineTo(px + 12, py + 17);
            ctx.lineTo(px + 16, py + 21);
            ctx.stroke();
          }
        }
        if (!s.visible[i]) {
          ctx.fillStyle = "#060d12b8";
          ctx.fillRect(px, py, TILE, TILE);
        }
      }
    // Door lintels mark the corridor mouths; their floor remains visibly walkable.
    for (const r of s.rooms)
      for (const [x, y] of [
        [r.cx, r.y - 1],
        [r.cx, r.y + r.h],
        [r.x - 1, r.cy],
        [r.x + r.w, r.cy],
      ])
        if (s.map[y]?.[x] === 0 && s.explored[y * WIDTH + x]) {
          ctx.fillStyle = b.edge + "77";
          ctx.fillRect(x * TILE + 1, y * TILE + 1, 3, 30);
          ctx.fillRect(x * TILE + 28, y * TILE + 1, 3, 30);
        }
    for (const r of s.rooms) {
      const tx = r.x + 1,
        ty = r.y - 1;
      if (!s.visible[ty * WIDTH + tx] || s.map[ty]?.[tx] !== 1) continue;
      const x = tx * TILE + 16,
        y = ty * TILE + 24,
        flicker = motion.matches ? 1 : 1 + Math.sin(time * 7 + tx) * 0.06;
      const glow = ctx.createRadialGradient(x, y, 2, x, y, 85 * flicker);
      glow.addColorStop(0, "#ecc47738");
      glow.addColorStop(1, "#edb66a00");
      ctx.fillStyle = glow;
      ctx.fillRect(x - 90, y - 90, 180, 180);
      ctx.fillStyle = "#221d19";
      ctx.fillRect(x - 4, y - 3, 8, 14);
      ctx.fillStyle = "#b28d59";
      ctx.fillRect(x - 2, y, 4, 9);
      ctx.fillStyle = "#e49b53";
      ctx.beginPath();
      ctx.ellipse(x, y - 5, 5, 8 * flicker, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#ffe4a1";
      ctx.fillRect(x - 2, y - 8, 4, 7);
    }
    for (const f of [...s.features, { ...s.stairs, type: "stairs" }])
      if (s.explored[f.y * WIDTH + f.x]) {
        ctx.globalAlpha = f.used
          ? 0.35
          : s.visible[f.y * WIDTH + f.x]
            ? 1
            : 0.3;
        if (!f.used && s.visible[f.y * WIDTH + f.x]) {
          const g = ctx.createRadialGradient(
            f.x * TILE + 16,
            f.y * TILE + 16,
            0,
            f.x * TILE + 16,
            f.y * TILE + 16,
            65,
          );
          g.addColorStop(0, f.type === "shrine" ? "#90d6da28" : "#e5b26425");
          g.addColorStop(1, "transparent");
          ctx.fillStyle = g;
          ctx.fillRect(f.x * TILE - 49, f.y * TILE - 49, 130, 130);
        }
        glyph(f.type, f.x * TILE + 16, f.y * TILE + 16);
        ctx.globalAlpha = 1;
      }
    for (const i of s.items)
      if (s.visible[i.y * WIDTH + i.x]) {
        ctx.fillStyle = "#ddc58622";
        ctx.beginPath();
        ctx.ellipse(i.x * TILE + 16, i.y * TILE + 23, 10, 4, 0, 0, Math.PI * 2);
        ctx.fill();
        glyph(i.item, i.x * TILE + 16, i.y * TILE + 14);
      }
    for (const e of s.enemies)
      if (e.intent)
        for (const t of e.intent.tiles)
          if (s.visible[t.y * WIDTH + t.x]) {
            const alpha = motion.matches
              ? 0.25
              : 0.22 + Math.sin(time * 5) * 0.06;
            ctx.fillStyle = `rgba(245,112,93,${alpha})`;
            ctx.fillRect(t.x * TILE + 1, t.y * TILE + 1, 30, 30);
            ctx.strokeStyle = "#ed9679";
            ctx.strokeRect(t.x * TILE + 3.5, t.y * TILE + 3.5, 25, 25);
          }
    const living = new Set(["player", ...s.enemies.map((e) => e.id)]);
    for (const id of positions.keys())
      if (!living.has(id)) positions.delete(id);
    for (const e of [...s.enemies, p].sort((a, b) => a.y - b.y)) {
      if (e !== p && !s.visible[e.y * WIDTH + e.x]) continue;
      const id = e === p ? "player" : e.id,
        target = { x: e.x * TILE + 16, y: e.y * TILE + 16 };
      let pos = positions.get(id) || target;
      const t = motion.matches ? 1 : 1 - Math.exp(-dt * 22);
      if (distance(pos, target) > 150) pos = target;
      else
        pos = {
          x: pos.x + (target.x - pos.x) * t,
          y: pos.y + (target.y - pos.y) * t,
        };
      positions.set(id, pos);
      if (e === p) {
        ctx.strokeStyle = "#d9c38a99";
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(pos.x, pos.y + 11, 13, 5, 0, 0, Math.PI * 2);
        ctx.stroke();
      }
      const lunge =
          e === p
            ? effects.find((f) => f.type === "lunge" && f.age < 0.18)
            : null,
        offset =
          lunge && !motion.matches
            ? Math.sin((lunge.age / 0.18) * Math.PI) * 7
            : 0;
      creature(
        e,
        pos.x + (lunge?.dx || 0) * offset,
        pos.y + (lunge?.dy || 0) * offset,
        e.boss ? 35 : 30,
        time,
      );
      if (e !== p) {
        if (e.hp < e.maxHp || e.boss) {
          ctx.fillStyle = "#13171c";
          ctx.fillRect(pos.x - 12, pos.y - 19, 24, 3);
          ctx.fillStyle = e.boss ? "#e6b97a" : "#cd7a70";
          ctx.fillRect(pos.x - 12, pos.y - 19, (24 * e.hp) / e.maxHp, 3);
        }
        if (e.intent) {
          ctx.fillStyle = "#ffda99";
          ctx.font = "bold 15px monospace";
          ctx.textAlign = "center";
          ctx.fillText("!", pos.x, pos.y - 23);
        } else if (e.exposed || e.recovery) {
          ctx.fillStyle = "#c5b3ee";
          ctx.font = "10px monospace";
          ctx.textAlign = "center";
          ctx.fillText("OPEN", pos.x, pos.y - 23);
        }
      }
    }
    // Subtle distance shade preserves crisp tile and sprite silhouettes.
    const shade = ctx.createRadialGradient(
      p.x * TILE + 16,
      p.y * TILE + 16,
      48,
      p.x * TILE + 16,
      p.y * TILE + 16,
      250,
    );
    shade.addColorStop(0, "#060b1000");
    shade.addColorStop(1, "#060b1038");
    ctx.fillStyle = shade;
    ctx.fillRect(0, 0, WIDTH * TILE, HEIGHT * TILE);
    for (const e of effects) {
      const x = e.x * TILE + 16,
        y = e.y * TILE + 16;
      ctx.globalAlpha = Math.max(0, 1 - e.age / 0.65);
      if (e.type === "bolt") {
        ctx.fillStyle = "#b3e5f4";
        ctx.beginPath();
        ctx.arc(x, y, Math.max(1, 6 - e.age * 8), 0, Math.PI * 2);
        ctx.fill();
      }
      if (e.type === "strike") {
        ctx.strokeStyle = "#f4b794";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(x, y, 10 + e.age * 28, 0, Math.PI * 2);
        ctx.stroke();
      }
      if (e.text) {
        ctx.font = "bold 12px monospace";
        ctx.textAlign = "center";
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#101922";
        ctx.strokeText(e.text, x, y - 18 - (motion.matches ? 0 : e.age * 24));
        ctx.fillStyle =
          e.type === "hurt"
            ? "#ffa99b"
            : e.type === "heal"
              ? "#bde9b7"
              : "#fff0c3";
        ctx.fillText(e.text, x, y - 18 - (motion.matches ? 0 : e.age * 24));
      }
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    // Exploration map stays small; the camera keeps combat readable on phones.
    const mx = canvas.width - 100,
      my = 8;
    rounded(mx - 5, my - 4, 99, 68, 4, "#071016dd");
    for (let y = 0; y < HEIGHT; y++)
      for (let x = 0; x < WIDTH; x++)
        if (s.explored[y * WIDTH + x]) {
          ctx.fillStyle = s.map[y][x] ? "#52605a" : "#a5b098";
          ctx.globalAlpha = s.visible[y * WIDTH + x] ? 0.65 : 0.3;
          ctx.fillRect(mx + x * 3, my + y * 3, 3, 3);
        }
    ctx.globalAlpha = 1;
    ctx.fillStyle = "#ffe3a2";
    ctx.fillRect(mx + p.x * 3, my + p.y * 3, 3, 3);
    if (pointer) {
      const tile = {
        x: Math.floor((pointer.x + camera.x) / TILE),
        y: Math.floor((pointer.y + camera.y) / TILE),
      };
      if (s.visible[tile.y * WIDTH + tile.x]) {
        const e = s.enemies.find((e) => e.x === tile.x && e.y === tile.y),
          f = s.features.find((f) => f.x === tile.x && f.y === tile.y);
        const text = e
          ? `${e.name} · ${e.hp}/${e.maxHp} HP · ${e.intent ? "ATTACK NEXT TURN" : e.kind}${e.exposed ? " · exposed" : ""}`
          : f
            ? `${f.type}${f.used ? " · spent" : " · E beside it"}`
            : "";
        if (text) {
          ctx.font = "12px monospace";
          const w = ctx.measureText(text).width + 20,
            x = Math.max(4, Math.min(canvas.width - w - 4, pointer.x + 12)),
            y = Math.max(4, pointer.y - 36);
          rounded(x, y, w, 28, 5, "#111c24f5");
          ctx.fillStyle = "#f0dfb6";
          ctx.textAlign = "left";
          ctx.fillText(text, x + 10, y + 18);
        }
      }
    }
  }
  canvas.addEventListener("pointermove", (e) => {
    const r = canvas.getBoundingClientRect();
    pointer = {
      x: ((e.clientX - r.left) * canvas.width) / r.width,
      y: ((e.clientY - r.top) * canvas.height) / r.height,
    };
  });
  canvas.addEventListener("pointerleave", () => (pointer = null));
  requestAnimationFrame(draw);
  return {
    ingest,
    reset() {
      positions.clear();
      effects = [];
      cameraReady = false;
    },
    pause() {
      state = null;
    },
  };
}
