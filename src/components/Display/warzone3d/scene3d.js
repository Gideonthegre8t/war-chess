/**
 * scene3d.js — the Three.js warzone.
 *
 * Framework-free on purpose: React only mounts a container and forwards the
 * display payload (`lastMove`, `gameResult`, `warzoneLevel`). Everything here is
 * plain Three.js with a tiny ticker list, so the scene can be driven by the same
 * contract the 2D warzone uses.
 *
 * World mapping: an 8x8 board sits at the centre of the terrain, White at +Z.
 * Chess squares map straight onto it, so a march reads as a real advance.
 */
import * as THREE from 'three';

const SQUARE = 1.4;
const BOARD_EXTENT = SQUARE * 4; // half-width of the 8x8 board
const FILES = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'];

const INTENSITY = {
  off: { move: 0, shake: 0, flash: 0 },
  low: { move: 1500, shake: 0.05, flash: 0.35 },
  medium: { move: 950, shake: 0.1, flash: 0.65 },
  high: { move: 550, shake: 0.2, flash: 1 },
};

const clamp01 = (v) => Math.min(1, Math.max(0, v));
const easeOutCubic = (t) => 1 - Math.pow(1 - clamp01(t), 3);

export const isWebGLSupported = () => {
  try {
    const canvas = document.createElement('canvas');
    return Boolean(
      window.WebGLRenderingContext &&
        (canvas.getContext('webgl2') || canvas.getContext('webgl'))
    );
  } catch {
    return false;
  }
};

const squareToWorld = (square) => {
  if (!square || square.length < 2) return new THREE.Vector3(0, 0, 0);
  const fileIndex = FILES.indexOf(square[0]);
  const rank = Number(square[1]);
  if (fileIndex === -1 || Number.isNaN(rank)) return new THREE.Vector3(0, 0, 0);
  return new THREE.Vector3(
    (fileIndex - 3.5) * SQUARE,
    0,
    (3.5 - (rank - 1)) * SQUARE
  );
};

// Deterministic rolling ground: flat inside the board, hills outside it.
const heightAt = (x, z) => {
  const distance = Math.hypot(x * 0.9, z * 0.75);
  const rim = Math.max(0, distance - BOARD_EXTENT - 1.5);
  if (rim <= 0) return 0;
  const wobble = 0.55 + 0.45 * Math.sin(x * 0.28) * Math.cos(z * 0.22);
  return Math.min(9, rim * 0.62 * wobble);
};

const makeBoardTexture = () => {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  const cell = size / 8;
  for (let row = 0; row < 8; row += 1) {
    for (let col = 0; col < 8; col += 1) {
      const light = (row + col) % 2 === 0;
      ctx.fillStyle = light ? 'rgba(214, 209, 190, 0.55)' : 'rgba(46, 58, 44, 0.75)';
      ctx.fillRect(col * cell, row * cell, cell, cell);
    }
  }
  ctx.strokeStyle = 'rgba(212, 175, 55, 0.55)';
  ctx.lineWidth = 6;
  ctx.strokeRect(3, 3, size - 6, size - 6);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
};

const buildCastle = (isWhite) => {
  const group = new THREE.Group();
  const stone = new THREE.MeshStandardMaterial({
    color: isWhite ? 0xcfc9b6 : 0x3a3f46,
    roughness: 0.85,
    metalness: 0.05,
    flatShading: true,
  });
  const trim = new THREE.MeshStandardMaterial({
    color: isWhite ? 0xf2ecdb : 0x5b4a3a,
    roughness: 0.7,
    flatShading: true,
  });

  const keep = new THREE.Mesh(new THREE.BoxGeometry(3.4, 2.4, 3.4), stone);
  keep.position.y = 1.2;
  group.add(keep);

  [-1.5, 1.5].forEach((x) => {
    const tower = new THREE.Mesh(new THREE.BoxGeometry(1.1, 3.4, 1.1), stone);
    tower.position.set(x, 1.7, 0);
    group.add(tower);

    const cap = new THREE.Mesh(new THREE.ConeGeometry(0.85, 1.1, 4), trim);
    cap.position.set(x, 3.95, 0);
    cap.rotation.y = Math.PI / 4;
    group.add(cap);
  });

  // Battlements along the keep's front edge.
  [-1.1, 0, 1.1].forEach((x) => {
    const merlon = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.5, 0.45), trim);
    merlon.position.set(x, 2.6, 1.5);
    group.add(merlon);
  });

  const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 2.2, 6), trim);
  pole.position.set(0, 3.6, 0);
  group.add(pole);

  const flag = new THREE.Mesh(
    new THREE.PlaneGeometry(1.1, 0.6),
    new THREE.MeshStandardMaterial({
      color: isWhite ? 0xf5f2e8 : 0x8c2f2f,
      side: THREE.DoubleSide,
      roughness: 0.9,
    })
  );
  flag.position.set(0.58, 4.2, 0);
  group.add(flag);

  return group;
};

