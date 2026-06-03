/**
 * klone-viewer.js — The Klone Factory
 * ------------------------------------
 * Drop-in Gaussian splat viewer powered by Three.js + Spark.
 *
 * Usage
 * -----
 *   <script type="importmap">
 *   {
 *     "imports": {
 *       "three":             "https://cdnjs.cloudflare.com/ajax/libs/three.js/0.180.0/three.module.js",
 *       "three/addons/":     "https://cdn.jsdelivr.net/npm/three@0.180.0/examples/jsm/",
 *       "@sparkjsdev/spark": "https://sparkjs.dev/releases/spark/2.0.0/spark.module.js"
 *     }
 *   }
 *   </script>
 *
 *   <script type="module">
 *     import { add3DViewer } from './klone-viewer.js';
 *
 *     add3DViewer(
 *       'my-container',            // id of the div to render into
 *       'assets/my-object.ksplat', // path or URL to the .ksplat file
 *       [0, -30, -75],             // initial camera position  [x, y, z]
 *       [0, -30,   0]              // look-at target           [x, y, z]
 *     );
 *   </script>
 *
 * The container div should have an explicit width and height (e.g. via CSS).
 * The viewer fills it completely and responds to resize automatically.
 *
 * Returns
 * -------
 * A promise that resolves once the splat has finished loading.
 * The resolved value is a `dispose()` function you can call to tear down
 * the viewer and free all GPU resources.
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { SparkRenderer, SplatMesh } from '@sparkjsdev/spark';

// ── Constants ────────────────────────────────────────────────────────────────

const ROTATION_SPEED  = 0.12;   // radians per second
const RESUME_DELAY_MS = 1200;   // ms after pointer-up before auto-rotate resumes

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Initialise a 3D splat viewer inside the given container element.
 *
 * @param {string}         containerId           - id of the host <div>
 * @param {string}         splatUrl              - URL / path to the .ksplat file
 * @param {[number,number,number]} [cameraPosition=[0,-30,-75]] - initial camera XYZ
 * @param {[number,number,number]} [lookAt=[0,-30,0]]           - orbit target XYZ
 * @returns {Promise<() => void>}  resolves to a dispose() function when loaded
 */
