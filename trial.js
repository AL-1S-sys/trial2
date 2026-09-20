import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

/* ------------------------------------------------------------------
   BUILDING FOOTPRINT (U-shape, opening toward +Z / the camera)

        -8                                        +8
   -6.5  +----------------------------------------+
         |            BACK CORRIDOR BAR           |
   -3.5  +--------+                      +--------+
         |  LEFT  |                      | RIGHT  |
         |  WING  |      COURTYARD       | WING   |
    +7   +--------+                      +--------+
------------------------------------------------------------------- */
const B = {
  outerLeft:  -11,
  outerRight:  11,
  backOuter:  -7.5,   // rear edge of the back bar
  backInner:  -3.5,   // where the courtyard starts
  wingInnerL: -4.5,   // inner face of the left wing
  wingInnerR:  4.5,   // inner face of the right wing
  frontEdge:   7      // where both wings end
};

// Corridor: a wide walkway running in front of every room, tracing the U
const PATH_W = 1.8;
const PATH_Y = 0.17;              // just above the slab top (0.15)

// Room slot positions derived from the footprint above
const BACK_SLOT_X = [-9.1, -6.5, -3.9, -1.3, 1.3];
const BACK_SLOT_Z = -6.3;
const WING_SLOTS = [
  { x: -8.6, z: -1.0 }, { x: -8.6, z: 4.15 },   // left wing, front then back
  { x:  8.6, z: -1.0 }, { x:  8.6, z: 4.15 }    // right wing, front then back
];
const WING_W = 5.0, WING_D = 4.0;   // w runs along the wing, d across it
const BACK_W = 2.4, BACK_D = 2.0;

// QR Code Checkpoint Registry
const checkpoints = {
  'L1_ENTRANCE': { name: 'Layer 1 Main Lobby',      layer: 1, targetId: 'l1_lobby' },
  'CAFETERIA':   { name: 'Ground Floor Cafeteria',  layer: 1, targetId: 'l1_wing_left_a' },
  'LIBRARY':     { name: 'Library Lower Floor',     layer: 2, targetId: 'l2_library' },
  'STUDENT_L3':  { name: 'Student Lounge (Floor 3)', layer: 3, targetId: 'l3_wing_right_a' }
};

