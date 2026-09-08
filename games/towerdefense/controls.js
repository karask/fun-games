let toastTimer, cameraDrag = null, suppressCanvasClick = false;
function notifyPlayer(message, duration = 2500) {
  const el = document.getElementById('toast');
  clearTimeout(toastTimer); el.textContent = message; el.classList.add('visible');
  toastTimer = setTimeout(() => el.classList.remove('visible'), duration);
}
function setPaused(paused, reason = '') {
  if(!G || !['build','wave'].includes(G.phase)) return;
  G.paused = paused;
  lastTime = performance.now();
  Sound.sync(!paused);
  updateHUD();
  if(paused) showPause(reason); else hideOverlay();
}
function togglePause() { if(G) setPaused(!G.paused); }
function cancelSelection() {
  if(!G) return;
  G.selectedTowerType = null; G.inspectedTower = null; G.pendingTile = null;
  updateShop();
}
function buildSelectedTile() {
  if(!G?.hoverCell || !G.selectedTowerType || G.paused) return;
  placeTower(G.hoverCell.col, G.hoverCell.row);
}
function setTargetPriority(priority) {
  if(G?.inspectedTower && ['first','strongest','fastest'].includes(priority)) G.inspectedTower.priority = priority;
}
function zoomCamera(delta, point) {
  if(!G) return;
  const anchor = point || { x: viewWidth / 2, y: viewHeight / 2 };
  const world = screenToWorld(anchor.x, anchor.y);
  cameraZoom = Math.min(2.5, Math.max(1, cameraZoom + delta));
  updateOffsets();
  const projected = worldToScreen(world.x, world.y);
  cameraPanX += anchor.x - projected.x; cameraPanY += anchor.y - projected.y;
  if(cameraZoom === 1) cameraPanX = cameraPanY = 0;
  updateOffsets();
}
function resetCamera() { cameraZoom = 1; cameraPanX = cameraPanY = 0; updateOffsets(); }
function initControls() {
  document.addEventListener('pointerdown', () => Sound.unlock(), {passive:true});
  document.addEventListener('keydown', () => Sound.unlock());
  window.addEventListener('blur', () => { if(G && !G.paused && ['wave','build'].includes(G.phase)) setPaused(true, 'Paused while you were away.'); });
  document.addEventListener('visibilitychange', () => { if(document.hidden && G && !G.paused) setPaused(true, 'Paused while you were away.'); });
  document.addEventListener('keydown', e => {
    const overlay = document.getElementById('overlay');
    if(!overlay.classList.contains('hidden')) {
      if(e.key === 'Tab') {
        const buttons = [...overlay.querySelectorAll('button:not(:disabled),input,select')];
        const first = buttons[0], last = buttons[buttons.length-1];
        if(e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
        else if(!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
      }
      if(e.key === 'Escape' && G?.paused) { e.preventDefault(); setPaused(false); }
      return;
    }
    if(!G || /INPUT|SELECT|TEXTAREA/.test(e.target.tagName) || e.ctrlKey || e.metaKey || e.altKey) return;
    if(e.key === 'Escape') { e.preventDefault(); if(G.selectedTowerType || G.inspectedTower) cancelSelection(); else setPaused(true); }
    else if(e.key.toLowerCase() === 'p') { e.preventDefault(); togglePause(); }
    else if(e.code === 'Space' && e.target.tagName !== 'BUTTON') { e.preventDefault(); if(G.phase === 'build') onStartWave(); else togglePause(); }
    else if(/^[1-5]$/.test(e.key)) { e.preventDefault(); selectTowerType(TOWER_ORDER[Number(e.key)-1]); canvas.focus(); }
    else if(e.target === canvas && e.key.startsWith('Arrow')) {
      e.preventDefault(); const cell = G.hoverCell || {col:5,row:5};
      const move = {ArrowLeft:[-1,0],ArrowRight:[1,0],ArrowUp:[0,-1],ArrowDown:[0,1]}[e.key];
      G.hoverCell = {col:Math.min(COLS-1,Math.max(0,cell.col+move[0])),row:Math.min(ROWS-1,Math.max(0,cell.row+move[1]))};
      renderTowerInfo();
    } else if(e.target === canvas && e.key === 'Enter') {
      e.preventDefault(); if(!G.hoverCell) G.hoverCell={col:5,row:5};
      if(G.selectedTowerType) buildSelectedTile();
      else { G.inspectedTower = G.towers.find(t => t.col === G.hoverCell.col && t.row === G.hoverCell.row) || null; renderTowerInfo(); }
    }
  });
  canvas.addEventListener('pointerdown', e => {
    if(!G || G.paused) return;
    G.touchMode = e.pointerType === 'touch';
    cameraDrag = {id:e.pointerId,x:e.clientX,y:e.clientY,lastX:e.clientX,lastY:e.clientY,dragging:false};
    canvas.setPointerCapture(e.pointerId);
  });
  canvas.addEventListener('pointermove', e => {
    if(!cameraDrag || cameraDrag.id !== e.pointerId) return;
    if(Math.hypot(e.clientX-cameraDrag.x,e.clientY-cameraDrag.y) > 8) cameraDrag.dragging = true;
    if(cameraDrag.dragging) {
      cameraPanX += e.clientX-cameraDrag.lastX; cameraPanY += e.clientY-cameraDrag.lastY;
      cameraPanX = Math.max(-viewWidth,Math.min(viewWidth,cameraPanX));
      cameraPanY = Math.max(-viewHeight,Math.min(viewHeight,cameraPanY));
      updateOffsets();
    }
    cameraDrag.lastX = e.clientX; cameraDrag.lastY = e.clientY;
  });
  canvas.addEventListener('pointerup', () => { suppressCanvasClick = Boolean(cameraDrag?.dragging); cameraDrag = null; });
  canvas.addEventListener('pointercancel', () => { cameraDrag = null; suppressCanvasClick = false; });
  canvas.addEventListener('wheel', e => {
    e.preventDefault(); const r = canvas.getBoundingClientRect();
    zoomCamera(e.deltaY < 0 ? .15 : -.15, {x:e.clientX-r.left,y:e.clientY-r.top});
  }, {passive:false});
}