export async function add3DViewer(
  containerId,
  splatUrl,
  cameraPosition = [0, -30, -75],
  lookAt         = [0, -30,   0]
) {
  const container = document.getElementById(containerId);
  if (!container) throw new Error(`klone-viewer: no element found with id "${containerId}"`);

  // ── Loading overlay ────────────────────────────────────────────────────────
  const loader = _buildLoader();
  container.style.position = container.style.position || 'relative';
  container.appendChild(loader.el);

  // ── Renderer ───────────────────────────────────────────────────────────────
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  // ── Scene ──────────────────────────────────────────────────────────────────
  const scene  = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(60, 1, 0.01, 1000);

  const spark = new SparkRenderer({ renderer });
  scene.add(spark);

  // ── Camera ─────────────────────────────────────────────────────────────────
  const TARGET = new THREE.Vector3(...lookAt);
  camera.position.set(...cameraPosition);
  camera.up.set(0, -1, 0);
  camera.lookAt(TARGET);

  // ── Orbit controls ─────────────────────────────────────────────────────────
  const controls = new OrbitControls(camera, renderer.domElement);
  controls.target.copy(TARGET);
  controls.enablePan     = false;
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.minDistance   = 20;
  controls.maxDistance   = 150;
  controls.maxPolarAngle = Math.PI / 2;
  controls.update();

  // ── Ground occluder ────────────────────────────────────────────────────────
  // Invisible plane that writes depth so splat fragments below it are hidden.
  // Tweak occluder.position.y if you need to raise or lower the clip level.
  const occluder = new THREE.Mesh(
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.FrontSide })
  );
  occluder.rotation.x  = Math.PI / 2;
  occluder.position.y  = lookAt[1] + 27; // sits just below the object's base
  occluder.renderOrder = -1;
  scene.add(occluder);

  // ── Resize ─────────────────────────────────────────────────────────────────
  function resize() {
    const w = container.clientWidth;
    const h = container.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
  }

  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(container);
  resize();

  // ── Auto-rotate state ──────────────────────────────────────────────────────
  let isUserInteracting = false;
  let resumeTimer       = null;
  let lastTime          = null;

  function onInteractStart() {
    isUserInteracting = true;
    if (resumeTimer) { clearTimeout(resumeTimer); resumeTimer = null; }
  }

  function onInteractEnd() {
    if (resumeTimer) clearTimeout(resumeTimer);
    resumeTimer = setTimeout(() => {
      isUserInteracting = false;
      lastTime = null;
    }, RESUME_DELAY_MS);
  }

  renderer.domElement.addEventListener('pointerdown',   onInteractStart, { passive: true });
  renderer.domElement.addEventListener('pointerup',     onInteractEnd,   { passive: true });
  renderer.domElement.addEventListener('pointercancel', onInteractEnd,   { passive: true });

  // ── Render loop ────────────────────────────────────────────────────────────
  renderer.setAnimationLoop(function animate(now) {
    if (!isUserInteracting) {
      if (lastTime === null) lastTime = now;
      const delta = (now - lastTime) / 1000;
      lastTime = now;

      const angle  = ROTATION_SPEED * delta;
      const offset = camera.position.clone().sub(TARGET);
      const cosA   = Math.cos(angle);
      const sinA   = Math.sin(angle);

      camera.position.set(
        TARGET.x + offset.x * cosA + offset.z * sinA,
        TARGET.y + offset.y,
        TARGET.z - offset.x * sinA + offset.z * cosA
      );
      camera.lookAt(TARGET);
      controls.target.copy(TARGET);
      controls.update();
    } else {
      lastTime = null;
      controls.update();
    }

    renderer.render(scene, camera);
  });

  // ── Load splat ─────────────────────────────────────────────────────────────
  await new Promise((resolve, reject) => {
    const mesh = new SplatMesh({
      url: splatUrl,
      onProgress: (event) => {
        if (event.lengthComputable && event.total > 0) {
          const pct = Math.round((event.loaded / event.total) * 100);
          loader.setLabel(`${pct}%`);
        }
      },
      onLoad: () => {
        loader.hide();
        resolve();
      },
      onError: reject,
    });
    scene.add(mesh);
  });

  // ── Dispose ────────────────────────────────────────────────────────────────
  function dispose() {
    renderer.setAnimationLoop(null);
    resizeObserver.disconnect();
    renderer.domElement.removeEventListener('pointerdown',   onInteractStart);
    renderer.domElement.removeEventListener('pointerup',     onInteractEnd);
    renderer.domElement.removeEventListener('pointercancel', onInteractEnd);
    if (resumeTimer) clearTimeout(resumeTimer);
    controls.dispose();
    renderer.dispose();
    container.removeChild(renderer.domElement);
    if (loader.el.parentNode) container.removeChild(loader.el);
  }

  return dispose;
}

// ── Internal helpers ─────────────────────────────────────────────────────────

function _buildLoader() {
  const el = document.createElement('div');
  Object.assign(el.style, {
    position:       'absolute',
    inset:          '0',
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    justifyContent: 'center',
    gap:            '14px',
    background:     '#000',
    zIndex:         '10',
    transition:     'opacity 0.7s ease',
  });

  const ring = document.createElement('div');
  Object.assign(ring.style, {
    width:        '40px',
    height:       '40px',
    border:       '2px solid rgba(255,255,255,0.12)',
    borderTop:    '2px solid rgba(255,255,255,0.7)',
    borderRadius: '50%',
    animation:    'klone-spin 1s linear infinite',
  });

  // Inject keyframes once
  if (!document.getElementById('klone-viewer-styles')) {
    const style = document.createElement('style');
    style.id = 'klone-viewer-styles';
    style.textContent = `
      @keyframes klone-spin { to { transform: rotate(360deg); } }
    `;
    document.head.appendChild(style);
  }

  const label = document.createElement('div');
  Object.assign(label.style, {
    color:       'rgba(255,255,255,0.4)',
    fontFamily:  'monospace',
    fontSize:    '11px',
    letterSpacing: '0.18em',
    textTransform: 'uppercase',
  });
  label.textContent = 'Loading';

  el.appendChild(ring);
  el.appendChild(label);

  return {
    el,
    setLabel: (text) => { label.textContent = text; },
    hide: () => {
      el.style.opacity = '0';
      el.style.pointerEvents = 'none';
      el.addEventListener('transitionend', () => el.remove(), { once: true });
    },
  };
}