// Floor plans: 4 wing rooms (in WING_SLOTS order) + 6 back-corridor rooms
const floorPlans = {
  1: {
    wings: [
      { id: 'l1_wing_left_a',  name: 'Cafeteria - Front Hall', desc: 'Serving counters and grab-and-go shelves.', hours: '7:00 AM - 5:00 PM', status: 'Open' },
      { id: 'l1_wing_left_b',  name: 'Cafeteria - Dining Area', desc: 'Long-table seating that opens onto the courtyard.', hours: '7:00 AM - 5:00 PM', status: 'Open' },
      { id: 'l1_wing_right_a', name: 'Campus Bookstore', desc: 'Textbooks, uniforms, and school supplies.', hours: '8:00 AM - 4:30 PM', status: 'Open' },
      { id: 'l1_wing_right_b', name: 'Campus Annex', desc: 'Overflow retail and parcel pickup.', hours: '8:00 AM - 4:30 PM', status: 'Open' }
    ],
    corridor: [
      { id: 'l1_lobby',       name: 'Main Lobby & Security', desc: 'Main entrance, guard post, and visitor logbook.', hours: '6:00 AM - 9:00 PM', status: 'Open' },
      { id: 'l1_admin',       name: 'Administrative Office', desc: 'Registrar, cashier, and records.', hours: '8:00 AM - 5:00 PM', status: 'Open' },
      { id: 'l1_clinic',      name: 'University Health Clinic', desc: 'First aid, consultations, and medical certificates.', hours: '7:30 AM - 6:00 PM', status: 'Open' },
      { id: 'l1_chapel',      name: 'Campus Chapel', desc: 'Quiet space for prayer and scheduled services.', hours: '6:00 AM - 8:00 PM', status: 'Open' },
      { id: 'l1_canteen2',    name: 'Annex Food Kiosks', desc: 'Small food stalls and drink counters.', hours: '8:00 AM - 6:00 PM', status: 'Open' },
      { id: 'l1_maintenance', name: 'Facilities & Maintenance', desc: 'Building services and lost and found.', hours: '7:00 AM - 5:00 PM', status: 'Open' },
      { id: 'l1_guidance',    name: 'Guidance Office', desc: 'Counseling and student support services.', hours: '8:00 AM - 5:00 PM', status: 'Open' },
      { id: 'l1_restroom_m',  name: 'Restroom (Men)', desc: 'Located at the end of the corridor.', hours: 'Always Open', status: 'Open' }
    ]
  },
  2: {
    wings: [
      { id: 'l2_wing_left_a',  name: 'Lecture Hall 101', desc: 'Tiered seating for 80.', hours: '7:00 AM - 7:00 PM', status: 'Open' },
      { id: 'l2_wing_left_b',  name: 'Lecture Hall 102', desc: 'Tiered seating for 80.', hours: '7:00 AM - 7:00 PM', status: 'Open' },
      { id: 'l2_wing_right_a', name: 'Lecture Hall 201', desc: 'Flat-floor room with movable tables.', hours: '7:00 AM - 7:00 PM', status: 'Open' },
      { id: 'l2_wing_right_b', name: 'Lecture Hall 202', desc: 'Flat-floor room with movable tables.', hours: '7:00 AM - 7:00 PM', status: 'Open' }
    ],
    corridor: [
      { id: 'l2_library',      name: 'Library Lower Floor', desc: 'Book stacks, quiet reading, and the circulation desk.', hours: '8:00 AM - 6:00 PM', status: 'Open' },
      { id: 'l2_room103',      name: 'Lecture Hall 103', desc: 'Standard classroom.', hours: '7:00 AM - 7:00 PM', status: 'Open' },
      { id: 'l2_room104',      name: 'Lecture Hall 104', desc: 'Standard classroom.', hours: '7:00 AM - 7:00 PM', status: 'Open' },
      { id: 'l2_facultypool',  name: 'Faculty Center A', desc: 'Faculty desks and consultation corners.', hours: '8:00 AM - 5:00 PM', status: 'Open' },
      { id: 'l2_discussion1',  name: 'Discussion Pod 1', desc: 'Small group room, whiteboard included.', hours: '8:00 AM - 6:00 PM', status: 'Open' },
      { id: 'l2_restroom_f',   name: 'Restroom (Women)', desc: 'Located at the end of the corridor.', hours: 'Always Open', status: 'Open' },
      { id: 'l2_room105',      name: 'Lecture Hall 105', desc: 'Standard classroom.', hours: '7:00 AM - 7:00 PM', status: 'Open' },
      { id: 'l2_restroom_m',   name: 'Restroom (Men)', desc: 'Located at the end of the corridor.', hours: 'Always Open', status: 'Open' }
    ]
  },
  3: {
    wings: [
      { id: 'l3_wing_left_a',  name: 'Computer Lab A', desc: '40 workstations for programming classes.', hours: '8:00 AM - 6:00 PM', status: 'Open' },
      { id: 'l3_wing_left_b',  name: 'Networking Hub', desc: 'Racks, patch panels, and hands-on networking benches.', hours: '8:00 AM - 6:00 PM', status: 'Open' },
      { id: 'l3_wing_right_a', name: 'Student Lounge South', desc: 'Seating and charging stations overlooking the courtyard.', hours: '24/7 Access', status: 'Open' },
      { id: 'l3_wing_right_b', name: 'Student Lounge North', desc: 'Quieter lounge with study booths.', hours: '24/7 Access', status: 'Open' }
    ],
    corridor: [
      { id: 'l3_libupper',    name: 'Library Upper Floor', desc: 'Private carrels and periodicals.', hours: '8:00 AM - 5:00 PM', status: 'Open' },
      { id: 'l3_comlab2',     name: 'Computer Laboratory 2', desc: 'General-use lab and printing station.', hours: '8:00 AM - 6:00 PM', status: 'Open' },
      { id: 'l3_multimedia',  name: 'Multimedia Editing Room', desc: 'Video and audio editing suites.', hours: '8:00 AM - 5:00 PM', status: 'Open' },
      { id: 'l3_facultyb',    name: 'IT Department Faculty Room', desc: 'IT faculty offices.', hours: '8:00 AM - 5:00 PM', status: 'Open' },
      { id: 'l3_discussion2', name: 'Collaborative Pod 2', desc: 'Group work room with a shared display.', hours: '8:00 AM - 6:00 PM', status: 'Open' },
      { id: 'l3_restroom_f',  name: 'Restroom (Women)', desc: 'Located at the end of the corridor.', hours: 'Always Open', status: 'Open' },
      { id: 'l3_comlab3',     name: 'Computer Laboratory 3', desc: 'Overflow lab for programming classes.', hours: '8:00 AM - 6:00 PM', status: 'Open' },
      { id: 'l3_restroom_m',  name: 'Restroom (Men)', desc: 'Located at the end of the corridor.', hours: 'Always Open', status: 'Open' }
    ]
  },
  4: {
    wings: [
      { id: 'l4_wing_left_a',  name: 'Mini-Auditorium', desc: 'Raked seating for talks and defenses.', hours: 'By Reservation', status: 'Open' },
      { id: 'l4_wing_left_b',  name: 'Green Room & Stage Prep', desc: 'Backstage holding area for performers.', hours: 'By Reservation', status: 'Open' },
      { id: 'l4_wing_right_a', name: 'Executive Conference Room', desc: 'Large meeting table and video conferencing.', hours: '8:00 AM - 5:00 PM', status: 'Open' },
      { id: 'l4_wing_right_b', name: 'Boardroom Annex', desc: 'Breakout room beside the conference room.', hours: '8:00 AM - 5:00 PM', status: 'Open' }
    ],
    corridor: [
      { id: 'l4_lounge',        name: 'Top Floor Recreational Lounge', desc: 'Games, seating, and campus views.', hours: '8:00 AM - 5:00 PM', status: 'Open' },
      { id: 'l4_studiosub',     name: 'Creative Arts Studio', desc: 'Open studio for art and design work.', hours: '8:00 AM - 5:00 PM', status: 'Open' },
      { id: 'l4_meeting',       name: 'Student Council Headquarters', desc: 'Council office and meeting space.', hours: '8:00 AM - 6:00 PM', status: 'Open' },
      { id: 'l4_storage',       name: 'Event Equipment Storage', desc: 'Sound, lighting, and staging equipment.', hours: 'Restricted', status: 'Staff Only' },
      { id: 'l4_rooftopgarden', name: 'Rooftop Green Deck', desc: 'Planted deck open to the sky.', hours: '8:00 AM - 4:30 PM', status: 'Open' },
      { id: 'l4_restroom_f',    name: 'Restroom (Women)', desc: 'Located at the end of the corridor.', hours: 'Always Open', status: 'Open' },
      { id: 'l4_altroom',       name: 'Alumni Relations Office', desc: 'Alumni affairs and events planning.', hours: '8:00 AM - 5:00 PM', status: 'Open' },
      { id: 'l4_restroom_m',    name: 'Restroom (Men)', desc: 'Located at the end of the corridor.', hours: 'Always Open', status: 'Open' }
    ]
  }
};

