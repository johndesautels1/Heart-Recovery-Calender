// heartViewer.js - 3D Heart Visualization Module
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

let scene, camera, renderer, controls, heartModel;
let tooltips = {};
let highlightedMeshes = [];

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

    // Center the model
    const box = new THREE.Box3().setFromObject(heartModel);
    const center = box.getCenter(new THREE.Vector3());
    heartModel.position.sub(center);

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

  // Animation loop
  function animate() {
    requestAnimationFrame(animate);
    controls.update();
    renderer.render(scene, camera);
  }
  animate();

  // Return API
  return {
    scene,
    camera,
    renderer,
    controls,
    heartModel,
    dispose: () => {
      window.removeEventListener('resize', handleResize);
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
  if (!diagnosisJSON) return;

  console.log('Rendering diagnosis:', diagnosisJSON);

  // Clear previous highlights
  clearHighlights();

  // Set view
  if (diagnosisJSON.view) {
    setInternalView(diagnosisJSON.view === 'internal');
  }

  // Highlight valve
  if (diagnosisJSON.highlightValve) {
    highlightValve(diagnosisJSON.highlightValve);
  }

  // Show valvular disease
  if (diagnosisJSON.valvularDisease) {
    const { valve, type, severity } = diagnosisJSON.valvularDisease;
    if (type === 'regurgitation') {
      simulateRegurgitation(valve);
    } else {
      highlightValve(valve, severity > 0.7 ? 0xff0000 : 0xff8800);
    }
  }

  // Show coronary plaque
  if (diagnosisJSON.coronaryPlaque) {
    diagnosisJSON.coronaryPlaque.forEach(plaque => {
      addPlaqueOverlay(plaque.artery, plaque.plaqueParams);
    });
  }

  // Show blood flow restrictions
  if (diagnosisJSON.restrictedFlow) {
    diagnosisJSON.restrictedFlow.forEach(region => {
      restrictBloodFlow(region);
    });
  }

  // Attach tooltips
  if (diagnosisJSON.tooltips) {
    Object.entries(diagnosisJSON.tooltips).forEach(([meshName, text]) => {
      attachTooltipToMesh(meshName, text);
    });
  }
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
