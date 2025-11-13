// heartViewer.js - 3D Heart Visualization Module
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

let scene, camera, renderer, controls, heartModel;
let tooltips = {};
let highlightedMeshes = [];
let bloodParticles = null;
let heartBeatScale = 1.0;
let heartBeatDirection = 1;

// Advanced cardiac simulation variables
let cardiacCycleTime = 0;
const CARDIAC_CYCLE_DURATION = 0.8; // seconds (75 bpm)
const ATRIAL_SYSTOLE_START = 0.0;
const ATRIAL_SYSTOLE_END = 0.1;
const VENTRICULAR_SYSTOLE_START = 0.1;
const VENTRICULAR_SYSTOLE_END = 0.4;
const DIASTOLE_START = 0.4;
const DIASTOLE_END = 0.8;

// Blood flow particle pools
let systemicBloodParticles = []; // Deoxygenated (blue)
let pulmonaryBloodParticles = []; // Oxygenated (red)
let coronaryBloodParticles = []; // Coronary circulation (red)

// Cardiac chambers (for animation when we have detailed model)
let rightAtrium, rightVentricle, leftAtrium, leftVentricle;

/**
 * Initialize the 3D heart viewer
 * @param {HTMLElement} container - DOM element to render into
 * @param {Object} options - Configuration options
 * @returns {Promise<Object>} Viewer API object
 */