// Flatten the floor plans into positioned POIs
const ROOM_COLOR = 0xf3f1e7;
const poiData3D = [];
Object.keys(floorPlans).forEach(key => {
  const layer = parseInt(key);
  const plan = floorPlans[layer];

  plan.wings.forEach((room, i) => {
    poiData3D.push({ ...room, layer, x: WING_SLOTS[i].x, z: WING_SLOTS[i].z, w: WING_W, d: WING_D, color: ROOM_COLOR });
  });
  plan.corridor.forEach((room, i) => {
    poiData3D.push({ ...room, layer, x: BACK_SLOT_X[i], z: BACK_SLOT_Z, w: BACK_W, d: BACK_D, color: ROOM_COLOR });
  });
});

// Resolve the scanned checkpoint against the generated rooms
const urlParams = new URLSearchParams(window.location.search);
const cpParam = urlParams.get('cp') || 'L1_ENTRANCE';
const currentSpot = { ...(checkpoints[cpParam] || checkpoints['L1_ENTRANCE']) };
const spotRoom = poiData3D.find(p => p.id === currentSpot.targetId);
currentSpot.x = spotRoom ? spotRoom.x : 0;
currentSpot.z = spotRoom ? spotRoom.z : 0;

// Scene Setup
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xe8eef5);

const width = window.innerWidth || 300;
const height = window.innerHeight || 300;

const camera = new THREE.PerspectiveCamera(45, width / height, 1, 1000);

const wideCamPos = new THREE.Vector3(18, 19, 26);
const wideTarget = new THREE.Vector3(0, 6, 0.5);

camera.position.copy(wideCamPos);

