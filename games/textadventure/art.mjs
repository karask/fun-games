// Original code-drawn illustrations: shared engraving language, distinct room compositions.
import { rooms, REGIONS } from "./story.mjs";
const palettes = [
  ["#111d25", "#665149", "#ddaa71", "#27363a"],
  ["#101f23", "#49665a", "#c1c795", "#213b36"],
  ["#16202e", "#52667c", "#c5be9d", "#283846"],
  ["#10242a", "#356166", "#d0c39a", "#1d4246"],
  ["#191a2c", "#554864", "#dcc2a3", "#292539"],
];
const path = (d, fill, stroke = "", width = 1) =>
  `<path d="${d}" fill="${fill}"${stroke ? ` stroke="${stroke}" stroke-width="${width}"` : ""}/>`;
const rect = (x, y, w, h, fill, rx = 0) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="${fill}" rx="${rx}"/>`;
const circle = (x, y, r, fill) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}"/>`;
function tree(x, y, size, color) {
  return `<g transform="translate(${x} ${y}) scale(${size})">${path("M-5 0 -3-94 -18-116 -8-107 -15-137 -1-111 9-146 7-107 25-129 12-100 5-84 7 0Z", color)}${path("M0-84 -35-102 -24-102 -43-128 -15-111 -1-97 M5-75 34-103 28-85 45-87 7-65", color, color, 2)}</g>`;
}
function pine(x, y, size, color) {
  return `<g transform="translate(${x} ${y}) scale(${size})">${rect(-3, -92, 6, 92, color)}${path("M0-142 -27-84 -14-86 -40-49 -23-51 -50-12 50-12 23-51 40-49 14-86 27-84Z", color)}</g>`;
}
function shard(x, y, size = 1) {
  return `<g class="shard-light" transform="translate(${x} ${y}) scale(${size})">${path("M0-22 13-6 8 17 -5 22 -14 0Z", "#e5c98d", "#fff0bf", 1.5)}${path("M0-22 0 10 -5 22 -14 0Z", "#927964")}${path("M0 10 13-6 8 17Z", "#fff0b7")}</g>`;
}
function crown(x, y, size = 1, broken = false) {
  return `<g transform="translate(${x} ${y}) scale(${size})">${path("M-59-29 -40 8 -23-45 0 0 23-45 40 8 59-29 46 46 -46 46Z", "#9b7950", "#efcd8c", 2)}${rect(-46, 30, 92, 17, "#57443b", 3)}${[-31, 0, 31].map((dx) => circle(dx, 37, 3, "#d9c4a0")).join("")}${broken ? path("M-9-26 6-5 -7 13 8 32 -1 49", "none", "#172128", 7) : shard(0, 12, 0.38)}</g>`;
}
function pillar(x, y, h, w = 35) {
  return `<g>${rect(x - w / 2 - 7, y - h, w + 14, 12, "#aba390", 2)}${rect(x - w / 2, y - h + 12, w, h - 21, "#6b7772")}${rect(x - w / 2 + 5, y - h + 15, 4, h - 25, "#a5ae96")}${rect(x - w / 2 + 15, y - h + 15, 3, h - 25, "#354c49")}${rect(x - w / 2 - 9, y - 12, w + 18, 13, "#848b78", 2)}</g>`;
}
function lantern(x, y, lit = true) {
  return `<g class="lantern">${path(`M${x - 3} ${y - 17} Q${x - 13} ${y - 31} ${x} ${y - 31} Q${x + 13} ${y - 31} ${x + 3} ${y - 17}`, "none", "#c5ab73", 2)}${rect(x - 10, y - 17, 20, 30, "#3a342b", 3)}${rect(x - 7, y - 12, 14, 20, lit ? "#edc47b" : "#495454", 2)}${path(`M${x} ${y - 9} Q${x - 7} ${y + 5} ${x} ${y + 7} Q${x + 6} ${y + 2} ${x} ${y - 9}`, "#fff0bb")}${rect(x - 12, y + 11, 24, 4, "#a28a58")}</g>`;
}
function house(x, y, size = 1, ruined = false) {
  return `<g transform="translate(${x} ${y}) scale(${size})">${rect(-70, -84, 140, 84, "#383f3b")}${path(ruined ? "M-88-83 -52-130 -20-110 -8-155 22-112 51-96 84-83Z" : "M-90-80 0-148 90-80Z", "#18282c", "#7b795e", 2)}${rect(-66, -81, 7, 80, "#776854")}${rect(58, -81, 7, 80, "#776854")}${rect(-17, -52, 34, 52, "#172326", 15)}${rect(-51, -62, 21, 27, ruined ? "#25292b" : "#d3b678", 2)}${rect(31, -62, 21, 27, ruined ? "#25292b" : "#d3b678", 2)}${rect(-65, -28, 130, 5, "#665c4b")}${path("M-50-62 -50-35 M-40-62 -40-35 M31-48 52-48", "none", "#746045", 2)}</g>`;
}
function dragon(x, y, size = 1, calm = false) {
  return `<g transform="translate(${x} ${y}) scale(${size})">${path("M-82 39 Q-142 6-160 34 Q-157-5-107 5 L-60 2 Q-81-48-56-91 L-11-32 Q28-34 51-6 L77 7 82 25 53 29 41 57 -70 58Z", "#7d785f", "#c4ab79", 2)}${path("M-59-91 -63 4 -12-32 -36-32 -41-56Z", "#384c47", "#a09670", 1.5)}${path("M47-8 33-32 56-18 67-37 66-8 82 4 74 9Z", "#b2a080")}${path("M-89 33 -46 27 -32 49 5 40 26 56 -1 60 -43 55 -83 58Z", "#424c42")}${path("M-49 42 -62 66 -27 66 M21 45 19 67 53 67", "none", "#a99c78", 8)}${path(calm ? "M50 5 60 5" : "M48 5 61 1 57 9Z", calm ? "none" : "#f4d091", "#f4d091", 2)}${path("M65 22 78 21", "none", "#25332f", 2)}${path("M-111 11-98 2-88 8-74-2-61 1", "none", "#c5ad81", 2)}</g>`;
}
function stoneArch(x, y, w, h, open = true) {
  return `<g>${path(`M${x - w / 2 - 25} ${y} V${y - h + 40} Q${x} ${y - h - 62} ${x + w / 2 + 25} ${y - h + 40} V${y}Z`, "#4d5358", "#888574", 2)}${path(`M${x - w / 2} ${y} V${y - h + 47} Q${x} ${y - h - 25} ${x + w / 2} ${y - h + 47} V${y}Z`, open ? "#101d26" : "#363c42")}${!open ? Array.from({ length: 9 }, (_, i) => rect(x - w / 2 + (i * w) / 8, y - h + 48, 3, h - 48, "#111d25")).join("") : ""}${path(`M${x} ${y - h - 9} V${y - h + 28} M${x - w / 2 - 17} ${y - h + 75} L${x - w / 2 + 2} ${y - h + 85} M${x + w / 2 + 17} ${y - h + 75} L${x + w / 2 - 2} ${y - h + 85}`, "none", "#b6a080", 2)}</g>`;
}
export function scene(roomId = "cover", flags = {}) {
  const cover = roomId === "cover",
    region = cover ? 4 : REGIONS[rooms[roomId].region].index,
    [sky, haze, light, ground] = palettes[region],
    id = `art-${roomId}`;
  const stars = Array.from({ length: 28 }, (_, i) =>
    circle(
      (i * 193 + 71) % 960,
      25 + ((i * 43) % 150),
      i % 5 === 0 ? 1.5 : 0.7,
      "#dbcdaa",
    ),
  ).join("");
  const present = (id) => !flags.taken?.includes(id);
  let art = "";
  if (cover) {
    art = path(
      "M0 282 120 254 262 285 383 241 527 265 640 211 765 241 870 236 960 269V400H0Z",
      "#282b39",
    );
    art += `<g opacity=".8">${rect(574, 149, 193, 116, "#1a2030")}${rect(590, 91, 37, 166, "#1a2030")}${rect(716, 66, 36, 196, "#1a2030")}${path("M577 91 608 40 639 91 M703 66 734 12 765 66 M638 154 672 95 706 154", "#1a2030")}${rect(654, 180, 39, 85, "#3d3542", 20)}${[604, 730, 670].map((x) => rect(x, 137, 5, 16, "#ddbc85")).join("")}</g>`;
    art += path(
      "M321 400 428 300 529 276 634 272 610 287 517 300 434 349 407 400Z",
      "#66534a",
    );
    art += `<g transform="translate(301 206) rotate(-10)">${circle(0, 0, 114, "#dcc18b08")}${circle(0, 0, 89, "#dcc18b08")}${crown(0, 0, 1.3, true)}${shard(-85, -34, 0.52)}${shard(76, -61, 0.42)}${shard(-42, -115, 0.36)}</g>`;
    art += tree(92, 391, 1.8, "#101922") + tree(873, 392, 2, "#101922");
  } else
    switch (roomId) {
      case "ruined_village":
        art =
          house(263, 299, 1.2, true) +
          house(700, 284, 0.85, true) +
          path("M0 354 230 326 443 334 589 303 960 345V400H0Z", "#202d30") +
          path("M380 400 430 300 480 275 488 305 530 400Z", "#6d5c4b") +
          tree(846, 336, 1.25, "#19292c") +
          rect(185, 311, 85, 7, "#7d6452") +
          path("M236 330 313 294 308 328Z", "#715c4a") +
          lantern(549, 280);
        break;
      case "elders_hut":
        art =
          rect(123, 64, 714, 270, "#373b35") +
          Array.from({ length: 7 }, (_, i) =>
            rect(129, 70 + i * 37, 702, 2, "#74735b"),
          ).join("") +
          stoneArch(683, 331, 101, 218, true) +
          rect(204, 115, 235, 119, "#bdaf84", 3) +
          path(
            "M226 196 271 134 325 177 376 127 409 204 M271 134 293 217 325 177 226 196 M376 127 325 177",
            "none",
            "#645e4b",
            2,
          ) +
          [226, 271, 325, 376, 409]
            .map((x, i) =>
              circle(x, [196, 134, 177, 127, 204][i], 4, "#ded2a7"),
            )
            .join("") +
          rect(165, 283, 375, 22, "#78684c", 3) +
          rect(188, 305, 18, 88, "#493e32") +
          rect(487, 305, 18, 88, "#493e32") +
          rect(263, 264, 94, 14, "#c2b189", 2) +
          lantern(517, 250) +
          rect(558, 86, 4, 70, "#a68c60") +
          (present("lantern") ? lantern(560, 175) : "");
        break;
      case "whispering_woods":
        art =
          Array.from({ length: 12 }, (_, i) =>
            tree(
              40 + i * 81,
              300 + (i % 3) * 30,
              0.9 + (i % 4) * 0.3,
              i % 2 ? "#53655a" : "#314e46",
            ),
          ).join("") +
          path("M376 400 443 288 481 248 477 312 551 400Z", "#758174") +
          tree(125, 420, 2.3, "#162d2d") +
          tree(828, 416, 2.45, "#183330") +
          circle(349, 314, 5, "#bad6b2") +
          path("M345 326 328 313 344 317 357 300 354 321Z", "#a4c9a0");
        break;
      case "ancient_shrine":
        art =
          tree(144, 341, 1.7, "#27483e") +
          tree(817, 334, 1.85, "#284d42") +
          [255, 364, 614, 720]
            .map((x, i) => pillar(x, 342, 145 + (i % 2) * 63, 42))
            .join("") +
          path("M407 331 429 246 546 246 566 331Z", "#5c7063", "#a5ab8b", 2) +
          rect(418, 238, 137, 14, "#929b7e", 3) +
          [451, 487, 523]
            .map(
              (x, i) =>
                `<circle cx="${x}" cy="291" r="13" fill="#334d46" stroke="${flags.shrine_awake ? "#ecd093" : "#91a086"}" stroke-width="2"/>`,
            )
            .join("") +
          (present("shard_2") ? shard(488, 204, 0.78) : "") +
          path("M465 344 483 333 503 345", "none", "#b5c497", 2);
        break;
      case "kings_road":
        art =
          path(
            "M0 294 136 246 286 262 433 229 660 260 814 225 960 277V400H0Z",
            "#445249",
          ) +
          path("M258 400 447 273 478 262 565 289 710 400Z", "#94846b") +
          Array.from({ length: 8 }, (_, i) =>
            path(
              `M${264 + i * 25} ${391 - i * 13} L${704 - i * 20} ${391 - i * 13}`,
              "none",
              "#645e52",
              1,
            ),
          ).join("") +
          pillar(254, 321, 104, 40) +
          path("M227 223H282V244H227Z", "#7d8270") +
          tree(807, 356, 1.9, "#253b38") +
          `<g transform="translate(310 324)">${circle(0, -28, 9, "#b6ad91")}${path("M-11-18 12-19 22 21 -26 21Z", flags.knight_healed ? "#a19b79" : "#5a6770")}${rect(-12, -20, 24, 8, "#576875")}</g>`;
        break;
      case "crossroads_inn":
        art =
          house(482, 319, 1.9) +
          rect(673, 212, 9, 100, "#5c5949") +
          rect(651, 222, 76, 49, "#967c53", 3) +
          path("M682 231 668 258 705 258Z", "#352e25") +
          rect(213, 246, 57, 77, "#665c48") +
          rect(220, 253, 40, 50, "#c5b28e") +
          path(
            "M228 267 251 267 M228 279 248 279 M231 292 247 292",
            "none",
            "#6e614b",
            2,
          ) +
          path(
            "M755 314 Q712 289 731 263 Q750 252 761 272 Q773 294 755 314",
            "none",
            "#bcaa7c",
            5,
          );
        break;
      case "dwarven_gate":
        art =
          path(
            "M0 400 0 182 120 125 164 81 284 121 333 61 411 106 512 65 633 125 733 49 850 128 960 176V400Z",
            "#44545e",
          ) +
          stoneArch(485, 352, 205, 250, !!flags.gate_opened) +
          [292, 677].map((x) => pillar(x, 351, 246, 53)).join("") +
          path(
            "M342 154 325 170 342 186 359 170Z M628 154 611 170 628 186 645 170Z",
            "#b4bba0",
          ) +
          path("M379 364 594 364 657 400H313Z", "#839087");
        break;
      case "abandoned_mine":
        art =
          path(
            "M0 400 0 120 102 60 316 82 480 12 710 78 842 65 960 146V400Z",
            "#303f45",
          ) +
          path("M318 355 351 163 488 112 627 155 675 355Z", "#0d1c25") +
          Array.from(
            { length: 3 },
            (_, i) =>
              `<g opacity="${1 - i * 0.2}">${path(`M${254 + i * 72} 370V${102 + i * 31}H${721 - i * 72}V370`, "none", "#7b7260", 18)}</g>`,
          ).join("") +
          path("M340 400 454 254 M651 400 519 254", "none", "#b8a68a", 5) +
          Array.from({ length: 7 }, (_, i) =>
            path(
              `M${349 + i * 17} ${390 - i * 19} H${640 - i * 17}`,
              "none",
              "#7a705f",
              5,
            ),
          ).join("") +
          (flags.rubble_cleared
            ? ""
            : path(
                "M410 318 446 270 477 290 499 264 534 293 561 270 595 331Z",
                "#777c72",
              )) +
          lantern(287, 205);
        break;
      case "crystal_cavern":
        art =
          path(
            "M0 0H960V91L848 174 732 91 661 135 558 53 471 127 338 70 241 153 162 79 0 146Z",
            "#354953",
          ) +
          Array.from(
            { length: 13 },
            (_, i) =>
              `<g transform="translate(${60 + i * 69} ${315 + (i % 3) * 21}) rotate(${((i % 3) - 1) * 14})">${path("M-15 0 -20-63 0-114 20-63 15 0Z", i % 2 ? "#8fa5b9" : "#6f829a", "#c1c6b6", 1)}${path("M0-113V0", "none", "#d7d8b9", 1)}</g>`,
          ).join("") +
          rect(429, 283, 115, 28, "#617b84", 4) +
          (present("shard_3") ? shard(486, 205, 1.1) : "");
        break;
      case "dragons_pass":
        art =
          path(
            "M0 400 75 187 243 43 416 261 594 39 760 279 861 95 960 212V400Z",
            "#6d7880",
          ) +
          path("M0 400 0 296 227 104 276 147 119 400Z", "#293f4b") +
          path(
            "M173 400 410 320 544 232 570 170 605 180 579 263 463 348 326 400Z",
            "#b1a58c",
          ) +
          path("M569 203Q574 79 674 124L730 203Z", "#172733") +
          path(
            "M616 190Q620 146 671 161L691 194Z",
            flags.heat_survived ? "#9bbda4" : "#c88c67",
          ) +
          pine(849, 372, 1.4, "#263c46");
        break;
      case "dragons_lair":
        art =
          path(
            "M0 0H960V157L849 99 792 182 702 76 593 136 454 52 334 122 237 92 142 156 0 108Z",
            "#3d424b",
          ) +
          path("M123 341 279 287 431 314 545 259 722 291 845 347Z", "#89724e") +
          Array.from({ length: 30 }, (_, i) =>
            rect(
              169 + ((i * 91) % 601),
              307 + ((i * 19) % 54),
              8,
              3,
              i % 3 ? "#b7a078" : "#d5b978",
            ),
          ).join("") +
          dragon(563, 252, 1.55, !!flags.dragon_permission) +
          (present("shard_4") ? shard(331, 290, 0.68) : "");
        break;
      case "marsh_path":
        art =
          rect(0, 254, 960, 146, "#25444b") +
          Array.from({ length: 10 }, (_, i) =>
            path(
              `M${(i * 121) % 790} ${275 + i * 11}h${90 + i * 7}`,
              "none",
              "#72948a",
              1,
            ),
          ).join("") +
          Array.from({ length: 7 }, (_, i) =>
            tree(
              31 + i * 157,
              317,
              0.9 + (i % 3) * 0.5,
              i % 2 ? "#29494b" : "#416264",
            ),
          ).join("") +
          path("M426 400 467 291 491 251 488 321 543 400Z", "#6b7d6d") +
          [230, 352, 681, 745]
            .map(
              (x, i) =>
                `<g class="wisp">${circle(x, 236 + (i % 2) * 36, 8, "#95c4b455")}${circle(x, 236 + (i % 2) * 36, 3, "#c1d8ba")}</g>`,
            )
            .join("") +
          (flags.marsh_lit ? lantern(501, 272) : "");
        break;
      case "witchs_cabin":
        art =
          rect(0, 275, 960, 125, "#25434a") +
          [345, 401, 564, 620]
            .map((x) => rect(x, 259, 10, 110, "#776f56"))
            .join("") +
          house(483, 278, 1.55) +
          path("M388 341 381 317 476 277 490 284 417 328 423 347Z", "#a08f69") +
          tree(129, 369, 2, "#27494a") +
          tree(809, 368, 1.9, "#224449") +
          path("M422 80Q392 43 432 22Q448 5 423-10", "none", "#a0b6a233", 17) +
          lantern(634, 257);
        break;
      case "sunken_temple":
        art =
          rect(0, 270, 960, 130, flags.temple_drained ? "#4b6865" : "#31585b") +
          [191, 326, 671, 798]
            .map((x, i) => pillar(x, 355, 170 + (i % 2) * 47, 41))
            .join("") +
          path("M414 331 444 268 553 268 581 331Z", "#8c9480") +
          rect(444, 260, 109, 14, "#b1b79b") +
          (present("shard_5") ? shard(489, 229, 0.76) : "") +
          rect(528, 262, 24, 9, "#b2a487") +
          (flags.chasm_crossed
            ? flags.temple_drained
              ? path("M195 390 459 304 492 317 310 400Z", "#a1a58b")
              : path(
                  "M210 305 Q328 341 449 288 M215 310 Q332 347 454 294",
                  "none",
                  "#cbb783",
                  3,
                )
            : "") +
          Array.from({ length: 5 }, (_, i) =>
            path(
              `M${88 + i * 147} ${347 + (i % 2) * 26}h92`,
              "none",
              "#aec6af55",
              1,
            ),
          ).join("");
        break;
      case "shadow_vale":
        art =
          path("M0 313 214 275 425 320 683 255 960 303V400H0Z", "#423e50") +
          path("M298 400 432 305 622 280 557 302 438 356 397 400Z", "#887b78") +
          Array.from(
            { length: 8 },
            (_, i) =>
              `<g transform="translate(${99 + i * 111} ${326 + (i % 3) * 20})">${path("M-15 0V-60Q0-81 15-60V0Z", "#687077")}${path("M-8-43H8 M-8-35H8 M-6-27H6", "none", "#b0b3a0", 1)}</g>`,
          ).join("") +
          tree(796, 402, 2.25, "#212b3a") +
          tree(115, 405, 2.4, "#202c37");
        break;
      case "citadel_gate":
        art =
          rect(156, 43, 648, 311, "#444653") +
          stoneArch(479, 355, 225, 262, !!flags.citadel_open) +
          [173, 746].map((x) => rect(x, 22, 44, 350, "#535663")).join("") +
          Array.from({ length: 12 }, (_, i) =>
            rect(150 + i * 55, 19, 28, 41, "#6b6971"),
          ).join("") +
          (!flags.citadel_open
            ? path(
                "M479 142 407 263 552 263Z M479 170V291",
                "none",
                "#c8abd3",
                3,
              )
            : "") +
          path("M345 374H614L655 400H311Z", "#8a8586");
        break;
      case "great_hall":
        art =
          rect(104, 23, 752, 336, "#343848") +
          [159, 298, 662, 801].map((x) => pillar(x, 358, 303, 40)).join("") +
          stoneArch(480, 340, 139, 235, true) +
          [226, 718]
            .map((x) =>
              path(
                `M${x - 26} 67H${x + 26}V221L${x} 201 ${x - 26} 227Z`,
                "#78555c",
                "#b49b7b",
                1,
              ),
            )
            .join("") +
          [226, 718]
            .map((x) =>
              path(
                `M${x} 100 ${x - 16} 137 ${x + 16} 137Z M${x} 119V162`,
                "none",
                "#d9bd83",
                2,
              ),
            )
            .join("") +
          path("M198 400 329 296 630 296 766 400Z", "#73665d") +
          rect(330, 291, 300, 9, "#a99a7e");
        break;
      case "throne_room":
        art =
          rect(118, 14, 724, 353, "#373643") +
          [190, 768].map((x) => pillar(x, 361, 313, 47)).join("") +
          stoneArch(480, 280, 181, 221, true) +
          path(
            "M409 286V153L436 176 480 121 524 176 551 153V286Z",
            "#4f4950",
            "#ac927b",
            2,
          ) +
          path("M400 325 420 278H540L561 325Z", "#69616a") +
          rect(365, 325, 231, 15, "#8c7f80") +
          rect(412, 353, 137, 17, "#a69a87") +
          rect(438, 292, 87, 61, "#71696b") +
          crown(480, 274, 0.7, !flags.crown_assembled) +
          path("M640 294 685 141 M667 219 696 227", "none", "#c2c7bd", 6) +
          lantern(265, 213) +
          lantern(693, 213);
        break;
    }
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 960 400" role="img" aria-label="${cover ? "A broken crown before a distant citadel" : rooms[roomId].title + " illustration"}"><defs><linearGradient id="${id}-sky" x2="0" y2="1"><stop stop-color="${sky}"/><stop offset="1" stop-color="${haze}"/></linearGradient><radialGradient id="${id}-glow"><stop stop-color="${light}" stop-opacity=".25"/><stop offset="1" stop-color="${light}" stop-opacity="0"/></radialGradient><pattern id="${id}-grain" width="7" height="7" patternUnits="userSpaceOnUse"><path d="M0 7 7 0" stroke="#ecd7af" stroke-opacity=".025" stroke-width="1"/></pattern><linearGradient id="${id}-vignette"><stop stop-color="#0b1521" stop-opacity=".6"/><stop offset=".5" stop-color="#0b1521" stop-opacity="0"/><stop offset="1" stop-color="#0b1521" stop-opacity=".6"/></linearGradient></defs>${rect(0, 0, 960, 400, `url(#${id}-sky)`)}${stars}${circle(700, 89, 37, light)}${circle(715, 80, 37, sky)}${rect(0, 265, 960, 135, ground)}${art}${`<ellipse cx="480" cy="243" rx="327" ry="185" fill="url(#${id}-glow)"/>`}${path("M0 329 Q224 304 476 337T960 312V340Q698 367 454 345T0 359Z", "#d8cfbb08")}${rect(0, 0, 960, 400, `url(#${id}-grain)`)}${rect(0, 0, 960, 400, `url(#${id}-vignette)`)}<path d="M18 47V18H47 M913 18H942V47 M18 353V382H47 M913 382H942V353" fill="none" stroke="${light}" stroke-opacity=".4"/><g class="embers">${[101, 284, 742, 871].map((x, i) => circle(x, 234 + (i % 2) * 54, 1.5, light)).join("")}</g></svg>`;
}
export function portrait(id, flags = {}) {
  const dragonId = id === "pyraxis",
    witch = id === "yarrow",
    knight = id === "wounded_knight",
    inn = id === "innkeeper",
    wary = witch
      ? flags.yarrow_intimidated
      : id.startsWith("aldric") &&
        (flags.aldric_questioned || flags.aldric_confronted);
  if (dragonId)
    return `<svg viewBox="0 0 120 140" role="img" aria-label="Pyraxis"><rect width="120" height="140" rx="6" fill="#273b3c"/><g transform="translate(45 79) scale(.53)">${dragon(0, 0, 1, flags.dragon_permission)}</g></svg>`;
  const coat = witch
      ? "#58675f"
      : knight
        ? "#5d6b77"
        : inn
          ? "#795c4d"
          : "#6b6870",
    skin = witch ? "#bda98f" : inn ? "#c4a181" : "#c8b899";
  return `<svg viewBox="0 0 120 140" role="img" aria-label="${nameForPortrait(id)}">${rect(0, 0, 120, 140, "#283137", 6)}${circle(61, 58, 43, "#aaa08312")}${path("M10 140 19 103 44 84H76L104 103 113 140Z", coat, "#aa9a7e", 1)}${path("M47 79 47 104 60 116 75 103 75 79Z", skin)}${path("M34 40Q61 18 88 41L84 76Q61 104 38 76Z", skin)}${path(witch ? "M32 61 27 37 60 11 94 38 90 88 79 70 78 38 40 37 38 80 27 93Z" : inn ? "M33 53 30 33Q60 14 89 33L91 57 77 38 41 38Z" : "M32 56 31 37Q60 9 90 35L91 59 78 42 77 26 43 29 41 47Z", witch ? "#b0b8a6" : inn ? "#423b35" : "#cec4ab")}${knight ? path("M29 49 34 27 60 14 86 27 93 49 81 52 77 34H44L40 52Z", "#88969a", "#bcc1ac", 1) : ""}${path(wary ? "M43 54 53 58 M69 58 79 54" : "M43 57H53 M69 57H79", "none", "#3d3a35", 2)}${path("M60 58 56 71H62", "none", "#8e7764", 1)}${path(wary ? "M49 81Q61 76 72 81" : "M49 79Q61 84 72 79", "none", "#745c50", 1.5)}${!witch && !knight && !inn ? path("M39 69 45 80 61 87 78 78 84 68 77 100 59 121 43 98Z", "#d0c7af") : ""}${witch ? path("M41 22 64 2 82 27 101 38 23 38Z", "#4a5956", "#9d9a81", 1) : ""}${path("M18 119 42 107 M81 107 102 120", "none", "#c8b48b44", 1)}</svg>`;
}
function nameForPortrait(id) {
  return id.startsWith("aldric")
    ? "Aldric"
    : id === "yarrow"
      ? "Yarrow"
      : id === "wounded_knight"
        ? "The knight"
        : "The innkeeper";
}