export async function initHeartViewer(container, options = {}) {
  const {
    modelPath = '/models/heart.glb',
    cameraDistance = 5,
    ambientLightIntensity = 0.5,
    directionalLightIntensity = 0.8
  } = options;

  // Create scene
  scene = new THREE.Scene();
  scene.background = new THREE.Color(0x0b0b0b);

  // Create camera
  camera = new THREE.PerspectiveCamera(
    45,
    container.clientWidth / container.clientHeight,
    0.1,
    1000
  );
  camera.position.set(0, 0, cameraDistance);

  // Create renderer
  renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.setPixelRatio(window.devicePixelRatio);
  container.appendChild(renderer.domElement);

  // Add lights
  const ambientLight = new THREE.AmbientLight(0xffffff, ambientLightIntensity);
  scene.add(ambientLight);

  const directionalLight = new THREE.DirectionalLight(0xffffff, directionalLightIntensity);
  directionalLight.position.set(5, 5, 5);
  scene.add(directionalLight);

  // Add orbit controls
  controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.minDistance = 0.5;
  controls.maxDistance = 5;

  // Load heart model
  const loader = new GLTFLoader();
  try {
    const gltf = await new Promise((resolve, reject) => {
      loader.load(
        modelPath,
        resolve,
        undefined,
        reject
      );
    });

    heartModel = gltf.scene;
    scene.add(heartModel);

    // Apply realistic cardiac muscle texture
    heartModel.traverse((child) => {
      if (child.isMesh) {
        // Store original material for later restoration
        child.userData.originalMaterial = child.material.clone();

        // Apply realistic cardiac muscle material
        child.material = new THREE.MeshStandardMaterial({
          color: 0xcc6666,  // Pinkish-red cardiac muscle color
          roughness: 0.7,    // Slightly rough surface (muscle tissue)
          metalness: 0.1,    // Low metalness (organic tissue)
          emissive: 0x220000, // Slight warm glow
          emissiveIntensity: 0.15
        });

        // Identify chambers if model has named parts
        const nameLower = child.name.toLowerCase();
        if (nameLower.includes('atrium') || nameLower.includes('atrial')) {
          if (nameLower.includes('right')) rightAtrium = child;
          else if (nameLower.includes('left')) leftAtrium = child;
        } else if (nameLower.includes('ventricle') || nameLower.includes('ventricular')) {
          if (nameLower.includes('right')) rightVentricle = child;
          else if (nameLower.includes('left')) leftVentricle = child;
        }
      }
    });

    // Center the model
    const box = new THREE.Box3().setFromObject(heartModel);
    const center = box.getCenter(new THREE.Vector3());
    heartModel.position.sub(center);

    console.log('✅ Heart model loaded with realistic cardiac tissue material');

  } catch (error) {
    console.error('Error loading heart model:', error);
    throw error;
  }

  // Handle window resize
  const handleResize = () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
  };
  window.addEventListener('resize', handleResize);

  // Animation loop with optional auto-rotation
  let autoRotate = false;
  let showBloodFlow = false;
  let heartBeatEnabled = false;
  let lastFrameTime = Date.now();

  function animate() {
    requestAnimationFrame(animate);

    const currentTime = Date.now();
    const delta = (currentTime - lastFrameTime) / 1000; // Convert to seconds
    lastFrameTime = currentTime;

    // Update cardiac cycle time
    if (heartBeatEnabled) {
      cardiacCycleTime += delta;
      if (cardiacCycleTime > CARDIAC_CYCLE_DURATION) {
        cardiacCycleTime = 0;
      }
    }

    // Auto-rotate the heart model for better visualization
    if (autoRotate && heartModel) {
      heartModel.rotation.y += 0.005; // Slow rotation
    }

    // Realistic heartbeat animation based on cardiac cycle
    if (heartBeatEnabled && heartModel) {
      const cyclePhase = cardiacCycleTime / CARDIAC_CYCLE_DURATION;

      // Anatomically accurate cardiac cycle animation
      let scale = 1.0;

      // Diastole (filling phase) - heart expands
      if (cyclePhase < ATRIAL_SYSTOLE_START / CARDIAC_CYCLE_DURATION) {
        scale = 1.0 + 0.03 * Math.sin(cyclePhase * Math.PI * 2);
      }
      // Atrial systole (atria contract) - subtle atrial contraction
      else if (cyclePhase < VENTRICULAR_SYSTOLE_START / CARDIAC_CYCLE_DURATION) {
        const atrialPhase = (cyclePhase - ATRIAL_SYSTOLE_START / CARDIAC_CYCLE_DURATION) /
                           ((VENTRICULAR_SYSTOLE_START - ATRIAL_SYSTOLE_START) / CARDIAC_CYCLE_DURATION);
        scale = 1.03 + 0.02 * Math.sin(atrialPhase * Math.PI);
      }
      // Ventricular systole (ventricles contract strongly) - heart contracts
      else if (cyclePhase < VENTRICULAR_SYSTOLE_END / CARDIAC_CYCLE_DURATION) {
        const ventricularPhase = (cyclePhase - VENTRICULAR_SYSTOLE_START / CARDIAC_CYCLE_DURATION) /
                                 ((VENTRICULAR_SYSTOLE_END - VENTRICULAR_SYSTOLE_START) / CARDIAC_CYCLE_DURATION);
        scale = 1.0 - 0.08 * Math.sin(ventricularPhase * Math.PI); // Strong contraction
      }
      // Diastole (relaxation) - heart returns to resting state
      else {
        const diastolePhase = (cyclePhase - DIASTOLE_START / CARDIAC_CYCLE_DURATION) /
                             ((DIASTOLE_END - DIASTOLE_START) / CARDIAC_CYCLE_DURATION);
        scale = 0.92 + 0.08 * diastolePhase; // Smooth return to normal
      }

      heartModel.scale.set(scale, scale, scale);
    }

    // Update anatomical blood flow
    if (showBloodFlow && (systemicBloodParticles.length > 0 ||
                          pulmonaryBloodParticles.length > 0 ||
                          coronaryBloodParticles.length > 0)) {
      updateBloodFlow(delta);
    }

    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  /**
   * Create visible coronary arteries on heart surface
   */
  function createCoronaryArteries() {
    // Left Anterior Descending (LAD) - runs down front of heart
    const ladPath = [
      new THREE.Vector3(-0.1, 0.6, 0.4),   // Origin from aorta
      new THREE.Vector3(0.0, 0.4, 0.5),    // Anterior surface upper
      new THREE.Vector3(0.1, 0.2, 0.5),    // Mid anterior
      new THREE.Vector3(0.15, 0.0, 0.45),  // Apex
      new THREE.Vector3(0.1, -0.1, 0.4)    // Wrapping slightly
    ];

    // Left Circumflex (LCX) - wraps around left side
    const lcxPath = [
      new THREE.Vector3(-0.1, 0.6, 0.3),   // Origin from aorta
      new THREE.Vector3(-0.3, 0.5, 0.2),   // Left lateral wall
      new THREE.Vector3(-0.4, 0.3, 0.0),   // Wrapping posterior
      new THREE.Vector3(-0.35, 0.2, -0.2)  // Posterior wall
    ];

    // Right Coronary Artery (RCA) - wraps around right side
    const rcaPath = [
      new THREE.Vector3(0.0, 0.6, 0.35),   // Origin from aorta
      new THREE.Vector3(0.3, 0.5, 0.3),    // Right atrial surface
      new THREE.Vector3(0.4, 0.3, 0.1),    // Right lateral wall
      new THREE.Vector3(0.35, 0.1, -0.1),  // Wrapping posterior
      new THREE.Vector3(0.2, 0.0, -0.2)    // Posterior descending
    ];

    // Create tube geometry for arteries
    function createArteryTube(path, color, name) {
      const curve = new THREE.CatmullRomCurve3(path);
      const tubeGeometry = new THREE.TubeGeometry(curve, 20, 0.012, 8, false);
      const tubeMaterial = new THREE.MeshStandardMaterial({
        color: color,
        emissive: color,
        emissiveIntensity: 0.3,
        metalness: 0.3,
        roughness: 0.5
      });
      const tube = new THREE.Mesh(tubeGeometry, tubeMaterial);
      tube.name = name;
      return tube;
    }

    const ladTube = createArteryTube(ladPath, 0xff6666, 'LAD_artery');
    const lcxTube = createArteryTube(lcxPath, 0xff6666, 'LCX_artery');
    const rcaTube = createArteryTube(rcaPath, 0xff6666, 'RCA_artery');

    scene.add(ladTube);
    scene.add(lcxTube);
    scene.add(rcaTube);

    console.log('✅ Coronary arteries visualized on heart surface (LAD, LCX, RCA)');

    return { ladTube, lcxTube, rcaTube };
  }

  /**
   * Create anatomically accurate blood flow paths
   * Systemic circulation: Body → Vena Cava → RA → RV → Pulmonary Artery → Lungs
   * Pulmonary circulation: Lungs → Pulmonary Veins → LA → LV → Aorta → Body
   * Coronary circulation: Aorta → Coronary Arteries → Heart Muscle → Coronary Sinus → RA
   */
  function createAnatomicalBloodFlowPaths() {
    // SYSTEMIC CIRCULATION PATH (Deoxygenated - Blue)
    const systemicPath = [
      new THREE.Vector3(0, 1.2, 0),    // Superior Vena Cava entry
      new THREE.Vector3(0.3, 0.8, 0.2), // Right Atrium
      new THREE.Vector3(0.35, 0.5, 0.2), // Tricuspid valve
      new THREE.Vector3(0.3, 0.1, 0.3),  // Right Ventricle
      new THREE.Vector3(0.2, 0.3, 0.4),  // Pulmonary valve
      new THREE.Vector3(-0.1, 0.8, 0.5), // Pulmonary artery (splits to lungs)
      new THREE.Vector3(-0.3, 1.2, 0.6)  // To lungs
    ];

    // PULMONARY CIRCULATION PATH (Oxygenated - Red)
    const pulmonaryPath = [
      new THREE.Vector3(-0.3, 1.2, -0.3), // Pulmonary veins from lungs
      new THREE.Vector3(-0.1, 0.9, -0.2), // Converging pulmonary veins
      new THREE.Vector3(-0.3, 0.7, -0.1), // Left Atrium
      new THREE.Vector3(-0.35, 0.4, 0),   // Mitral valve
      new THREE.Vector3(-0.3, 0.0, 0.1),  // Left Ventricle apex
      new THREE.Vector3(-0.25, 0.2, 0),   // Left Ventricle mid
      new THREE.Vector3(-0.2, 0.5, -0.1), // Aortic valve
      new THREE.Vector3(-0.1, 0.8, -0.2), // Ascending aorta
      new THREE.Vector3(0, 1.0, -0.3),    // Aortic arch
      new THREE.Vector3(0.2, 1.2, -0.2)   // To body
    ];

    // CORONARY CIRCULATION PATH (Oxygenated - Bright Red)
    const coronaryPath = [
      new THREE.Vector3(-0.15, 0.6, -0.15), // Coronary ostia (from aorta)
      new THREE.Vector3(0.0, 0.5, 0.4),     // LAD down front
      new THREE.Vector3(0.3, 0.3, 0.3),     // LAD to apex
      new THREE.Vector3(0.4, 0.2, 0.0),     // Wrapping around
      new THREE.Vector3(0.3, 0.4, -0.3),    // RCA
      new THREE.Vector3(0.2, 0.6, -0.2),    // Back to coronary sinus
      new THREE.Vector3(0.3, 0.8, 0.1)      // Drains to RA
    ];

    return { systemicPath, pulmonaryPath, coronaryPath };
  }

  /**
   * Create individual blood cell particles that follow anatomical paths
   */
  function createBloodFlow() {
    // Clear existing particles
    systemicBloodParticles.forEach(p => scene.remove(p.mesh));
    pulmonaryBloodParticles.forEach(p => scene.remove(p.mesh));
    coronaryBloodParticles.forEach(p => scene.remove(p.mesh));
    systemicBloodParticles = [];
    pulmonaryBloodParticles = [];
    coronaryBloodParticles = [];

    // Create visible coronary arteries on heart surface
    createCoronaryArteries();

    const paths = createAnatomicalBloodFlowPaths();

    // Create systemic (deoxygenated) blood particles - BLUE
    const systemicGeometry = new THREE.SphereGeometry(0.015, 8, 8);
    const systemicMaterial = new THREE.MeshStandardMaterial({
      color: 0x0066ff,
      emissive: 0x0033aa,
      emissiveIntensity: 0.4,
      metalness: 0.6,
      roughness: 0.3
    });

    for (let i = 0; i < 80; i++) {
      const mesh = new THREE.Mesh(systemicGeometry, systemicMaterial);
      const progress = i / 80;
      systemicBloodParticles.push({
        mesh,
        path: paths.systemicPath,
        progress,
        speed: 0.003 + Math.random() * 0.002
      });
      scene.add(mesh);
    }

    // Create pulmonary (oxygenated) blood particles - RED
    const pulmonaryGeometry = new THREE.SphereGeometry(0.015, 8, 8);
    const pulmonaryMaterial = new THREE.MeshStandardMaterial({
      color: 0xff0000,
      emissive: 0xaa0000,
      emissiveIntensity: 0.5,
      metalness: 0.6,
      roughness: 0.3
    });

    for (let i = 0; i < 100; i++) {
      const mesh = new THREE.Mesh(pulmonaryGeometry, pulmonaryMaterial);
      const progress = i / 100;
      pulmonaryBloodParticles.push({
        mesh,
        path: paths.pulmonaryPath,
        progress,
        speed: 0.004 + Math.random() * 0.002
      });
      scene.add(mesh);
    }

    // Create coronary circulation particles - BRIGHT RED
    const coronaryGeometry = new THREE.SphereGeometry(0.012, 6, 6);
    const coronaryMaterial = new THREE.MeshStandardMaterial({
      color: 0xff3333,
      emissive: 0xff0000,
      emissiveIntensity: 0.6,
      metalness: 0.7,
      roughness: 0.2
    });

    for (let i = 0; i < 60; i++) {
      const mesh = new THREE.Mesh(coronaryGeometry, coronaryMaterial);
      const progress = i / 60;
      coronaryBloodParticles.push({
        mesh,
        path: paths.coronaryPath,
        progress,
        speed: 0.0025 + Math.random() * 0.0015
      });
      scene.add(mesh);
    }

    console.log('✅ Anatomical blood flow created:');
    console.log(`   - ${systemicBloodParticles.length} systemic (deoxygenated) particles`);
    console.log(`   - ${pulmonaryBloodParticles.length} pulmonary (oxygenated) particles`);
    console.log(`   - ${coronaryBloodParticles.length} coronary circulation particles`);
  }

  /**
   * Update blood particle positions along anatomical paths
   */
  function updateBloodFlow(delta) {
    // Get cardiac phase for valve timing
    const cyclePhase = (cardiacCycleTime % CARDIAC_CYCLE_DURATION) / CARDIAC_CYCLE_DURATION;

    // Valves open/close based on cardiac cycle
    const tricuspidOpen = cyclePhase < VENTRICULAR_SYSTOLE_START || cyclePhase > DIASTOLE_START;
    const pulmonicOpen = cyclePhase >= VENTRICULAR_SYSTOLE_START && cyclePhase <= VENTRICULAR_SYSTOLE_END;
    const mitralOpen = cyclePhase < VENTRICULAR_SYSTOLE_START || cyclePhase > DIASTOLE_START;
    const aorticOpen = cyclePhase >= VENTRICULAR_SYSTOLE_START && cyclePhase <= VENTRICULAR_SYSTOLE_END;

    // Update systemic circulation particles
    systemicBloodParticles.forEach(particle => {
      particle.progress += particle.speed * (tricuspidOpen ? 1 : 0.3);
      if (particle.progress > 1) particle.progress = 0;

      const pos = getPointOnPath(particle.path, particle.progress);
      particle.mesh.position.copy(pos);
    });

    // Update pulmonary circulation particles
    pulmonaryBloodParticles.forEach(particle => {
      particle.progress += particle.speed * (mitralOpen && aorticOpen ? 1 : 0.3);
      if (particle.progress > 1) particle.progress = 0;

      const pos = getPointOnPath(particle.path, particle.progress);
      particle.mesh.position.copy(pos);
    });

    // Update coronary circulation particles
    coronaryBloodParticles.forEach(particle => {
      particle.progress += particle.speed;
      if (particle.progress > 1) particle.progress = 0;

      const pos = getPointOnPath(particle.path, particle.progress);
      particle.mesh.position.copy(pos);
    });
  }

  /**
   * Get interpolated position along a path
   */
  function getPointOnPath(path, t) {
    const segments = path.length - 1;
    const scaledT = t * segments;
    const segment = Math.floor(scaledT);
    const localT = scaledT - segment;

    if (segment >= segments) {
      return path[path.length - 1].clone();
    }

    const p0 = path[Math.max(0, segment - 1)];
    const p1 = path[segment];
    const p2 = path[segment + 1];
    const p3 = path[Math.min(segments, segment + 2)];

    // Catmull-Rom spline for smooth interpolation
    return new THREE.Vector3(
      catmullRom(localT, p0.x, p1.x, p2.x, p3.x),
      catmullRom(localT, p0.y, p1.y, p2.y, p3.y),
      catmullRom(localT, p0.z, p1.z, p2.z, p3.z)
    );
  }

  /**
   * Catmull-Rom spline interpolation
   */
  function catmullRom(t, p0, p1, p2, p3) {
    const v0 = (p2 - p0) * 0.5;
    const v1 = (p3 - p1) * 0.5;
    const t2 = t * t;
    const t3 = t * t2;
    return (2 * p1 - 2 * p2 + v0 + v1) * t3 +
           (-3 * p1 + 3 * p2 - 2 * v0 - v1) * t2 +
           v0 * t + p1;
  }

  // Return API
  return {
    scene,
    camera,
    renderer,
    controls,
    heartModel,
    setAutoRotate: (enabled) => { autoRotate = enabled; },
    setBloodFlow: (enabled) => {
      showBloodFlow = enabled;
      if (enabled && systemicBloodParticles.length === 0) {
        createBloodFlow();
      } else if (!enabled) {
        // Remove all blood flow particles
        systemicBloodParticles.forEach(p => scene.remove(p.mesh));
        pulmonaryBloodParticles.forEach(p => scene.remove(p.mesh));
        coronaryBloodParticles.forEach(p => scene.remove(p.mesh));
        systemicBloodParticles = [];
        pulmonaryBloodParticles = [];
        coronaryBloodParticles = [];
      }
    },
    setHeartBeat: (enabled) => {
      heartBeatEnabled = enabled;
      if (enabled) {
        cardiacCycleTime = 0; // Reset cardiac cycle
      }
    },
    dispose: () => {
      window.removeEventListener('resize', handleResize);
      if (bloodParticles) {
        scene.remove(bloodParticles);
        bloodParticles = null;
      }
      disposeHeartViewer();
    }
  };
}

