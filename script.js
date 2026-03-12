import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.162.0/build/three.module.js";

// -------------------
// Scene Setup
// -------------------
const scene = new THREE.Scene();

// Load Blender screenshot as background
const loader = new THREE.TextureLoader();
loader.load('blenderbackground.png', function(texture){
    scene.background = texture;
});

// Camera
const camera = new THREE.PerspectiveCamera(
  75,
  window.innerWidth / window.innerHeight,
  0.1,
  1000
);
camera.position.z = 2;

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias:true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// -------------------
// Lights (optional, makes cube look nicer on background)
// -------------------
const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
directionalLight.position.set(5, 5, 5);
scene.add(directionalLight);

// -------------------
// Cube (CAD object)
// -------------------
const geometry = new THREE.BoxGeometry(0.4, 0.4, 0.4);
const material = new THREE.MeshNormalMaterial();
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

// -------------------
// Ghost Hand Spheres (Expert)
// -------------------
const spheres = [];
const sphereGeometry = new THREE.SphereGeometry(0.03, 8, 8);
const sphereMaterial = new THREE.MeshBasicMaterial({
  color: 0x00ffff,
  transparent: true,
  opacity: 0.5
});

for(let i = 0; i < 21; i++){
  const s = new THREE.Mesh(sphereGeometry, sphereMaterial);
  scene.add(s);
  spheres.push(s);
}

// -------------------
// MediaPipe Hands Setup
// -------------------
const videoElement = document.getElementById('webcam');

const hands = new Hands({
  locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
});
hands.setOptions({
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.7,
  minTrackingConfidence: 0.7
});

hands.onResults((results) => {
  if(results.multiHandLandmarks && results.multiHandLandmarks.length > 0){
    const landmarks = results.multiHandLandmarks[0];
    for(let i = 0; i < 21; i++){
      const lm = landmarks[i];
      spheres[i].position.x = (lm.x - 0.5) * 1.5;
      spheres[i].position.y = -(lm.y - 0.5) * 1.5;
      spheres[i].position.z = -lm.z * 1.5;
    }
  }
});

const cameraMP = new Camera(videoElement, {
  onFrame: async () => { await hands.send({ image: videoElement }); },
  width: 320,
  height: 240
});
cameraMP.start();

// -------------------
// Raycaster for Novice Dragging
// -------------------
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let selectedObject = null;

window.addEventListener('mousedown', (event) => {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObjects([cube]);
  if(intersects.length > 0){
    selectedObject = intersects[0].object;
  }
});

window.addEventListener('mouseup', () => { selectedObject = null; });

window.addEventListener('mousemove', (event) => {
  if(selectedObject){
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const planeZ = new THREE.Plane(new THREE.Vector3(0,0,1), 0);
    const intersection = new THREE.Vector3();
    raycaster.ray.intersectPlane(planeZ, intersection);
    selectedObject.position.copy(intersection);
  }
});

// -------------------
// Animation Loop
// -------------------
function animate(){
  requestAnimationFrame(animate);
  renderer.render(scene, camera);
}

animate();

// -------------------
// Handle Window Resize
// -------------------
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// -------------------
// Cube Controls Panel (size + rotation) - prettier styling
// -------------------
const sizeControls = document.createElement('div');
sizeControls.style.position = 'fixed';
sizeControls.style.top = '60px'; // below top bar
sizeControls.style.right = '10px';
// sizeControls.style.background = 'rgba(255,255,255,0.95)'; // slightly more opaque

sizeControls.style.border = '1px solid rgba(0,0,0,0.1)';
sizeControls.style.background = 'linear-gradient(to bottom, rgba(255,255,255,0.98), rgba(245,245,245,0.98))';

sizeControls.style.padding = '15px';
sizeControls.style.fontFamily = 'sans-serif';
sizeControls.style.borderRadius = '8px'; // rounder corners
sizeControls.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)'; // nicer shadow
sizeControls.style.zIndex = '1000';
sizeControls.style.width = '180px';
sizeControls.style.lineHeight = '1.4';