const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: "high-performance" });
renderer.setSize(width, height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

renderer.domElement.style.touchAction = 'none';
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.05;
controls.minDistance = 5;
controls.maxDistance = 70;
controls.minPolarAngle = 0;
controls.maxPolarAngle = Math.PI / 2 + 0.1;
controls.target.copy(wideTarget);

const targetCamPos = new THREE.Vector3().copy(wideCamPos);
const targetLookAt = new THREE.Vector3().copy(wideTarget);
let isTransitioning = false;

controls.addEventListener('start', () => { isTransitioning = false; });

let activeIsolatedLayer = 'all';

// Lighting
scene.add(new THREE.AmbientLight(0xffffff, 0.7));

const sunLight = new THREE.DirectionalLight(0xfff5e6, 0.9);
sunLight.position.set(30, 50, 30);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 0.5;
sunLight.shadow.camera.far = 150;
sunLight.shadow.camera.left = -30;
sunLight.shadow.camera.right = 30;
sunLight.shadow.camera.top = 30;
sunLight.shadow.camera.bottom = -30;
sunLight.shadow.bias = -0.0005;
scene.add(sunLight);

// Grounds
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(80, 80),
  new THREE.MeshStandardMaterial({ color: 0x94b49f, roughness: 0.9 })
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.01;
ground.receiveShadow = true;
scene.add(ground);

// Courtyard paving fills the opening of the U exactly
const courtW = B.wingInnerR - B.wingInnerL;
const courtD = B.frontEdge - B.backInner;
const walkway = new THREE.Mesh(
  new THREE.PlaneGeometry(courtW, courtD),
  new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.6 })
);
walkway.rotation.x = -Math.PI / 2;
walkway.position.set(0, 0.01, B.backInner + courtD / 2);
walkway.receiveShadow = true;
scene.add(walkway);

/* U-shaped slab geometry.
   The shape is drawn in (x, y) where y stands in for world Z, then rotated flat.
   `m` expands the outline outward — the courtyard notch shrinks by the same amount. */
function makeUShape(m = 0) {
  const s = new THREE.Shape();
  s.moveTo(B.outerLeft  - m, B.backOuter - m);
  s.lineTo(B.outerRight + m, B.backOuter - m);
  s.lineTo(B.outerRight + m, B.frontEdge + m);
  s.lineTo(B.wingInnerR - m, B.frontEdge + m);
  s.lineTo(B.wingInnerR - m, B.backInner + m);
  s.lineTo(B.wingInnerL + m, B.backInner + m);
  s.lineTo(B.wingInnerL + m, B.frontEdge + m);
  s.lineTo(B.outerLeft  - m, B.frontEdge + m);
  s.closePath();
  return s;
}

function makeSlabGeometry(margin, thickness, topY) {
  const geo = new THREE.ExtrudeGeometry(makeUShape(margin), { depth: thickness, bevelEnabled: false });
  geo.rotateX(Math.PI / 2);      // shape Y becomes world Z; slab now spans y = -thickness..0
  geo.translate(0, topY, 0);
  return geo;
}

/* Corridor geometry, identical on every floor.
   Back run sits between the back rooms and the courtyard; each wing run
   sits between that wing's rooms and the courtyard. Together they trace a U. */
const pathMat = new THREE.MeshStandardMaterial({ color: 0xb9c2cc, roughness: 0.75 });

const backPathZ = B.backInner - PATH_W / 2;                 // centre of the back run
const wingPathX = B.wingInnerR + PATH_W / 2;                // centre of each wing run
const wingPathLen = B.frontEdge - B.backInner;

function makeStrip(w, d, x, z) {
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), pathMat);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, PATH_Y, z);
  mesh.receiveShadow = true;
  return mesh;
}

function buildFloorPath() {
  const parts = [];
  const spanX = B.outerRight - B.outerLeft;

  parts.push(makeStrip(spanX, PATH_W, 0, backPathZ));
  parts.push(makeStrip(PATH_W, wingPathLen, -wingPathX, B.backInner + wingPathLen / 2));
  parts.push(makeStrip(PATH_W, wingPathLen,  wingPathX, B.backInner + wingPathLen / 2));

  return parts;
}

const floorMeshes = {};
const selectableSlabs = [];
const selectableRooms = [];
const spacing = 4.5;

const infoPanel = document.getElementById('info-panel');
const layerDisplay = document.getElementById('layer-display');
const overlay = document.getElementById('instructions-overlay');
const locationDisplay = document.getElementById('location-display');