const buildArmy = (isWhite) => {
  const group = new THREE.Group();
  const body = new THREE.MeshStandardMaterial({
    color: isWhite ? 0xe8e2cf : 0x4a4f58,
    roughness: 0.8,
    flatShading: true,
    transparent: true,
    opacity: 1,
  });
  const steel = new THREE.MeshStandardMaterial({
    color: isWhite ? 0xb8b2a0 : 0x2c3038,
    roughness: 0.5,
    metalness: 0.4,
    flatShading: true,
    transparent: true,
    opacity: 1,
  });

  const torso = new THREE.ConeGeometry(0.34, 0.95, 6);
  const head = new THREE.SphereGeometry(0.19, 8, 6);

  const slots = [];
  for (let i = 0; i < 6; i += 1) {
    const soldier = new THREE.Group();
    const bodyMesh = new THREE.Mesh(torso, body);
    bodyMesh.position.y = 0.48;
    soldier.add(bodyMesh);
    const headMesh = new THREE.Mesh(head, steel);
    headMesh.position.y = 1.08;
    soldier.add(headMesh);

    const column = i % 3;
    const row = Math.floor(i / 3);
    const x = (column - 1) * 1.5;
    const z = (row === 0 ? 0.6 : -0.7) * (isWhite ? 1 : -1);
    soldier.position.set(x, 0, z);
    soldier.userData.home = soldier.position.clone();
    group.add(soldier);
    slots.push(soldier);
  }

  group.userData.materials = [body, steel];
  group.userData.slots = slots;
  return group;
};