/**
 * Toggle between internal and external heart views
 * @param {boolean} showInternal - True for internal view
 */
export function setInternalView(showInternal) {
  if (!heartModel) return;

  heartModel.traverse((child) => {
    if (child.isMesh) {
      // Toggle visibility based on mesh names (depends on your model structure)
      if (child.name.includes('external') || child.name.includes('outer')) {
        child.visible = !showInternal;
      }
      if (child.name.includes('internal') || child.name.includes('inner')) {
        child.visible = showInternal;
      }
    }
  });
}

/**
 * Highlight a specific heart valve
 * @param {string} valveName - Name of valve (mitral, aortic, tricuspid, pulmonary)
 * @param {number} color - Hex color code
 */
export function highlightValve(valveName, color = 0xff0000) {
  if (!heartModel) return;

  const valveMap = {
    mitral: ['mitral', 'mv'],
    aortic: ['aortic', 'av'],
    tricuspid: ['tricuspid', 'tv'],
    pulmonary: ['pulmonary', 'pv']
  };

  const searchTerms = valveMap[valveName.toLowerCase()] || [valveName];

  heartModel.traverse((child) => {
    if (child.isMesh) {
      const nameLower = child.name.toLowerCase();
      if (searchTerms.some(term => nameLower.includes(term))) {
        child.material = new THREE.MeshStandardMaterial({
          color: color,
          emissive: color,
          emissiveIntensity: 0.5
        });
        highlightedMeshes.push(child);
      }
    }
  });
}

