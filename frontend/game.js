// ============================================================
// STATION-7 // Escape Protocol — frontend game engine
// Talks to the FastAPI manager at MANAGER_URL for all game
// logic. All movement/collision here is purely client-side
// presentation; the source of truth (inventory, puzzles,
// location) always comes from the backend.
// ============================================================

const MANAGER_URL = "http://127.0.0.1:8000";

const CANVAS_W = 960;
const CANVAS_H = 600;
const PLAYER_SPEED = 220; // px / sec
const PLAYER_RADIUS = 14;
const INTERACT_RANGE = 78;

// ---------- Room definitions ----------
// Each room is drawn as a blueprint schematic. "solid" rects block
// movement; "objects" and "npcs" are interactive nodes the player
// can approach and trigger with E / F / T.
const ROOMS = {
  laboratory: {
    label: "LABORATORY",
    playerStart: { x: 480, y: 470 },
    walls: { x: 40, y: 40, w: 880, h: 520 },
    solids: [
      { x: 100, y: 90, w: 190, h: 90 },   // desk block
      { x: 660, y: 90, w: 190, h: 100 },  // computer block
    ],
    objects: [
      { id: "desk", label: "DESK", x: 195, y: 135, w: 190, h: 90, shape: "desk" },
      { id: "computer", label: "TERMINAL", x: 755, y: 140, w: 190, h: 100, shape: "computer" },
      { id: "vent", label: "VENT", x: 55, y: 300, w: 44, h: 110, shape: "vent" },
      { id: "door", label: "EXIT DOOR", x: 900, y: 300, w: 40, h: 150, shape: "door" },
    ],
    npcs: [
      { id: "robot", label: "ECHO", x: 480, y: 290, color: "#49D3C7", shape: "robot" },
      { id: "guard", label: "ELIO", x: 800, y: 470, color: "#F5A623", shape: "guard" },
      { id: "scientist", label: "SCIENTIST", x: 620, y: 470, color: "#C7D3E8", shape: "scientist" },
    ],
  },
  office: {
    label: "OFFICE — SECTOR LOCKED",
    playerStart: { x: 480, y: 470 },
    walls: { x: 40, y: 40, w: 880, h: 520 },
    solids: [],
    objects: [],
    npcs: [],
    underConstruction: true,
  },
  control_room: {
    label: "CONTROL ROOM — SECTOR LOCKED",
    playerStart: { x: 480, y: 470 },
    walls: { x: 40, y: 40, w: 880, h: 520 },
    solids: [],
    objects: [],
    npcs: [],
    underConstruction: true,
  },
};

// ---------- State ----------
const canvas = document.getElementById("game-canvas");
const ctx = canvas.getContext("2d");

let gameState = null;       // last known backend state
let currentRoomKey = "laboratory";
let player = { x: 480, y: 470 };
let keys = {};
let nearestTarget = null;   // { kind: 'object'|'npc', data, dist }
let chatOpen = false;
let chatTargetId = null;
let lastTime = performance.now();

// ============================================================
// Networking
// ============================================================

async function apiGetState() {
  const res = await fetch(`${MANAGER_URL}/state`);
  if (!res.ok) throw new Error(`GET /state failed: ${res.status}`);
  return res.json();
}