// Update innerHTML with styled inputs and buttons
sizeControls.innerHTML = `
  <strong>Cube Size</strong><br>
  <label style="display:flex; justify-content:space-between; margin-bottom:6px;">X:
    <input id="sizeX" type="number" step="0.1" value="${cube.geometry.parameters.width}" style="width:60px; padding:4px 6px; border-radius:4px; border:1px solid #ccc; text-align:right;">
  </label>
  <label style="display:flex; justify-content:space-between; margin-bottom:6px;">Y:
    <input id="sizeY" type="number" step="0.1" value="${cube.geometry.parameters.height}" style="width:60px; padding:4px 6px; border-radius:4px; border:1px solid #ccc; text-align:right;">
  </label>
  <label style="display:flex; justify-content:space-between; margin-bottom:6px;">Z:
    <input id="sizeZ" type="number" step="0.1" value="${cube.geometry.parameters.depth}" style="width:60px; padding:4px 6px; border-radius:4px; border:1px solid #ccc; text-align:right;">
  </label>
  <button id="updateCube" style="width:100%; padding:6px 0; border:none; border-radius:5px; background:#000; color:#fff; font-weight:bold; cursor:pointer; margin-bottom:10px; transition:all 0.2s ease;">Update Cube</button>
  <hr style="margin:10px 0; border-color:#ccc;">
  <strong>Cube Rotation (degrees)</strong><br>
  <label style="display:flex; justify-content:space-between; margin-bottom:6px;">Rot X:
    <input id="rotX" type="number" step="1" value="${(cube.rotation.x*180/Math.PI).toFixed(0)}" style="width:60px; padding:4px 6px; border-radius:4px; border:1px solid #ccc; text-align:right;">
  </label>
  <label style="display:flex; justify-content:space-between; margin-bottom:6px;">Rot Y:
    <input id="rotY" type="number" step="1" value="${(cube.rotation.y*180/Math.PI).toFixed(0)}" style="width:60px; padding:4px 6px; border-radius:4px; border:1px solid #ccc; text-align:right;">
  </label>
  <label style="display:flex; justify-content:space-between; margin-bottom:6px;">Rot Z:
    <input id="rotZ" type="number" step="1" value="${(cube.rotation.z*180/Math.PI).toFixed(0)}" style="width:60px; padding:4px 6px; border-radius:4px; border:1px solid #ccc; text-align:right;">
  </label>
  <button id="updateCubeRotation" style="width:100%; padding:6px 0; border:none; border-radius:5px; background:#000; color:#fff; font-weight:bold; cursor:pointer; transition:all 0.2s ease;">Update Rotation</button>
`;

document.body.appendChild(sizeControls);

// Grab inputs
const sizeXInput = document.getElementById("sizeX");
const sizeYInput = document.getElementById("sizeY");
const sizeZInput = document.getElementById("sizeZ");
const updateButton = document.getElementById("updateCube");

const rotXInput = document.getElementById("rotX");
const rotYInput = document.getElementById("rotY");
const rotZInput = document.getElementById("rotZ");
const updateRotationButton = document.getElementById("updateCubeRotation");

// -------------------
// Update cube size
// -------------------
updateButton.addEventListener("click", () => {
  const x = parseFloat(sizeXInput.value) || 0.1;
  const y = parseFloat(sizeYInput.value) || 0.1;
  const z = parseFloat(sizeZInput.value) || 0.1;

  cube.geometry.dispose();
  cube.geometry = new THREE.BoxGeometry(x, y, z);
});

// -------------------
// Update cube rotation
// -------------------
updateRotationButton.addEventListener("click", () => {
  const x = parseFloat(rotXInput.value) * (Math.PI/180);
  const y = parseFloat(rotYInput.value) * (Math.PI/180);
  const z = parseFloat(rotZInput.value) * (Math.PI/180);

  cube.rotation.set(x, y, z);
});

// -------------------
// Top Bar: Ghost Hands Expert (Centered)
// -------------------
const topBar = document.createElement('div');
topBar.style.position = 'fixed';
topBar.style.top = '0';
topBar.style.left = '0';
topBar.style.width = '100%';
topBar.style.height = '50px';
topBar.style.background = 'linear-gradient(to right, #1a1a1a, #333)';
topBar.style.color = 'white';
topBar.style.display = 'flex';
topBar.style.alignItems = 'center';     // vertical center
topBar.style.justifyContent = 'center'; // horizontal center
topBar.style.gap = '15px';              // space between text and button
topBar.style.fontFamily = 'sans-serif';
topBar.style.fontSize = '16px';
topBar.style.zIndex = '1000';
topBar.style.boxShadow = '0 2px 8px rgba(0,0,0,0.5)';
topBar.style.borderBottom = '1px solid #555';
topBar.style.userSelect = 'none';

topBar.innerHTML = `
  <span style="font-weight: bold;">Ghost Hands Expert Activated</span>
  <button id="helpBtn" style="
    background:#f0f0f0;
    color:#000;
    border:none;
    padding:8px 16px;
    cursor:pointer;
    border-radius:5px;
    font-weight: bold;
    height:32px;
    display:flex;
    align-items:center;
    justify-content:center;
    transition: background 0.2s;
  ">Help</button>
`;

document.body.appendChild(topBar);