/**
 * Simulate valve regurgitation (backflow animation)
 * @param {string} valveName - Name of valve
 */
export function simulateRegurgitation(valveName) {
  console.log(`Simulating regurgitation for ${valveName} valve`);
  // TODO: Implement particle system for blood backflow animation
  highlightValve(valveName, 0xff6600);
}

/**
 * Highlight a coronary artery
 * @param {string} arteryName - Name of artery (LAD, LCX, RCA)
 * @param {number} color - Hex color code
 */
export function highlightCoronaryArtery(arteryName, color = 0xffa500) {
  if (!heartModel) return;

  const arteryMap = {
    LAD: ['lad', 'left anterior descending'],
    LCX: ['lcx', 'left circumflex'],
    RCA: ['rca', 'right coronary']
  };

  const searchTerms = arteryMap[arteryName.toUpperCase()] || [arteryName];

  heartModel.traverse((child) => {
    if (child.isMesh) {
      const nameLower = child.name.toLowerCase();
      if (searchTerms.some(term => nameLower.includes(term))) {
        child.material = new THREE.MeshStandardMaterial({
          color: color,
          emissive: color,
          emissiveIntensity: 0.6
        });
        highlightedMeshes.push(child);
      }
    }
  });
}

/**
 * Add plaque overlay to coronary artery
 * @param {string} arteryName - Name of artery
 * @param {Object} plaqueParams - Plaque parameters (severity, location, type)
 */