// Build Floors
for (let i = 1; i <= 4; i++) {
  const floorGroup = new THREE.Group();
  const floorY = (i - 1) * spacing;
  floorGroup.position.y = floorY;

  // Main U slab: top face sits at y = 0.15 so rooms rest on it
  const slabMesh = new THREE.Mesh(
    makeSlabGeometry(0, 0.3, 0.15),
    new THREE.MeshStandardMaterial({ color: 0xdde3ea, roughness: 0.5, side: THREE.DoubleSide })
  );
  slabMesh.receiveShadow = true;
  slabMesh.userData = { type: 'slab', layerNumber: i, floorY: floorY };
  floorGroup.add(slabMesh);
  selectableSlabs.push(slabMesh);

  // Balcony lip, same U outline nudged outward and tucked under the slab
  const balconyMesh = new THREE.Mesh(
    makeSlabGeometry(0.25, 0.12, -0.15),
    new THREE.MeshStandardMaterial({ color: 0xc4cbd4, roughness: 0.4, side: THREE.DoubleSide })
  );
  balconyMesh.receiveShadow = true;
  floorGroup.add(balconyMesh);

  // Corridor path: back run plus one run down each wing
  buildFloorPath().forEach(seg => floorGroup.add(seg));

  // Staircase sits on the right-wing corridor, at the open end
  if (i < 4) {
    const stairGroup = new THREE.Group();
    // Moved from the wing edge to the newly cleared right side of the back corridor
    stairGroup.position.set(6.7, 1.15, BACK_SLOT_Z);
    
    // Rotate the stairs so they face nicely along the corridor if needed
    stairGroup.rotation.y = Math.PI / 2;

    for (let s = 0; s < 5; s++) {
      const step = new THREE.Mesh(
        new THREE.BoxGeometry(PATH_W * 0.8, 0.2, 0.6),
        new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.6 })
      );
      step.position.set(0, s * 0.38 + 0.1, s * 0.6);
      step.castShadow = true;
      step.receiveShadow = true;
      stairGroup.add(step);
    }
    floorGroup.add(stairGroup);
  }

  // Rooms
// List of room IDs you want to highlight
const highlightedIds = [
  'l1_wing_left_a', 'l1_wing_left_b', // Cafeteria
  'l2_library', 'l3_libupper',        // Library
  'l3_wing_right_a', 'l3_wing_right_b', 'l4_lounge' // Student Lounges
];

// Inside your floor/room creation loop:
poiData3D.filter(p => p.layer === i).forEach(poi => {
  const isTargetRoom = (poi.id === currentSpot.targetId);
  const isHighlighted = highlightedIds.includes(poi.id);

  const roomGroup = new THREE.Group();
  roomGroup.position.set(poi.x, 0.75, poi.z);

  // Wing rooms turn to face the courtyard
  if (poi.x < 0 && poi.z > B.backInner) roomGroup.rotation.y = Math.PI / 2;
  else if (poi.x > 0 && poi.z > B.backInner) roomGroup.rotation.y = -Math.PI / 2;

  const roomMesh = new THREE.Mesh(
    new THREE.BoxGeometry(poi.w, 1.2, poi.d),
    new THREE.MeshStandardMaterial({
      color: isTargetRoom ? 0xff4081 : (isHighlighted ? 0xffd700 : poi.color), // Gold color for highlights
      roughness: 0.7,
      emissive: isTargetRoom ? 0xff80ab : (isHighlighted ? 0xffa500 : 0x000000), // Soft orange glow
      emissiveIntensity: isTargetRoom ? 0.5 : (isHighlighted ? 0.6 : 0)
    })
  );
  roomMesh.castShadow = true;
  roomMesh.receiveShadow = true;
  roomGroup.add(roomMesh);

  // Glazing on the courtyard-facing side
  const glassMesh = new THREE.Mesh(
    new THREE.BoxGeometry(poi.w * 0.8, 0.6, 0.1),
    new THREE.MeshStandardMaterial({ color: 0x88ccff, roughness: 0.1, transparent: true, opacity: 0.5 })
  );
  glassMesh.position.set(0, 0, poi.d / 2 + 0.02);
  roomGroup.add(glassMesh);

  roomGroup.userData = { type: 'room', layerNumber: i, data: poi, floorY: floorY };
  if (isTargetRoom || isHighlighted) roomGroup.scale.set(1.05, 1.2, 1.05);

  floorGroup.add(roomGroup);
  selectableRooms.push(roomGroup);
})  ;

  floorGroup.visible = true;
  floorMeshes[i] = floorGroup;
  scene.add(floorGroup);
}

// 3D Pin
const userPin = new THREE.Mesh(
  new THREE.ConeGeometry(0.6, 1.5, 8),
  new THREE.MeshBasicMaterial({ color: 0xff3b30 })
);
userPin.rotation.x = Math.PI;
userPin.position.set(currentSpot.x, (currentSpot.layer - 1) * spacing + 2, currentSpot.z);
scene.add(userPin);