async function apiSendAction(action, target, message) {
  const res = await fetch(`${MANAGER_URL}/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, target, message }),
  });
  if (!res.ok) {
    throw new Error(`Manager error (${res.status})`);
  }
  return res.json();
}

function setConnectionStatus(online) {
  const el = document.getElementById("connection-status");
  el.textContent = online ? "● LINK ESTABLISHED" : "● LINK DOWN";
  el.className = online ? "online" : "offline";
}

// ============================================================
// Log / inventory / HUD rendering
// ============================================================

function pushLog(kind, tag, text) {
  const wrap = document.getElementById("log-entries");
  const row = document.createElement("div");
  row.className = `log-line ${kind}`;
  row.innerHTML = `<span class="log-tag">${tag}</span><span class="log-text"></span>`;
  row.querySelector(".log-text").textContent = text;
  wrap.appendChild(row);
  wrap.parentElement.scrollTop = wrap.parentElement.scrollHeight;
}

function renderInventory(state) {
  const wrap = document.getElementById("inventory-entries");
  wrap.innerHTML = "";
  const items = state.inventory || [];
  if (items.length === 0) {
    wrap.innerHTML = `<span class="empty-note">No items recovered.</span>`;
    return;
  }
  items.forEach((item) => {
    const chip = document.createElement("span");
    chip.className = "item-chip";
    chip.textContent = item.toUpperCase();
    wrap.appendChild(chip);
  });
}

function renderPuzzleHud(state) {
  const puzzles = state.puzzles || {};
  document.querySelectorAll(".puzzle-node").forEach((node) => {
    const key = node.dataset.puzzle;
    node.classList.toggle("solved", !!puzzles[key]);
  });
}

function renderRoomLabel(state) {
  const room = ROOMS[state.location] || ROOMS.laboratory;
  document.getElementById("room-name").textContent = room.label;
}

function applyState(state) {
  gameState = state;
  if (ROOMS[state.location]) {
    currentRoomKey = state.location;
  }
  renderInventory(state);
  renderPuzzleHud(state);
  renderRoomLabel(state);
}

// ============================================================
// Interaction resolution
// ============================================================

function currentRoom() {
  return ROOMS[currentRoomKey] || ROOMS.laboratory;
}

function findNearestInteractable() {
  const room = currentRoom();
  let best = null;

  const consider = (kind, data, cx, cy) => {
    const dx = player.x - cx;
    const dy = player.y - cy;
    const dist = Math.hypot(dx, dy);
    if (dist <= INTERACT_RANGE && (!best || dist < best.dist)) {
      best = { kind, data, dist };
    }
  };

  room.objects.forEach((o) => consider("object", o, o.x + o.w / 2, o.y + o.h / 2));
  room.npcs.forEach((n) => consider("npc", n, n.x, n.y));

  return best;
}

function promptTextFor(target) {
  if (!target) return "";
  if (target.kind === "npc") return `[T] Talk to ${target.data.label}`;
  const obj = target.data;
  if (obj.id === "door") return "[F] Open door";
  return `[E] Search  ·  [F] Use`;
}

async function doSearch(objectId) {
  pushLog("action", "YOU", `You search the ${objectId}.`);
  try {
    const result = await apiSendAction("search", objectId, null);
    setConnectionStatus(true);
    pushLog("system", "SYS", result.result.message);
    applyState(result.state);
  } catch (e) {
    setConnectionStatus(false);
    pushLog("system", "SYS", "Connection to manager lost — is the backend running?");
  }
}

async function doUse(objectId) {
  pushLog("action", "YOU", `You use the ${objectId}.`);
  try {
    const result = await apiSendAction("use", objectId, null);
    setConnectionStatus(true);
    const msg = (result.result && result.result.message) || "Nothing happens.";
    pushLog("system", "SYS", msg);
    applyState(result.state);
  } catch (e) {
    setConnectionStatus(false);
    pushLog("system", "SYS", "Connection to manager lost — is the backend running?");
  }
}

async function sendChatMessage(agentId, message) {
  pushLog("you", "YOU", message);
  try {
    const result = await apiSendAction("talk", agentId, message);
    setConnectionStatus(true);
    const msg = (result.result && result.result.message) || "...";
    pushLog(agentId, agentId.toUpperCase(), msg);
    applyState(result.state);
  } catch (e) {
    setConnectionStatus(false);
    pushLog("system", "SYS", "Connection to manager lost — is the backend running?");
  }
}

// ============================================================
// Chat UI
// ============================================================

const chatBar = document.getElementById("chat-bar");
const chatInput = document.getElementById("chat-input");
const chatTargetLabel = document.getElementById("chat-target");

function openChat(npc) {
  chatOpen = true;
  chatTargetId = npc.id;
  chatTargetLabel.textContent = `${npc.label} >`;
  chatBar.classList.remove("hidden");
  chatInput.value = "";
  chatInput.focus();
  switchTab("log");
}

function closeChat() {
  chatOpen = false;
  chatTargetId = null;
  chatBar.classList.add("hidden");
  chatInput.blur();
}

chatInput.addEventListener("keydown", (e) => {
  e.stopPropagation();
  if (e.key === "Enter") {
    const text = chatInput.value.trim();
    if (text.length > 0) {
      sendChatMessage(chatTargetId, text);
      chatInput.value = "";
    }
  } else if (e.key === "Escape") {
    closeChat();
  }
});

document.getElementById("chat-close").addEventListener("click", closeChat);

// ============================================================
// Tabs
// ============================================================

function switchTab(name) {
  document.querySelectorAll(".tab-btn").forEach((b) =>
    b.classList.toggle("active", b.dataset.tab === name)
  );
  document.querySelectorAll(".panel").forEach((p) =>
    p.classList.toggle("active", p.id === `${name}-panel`)
  );
}

document.querySelectorAll(".tab-btn").forEach((btn) => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});

// ============================================================
// Input
// ============================================================

window.addEventListener("keydown", (e) => {
  if (chatOpen) return; // chat input handles its own keys
  keys[e.key.toLowerCase()] = true;

  if (e.key.toLowerCase() === "e" && nearestTarget && nearestTarget.kind === "object") {
    doSearch(nearestTarget.data.id);
  }
  if (e.key.toLowerCase() === "f" && nearestTarget && nearestTarget.kind === "object") {
    doUse(nearestTarget.data.id);
  }
  if (e.key.toLowerCase() === "t" && nearestTarget && nearestTarget.kind === "npc") {
    openChat(nearestTarget.data);
  }
  if (e.key === "Escape") {
    closeChat();
  }
});

window.addEventListener("keyup", (e) => {
  keys[e.key.toLowerCase()] = false;
});

// ============================================================
// Update / physics
// ============================================================

function rectsOverlap(cx, cy, r, rect) {
  const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return (dx * dx + dy * dy) < (r * r);
}

function update(dt) {
  if (chatOpen) return;

  const room = currentRoom();
  let dx = 0, dy = 0;
  if (keys["w"] || keys["arrowup"]) dy -= 1;
  if (keys["s"] || keys["arrowdown"]) dy += 1;
  if (keys["a"] || keys["arrowleft"]) dx -= 1;
  if (keys["d"] || keys["arrowright"]) dx += 1;

  if (dx !== 0 || dy !== 0) {
    const len = Math.hypot(dx, dy);
    dx /= len; dy /= len;

    const nextX = player.x + dx * PLAYER_SPEED * dt;
    const nextY = player.y + dy * PLAYER_SPEED * dt;

    const bounds = room.walls;
    const clampedX = Math.min(Math.max(nextX, bounds.x + PLAYER_RADIUS), bounds.x + bounds.w - PLAYER_RADIUS);
    const clampedY = Math.min(Math.max(nextY, bounds.y + PLAYER_RADIUS), bounds.y + bounds.h - PLAYER_RADIUS);

    const blockedX = room.solids.some((r) => rectsOverlap(clampedX, player.y, PLAYER_RADIUS, r));
    const blockedY = room.solids.some((r) => rectsOverlap(player.x, clampedY, PLAYER_RADIUS, r));

    if (!blockedX) player.x = clampedX;
    if (!blockedY) player.y = clampedY;
  }

  nearestTarget = findNearestInteractable();
  updatePromptBubble();
}

function updatePromptBubble() {
  const bubble = document.getElementById("prompt-bubble");
  if (!nearestTarget) {
    bubble.classList.add("hidden");
    return;
  }
  const target = nearestTarget.data;
  const anchorX = target.x !== undefined ? (target.w ? target.x + target.w / 2 : target.x) : player.x;
  const anchorY = target.y !== undefined ? target.y : player.y;

  const rect = canvas.getBoundingClientRect();
  const scaleX = rect.width / CANVAS_W;
  const scaleY = rect.height / CANVAS_H;

  bubble.style.left = `${rect.left + anchorX * scaleX}px`;
  bubble.style.top = `${rect.top + (anchorY - 18) * scaleY}px`;
  bubble.textContent = promptTextFor(nearestTarget);
  bubble.classList.remove("hidden");
}

// ============================================================
// Rendering
// ============================================================

function drawGrid() {
  ctx.strokeStyle = "rgba(73, 211, 199, 0.06)";
  ctx.lineWidth = 1;
  for (let x = 0; x <= CANVAS_W; x += 40) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, CANVAS_H); ctx.stroke();
  }
  for (let y = 0; y <= CANVAS_H; y += 40) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_W, y); ctx.stroke();
  }
}

function drawWalls(room) {
  ctx.strokeStyle = "#49D3C7";
  ctx.lineWidth = 2;
  ctx.strokeRect(room.walls.x, room.walls.y, room.walls.w, room.walls.h);
  // corner brackets
  const b = room.walls;
  const len = 22;
  ctx.lineWidth = 3;
  [[b.x, b.y, 1, 1], [b.x + b.w, b.y, -1, 1], [b.x, b.y + b.h, 1, -1], [b.x + b.w, b.y + b.h, -1, -1]]
    .forEach(([cx, cy, sx, sy]) => {
      ctx.beginPath();
      ctx.moveTo(cx, cy + len * sy);
      ctx.lineTo(cx, cy);
      ctx.lineTo(cx + len * sx, cy);
      ctx.stroke();
    });
}

function puzzleFlag(key) {
  return gameState && gameState.puzzles && gameState.puzzles[key];
}

function hasItem(name) {
  return gameState && gameState.inventory && gameState.inventory.includes(name);
}

function drawObject(obj) {
  const solved = {
    desk: hasItem("screwdriver"),
    computer: puzzleFlag("unlock_computer"),
    vent: puzzleFlag("open_vent"),
    door: puzzleFlag("door_unlocked"),
  }[obj.id];

  const glow = nearestTarget && nearestTarget.kind === "object" && nearestTarget.data.id === obj.id;
  const lineColor = solved ? "#F5A623" : "#49D3C7";

  ctx.save();
  ctx.strokeStyle = lineColor;
  ctx.fillStyle = solved ? "rgba(245, 166, 35, 0.08)" : "rgba(73, 211, 199, 0.06)";
  ctx.lineWidth = glow ? 2.5 : 1.5;
  if (glow) {
    ctx.shadowColor = lineColor;
    ctx.shadowBlur = 14;
  }

  ctx.fillRect(obj.x, obj.y, obj.w, obj.h);
  ctx.strokeRect(obj.x, obj.y, obj.w, obj.h);

  // shape flourishes
  ctx.shadowBlur = 0;
  ctx.beginPath();
  if (obj.shape === "computer") {
    ctx.strokeRect(obj.x + 20, obj.y + 15, obj.w - 40, obj.h - 45);
    ctx.moveTo(obj.x + obj.w / 2, obj.y + obj.h - 30);
    ctx.lineTo(obj.x + obj.w / 2, obj.y + obj.h - 15);
  } else if (obj.shape === "vent") {
    for (let i = 1; i < 5; i++) {
      ctx.moveTo(obj.x + 6, obj.y + (obj.h / 5) * i);
      ctx.lineTo(obj.x + obj.w - 6, obj.y + (obj.h / 5) * i);
    }
  } else if (obj.shape === "door") {
    ctx.moveTo(obj.x + obj.w - 8, obj.y + obj.h / 2);
    ctx.arc(obj.x + obj.w - 8, obj.y + obj.h / 2, 4, 0, Math.PI * 2);
  } else if (obj.shape === "desk") {
    ctx.moveTo(obj.x + 15, obj.y + obj.h - 10);
    ctx.lineTo(obj.x + obj.w - 15, obj.y + obj.h - 10);
  }
  ctx.stroke();

  ctx.fillStyle = solved ? "#F5A623" : "#7C8AA3";
  ctx.font = "10px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText(obj.label, obj.x + obj.w / 2, obj.y - 8);
  ctx.restore();
}

function drawNpc(npc) {
  const glow = nearestTarget && nearestTarget.kind === "npc" && nearestTarget.data.id === npc.id;
  const bob = Math.sin(performance.now() / 400 + npc.x) * 3;

  ctx.save();
  ctx.translate(npc.x, npc.y + bob);
  ctx.strokeStyle = npc.color;
  ctx.fillStyle = "rgba(255,255,255,0.02)";
  ctx.lineWidth = glow ? 2.5 : 1.5;
  if (glow) { ctx.shadowColor = npc.color; ctx.shadowBlur = 16; }

  if (npc.shape === "robot") {
    ctx.strokeRect(-16, -22, 32, 32);
    ctx.beginPath(); ctx.moveTo(0, -22); ctx.lineTo(0, -32); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, -32, 3, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-16, 10); ctx.lineTo(-16, 26); ctx.moveTo(16, 10); ctx.lineTo(16, 26); ctx.stroke();
  } else {
    ctx.beginPath(); ctx.arc(0, -18, 12, 0, Math.PI * 2); ctx.stroke(); // head
    ctx.beginPath();
    ctx.moveTo(0, -6);
    ctx.lineTo(0, 22);
    ctx.moveTo(-14, 6); ctx.lineTo(14, 6);
    ctx.moveTo(0, 22); ctx.lineTo(-12, 40);
    ctx.moveTo(0, 22); ctx.lineTo(12, 40);
    ctx.stroke();
  }

  ctx.shadowBlur = 0;
  ctx.fillStyle = npc.color;
  ctx.font = "10px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText(npc.label, 0, -42);
  ctx.restore();
}

function drawPlayer() {
  ctx.save();
  ctx.translate(player.x, player.y);
  ctx.strokeStyle = "#E7ECF3";
  ctx.fillStyle = "rgba(231, 236, 243, 0.12)";
  ctx.lineWidth = 2;
  ctx.shadowColor = "#E7ECF3";
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(0, -PLAYER_RADIUS);
  ctx.lineTo(PLAYER_RADIUS, 0);
  ctx.lineTo(0, PLAYER_RADIUS);
  ctx.lineTo(-PLAYER_RADIUS, 0);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawUnderConstruction(room) {
  ctx.save();
  ctx.fillStyle = "#7C8AA3";
  ctx.font = "14px 'JetBrains Mono', monospace";
  ctx.textAlign = "center";
  ctx.fillText("// SECTOR BLUEPRINT NOT YET AVAILABLE", CANVAS_W / 2, CANVAS_H / 2);
  ctx.restore();
}

function render() {
  ctx.clearRect(0, 0, CANVAS_W, CANVAS_H);
  ctx.fillStyle = "#070B14";
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);

  const room = currentRoom();
  drawGrid();
  drawWalls(room);

  if (room.underConstruction) {
    drawUnderConstruction(room);
    return;
  }

  room.objects.forEach(drawObject);
  room.npcs.forEach(drawNpc);
  drawPlayer();
}

// ============================================================
// Main loop
// ============================================================

function loop(now) {
  const dt = Math.min((now - lastTime) / 1000, 0.05);
  lastTime = now;
  update(dt);
  render();
  requestAnimationFrame(loop);
}

// ============================================================
// Boot
// ============================================================

async function boot() {
  pushLog("system", "SYS", "Booting station uplink…");
  const room = currentRoom();
  player = { ...room.playerStart };

  try {
    const state = await apiGetState();
    setConnectionStatus(true);
    applyState(state);
    pushLog("system", "SYS", "Link established. Move with WASD. Good luck.");
  } catch (e) {
    setConnectionStatus(false);
    pushLog("system", "SYS", `Could not reach manager at ${MANAGER_URL}. Start the backend, then refresh.`);
  }

  requestAnimationFrame(loop);
}

boot();