const buildBurst = () => {
  const count = 90;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({
    color: 0xffc46b,
    size: 0.26,
    transparent: true,
    opacity: 0,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const points = new THREE.Points(geometry, material);
  points.frustumCulled = false;
  return { points, material, positions, velocities: new Float32Array(count * 3), count };
};

export function createWarzone3D(container) {
  if (!container || !isWebGLSupported()) return null;

  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(container.clientWidth || 640, container.clientHeight || 360, false);
  renderer.setClearColor(0x0b0f13, 1);
  renderer.domElement.style.width = '100%';
  renderer.domElement.style.height = '100%';
  renderer.domElement.style.display = 'block';
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x101820, 0.017);

  const camera = new THREE.PerspectiveCamera(
    46,
    (container.clientWidth || 640) / (container.clientHeight || 360),
    0.1,
    220
  );
  const camHome = new THREE.Vector3(0, 15, 22);
  const camLook = new THREE.Vector3(0, 2, 0);
  camera.position.copy(camHome);
  camera.lookAt(camLook);

  // --- Lights ---------------------------------------------------------------
  const hemi = new THREE.HemisphereLight(0x9fb6c8, 0x2a2a22, 1.05);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xffe3b0, 1.5);
  sun.position.set(12, 20, 10);
  scene.add(sun);

  const flashLight = new THREE.PointLight(0xffd08a, 0, 46, 2);
  flashLight.position.set(0, 6, 0);
  scene.add(flashLight);

  const alarmLight = new THREE.PointLight(0xff5c6c, 0, 40, 2);
  alarmLight.position.set(0, 7, 0);
  scene.add(alarmLight);

  // --- Terrain --------------------------------------------------------------
  const terrainGeometry = new THREE.PlaneGeometry(80, 80, 64, 64);
  terrainGeometry.rotateX(-Math.PI / 2);
  {
    const position = terrainGeometry.attributes.position;
    const colors = new Float32Array(position.count * 3);
    const low = new THREE.Color(0x1d2a20);
    const mid = new THREE.Color(0x33432f);
    const high = new THREE.Color(0x5a5347);
    const scratch = new THREE.Color();
    for (let i = 0; i < position.count; i += 1) {
      const x = position.getX(i);
      const z = position.getZ(i);
      const y = heightAt(x, z);
      position.setY(i, y);
      const t = clamp01(y / 7);
      if (t < 0.5) scratch.copy(low).lerp(mid, t * 2);
      else scratch.copy(mid).lerp(high, (t - 0.5) * 2);
      colors[i * 3] = scratch.r;
      colors[i * 3 + 1] = scratch.g;
      colors[i * 3 + 2] = scratch.b;
    }
    terrainGeometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    terrainGeometry.computeVertexNormals();
  }
  const terrain = new THREE.Mesh(
    terrainGeometry,
    new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true })
  );
  scene.add(terrain);

  // --- Board overlay --------------------------------------------------------
  const boardTexture = makeBoardTexture();
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(BOARD_EXTENT * 2, BOARD_EXTENT * 2),
    new THREE.MeshStandardMaterial({
      map: boardTexture,
      transparent: true,
      opacity: 0.62,
      roughness: 0.95,
      depthWrite: false,
    })
  );
  board.rotation.x = -Math.PI / 2;
  board.position.y = 0.03;
  scene.add(board);

  // --- Castles --------------------------------------------------------------
  const whiteCastle = buildCastle(true);
  whiteCastle.position.set(0, 0, 12.5);
  scene.add(whiteCastle);

  const blackCastle = buildCastle(false);
  blackCastle.position.set(0, 0, -12.5);
  blackCastle.rotation.y = Math.PI;
  scene.add(blackCastle);

  // --- Armies ---------------------------------------------------------------
  const whiteArmy = buildArmy(true);
  whiteArmy.position.set(0, 0, 8.6);
  scene.add(whiteArmy);

  const blackArmy = buildArmy(false);
  blackArmy.position.set(0, 0, -8.6);
  blackArmy.rotation.y = Math.PI;
  scene.add(blackArmy);

  // --- March token ----------------------------------------------------------
  const tokenMaterial = new THREE.MeshStandardMaterial({
    color: 0xffd98a,
    emissive: 0x7a5d1f,
    emissiveIntensity: 0.8,
    roughness: 0.4,
    metalness: 0.3,
    transparent: true,
    opacity: 1,
  });
  const token = new THREE.Mesh(new THREE.ConeGeometry(0.42, 1.15, 6), tokenMaterial);
  token.visible = false;
  scene.add(token);

  const promotionRing = new THREE.Mesh(
    new THREE.RingGeometry(0.5, 0.72, 32),
    new THREE.MeshBasicMaterial({
      color: 0xffd76b,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
  );
  promotionRing.rotation.x = -Math.PI / 2;
  promotionRing.visible = false;
  scene.add(promotionRing);

  const burst = buildBurst();
  scene.add(burst.points);

  // --- State ---------------------------------------------------------------
  let intensity = INTENSITY.medium;
  let shake = 0;
  let flash = 0;
  let alarmUntil = 0;
  let camLocked = false;
  const camGoal = camHome.clone();
  const lookGoal = camLook.clone();
  const tickers = [];
  let disposed = false;

  const addTicker = (fn) => {
    tickers.push(fn);
  };

  const triggerBurst = (at) => {
    const { positions, velocities, count, material } = burst;
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = at.x;
      positions[i * 3 + 1] = 0.4;
      positions[i * 3 + 2] = at.z;
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.4 + Math.random() * 3.4;
      velocities[i * 3] = Math.cos(angle) * speed;
      velocities[i * 3 + 1] = 2.2 + Math.random() * 4.2;
      velocities[i * 3 + 2] = Math.sin(angle) * speed;
    }
    burst.points.geometry.attributes.position.needsUpdate = true;
    material.opacity = 1;
    let life = 0;
    addTicker((dt) => {
      life += dt;
      for (let i = 0; i < count; i += 1) {
        velocities[i * 3 + 1] -= 9 * dt;
        positions[i * 3] += velocities[i * 3] * dt;
        positions[i * 3 + 1] += velocities[i * 3 + 1] * dt;
        positions[i * 3 + 2] += velocities[i * 3 + 2] * dt;
        if (positions[i * 3 + 1] < 0.05) positions[i * 3 + 1] = 0.05;
      }
      burst.points.geometry.attributes.position.needsUpdate = true;
      material.opacity = Math.max(0, 1 - life / 1.4);
      return life < 1.4;
    });
  };

  const moveToken = (lastMove, moverColor, duration) => {
    const from = squareToWorld(lastMove.from).setY(0.55);
    const to = squareToWorld(lastMove.to).setY(0.55);

    tokenMaterial.color.set(moverColor === 'w' ? 0xffeec2 : 0xff9a9a);
    token.position.copy(from);
    token.visible = true;

    if (duration <= 0) {
      token.position.copy(to);
      return;
    }

    let elapsed = 0;
    addTicker((dt) => {
      elapsed += dt;
      const t = clamp01(elapsed / duration);
      token.position.lerpVectors(from, to, easeOutCubic(t));
      token.position.y = 0.55 + Math.sin(t * Math.PI) * 1.5;
      token.rotation.y += dt * 5.5;
      if (t >= 1) {
        token.visible = false;
        return false;
      }
      return true;
    });
  };

  const playPromotion = (at) => {
    promotionRing.position.set(at.x, 0.09, at.z);
    promotionRing.visible = true;
    let life = 0;
    addTicker((dt) => {
      life += dt;
      const t = clamp01(life / 1.1);
      promotionRing.scale.setScalar(0.6 + t * 3.4);
      promotionRing.material.opacity = 1 - t;
      if (t >= 1) {
        promotionRing.visible = false;
        return false;
      }
      return true;
    });
  };

  const boostArmy = (army, direction) => {
    const slots = army.userData.slots || [];
    slots.forEach((slot, index) => {
      let t = 0;
      const delay = index * 0.04;
      addTicker((dt) => {
        t += dt;
        const progress = clamp01((t - delay) / 0.45);
        const home = slot.userData.home;
        slot.position.z = home.z + direction * easeOutCubic(progress) * 0.9;
        return progress < 1;
      });
    });
  };

  const collapseCastle = (castle) => {
    let t = 0;
    addTicker((dt) => {
      t += dt;
      const p = clamp01(t / 2.2);
      castle.rotation.z = easeOutCubic(p) * 0.42;
      castle.position.y = -easeOutCubic(p) * 1.35;
      return p < 1;
    });
  };

  const fadeArmy = (army, to) => {
    const [body, steel] = army.userData.materials || [];
    let t = 0;
    addTicker((dt) => {
      t += dt;
      const p = clamp01(t / 1.6);
      const opacity = 1 - p * (1 - to);
      if (body) body.opacity = opacity;
      if (steel) steel.opacity = opacity;
      army.position.y = -p * 0.5;
      return p < 1;
    });
  };

  const playResult = (gameResult) => {
    if (!gameResult?.over) return;
    const winner = gameResult.winner;
    const type = gameResult.type;

    if (type === 'checkmate') {
      const losingCastle = winner === 'w' ? blackCastle : whiteCastle;
      collapseCastle(losingCastle);
      fadeArmy(winner === 'w' ? blackArmy : whiteArmy, 0.25);
      if (winner === 'w') boostArmy(whiteArmy, -1);
      else boostArmy(blackArmy, 1);

      camLocked = true;
      camGoal.set(winner === 'w' ? 5 : -5, 8.5, winner === 'w' ? -6 : 6);
      lookGoal.set(0, 3, winner === 'w' ? -10 : 10);
      shake = Math.max(shake, 0.55);
      return;
    }

    if (type === 'timeout' || type === 'resignation' || type === 'draw-agreed') {
      const loser = winner === 'w' ? blackArmy : winner === 'b' ? whiteArmy : null;
      const victor = winner === 'w' ? whiteArmy : winner === 'b' ? blackArmy : null;
      if (loser) fadeArmy(loser, 0.3);
      if (victor) boostArmy(victor, winner === 'w' ? -1 : 1);
      shake = Math.max(shake, 0.3);
    }
  };

  const reset = () => {
    tickers.length = 0;
    token.visible = false;
    promotionRing.visible = false;
    burst.material.opacity = 0;
    shake = 0;
    flash = 0;
    alarmUntil = 0;
    camLocked = false;
    camGoal.copy(camHome);
    lookGoal.copy(camLook);

    [whiteCastle, blackCastle].forEach((castle) => {
      castle.rotation.z = 0;
      castle.position.y = 0;
    });

    [[whiteArmy, 8.6], [blackArmy, -8.6]].forEach(([army, z]) => {
      army.position.set(0, 0, z);
      const [body, steel] = army.userData.materials || [];
      if (body) body.opacity = 1;
      if (steel) steel.opacity = 1;
      (army.userData.slots || []).forEach((slot) => {
        slot.position.copy(slot.userData.home);
      });
    });
  };

  const setIntensity = (level) => {
    intensity = INTENSITY[level] || INTENSITY.medium;
  };

  const playMove = (lastMove, moverColor) => {
    if (!lastMove) return;
    moveToken(lastMove, moverColor, intensity.move);
    flash = Math.max(flash, 0.5 + intensity.flash * 0.9);
    shake = Math.max(shake, 0.12 + intensity.shake);
    const destination = squareToWorld(lastMove.to);
    if (lastMove.captured) triggerBurst(destination);
    if (lastMove.promotion) playPromotion(destination);
    boostArmy(moverColor === 'w' ? whiteArmy : blackArmy, moverColor === 'w' ? -0.35 : 0.35);
  };

  const setAlarm = (active) => {
    alarmUntil = active ? Number.POSITIVE_INFINITY : 0;
  };

  // --- Resize --------------------------------------------------------------
  const resize = () => {
    const width = container.clientWidth || 1;
    const height = container.clientHeight || 1;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };

  const observer = new ResizeObserver(resize);
  observer.observe(container);

  // --- Loop ----------------------------------------------------------------
  const clock = new THREE.Clock();
  const render = () => {
    if (disposed) return;
    const dt = Math.min(clock.getDelta(), 0.05);
    const elapsed = clock.elapsedTime;

    for (let i = tickers.length - 1; i >= 0; i -= 1) {
      if (tickers[i](dt, elapsed) === false) tickers.splice(i, 1);
    }

    // Idle camera drift, suspended once the battle is decided.
    if (!camLocked) {
      camGoal.set(Math.sin(elapsed * 0.16) * 3.2, 15 + Math.sin(elapsed * 0.23) * 0.8, 22);
      lookGoal.set(0, 2, 0);
    }
    camera.position.lerp(camGoal, 1 - Math.pow(0.001, dt));
    if (shake > 0.001) {
      camera.position.x += (Math.random() - 0.5) * shake * 2.4;
      camera.position.y += (Math.random() - 0.5) * shake * 1.6;
      shake *= Math.pow(0.02, dt);
    }
    camera.lookAt(lookGoal);

    flash *= Math.pow(0.06, dt);
    flashLight.intensity = flash * 220;

    const alarmActive = alarmUntil === Number.POSITIVE_INFINITY;
    alarmLight.intensity = alarmActive ? 40 + Math.sin(elapsed * 6) * 18 : 0;

    board.material.opacity = 0.62;

    renderer.render(scene, camera);
  };

  renderer.setAnimationLoop(render);

  const dispose = () => {
    disposed = true;
    renderer.setAnimationLoop(null);
    observer.disconnect();
    tickers.length = 0;
    scene.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      const material = object.material;
      if (!material) return;
      if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
      else material.dispose();
    });
    boardTexture.dispose();
    renderer.dispose();
    if (renderer.domElement.parentNode === container) {
      container.removeChild(renderer.domElement);
    }
  };

  return { playMove, playResult, reset, setIntensity, setAlarm, resize, dispose };
}