if (locationDisplay) locationDisplay.innerHTML = `📍 ${currentSpot.name}`;

const closeBtn = document.getElementById('close-instructions');
if (closeBtn) {
  closeBtn.addEventListener('click', (event) => {
    event.stopPropagation();
    if (overlay) overlay.classList.add('hidden');

    activeIsolatedLayer = 'all';
    Object.keys(floorMeshes).forEach(key => { floorMeshes[key].visible = true; });

    if (userPin) userPin.visible = true;
    if (layerDisplay) layerDisplay.innerHTML = '🏢 Viewing: All Floors';

    targetCamPos.copy(wideCamPos);
    targetLookAt.copy(wideTarget);
    isTransitioning = true;
  });
}

// Tap vs drag detection so orbiting never selects a room
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let pointerStart = null;

window.addEventListener('pointerdown', (e) => { pointerStart = { x: e.clientX, y: e.clientY }; });

window.addEventListener('pointerup', (event) => {
  if (!pointerStart) return;
  const moved = Math.hypot(event.clientX - pointerStart.x, event.clientY - pointerStart.y);
  pointerStart = null;
  if (moved > 8) return;

  if (!overlay || event.target.closest('#info-panel') || event.target.closest('#ui-container') || !overlay.classList.contains('hidden')) return;

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const visibleTargets = [...selectableRooms, ...selectableSlabs].filter(m => m.parent.visible);
  const intersects = raycaster.intersectObjects(visibleTargets, true);

  if (intersects.length > 0) {
    let hit = intersects[0].object;
    while (hit && !hit.userData.type && hit.parent) hit = hit.parent;

    if (activeIsolatedLayer === 'all') {
      if (hit.userData.layerNumber) isolateAndZoomFloor(hit.userData.layerNumber, hit.userData.floorY);
    } else if (hit.userData.type === 'room') {
      showRoomDetails(hit.userData.data);
    } else if (hit.userData.type === 'slab') {
      isolateAndZoomFloor('all', 0);
    }
  } else if (infoPanel) {
    infoPanel.classList.remove('active');
  }
});

function showRoomDetails(room) {
  const rn = document.getElementById('room-name');
  const rlt = document.getElementById('room-layer-tag');
  const rd = document.getElementById('room-desc');
  const rh = document.getElementById('room-hours');
  const rs = document.getElementById('room-status');

  if (rn) rn.innerText = room.name;
  if (rlt) rlt.innerText = `Floor Layer ${room.layer}`;
  if (rd) rd.innerText = room.desc;
  if (rh) rh.innerText = room.hours;
  if (rs) rs.innerText = room.status;

  if (infoPanel) infoPanel.classList.add('active');
}

function isolateAndZoomFloor(selectedLayer, floorY) {
  activeIsolatedLayer = selectedLayer;
  if (infoPanel) infoPanel.classList.remove('active');

  if (layerDisplay) {
    layerDisplay.innerHTML = (selectedLayer === 'all')
      ? '🏢 Viewing: All Floors'
      : `🏢 Viewing: Floor Layer ${selectedLayer}`;
  }

  Object.keys(floorMeshes).forEach(key => {
    const layerNum = parseInt(key);
    floorMeshes[layerNum].visible = (selectedLayer === 'all' || selectedLayer === layerNum);
  });

  if (userPin) userPin.visible = (selectedLayer === 'all' || selectedLayer === currentSpot.layer);

  if (selectedLayer === 'all') {
    targetCamPos.copy(wideCamPos);
    targetLookAt.copy(wideTarget);
  } else {
    // Look into the open side of the U
    targetLookAt.set(0, floorY + 0.5, 0.5);
    targetCamPos.set(0, floorY + 14, 20);
  }
  isTransitioning = true;
}

function animate() {
  requestAnimationFrame(animate);

  if (isTransitioning) {
    camera.position.lerp(targetCamPos, 0.05);
    controls.target.lerp(targetLookAt, 0.05);
    if (camera.position.distanceTo(targetCamPos) < 0.05 && controls.target.distanceTo(targetLookAt) < 0.05) {
      isTransitioning = false;
    }
  }

  if (userPin && userPin.visible) userPin.rotation.y += 0.03;
  controls.update();
  renderer.render(scene, camera);
}
animate();

window.addEventListener('resize', () => {
  const w = window.innerWidth;
  const h = window.innerHeight;

  camera.aspect = w / h;
  camera.updateProjectionMatrix();

  renderer.setSize(w, h);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});