export function addPlaqueOverlay(arteryName, plaqueParams = {}) {
  const { severity = 0.5, location = 'proximal', type = 'calcified' } = plaqueParams;

  console.log(`Adding ${type} plaque to ${arteryName} (${location}, severity: ${severity})`);

  // Color based on severity
  let color = 0xffff00; // yellow for mild
  if (severity > 0.7) color = 0xff0000; // red for severe
  else if (severity > 0.4) color = 0xff8800; // orange for moderate

  highlightCoronaryArtery(arteryName, color);
}

/**
 * Restrict blood flow in a region
 * @param {Object} regionBox - Bounding box defining restricted region
 */
export function restrictBloodFlow(regionBox) {
  console.log('Restricting blood flow in region:', regionBox);
  // TODO: Implement flow visualization with reduced flow in specified region
}

/**
 * Attach tooltip to a mesh by name
 * @param {string} meshName - Name of mesh
 * @param {string} text - Tooltip text
 */
export function attachTooltipToMesh(meshName, text) {
  if (!heartModel) return;

  heartModel.traverse((child) => {
    if (child.isMesh && child.name.toLowerCase().includes(meshName.toLowerCase())) {
      tooltips[child.uuid] = text;
    }
  });
}

/**
 * Clear all highlights and overlays
 */