// Hover effect for button
const helpBtn = document.getElementById('helpBtn');
helpBtn.addEventListener('mouseenter', () => helpBtn.style.background = '#ddd');
helpBtn.addEventListener('mouseleave', () => helpBtn.style.background = '#f0f0f0');
// -------------------
// Help Menu Overlay with Gesture Images
// -------------------
const helpMenu = document.createElement('div');
helpMenu.style.position = 'fixed';
helpMenu.style.top = '60px';
helpMenu.style.left = '50%';
helpMenu.style.transform = 'translateX(-50%)';
helpMenu.style.background = 'rgba(255,255,255,0.97)';
helpMenu.style.color = '#000';
helpMenu.style.padding = '25px';
helpMenu.style.borderRadius = '8px';
helpMenu.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
helpMenu.style.display = 'none'; // hidden by default
helpMenu.style.maxWidth = '500px';
helpMenu.style.fontFamily = 'sans-serif';
helpMenu.style.fontSize = '14px';
helpMenu.style.lineHeight = '1.5';
helpMenu.style.zIndex = '1001';

helpMenu.innerHTML = `
  <h2 style="margin-top:0; color:#333;">Ghost Hands Expert Help</h2>
  <p>Use the panel on the right to resize and rotate the cube. You can also drag the cube directly in the scene.</p>
  
  <h3 style="margin-bottom:5px;">Gesture Legend</h3>
  <div style="display:flex; flex-direction:column; gap:10px;">
    <div style="display:flex; align-items:center; gap:10px;">
      <img src="openhand.png" alt="Open Hand" style="width:40px; height:40px;">
      <span><strong>Open Hand:</strong> Detect and highlight hand position.</span>
    </div>
    <div style="display:flex; align-items:center; gap:10px;">
      <img src="fist.png" alt="Fist" style="width:40px; height:40px;">
      <span><strong>Fist:</strong> Grab or drag an object.</span>
    </div>
    <div style="display:flex; align-items:center; gap:10px;">
      <img src="pointer.png" alt="Pointing Finger" style="width:40px; height:40px;">
      <span><strong>Pointing Finger:</strong> Select a specific object. Use to indicate targets or choose smaller items.</span>
    </div>
    <div style="display:flex; align-items:center; gap:10px;">
      <img src="pinch.png" alt="Pinch" style="width:40px; height:40px;">
      <span><strong>Pinch (thumb + index):</strong> Resize or scale the object.</span>
    </div>
    <div style="display:flex; align-items:center; gap:10px;">
      <img src="circle.png" alt="Circle Gesture" style="width:40px; height:40px;">
      <span><strong>Circle:</strong> Rotate object.</span>
    </div>
    <div style="display:flex; align-items:center; gap:10px;">
      <img src="thumbsup.png" alt="Thumbs Up" style="width:40px; height:40px;">
      <span><strong>Thumbs Up:</strong> Confirm action or apply changes.</span>
    </div>
    <div style="display:flex; align-items:center; gap:10px;">
      <img src="thumbsdown.png" alt="Thumbs Down" style="width:40px; height:40px;">
      <span><strong>Thumbs Down:</strong> Cancel action or undo.</span>
    </div>
    <div style="display:flex; align-items:center; gap:10px;">
      <img src="swipe.png" alt="Swipe Gesture" style="width:40px; height:40px;">
      <span><strong>Swipe:</strong> Rotate camera.</span>
    </div>
  </div>
  
  <button id="closeHelp" style="
    background:#1a1a1a;
    color:#fff;
    border:none;
    padding:6px 12px;
    cursor:pointer;
    border-radius:5px;
    font-weight:bold;
    margin-top:15px;
    transition: background 0.2s;
  ">Close</button>
`;
document.body.appendChild(helpMenu);

// Close button hover
const closeHelpBtn = document.getElementById('closeHelp');
closeHelpBtn.addEventListener('mouseenter', () => closeHelpBtn.style.background = '#333');
closeHelpBtn.addEventListener('mouseleave', () => closeHelpBtn.style.background = '#1a1a1a');

// Event Listeners
helpBtn.addEventListener('click', () => { helpMenu.style.display = 'block'; });
closeHelpBtn.addEventListener('click', () => { helpMenu.style.display = 'none'; });


// -------------------
// Toggle Talk to Expert Button
// -------------------
const talkButton = document.createElement('button');
talkButton.textContent = 'Voice Chat Disabled';
talkButton.style.position = 'fixed';
talkButton.style.top = '60px'; // below top bar
talkButton.style.left = '50%';
talkButton.style.transform = 'translateX(-50%)';
talkButton.style.padding = '8px 16px';
talkButton.style.fontSize = '14px';
talkButton.style.fontWeight = 'bold';
talkButton.style.border = 'none';
talkButton.style.borderRadius = '5px';
talkButton.style.background = '#f0f0f0';
talkButton.style.color = '#000';
talkButton.style.cursor = 'pointer';
talkButton.style.zIndex = '1000';
document.body.appendChild(talkButton);

// Hover effect
talkButton.addEventListener('mouseenter', () => talkButton.style.background = '#ddd');
talkButton.addEventListener('mouseleave', () => talkButton.style.background = '#f0f0f0');

// Toggle state
let isListening = false;

talkButton.addEventListener('click', () => {
  isListening = !isListening; // toggle state
  talkButton.textContent = isListening ? 'Listening…' : 'Voice Chat Disabled';
});