export function clearHighlights() {
  highlightedMeshes.forEach((mesh) => {
    // Restore original material (this is simplified - ideally store original materials)
    mesh.material = new THREE.MeshStandardMaterial({ color: 0xcccccc });
  });
  highlightedMeshes = [];
}

/**
 * Render diagnosis visualization from JSON
 * @param {Object} diagnosisJSON - Diagnosis data structure
 */
export function renderDiagnosisVisualization(diagnosisJSON) {
  if (!diagnosisJSON) {
    console.error('❌ No diagnosis JSON provided');
    return;
  }

  console.log('🎨 Rendering diagnosis:', diagnosisJSON);

  if (!heartModel) {
    console.error('❌ Heart model not loaded yet!');
    return;
  }

  // Log all mesh names in the heart model
  console.log('🔍 Heart model meshes:');
  let meshCount = 0;
  heartModel.traverse((child) => {
    if (child.isMesh) {
      meshCount++;
      console.log(`  - Mesh ${meshCount}: "${child.name}"`);
    }
  });
  console.log(`Total meshes found: ${meshCount}`);

  // Clear previous highlights
  clearHighlights();
  console.log('✅ Cleared previous highlights');

  // Set view
  if (diagnosisJSON.view) {
    setInternalView(diagnosisJSON.view === 'internal');
    console.log(`✅ Set view to: ${diagnosisJSON.view}`);
  }

  // Highlight valve
  if (diagnosisJSON.highlightValve) {
    highlightValve(diagnosisJSON.highlightValve);
    console.log(`✅ Highlighted valve: ${diagnosisJSON.highlightValve}`);
  }

  // Show valvular disease
  if (diagnosisJSON.valvularDisease) {
    const { valve, type, severity } = diagnosisJSON.valvularDisease;
    if (type === 'regurgitation') {
      simulateRegurgitation(valve);
    } else {
      highlightValve(valve, severity > 0.7 ? 0xff0000 : 0xff8800);
    }
    console.log(`✅ Applied valvular disease: ${valve} (${type})`);
  }

  // Show coronary plaque
  if (diagnosisJSON.coronaryPlaque) {
    console.log(`🔬 Processing ${diagnosisJSON.coronaryPlaque.length} coronary plaques...`);

    // Calculate average severity across all plaques
    let totalSeverity = 0;
    diagnosisJSON.coronaryPlaque.forEach((plaque, index) => {
      console.log(`  Plaque ${index + 1}: ${plaque.artery}, severity: ${plaque.plaqueParams.severity}`);
      totalSeverity += plaque.plaqueParams.severity;
      addPlaqueOverlay(plaque.artery, plaque.plaqueParams);
    });
    const avgSeverity = totalSeverity / diagnosisJSON.coronaryPlaque.length;

    console.log(`Average severity: ${avgSeverity}`);

    // If no specific arteries were highlighted (single-mesh model), color entire heart
    if (highlightedMeshes.length === 0) {
      console.log('⚠️ No specific arteries found, coloring entire heart based on risk...');

      // Color entire heart based on average severity with bright, visible colors
      let heartColor = 0x00ff88; // bright cyan-green for low risk
      let emissiveIntensity = 0.5;

      if (avgSeverity > 0.3) {
        heartColor = 0xffff00; // bright yellow for moderate
        emissiveIntensity = 0.6;
      }
      if (avgSeverity > 0.5) {
        heartColor = 0xff6600; // bright orange for high
        emissiveIntensity = 0.7;
      }
      if (avgSeverity > 0.7) {
        heartColor = 0xff0000; // bright red for very high
        emissiveIntensity = 0.8;
      }

      heartModel.traverse((child) => {
        if (child.isMesh) {
          console.log(`  Coloring mesh "${child.name}" with color #${heartColor.toString(16)} (emissive: ${emissiveIntensity})`);

          // Create highly visible material
          child.material = new THREE.MeshStandardMaterial({
            color: heartColor,
            emissive: heartColor,
            emissiveIntensity: emissiveIntensity,
            metalness: 0.3,
            roughness: 0.4,
            transparent: false,
            opacity: 1.0
          });

          // Force material update
          child.material.needsUpdate = true;
          highlightedMeshes.push(child);

          console.log(`  ✅ Material applied to "${child.name}"`);
        }
      });
      console.log(`✅ Colored entire heart model (avg severity: ${(avgSeverity * 100).toFixed(1)}%)`);
    } else {
      console.log(`✅ Applied ${highlightedMeshes.length} plaque highlights`);
    }
  }

  // Show blood flow restrictions
  if (diagnosisJSON.restrictedFlow) {
    diagnosisJSON.restrictedFlow.forEach(region => {
      restrictBloodFlow(region);
    });
    console.log('✅ Applied blood flow restrictions');
  }

  // Attach tooltips
  if (diagnosisJSON.tooltips) {
    Object.entries(diagnosisJSON.tooltips).forEach(([meshName, text]) => {
      attachTooltipToMesh(meshName, text);
    });
    console.log(`✅ Attached ${Object.keys(diagnosisJSON.tooltips).length} tooltips`);
  }

  console.log('🎉 Diagnosis visualization complete!');
}

/**
 * Clean up and dispose of viewer resources
 */
export function disposeHeartViewer() {
  if (renderer) {
    renderer.dispose();
  }
  if (scene) {
    scene.traverse((object) => {
      if (object.geometry) object.geometry.dispose();
      if (object.material) {
        if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose());
        } else {
          object.material.dispose();
        }
      }
    });
  }
  highlightedMeshes = [];
  tooltips = {};
}
