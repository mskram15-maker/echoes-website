// ECHOES — Immersive investigation (smoke, sway, grab, rooms, briefing)
const state = {
  level: 1, health: 85, food: 3, water: 2.5, safety: 60, info: 10,
  hour: 14, minute: 32, location: "Unknown Wilderness",
  inventory: [],
  objectives: [],
  memory: {
    foundObject: false, flashlightOn: false, climbedHill: false,
    campExamined: false, roadExamined: false, treesExamined: false, streamUsed: false,
    messagesRead: 0, askedArtifact: false, askedKnight: false, askedDino: false,
    paintingSeen: false, deskSearched: false, doorOpened: false,
    clockOpened: false, sceneExamined: false, valeQuestioned: false,
    annaQuestioned: false, cctvChecked: false, inStudy: false, portraitQuestioned: false
  },
  clues: [], turn: 0, levelComplete: false, requiredClues: 4
};

let scene, camera, renderer, clockSys;
let player = { x: 0, y: 1.6, z: 10, yaw: 0, pitch: 0, onGround: true };
let keys = {}, isLooking = false, lastMouse = { x: 0, y: 0 };
let activePointerId = null, pointerStart = { x: 0, y: 0 }, pointerMoved = false;
let interactables = [], grabbables = [], currentHover = null, heldObject = null;
let worldGroup = null, flashlight = null, hillMesh = null;
let hoverOutline = null;
let sunLight = null, ambientLight = null, fireLight = null;
let smokeParticles = [], treeMeshes = [], footprintMeshes = [], peopleMeshes = [];
let roomStudy = null, roomHall = null;
let heldToolRig = null, equippedItemId = null;
let phoneRig = null, phoneRigOpen = false, previousHeldItem = null;
let phoneScreenCanvas = null, phoneScreenContext = null, phoneScreenTexture = null;
let mapToolTexture = null, mapToolCanvas = null, compassNeedle = null, activePhoneApp = "home";
let lastPhoneReadoutUpdate = 0;
let conversationTarget = null;
let conversationHistory = {};
let phoneThreads = {};
let phoneNotificationTimer = null;
let investigationTeam = { members: [], activeIndex: 0 };
let interiorFixtures = [], interiorSwitchMesh = null, interiorLightsOn = false;
let fireFlames = [], fireEmbers = [], waterRipples = [];
let atmosphereFields = [];
let encounterState = { level:0, threat:null, active:false, cleared:false, progress:0, distractedUntil:0, failed:false };
let vaultObstacles = [];
let vaultJumpTimer = 0;
let mapContext = null, lastMapUpdate = 0;
const interactionRaycaster = new THREE.Raycaster();
const cameraTarget = new THREE.Vector3();
const sdgRules = {
  1: { label: "SDG 15 · LIFE ON LAND", rule: "Protect habitats and leave no trace." },
  2: { label: "SDG 11 · SUSTAINABLE CITIES & COMMUNITIES", rule: "Respect cultural heritage; preserve every artifact." },
  3: { label: "SDG 16 · PEACE, JUSTICE & STRONG INSTITUTIONS", rule: "Follow evidence, question assumptions, and seek a fair outcome." }
};
const characterChatbots = {
  artifact: {
    name: "The Egyptian Artifact",
    questions: ["What is your story?", "Why did the exhibits wake?", "What does the key unlock?"],
    answers: [
      { match: /origin|egypt|history|ancient|civilization|artifact|your story/i, topic: "origin", replies: ["I crossed oceans before this city had a name. I am a record of the people who made me, not a prize for those who own me.", "The symbols on my base describe a community that kept its history alive by passing it on. Ask what the curator tried to protect."] },
      { match: /curse|alive|wake|museum|pulse|machine|why/i, topic: "pulse", replies: ["It was not a curse. At 11:03, a pulse from beneath the gallery woke the symbols carved into my base.", "The hum came from below, not from inside me. Follow the service door and the curator's warning."] },
      { match: /key|chamber|door|curator|below|open/i, topic: "key", replies: ["The brass key opens the chamber below this wing. The curator tried to stop someone from moving the original.", "Look for the curator's desk. The note there explains why the chamber must remain sealed."] },
      { match: /project|echo|memory|transfer|subject/i, topic: "echo", replies: ["The machines called it Project Echo. They wanted to copy a living person's memories, as if a life were a museum object.", "The original subject is still alive. Stop the transfer; the curator's note tells you where to begin."] }
    ],
    fallback: "I can tell you about my origins, the pulse at 11:03, the brass key, and the warning about Project Echo."
  },
  knight: {
    name: "The Knight",
    questions: ["What happened after closing?", "What did the stranger carry?", "What woke the exhibits?"],
    answers: [
      { match: /close|night|after|when|hour|time|stranger|figure|coat|case|carry|person/i, topic: "visitor", replies: ["After closing, a stranger in a long coat crossed the Egyptian wing with a hard case. He ignored every display and went straight for the service corridor.", "I saw him again beside the Egyptian display. The case was humming. He did not look like a curator."] },
      { match: /artifact|key|chamber|door|curator|below/i, topic: "chamber", replies: ["The curator argued that the original belonged in the sealed chamber below. The little brass key is the only way through that service door.", "The chamber was sealed for a reason. The curator left a note on the desk—read it before you turn that key."] },
      { match: /dino|skeleton|pulse|sound|hear|heard|ring|vibrat|11:03|wok(?:e|en)?|machine|echo/i, topic: "pulse", replies: ["At 11:03, a pulse ran through every glass case. The dinosaur's bones rang like a tuning fork. That was machinery, not a ghost.", "I heard the pulse too: one signal, then a hum from below the floor. The dinosaur's ribs caught the vibration."] },
      { match: /project|echo|transfer|memory/i, topic: "echo", replies: ["I heard the name Project Echo on the curator's recording. Whatever was being moved was a memory, not a museum object.", "It was not the artifact they wanted to move. The machine was designed to transfer a person's memories."] }
    ],
    fallback: "I remember the long coat, the hard case, and the 11:03 pulse. Ask me about the service door, the exhibits, or Project Echo."
  },
  dinosaur: {
    name: "The Dinosaur Skeleton",
    questions: ["What was the pulse?", "Who woke you?", "What is Project Echo?"],
    answers: [
      { match: /pulse|11:03|sound|ring|vibrat|wake|machine/i, topic: "pulse", replies: ["11:03 PM. One low pulse, then a hum behind the wall. Every bone carried it. No storm makes a rhythm like that.", "Another vibration passed through the gallery, but the first pulse came from below the floor. The sensor log marked it 11:03."] },
      { match: /who|person|stranger|figure|coat|knight/i, topic: "visitor", replies: ["A long shadow crossed the gallery after the pulse. It carried a case and stopped at the Egyptian display.", "The visitor's steps paused at the sealed service door. I cannot identify a face; I only remember the sound and direction."] },
      { match: /project|echo|transfer|memory|subject/i, topic: "echo", replies: ["The machines used the word 'transfer'. I am only the museum's sensor echo, repeating sounds recorded near the original subject.", "Project Echo reached the original subject through the equipment below. No exhibit can tell you what that person remembers."] },
      { match: /artifact|key|chamber|curator/i, topic: "chamber", replies: ["The curator hid a key for the chamber below. The note on the desk explains why the original subject must be found.", "The pulse echoed through the glass, but the curator's note is your best source for what is hidden downstairs."] }
    ],
    fallback: "I can replay what I sensed: a pulse at 11:03, a long-coated visitor, and the word 'transfer'. Which clue should I revisit?"
  },
  museumPortrait: {
    name: "The Museum Portrait",
    questions: ["What changed in the painting?", "Who is the long-coated figure?", "What does the key symbol mean?"],
    answers: [
      { match: /paint|image|scene|change|shift|show|see/i, topic: "image", replies: ["The canvas shifted after the pulse: first a long-coated figure, then a small key symbol in the sky. I cannot show you more than the scene I hold.", "The figure appeared near the Egyptian wing. When the image changed, the key symbol remained. The curator may know what it opens."] },
      { match: /who|person|stranger|visitor|figure|coat|case/i, topic: "visitor", replies: ["I can show a long coat and a hard case, but not a face. The figure crossed toward the Egyptian wing after closing.", "The painted visitor paused near the service corridor. I cannot identify them; compare the knight's account and the gallery records."] },
      { match: /key|symbol|door|chamber|curator|open/i, topic: "key", replies: ["The key symbol appeared after the image shifted. It resembles the brass key from the campsite; the curator's desk may explain the connection.", "I only know what the paint remembers: a key, a sealed door, and a figure carrying a case. Ask the artifact about the chamber."] },
      { match: /pulse|11:03|wake|alive|machine|echo/i, topic: "pulse", replies: ["The gallery shuddered at 11:03. Then the painted scene changed. I am a witness in pigment, not a living person.", "A low pulse moved through the wall before my image shifted. The dinosaur and the knight heard it too."] }
    ],
    fallback: "I remember a shifting scene: a long coat, a hard case, and a key symbol. Ask what changed, who crossed the gallery, or what the key might open."
  },
  portrait: {
    name: "The Blackwood Portrait",
    questions: ["Why does the clock show 11:47?", "What changed in the inheritance?", "What do you know about the study?"],
    answers: [
      { match: /clock|11:47|time|hour/i, topic: "clock", replies: ["The hands stopped at 11:47. That was the hour the Blackwood trust changed hands—and the minute someone moved me from my place above the stairs.", "I could see the clock from my frame. Its hands stopped after the figure passed; the brass plaque records the same minute."] },
      { match: /inherit|trust|money|will|change/i, topic: "inheritance", replies: ["The trust was rewritten in secret. Look for the clock's hidden note and the letter in the study; the portrait remembers only what it saw.", "I witnessed the house change, not the ink on the document. Check the letter and clock before deciding who benefited."] },
      { match: /study|letter|room|crime|weapon|body/i, topic: "study", replies: ["A figure in a long coat crossed the landing towards the study. I could not see a face. Anna was near the stairs, watching.", "The long-coated figure went to the study. I cannot identify them; only the records can confirm the timeline."] },
      { match: /anna|maid|housekeep/i, topic: "anna", replies: ["Anna notices details people overlook. Ask her what she saw near 11:40, then compare her account with the CCTV.", "Anna was near the stairs. She seemed frightened, but I cannot say what she knew. Ask her directly."] },
      { match: /vale|doctor|adrian/i, topic: "vale", replies: ["Dr. Vale said he was alone in the lab. The clock's note and the camera may tell you whether that story holds.", "I saw Dr. Vale in the hall earlier in the evening, but I cannot confirm where he was at 11:40."] }
    ],
    fallback: "I am a witness, not an oracle. Ask about the 11:47 clock, the Blackwood trust, the study, or the people in the hall."
  },
  vale: {
    name: "Dr. Adrian Vale",
    questions: ["Where were you at 11:40?", "What is Project Echo?", "Why should I trust you?"],
    answers: [
      { match: /alibi|where|lab|alone|11:30|11:40|time|clock/i, topic: "alibi", replies: ["I was in the lab from 10:30 until 11:30. I never entered the study. That is what I told the investigators.", "My lab access log should show when I left. I will not change my statement without a reason to do so."] },
      { match: /project|echo|transfer|memory|subject/i, topic: "project echo", replies: ["Project Echo was meant to preserve a person's memories. The transfer window was 11:30 to midnight. The original subject was never supposed to wake during it.", "The project was a memory-transfer experiment. If the original subject woke, the procedure could not safely finish."] },
      { match: /anna|maid|witness|coat|figure|stranger|study/i, topic: "anna's testimony", replies: ["Anna was in the hall that night. She insists she saw someone in a long coat near the study, but she never saw a face.", "Anna's observation is specific about the coat and time, not the person's identity. It must be checked against the CCTV."] },
      { match: /proof|evidence|camera|cctv|footage|innocent/i, topic: "evidence", replies: ["Check the security terminal before you accuse anyone. A timeline is only useful when it is supported by evidence.", "The recording can test both my alibi and Anna's account. Please inspect the CCTV before drawing a conclusion."] },
      { match: /trust|guilty|weapon|letter|why/i, topic: "the accusation", replies: ["The letter and the clock know more than I do. If you have evidence, show me the timeline—not a guess.", "Do not confuse suspicion with proof. The study's evidence and camera record belong in the same timeline."] }
    ],
    fallback: "I can answer about my lab alibi, Project Echo, or the evidence. What would you like to ask?"
  },
  anna: {
    name: "Anna, the Housekeeper",
    questions: ["What did you see near the study?", "What time was it?", "Did you recognize the person?"],
    answers: [
      { match: /coat|figure|person|who|face|recogn|height|study|see|saw/i, topic: "the figure", replies: ["I saw a tall figure in a long coat near the study door. The face was hidden. I will not pretend I know who it was.", "It was a long coat, around 11:40. I never saw a face, so I cannot name the person."] },
      { match: /time|when|11:40|clock|hour/i, topic: "the time", replies: ["Around 11:40. The hall clock was still ticking then. It stopped later, at 11:47.", "It was close to 11:40. I remember because the hall clock had not stopped yet."] },
      { match: /vale|doctor|lab|alibi/i, topic: "Vale's alibi", replies: ["Dr. Vale said he was in the lab. I cannot confirm that. Please check the CCTV instead of relying on my memory.", "He told us he had not left the lab. I did not see him there, so please check the access record."] },
      { match: /letter|weapon|print|evidence|proof|innocent/i, topic: "the evidence", replies: ["The letter was on the desk, and the weapon looked clean. The camera recording should tell you who actually went into the study.", "I did not touch the scene. The letter, clean weapon, and camera are things you can verify for yourself."] },
      { match: /project|echo|transfer|memory/i, topic: "Project Echo", replies: ["I heard Dr. Vale call it Project Echo. I only know what I overheard; the study records and terminal are your real evidence.", "I heard the words 'memory transfer', but I do not know the science. The study notes may explain it better."] }
    ],
    fallback: "I can tell you what I saw, and what I did not see. Ask about the long coat, the time, or the CCTV. I will not guess at someone's guilt."
  }
};
const music = { context: null, master: null, timer: null, enabled: true, step: 0, level: 0, generation: 0, sources: new Map() };

function initThree() {
  const canvas = document.getElementById("gameCanvas");
  const wrap = document.getElementById("viewportWrap");
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.85));
  renderer.setSize(wrap.clientWidth, wrap.clientHeight);
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.physicallyCorrectLights = true;
  renderer.toneMappingExposure = 1.12;
  renderer.outputEncoding = THREE.sRGBEncoding;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.1;
  scene = new THREE.Scene();
  camera = new THREE.PerspectiveCamera(68, wrap.clientWidth / wrap.clientHeight, 0.08, 250);
  clockSys = new THREE.Clock();
  flashlight = new THREE.SpotLight(0xfff5e6, 0, 26, Math.PI / 6.5, 0.35, 1.1);
  flashlight.distance = 34;
  flashlight.angle = Math.PI / 5.2;
  flashlight.penumbra = 0.5;
  flashlight.decay = 0.8;
  flashlight.castShadow = true;
  camera.add(flashlight);
  flashlight.position.set(0.2, -0.12, 0.25);
  flashlight.target.position.set(0, -0.05, -5);
  camera.add(flashlight.target);
  heldToolRig = new THREE.Group();
  heldToolRig.position.set(0.43, -0.22, -0.76);
  heldToolRig.scale.setScalar(0.68);
  camera.add(heldToolRig);
  phoneRig = new THREE.Group();
  phoneRig.visible = false;
  phoneRig.position.set(-0.3,-0.26,-0.86);
  phoneRig.rotation.set(-0.06,0.12,-0.08);
  camera.add(phoneRig);
  buildHeldPhone();
  scene.add(camera);
  const mapCanvas = document.getElementById("miniMap");
  if (mapCanvas) mapContext = mapCanvas.getContext("2d");
  window.addEventListener("resize", onResize);
  setupControls();
  animate();
}
function actionButtonAction() {
  if(useEquippedItem()) return;
  if (heldObject || (currentHover && currentHover.userData.grabbable)) toggleGrab();
  else tryInteract();
}
function onResize() {
  const wrap = document.getElementById("viewportWrap");
  if (!wrap || !renderer) return;
  camera.aspect = wrap.clientWidth / wrap.clientHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(wrap.clientWidth, wrap.clientHeight);
}
function setupControls() {
  const canvas = document.getElementById("gameCanvas");
  window.addEventListener("keydown", e => {
    const phoneOverlay=document.getElementById("phoneChatOverlay");
    if (e.code === "Escape" && phoneOverlay && !phoneOverlay.hidden) {
      e.preventDefault();
      endConversation();
      return;
    }
    if (phoneOverlay && !phoneOverlay.hidden) return;
    if (e.target instanceof HTMLElement && e.target.matches("input,textarea,select,[contenteditable='true']")) return;
    if (document.activeElement === document.getElementById("commandInput") ||
        !document.getElementById("game").classList.contains("active") ||
        document.getElementById("introOverlay").classList.contains("active") ||
        document.getElementById("scoreOverlay").classList.contains("active") ||
        document.getElementById("instrPopup").classList.contains("show")) return;
    keys[e.code] = true;
    if (["ArrowUp","ArrowDown","ArrowLeft","ArrowRight","KeyW","KeyA","KeyS","KeyD","KeyF","Space","KeyE","KeyP"].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    if (e.code === "KeyF") toggleFlashlight();
    if (e.code === "Space") tryVaultOrClimb();
    if (e.code === "KeyE") equippedItemId && ["food","water","meds","flare"].includes(equippedItemId) ? useEquippedItem() : toggleGrab();
    if (e.code === "KeyP" && investigationTeam.members.length > 1) passInvestigator();
  });
  peopleMeshes.forEach(person => {
    person.rotation.y=Math.sin(t*0.45+person.userData.phase)*0.08;
    person.position.y=Math.sin(t*1.1+person.userData.phase)*0.018;
  });
  window.addEventListener("keyup", e => { keys[e.code] = false; });
  window.addEventListener("blur", () => {
    keys = {};
    isLooking = false;
    activePointerId = null;
    if (hoverOutline) hoverOutline.visible=false;
  });
  canvas.addEventListener("pointerdown", e => {
    if (activePointerId !== null || (e.pointerType === "mouse" && e.button !== 0 && e.button !== 2)) return;
    activePointerId = e.pointerId;
    isLooking = true;
    lastMouse = { x: e.clientX, y: e.clientY };
    pointerStart = { x: e.clientX, y: e.clientY };
    pointerMoved = false;
    canvas.setPointerCapture(e.pointerId);
    if (e.pointerType !== "touch" && e.button === 0) tryInteract();
    if (e.pointerType === "touch") e.preventDefault();
  });
  window.addEventListener("pointermove", e => {
    if (!isLooking || e.pointerId !== activePointerId) return;
    if (Math.hypot(e.clientX - pointerStart.x, e.clientY - pointerStart.y) > 8) pointerMoved = true;
    player.yaw -= (e.clientX - lastMouse.x) * 0.0032;
    player.pitch -= (e.clientY - lastMouse.y) * 0.0028;
    player.pitch = Math.max(-1.3, Math.min(1.3, player.pitch));
    lastMouse = { x: e.clientX, y: e.clientY };
  });
  const endLook = e => {
    if (e.pointerId !== activePointerId) return;
    if (e.pointerType === "touch" && !pointerMoved) tryInteract();
    isLooking = false;
    activePointerId = null;
  };
  window.addEventListener("pointerup", endLook);
  window.addEventListener("pointercancel", endLook);
  canvas.addEventListener("contextmenu", e => e.preventDefault());
  document.querySelectorAll(".mbtn").forEach(btn => {
    const d = btn.dataset.dir;
    const on = () => keys["btn_"+d] = true, off = () => keys["btn_"+d] = false;
    btn.addEventListener("pointerdown", e => {
      e.preventDefault();
      btn.setPointerCapture(e.pointerId);
      on();
    });
    btn.addEventListener("pointerup", off);
    btn.addEventListener("pointercancel", off);
    btn.addEventListener("lostpointercapture", off);
  });
  setTimeout(() => { const h = document.getElementById("lookHint"); if (h) h.classList.add("fade"); }, 12000);
  document.getElementById("phoneComposer").addEventListener("submit",sendPhoneMessage);
}
function addHandSegment(group,start,end,radiusStart,radiusEnd,material) {
  const direction=new THREE.Vector3().subVectors(end,start);
  const segment=new THREE.Mesh(
    new THREE.CylinderGeometry(radiusEnd,radiusStart,direction.length(),10),
    material
  );
  segment.position.copy(start).add(end).multiplyScalar(0.5);
  segment.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
  segment.castShadow=true;
  group.add(segment);
  return segment;
}
function buildGripHand(rig,options={}) {
  const hand=new THREE.Group();
  const mirrored=options.mirrored?-1:1;
  const scale=options.scale||1;
  hand.position.set(options.x||0,options.y||0,options.z||0);
  hand.scale.set(scale*mirrored,scale,scale);
  rig.add(hand);
  const skin=new THREE.MeshPhysicalMaterial({
    color:options.skinColor||0xb77b5d,roughness:0.82,clearcoat:0.06,
    emissive:0x160a06,emissiveIntensity:0.18
  });
  const sleeveMaterial=new THREE.MeshStandardMaterial({color:options.sleeveColor||0x303936,roughness:0.96});
  const cuffMaterial=new THREE.MeshStandardMaterial({color:0x56605a,roughness:0.82});
  const forearm=new THREE.Mesh(new THREE.CylinderGeometry(0.075,0.115,0.43,16),sleeveMaterial);
  forearm.rotation.set(-0.68,0,-0.14);
  forearm.position.set(-0.025,-0.245,0.075);
  forearm.castShadow=true;
  hand.add(forearm);
  const cuff=new THREE.Mesh(new THREE.CylinderGeometry(0.082,0.09,0.07,16),cuffMaterial);
  cuff.rotation.copy(forearm.rotation);
  cuff.position.set(-0.012,-0.065,-0.03);
  hand.add(cuff);
  const palm=new THREE.Mesh(new THREE.SphereGeometry(0.105,18,14),skin);
  palm.scale.set(0.96,1.18,0.49);
  palm.position.set(0.018,0.005,-0.145);
  palm.castShadow=true;
  hand.add(palm);

  const fingerOffsets=[-0.058,-0.019,0.02,0.057];
  fingerOffsets.forEach((offset,index)=>{
    const length=0.105+(index===0||index===3?-0.012:0.008);
    const start=new THREE.Vector3(offset, 0.015, -0.17);
    const middle=new THREE.Vector3(offset+0.006, -0.035-length*0.34, -0.36);
    const tip=new THREE.Vector3(offset+0.018, -0.015-length*0.78, -0.345);
    addHandSegment(hand,start,middle,0.027,0.021,skin);
    addHandSegment(hand,middle,tip,0.021,0.016,skin);
    const joint=new THREE.Mesh(new THREE.SphereGeometry(0.021,10,8),skin);
    joint.position.copy(middle);
    hand.add(joint);
    const nail=new THREE.Mesh(new THREE.SphereGeometry(0.012,8,6),
      new THREE.MeshStandardMaterial({color:0xd9b7a3,roughness:0.68}));
    nail.scale.set(0.75,1,0.35);
    nail.position.set(tip.x,tip.y-0.012,tip.z-0.012);
    hand.add(nail);
  });
  const thumbStart=new THREE.Vector3(0.09,0.025,-0.16);
  const thumbJoint=new THREE.Vector3(0.145,-0.025,-0.31);
  const thumbTip=new THREE.Vector3(0.112,-0.09,-0.34);
  addHandSegment(hand,thumbStart,thumbJoint,0.034,0.028,skin);
  addHandSegment(hand,thumbJoint,thumbTip,0.028,0.021,skin);
  const thumbJointMesh=new THREE.Mesh(new THREE.SphereGeometry(0.027,10,8),skin);
  thumbJointMesh.position.copy(thumbJoint);
  hand.add(thumbJointMesh);
  return hand;
}
function buildHeldPhone() {
  buildGripHand(phoneRig,{x:-0.01,y:0.12,z:0.02,scale:1.04,mirrored:true,sleeveColor:0x303b39});
  const frame = new THREE.Mesh(new THREE.BoxGeometry(0.39,0.69,0.055),
    new THREE.MeshStandardMaterial({color:0x12191d,metalness:0.62,roughness:0.28}));
  frame.position.set(0.035,0.12,-0.27); phoneRig.add(frame);
  phoneScreenCanvas=document.createElement("canvas");
  phoneScreenCanvas.width=256; phoneScreenCanvas.height=512;
  phoneScreenContext=phoneScreenCanvas.getContext("2d");
  drawPhoneScreen();
  phoneScreenTexture=new THREE.CanvasTexture(phoneScreenCanvas);
  phoneScreenTexture.encoding=THREE.sRGBEncoding;
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.35,0.63),
    new THREE.MeshBasicMaterial({map:phoneScreenTexture}));
  screen.position.set(0.035,0.12,-0.239); phoneRig.add(screen);
  const cameraDot = new THREE.Mesh(new THREE.CircleGeometry(0.012,10),
    new THREE.MeshBasicMaterial({color:0x11151a}));
  cameraDot.position.set(0.035,0.417,-0.235); phoneRig.add(cameraDot);
  const sideButton = new THREE.Mesh(new THREE.BoxGeometry(0.014,0.075,0.025),
    new THREE.MeshStandardMaterial({color:0x687579,metalness:0.7,roughness:0.25}));
  sideButton.position.set(-0.167,0.12,-0.27); phoneRig.add(sideButton);
}
function drawPhoneScreen() {
  if(!phoneScreenContext||!phoneScreenCanvas) return;
  const ctx=phoneScreenContext,w=phoneScreenCanvas.width,h=phoneScreenCanvas.height;
  ctx.fillStyle="#0d1717";ctx.fillRect(0,0,w,h);
  if(activePhoneApp==="map") {
    renderFieldMap(phoneScreenCanvas,ctx,true);
    ctx.fillStyle="rgba(22,39,32,0.92)";ctx.fillRect(0,0,w,45);
    ctx.fillStyle="#e6f0e5";ctx.font="bold 14px sans-serif";ctx.fillText("FIELD MAP",14,20);
    ctx.fillStyle="#bad2be";ctx.font="10px sans-serif";ctx.fillText(`${currentPhoneTime()}  ·  GPS LOCKED`,14,36);
    if(phoneScreenTexture) phoneScreenTexture.needsUpdate=true;
    return;
  }
  const gradient=ctx.createLinearGradient(0,0,w,h);
  gradient.addColorStop(0,"#1d5140");gradient.addColorStop(1,"#122a29");
  ctx.fillStyle=gradient;ctx.fillRect(0,0,w,92);
  ctx.fillStyle="#e6f0e5";ctx.font="bold 19px sans-serif";ctx.fillText("ECHOES FIELD",17,35);
  ctx.fillStyle="#bad2be";ctx.font="12px sans-serif";
  ctx.fillText(`${currentPhoneTime()}  ·  GPS LOCKED`,17,61);
  ctx.fillText(`LEVEL ${state.level}  ·  ${state.location.toUpperCase().slice(0,22)}`,17,80);
  if(activePhoneApp==="compass") {
    const centerX=w/2,centerY=285,radius=82;
    ctx.fillStyle="#bdc7a6";ctx.beginPath();ctx.arc(centerX,centerY,radius+8,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#263b32";ctx.beginPath();ctx.arc(centerX,centerY,radius,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle="#c7d4b8";ctx.lineWidth=2;
    for(let i=0;i<32;i++) {
      const angle=i*Math.PI/16,inner=radius-(i%4===0?13:7);
      ctx.beginPath();ctx.moveTo(centerX+Math.sin(angle)*inner,centerY-Math.cos(angle)*inner);
      ctx.lineTo(centerX+Math.sin(angle)*radius,centerY-Math.cos(angle)*radius);ctx.stroke();
    }
    const degree=(((-player.yaw*180/Math.PI)%360)+360)%360,angle=degree*Math.PI/180;
    ctx.fillStyle="#f1e4c4";ctx.font="bold 15px sans-serif";ctx.textAlign="center";
    ctx.fillText("N",centerX,centerY-radius-22);ctx.fillText("E",centerX+radius+20,centerY+5);
    ctx.fillText("S",centerX,centerY+radius+28);ctx.fillText("W",centerX-radius-20,centerY+5);
    ctx.strokeStyle="#e94e3d";ctx.lineWidth=5;ctx.beginPath();
    ctx.moveTo(centerX,centerY);ctx.lineTo(centerX+Math.sin(angle)*65,centerY-Math.cos(angle)*65);ctx.stroke();
    ctx.strokeStyle="#e7e2d4";ctx.beginPath();
    ctx.moveTo(centerX,centerY);ctx.lineTo(centerX-Math.sin(angle)*43,centerY+Math.cos(angle)*43);ctx.stroke();
    ctx.fillStyle="#e6f0e5";ctx.beginPath();ctx.arc(centerX,centerY,6,0,Math.PI*2);ctx.fill();
    ctx.fillStyle="#b6d2b7";ctx.font="bold 15px sans-serif";
    ctx.fillText(`${degree.toFixed(0).padStart(3,"0")}° ${compassCardinal(degree)}`,centerX,420);
    ctx.textAlign="left";
    if(phoneScreenTexture) phoneScreenTexture.needsUpdate=true;
    return;
  }
  if(activePhoneApp==="messages") {
    const unread=Math.max(0,2-state.memory.messagesRead);
    ctx.fillStyle="#e4eee5";ctx.font="bold 15px sans-serif";ctx.fillText("SECURE MESSAGES",17,122);
    ctx.fillStyle="#9fbea8";ctx.font="11px sans-serif";ctx.fillText(`${unread} UNREAD DISPATCH${unread===1?"":"ES"}`,17,143);
    const subjects=state.level===1?["FIELD WARNING","CAMPSITE COMPROMISED"]:state.level===2
      ?["EGYPTIAN ARTIFACT","THE KNIGHT","DINOSAUR SENSOR","MUSEUM PORTRAIT"]:["DR. VALE","ANNA","CASE DISPATCH"];
    subjects.slice(0,4).forEach((subject,index)=>{
      const y=170+index*70;
      ctx.fillStyle="#203731";ctx.beginPath();ctx.roundRect(15,y,226,56,10);ctx.fill();
      ctx.fillStyle=index<state.memory.messagesRead?"#85c796":"#d6bd82";ctx.font="bold 10px sans-serif";
      ctx.fillText(index<state.memory.messagesRead?"READ":"NEW",25,y+18);
      ctx.fillStyle="#e4eee5";ctx.font="bold 11px sans-serif";ctx.fillText(subject,25,y+38);
    });
    if(phoneScreenTexture) phoneScreenTexture.needsUpdate=true;
    return;
  }
  if(activePhoneApp==="case") {
    ctx.fillStyle="#e4eee5";ctx.font="bold 15px sans-serif";ctx.fillText("CASE FILE",17,122);
    ctx.fillStyle="#9fbea8";ctx.font="11px sans-serif";ctx.fillText(`${state.clues.length} CLUES · LEVEL ${state.level}`,17,143);
    state.clues.slice(-5).forEach((clue,index)=>{
      const y=165+index*62;
      ctx.fillStyle="#203731";ctx.beginPath();ctx.roundRect(15,y,226,50,9);ctx.fill();
      ctx.fillStyle="#d9bd7a";ctx.font="bold 10px sans-serif";ctx.fillText(String(index+1).padStart(2,"0"),24,y+18);
      ctx.fillStyle="#e4eee5";ctx.font="10px sans-serif";
      const text=clue.length>37?clue.slice(0,34)+"…":clue;
      ctx.fillText(text,48,y+20);
    });
    if(phoneScreenTexture) phoneScreenTexture.needsUpdate=true;
    return;
  }
  if(activePhoneApp==="conversation"&&conversationTarget) {
    const thread=phoneThreads[conversationTarget]||[];
    ctx.fillStyle="#e4eee5";ctx.font="bold 14px sans-serif";
    ctx.fillText((characterChatbots[conversationTarget]?.name||"WITNESS").toUpperCase().slice(0,23),15,119);
    thread.slice(-4).forEach((message,index)=>{
      const y=145+index*77;
      ctx.fillStyle=message.sender==="player"?"#2a654b":"#293a34";
      ctx.beginPath();ctx.roundRect(14,y,message.sender==="player"?213:228,62,11);ctx.fill();
      ctx.fillStyle="#dce8df";ctx.font="10px sans-serif";
      ctx.fillText(message.text.slice(0,35),24,y+22);
      if(message.text.length>35)ctx.fillText(message.text.slice(35,68)+"…",24,y+39);
    });
    if(phoneScreenTexture) phoneScreenTexture.needsUpdate=true;
    return;
  }
  const apps=[["✉","MESSAGES"],["⌖","FIELD MAP"],["✥","COMPASS"],["▤","CASE FILE"]];
  apps.forEach((app,index)=>{
    const col=index%2,row=Math.floor(index/2),x=17+col*116,y=119+row*118;
    ctx.fillStyle="#1d302d";ctx.beginPath();ctx.roundRect(x,y,103,91,16);ctx.fill();
    ctx.fillStyle=index===0?"#a8d7b4":index===1?"#dcc58a":index===2?"#f19c83":"#b3c5e0";
    ctx.font="32px sans-serif";ctx.fillText(app[0],x+34,y+44);
    ctx.fillStyle="#e4eee5";ctx.font="bold 10px sans-serif";ctx.fillText(app[1],x+18,y+68);
  });
  ctx.fillStyle="#8ca796";ctx.font="10px sans-serif";
  ctx.fillText(`POSITION  ${player.x.toFixed(1)} / ${player.z.toFixed(1)}`,17,376);
  ctx.fillText("TAP AN APP TO OPEN",17,397);
  ctx.fillStyle="#1a332b";ctx.fillRect(17,424,222,60);
  ctx.fillStyle="#a7d2ab";ctx.font="bold 11px sans-serif";ctx.fillText("SECURE CASE CHANNEL",28,448);
  ctx.fillStyle="#c7d7ca";ctx.font="10px sans-serif";ctx.fillText("Witness replies are stored locally.",28,466);
  if(phoneScreenTexture) phoneScreenTexture.needsUpdate=true;
}
function showInstr(title, body) {
  document.getElementById("instrTitle").textContent = title;
  document.getElementById("instrBody").innerHTML = body;
  document.getElementById("instrPopup").classList.add("show");
}
function closeInstr() {
  document.getElementById("instrPopup").classList.remove("show");
  document.getElementById("gameCanvas").focus();
}

function advanceTime(mins) {
  state.minute += mins;
  while (state.minute >= 60) { state.minute -= 60; state.hour = (state.hour + 1) % 24; }
  updateTimeDisplay(); updateDayNight();
}
function stopLevelMusic(suspendContext=true) {
  music.generation++;
  if(music.timer) {
    clearInterval(music.timer);
    music.timer=null;
  }
  for(const [source,connections] of music.sources) {
    try {
      source.stop();
      source.disconnect();
      if(connections.filter) connections.filter.disconnect();
      connections.volume.disconnect();
    } catch(error) {
      console.warn("A background music voice had already stopped.",error);
    }
  }
  music.sources.clear();
  if(music.context&&music.master) {
    const now=music.context.currentTime;
    music.master.gain.cancelScheduledValues(now);
    music.master.gain.setValueAtTime(0,now);
    music.master.gain.value=0;
    if(suspendContext&&music.context.state!=="suspended"&&music.context.state!=="closed") {
      music.context.suspend().catch(error=>{
        console.error("Unable to suspend background music.",error);
      });
    }
  }
  updateMusicButton();
}
function startLevelMusic(level) {
  music.level=level;
  stopLevelMusic(false);
  if (!music.enabled) { updateMusicButton(); return; }
  const AudioContextClass=window.AudioContext||window.webkitAudioContext;
  if (!AudioContextClass) {
    console.warn("Background music is unavailable because this browser does not support Web Audio.");
    return;
  }
  const generation=music.generation;
  try {
    if (!music.context) {
      music.context=new AudioContextClass();
      music.master=music.context.createGain();
      music.master.gain.value=0;
      music.master.connect(music.context.destination);
    }
    const ctx=music.context;
    ctx.resume().then(()=>{
      if(!music.enabled||generation!==music.generation) {
        return;
      }
      const now=ctx.currentTime;
      music.master.gain.cancelScheduledValues(now);
      music.master.gain.setValueAtTime(0,now);
      music.master.gain.linearRampToValueAtTime(0.1,now+0.2);
      const createVoice=(oscillator,volume,filter=null)=>{
        oscillator.connect(filter||volume);
        if(filter) filter.connect(volume);
        volume.connect(music.master);
        music.sources.set(oscillator,{filter,volume});
        oscillator.addEventListener("ended",()=>{
          music.sources.delete(oscillator);
          oscillator.disconnect();
          if(filter) filter.disconnect();
          volume.disconnect();
        },{once:true});
        oscillator.start();
        return oscillator;
      };
      const drone=ctx.createOscillator();
      const droneGain=ctx.createGain();
      drone.type="sine";
      drone.frequency.value=level===1?73.42:level===2?55:65.41;
      droneGain.gain.value=0.045;
      createVoice(drone,droneGain);
      const notes=level===1?[293.66,349.23,440,392,293.66,261.63,349.23,392]
        :level===2?[164.81,174.61,146.83,220,164.81,155.56,196,174.61]
        :[220,261.63,293.66,329.63,293.66,261.63,196,220];
      const playNote=()=>{
        if (!music.enabled||generation!==music.generation||ctx.state!=="running") return;
        const noteTime=ctx.currentTime;
        const oscillator=ctx.createOscillator();
        const filter=ctx.createBiquadFilter();
        const volume=ctx.createGain();
        oscillator.type=level===2?"triangle":"sine";
        oscillator.frequency.value=notes[music.step%notes.length];
        filter.type="lowpass";
        filter.frequency.value=level===2?430:700;
        volume.gain.setValueAtTime(0.0001,noteTime);
        volume.gain.linearRampToValueAtTime(level===2?0.3:0.2,noteTime+0.18);
        volume.gain.exponentialRampToValueAtTime(0.0001,noteTime+(level===2?1.25:1.05));
        oscillator.connect(filter);
        createVoice(oscillator,volume,filter);
        music.step++;
      };
      music.step=0;
      playNote();
      music.timer=setInterval(playNote,level===2?1050:1250);
    }).catch(error=>{
      if(generation!==music.generation) return;
      console.error("Unable to resume level background music.",error);
      addMsg("warning","Background music could not start in this browser.");
    });
  } catch(error) {
    console.error("Unable to start level background music.",error);
    addMsg("warning","Background music could not start in this browser.");
  }
  updateMusicButton();
}
function toggleMusic() {
  music.enabled=!music.enabled;
  if (music.enabled) startLevelMusic(state.level);
  else stopLevelMusic();
  updateMusicButton();
}
function updateMusicButton() {
  const button=document.getElementById("musicButton");
  if (!button) return;
  button.textContent=music.enabled?"♫ STOP MUSIC":"♫ PLAY MUSIC";
  button.setAttribute("aria-label",music.enabled?"Stop background music":"Play background music");
  button.setAttribute("aria-pressed",String(music.enabled));
}
function updateTimeDisplay() {
  const period = state.hour >= 5 && state.hour < 18 ? "Day" : "Night";
  document.getElementById("time").textContent = `${period} — ${state.hour}:${String(state.minute).padStart(2,"0")}`;
}
function updateDayNight() {
  if (!sunLight || !ambientLight) return;
  const h = state.hour + state.minute / 60;
  let sunI = 0.15, ambI = 0.22, sunC = 0x6688aa, ambC = 0x151825, fogC = 0x060810, exp = 0.85;
  if (h >= 5 && h < 8) { const t=(h-5)/3; sunI=0.3+t*0.7; ambI=0.3+t*0.25; sunC=0xffaa66; fogC=0x1a1510; exp=0.95+t*0.15; }
  else if (h >= 8 && h < 17) { sunI=1.05; ambI=0.55; sunC=0xfff5e0; ambC=0x445544; fogC=0x6a8a9a; exp=1.15; }
  else if (h >= 17 && h < 20) { const t=(h-17)/3; sunI=1-t*0.8; ambI=0.5-t*0.28; sunC=0xff6633; fogC=0x2a1810; exp=1.1-t*0.2; }
  if (state.level >= 2) {
    if(interiorLightsOn) {
      sunI=Math.max(sunI*0.24,0.68);
      ambI=1.35;
      sunC=0xe6d9bf;
      ambC=0x82939a;
    } else {
      sunI*=0.2;
      ambI=Math.max(0.4,ambI*0.68);
      ambC=0x4a5360;
    }
    fogC = state.level===2 ? 0x0c0a08 : 0x08060a;
    exp = interiorLightsOn ? 1.22 : 1.04;
  }
  sunLight.intensity = sunI; sunLight.color.setHex(sunC);
  ambientLight.intensity = ambI; ambientLight.color.setHex(ambC);
  scene.background = new THREE.Color(fogC);
  if (scene.fog) scene.fog.color.setHex(fogC);
  renderer.toneMappingExposure = exp;
  if (fireLight) fireLight.intensity = ((h < 6 || h > 18) ? 2.8 : 1.55) * fireLight.userData.flicker;
}

function toggleFlashlight() {
  const item = state.inventory.find(i => i.id === "flashlight");
  if (!item) { addMsg("system","No flashlight."); return; }
  equipHeldItem("flashlight");
  state.memory.flashlightOn = !state.memory.flashlightOn;
  if (flashlight) flashlight.intensity = state.memory.flashlightOn ? 5.2 : 0;
  addMsg("system", state.memory.flashlightOn ? "🔦 Flashlight ON" : "Flashlight OFF");
  if (state.memory.flashlightOn) { state.info=Math.min(100,state.info+2); item.uses=Math.max(0,item.uses-1); }
  updateUI();
}
function clearHeldTool() {
  if(!heldToolRig) { equippedItemId=null; return; }
  while(heldToolRig.children.length) {
    const child=heldToolRig.children[0];
    heldToolRig.remove(child);
    disposeObjectResources(child);
  }
  heldToolRig.visible=true;
  mapToolTexture=null;
  mapToolCanvas=null;
  compassNeedle=null;
  equippedItemId=null;
}
function equipHeldItem(id) {
  if (!heldToolRig || equippedItemId === id) return;
  clearHeldTool();
  equippedItemId=id;
  if(id==="phone") {
    heldToolRig.visible=false;
    phoneRig.visible=true;
    updateActionButton();
    return;
  }
  buildGripHand(heldToolRig,{x:id==="map"?-0.18:0,y:0.12,z:0.015});
  const metal=new THREE.MeshStandardMaterial({color:0x35434a,metalness:0.72,roughness:0.3});
  const dark=new THREE.MeshStandardMaterial({color:0x1c2428,metalness:0.55,roughness:0.4});
  if (id==="flashlight") {
    const body=new THREE.Mesh(new THREE.CylinderGeometry(0.055,0.075,0.48,16),metal);
    body.rotation.x=-Math.PI/2; body.position.set(0.03,0.035,-0.27); heldToolRig.add(body);
    const lens=new THREE.Mesh(new THREE.CylinderGeometry(0.073,0.061,0.075,16),
      new THREE.MeshStandardMaterial({color:0xc9e6e7,emissive:0x9dc9d0,emissiveIntensity:0.7,metalness:0.2,roughness:0.18}));
    lens.rotation.x=-Math.PI/2; lens.position.set(0.03,0.035,-0.54); heldToolRig.add(lens);
    const grip=new THREE.Mesh(new THREE.CylinderGeometry(0.038,0.04,0.15,12),dark);
    grip.rotation.x=-Math.PI/2; grip.position.set(0.03,0.035,-0.02); heldToolRig.add(grip);
  } else if (id==="water") {
    const bottle=new THREE.Mesh(new THREE.CylinderGeometry(0.115,0.13,0.38,16),
      new THREE.MeshPhysicalMaterial({color:0x6bafc1,roughness:0.18,metalness:0.04,transparent:true,opacity:0.82}));
    bottle.position.set(0.055,0.04,-0.3); heldToolRig.add(bottle);
    const neck=new THREE.Mesh(new THREE.CylinderGeometry(0.053,0.072,0.11,12),metal);
    neck.position.set(0.055,0.28,-0.3); heldToolRig.add(neck);
    const cap=new THREE.Mesh(new THREE.CylinderGeometry(0.057,0.057,0.07,12),dark);
    cap.position.set(0.055,0.37,-0.3); heldToolRig.add(cap);
    const label=new THREE.Mesh(new THREE.CylinderGeometry(0.118,0.13,0.1,16,1,true),
      new THREE.MeshStandardMaterial({color:0xe1d3a2,roughness:0.65,side:THREE.DoubleSide}));
    label.position.set(0.055,0.02,-0.3); heldToolRig.add(label);
  } else if (id==="food") {
    const can=new THREE.Mesh(new THREE.CylinderGeometry(0.13,0.13,0.3,18),
      new THREE.MeshStandardMaterial({color:0x9c5b39,metalness:0.4,roughness:0.36}));
    can.position.set(0.055,0.055,-0.3); heldToolRig.add(can);
    const lid=new THREE.Mesh(new THREE.CylinderGeometry(0.132,0.132,0.025,18),metal);
    lid.position.set(0.055,0.22,-0.3); heldToolRig.add(lid);
    const label=new THREE.Mesh(new THREE.CylinderGeometry(0.131,0.131,0.12,18,1,true),
      new THREE.MeshStandardMaterial({color:0xd3b77e,roughness:0.62,side:THREE.DoubleSide}));
    label.position.set(0.055,0.055,-0.3); heldToolRig.add(label);
  } else if (id==="meds") {
    const pack=new THREE.Mesh(new THREE.BoxGeometry(0.22,0.27,0.045),
      new THREE.MeshStandardMaterial({color:0xe7e1ce,roughness:0.72}));
    pack.position.set(0.055,0.045,-0.3); heldToolRig.add(pack);
    for(let row=0;row<2;row++) for(let col=0;col<3;col++) {
      const tablet=new THREE.Mesh(new THREE.SphereGeometry(0.035,8,6),
        new THREE.MeshStandardMaterial({color:0xb34e46,roughness:0.55}));
      tablet.position.set(-0.015+col*0.07,-0.015+row*0.1,-0.265); heldToolRig.add(tablet);
    }
  } else if (id==="map") {
    mapToolCanvas=document.createElement("canvas");
    mapToolCanvas.width=360;mapToolCanvas.height=360;
    renderFieldMap(mapToolCanvas,mapToolCanvas.getContext("2d"),true);
    if(mapToolCanvas) {
      mapToolTexture=new THREE.CanvasTexture(mapToolCanvas);
      mapToolTexture.encoding=THREE.sRGBEncoding;
      const sheet=new THREE.Mesh(new THREE.PlaneGeometry(0.67,0.52),
        new THREE.MeshStandardMaterial({map:mapToolTexture,color:0xffffff,roughness:0.9,side:THREE.DoubleSide}));
      sheet.position.set(-0.2,0.15,-0.31);
      sheet.rotation.x=0.14;
      heldToolRig.add(sheet);
      const edgeMaterial=new THREE.MeshStandardMaterial({color:0x9b8054,roughness:0.92});
      [[0,0.267], [0,-0.267]].forEach(([x,y])=>{
        const fold=new THREE.Mesh(new THREE.BoxGeometry(0.65,0.008,0.006),edgeMaterial);
        fold.position.set(-0.2,y+0.15,-0.305);
        heldToolRig.add(fold);
      });
    }
  } else if (id==="compass") {
    const housing=new THREE.Mesh(new THREE.CylinderGeometry(0.19,0.19,0.055,36),
      new THREE.MeshStandardMaterial({color:0xa98245,metalness:0.8,roughness:0.27}));
    housing.rotation.x=Math.PI/2;
    housing.position.set(0.025,0.12,-0.32);
    heldToolRig.add(housing);
    const bezel=new THREE.Mesh(new THREE.TorusGeometry(0.17,0.012,8,36),
      new THREE.MeshStandardMaterial({color:0xd9bd7a,metalness:0.88,roughness:0.2}));
    bezel.position.set(0.025,0.12,-0.29);
    heldToolRig.add(bezel);
    const glass=new THREE.Mesh(new THREE.CircleGeometry(0.158,36),
      new THREE.MeshPhysicalMaterial({color:0x78969a,transparent:true,opacity:0.34,roughness:0.08,metalness:0.14,side:THREE.DoubleSide}));
    glass.position.set(0.025,0.12,-0.282);
    heldToolRig.add(glass);
    const tickMaterial=new THREE.MeshStandardMaterial({color:0xe8dfc7,metalness:0.25,roughness:0.5});
    for(let i=0;i<16;i++) {
      const angle=i*Math.PI/8;
      const tick=new THREE.Mesh(new THREE.BoxGeometry(0.006,i%4===0?0.035:0.018,0.003),tickMaterial);
      tick.position.set(0.025+Math.sin(angle)*0.132,0.12+Math.cos(angle)*0.132,-0.276);
      tick.rotation.z=-angle;
      heldToolRig.add(tick);
    }
    const needle=new THREE.Group();
    needle.position.set(0.025,0.12,-0.27);
    compassNeedle=needle;
    const northShape=new THREE.Shape();
    northShape.moveTo(0,0.12);northShape.lineTo(-0.025,0);northShape.lineTo(0,0.015);northShape.lineTo(0.025,0);northShape.closePath();
    const southShape=new THREE.Shape();
    southShape.moveTo(0,-0.1);southShape.lineTo(-0.022,0);southShape.lineTo(0,0.012);southShape.lineTo(0.022,0);southShape.closePath();
    const north=new THREE.Mesh(new THREE.ShapeGeometry(northShape),
      new THREE.MeshBasicMaterial({color:0xe94e3d,side:THREE.DoubleSide}));
    const south=new THREE.Mesh(new THREE.ShapeGeometry(southShape),
      new THREE.MeshBasicMaterial({color:0xe7e2d4,side:THREE.DoubleSide}));
    needle.add(north,south);
    heldToolRig.add(needle);
    const cap=new THREE.Mesh(new THREE.SphereGeometry(0.018,12,8),
      new THREE.MeshStandardMaterial({color:0xd9bd7a,metalness:0.8,roughness:0.24}));
    cap.position.set(0.025,0.12,-0.266);
    heldToolRig.add(cap);
  } else if (id==="flare") {
    const body=new THREE.Mesh(new THREE.CylinderGeometry(0.048,0.062,0.34,14),
      new THREE.MeshStandardMaterial({color:0xb83f2d,roughness:0.48,metalness:0.16}));
    body.rotation.x=-Math.PI/2;body.position.set(0.04,0.055,-0.31);heldToolRig.add(body);
    const grip=new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.05,0.12,12),
      new THREE.MeshStandardMaterial({color:0x343b3c,roughness:0.68}));
    grip.rotation.x=-Math.PI/2;grip.position.set(0.04,0.055,-0.07);heldToolRig.add(grip);
    const cap=new THREE.Mesh(new THREE.CylinderGeometry(0.066,0.055,0.07,14),
      new THREE.MeshStandardMaterial({color:0xff9b54,emissive:0xff5d28,emissiveIntensity:0.7,roughness:0.35}));
    cap.rotation.x=-Math.PI/2;cap.position.set(0.04,0.055,-0.53);heldToolRig.add(cap);
  }
  updateActionButton();
}
function unequipHeldItem() {
  clearHeldTool();
  updateUI();
}
function useEquippedItem() {
  if (!equippedItemId || !["food","water","meds","flare"].includes(equippedItemId)) return false;
  const item=state.inventory.find(i=>i.id===equippedItemId);
  if (!item || item.uses<=0) { addMsg("system","There is none left to use."); return true; }
  if(equippedItemId==="flare") {
    item.uses--;
    if(encounterState.active&&!encounterState.cleared) {
      encounterState.distractedUntil=performance.now()/1000+8;
      if(state.level<3) clearEncounter("The bright flare sends the presence recoiling long enough for you to get clear.");
      else {
        addMsg("system","The flare blooms bright. The stalker shields their eyes—use the opening to retreat through the study door.");
        setEncounterHint("DISTRACTED · GET TO THE STUDY DOOR");
      }
    } else addMsg("system","The signal flare burns bright, marking your position without harming anyone.");
  } else if (equippedItemId==="food") {
    item.uses--; state.food=Math.max(0,state.food-0.4);
    state.health=Math.min(100,state.health+8); advanceTime(5);
    addMsg("system","You eat from the ration tin. Strength returns.");
  } else if (equippedItemId==="water") {
    item.uses--; state.water=Math.max(0,state.water-0.3);
    state.health=Math.min(100,state.health+5); advanceTime(3);
    addMsg("system","You take a drink from the bottle.");
  } else {
    item.uses--; state.health=Math.min(100,state.health+18); advanceTime(8);
    addMsg("system","You use the first-aid kit. You feel steadier.");
  }
  if(item.uses===0) {
    state.inventory=state.inventory.filter(entry=>entry!==item);
    clearHeldTool();
  }
  updateUI();
  return true;
}
function useItemById(id) {
  const item = state.inventory.find(i => i.id === id);
  if (!item) return;
  if (id === "flashlight") { toggleFlashlight(); return; }
  if (["food","water","meds","flare"].includes(id)) {
    if(equippedItemId===id) { unequipHeldItem(); return; }
    equipHeldItem(id);
    addMsg("system",id==="flare"?"You hold a signal flare. Press E or USE FLARE to create a bright, non-harmful distraction.":`Holding ${item.name.replace(/^\S+\s*/,"")}. Press E or USE to consume it.`);
    updateUI();
    return;
  }
  else if (id === "phone") {
    if(!document.getElementById("phoneChatOverlay").hidden) { endConversation(); return; }
    openFieldPhone();
    return;
  } else if (id==="map"||id==="compass") {
    if(equippedItemId===id) { unequipHeldItem(); return; }
    equipHeldItem(id);
    addMsg("system",id==="map"?"You unfold the field map. Your position updates as you move.":"You raise the compass. The needle tracks north as you turn.");
  }
  else if (id === "key") addMsg("system","Strange Key — cold, unknown symbol.");
  else if (id === "journal") addMsg("ai",'Journal: "Signal near ridge. Don\'t trust the phone. Leave."');
  updateUI();
}

function toggleGrab() {
  if (heldObject) {
    const dropPos = new THREE.Vector3(0, -0.3, -1.4).applyQuaternion(camera.quaternion);
    heldObject.position.copy(camera.position).add(dropPos);
    heldObject.position.y = Math.max(0.15, heldObject.position.y);
    heldObject.quaternion.copy(camera.quaternion);
    heldObject.userData.held = false;
    addMsg("system", "You put down the " + (heldObject.userData.label || "object") + ".");
    heldObject = null;
    return;
  }
  if (currentHover && currentHover.userData.grabbable) {
    heldObject = currentHover;
    const worldPosition = new THREE.Vector3();
    const worldQuaternion = new THREE.Quaternion();
    const worldScale = new THREE.Vector3();
    heldObject.updateWorldMatrix(true,false);
    heldObject.matrixWorld.decompose(worldPosition,worldQuaternion,worldScale);
    if (heldObject.parent) heldObject.parent.remove(heldObject);
    worldGroup.add(heldObject);
    heldObject.position.copy(worldPosition);
    heldObject.quaternion.copy(worldQuaternion);
    heldObject.scale.copy(worldScale);
    heldObject.userData.held = true;
    addMsg("system", "You pick up the " + (heldObject.userData.label || "object") + ". Press E to drop.");
    if (heldObject.userData.onGrab) heldObject.userData.onGrab();
  } else {
    addMsg("system", "Nothing grabbable in front of you. Aim at a small object and press E.");
  }
}

function tryClimb() {
  if(state.level===3) { addMsg("system","Walk up the manor staircase to reach the upper landing."); return; }
  if (!hillMesh || state.level !== 1) { if (state.level===1) addMsg("system","Move closer to the hill."); return; }
  const dist = Math.hypot(player.x - hillMesh.position.x, player.z - hillMesh.position.z);
  if (dist > 6.5) { addMsg("system","Too far from the hill."); return; }
  player.onGround = false;
  player.y = Math.min(4.8, player.y + 0.45);
  advanceTime(4);
  if (!state.memory.climbedHill) {
    state.memory.climbedHill = true;
    state.safety += 10; state.info += 15;
    setScene("Ridge view: campfire smoke, eastern road with tracks, broken trail through trees.");
    addMsg("ai","You climb the rocky hill. The valley opens below.");
    addClue("Hill view: smoke is a campfire; fresh tire tracks east");
    addClue("Broken trail through trees toward the camp");
    checkL1();
  } else addMsg("ai","On the ridge again.");
  updateUI();
}
function tryVaultOrClimb() {
  const obstacle=vaultObstacles.find(item=>Math.hypot(player.x-item.x,player.z-item.z)<2.3);
  if(obstacle) {
    vaultJumpTimer=0.82;
    player.y=Math.max(player.y,2.1);
    if(obstacle.level===3&&state.memory.inStudy) encounterState.studyObstacleVaulted=true;
    addMsg("system","You vault the obstacle. Keep moving!");
    return;
  }
  tryClimb();
}

function tryInteract() {
  if (!currentHover) return;
  const id = currentHover.userData.id;
  const label = currentHover.userData.label || id;
  setScene(characterChatbots[id] ? "Talking with: " + label : "Examining: " + label);
  advanceTime(2);
  if(id==="wallSwitch") { setInteriorLights(!interiorLightsOn); return; }
  if (state.level === 1) {
    if (id==="smoke"||id==="camp") examineCamp();
    else if (id==="hill") tryClimb();
    else if (id==="road") examineRoad();
    else if (id==="trees") examineTrees();
    else if (id==="stream") examineStream();
    else if (id==="footprint") { addMsg("ai","Boot print — deep heel, heading toward the smoke. Size roughly matches an adult male."); addClue("Boot prints lead toward the campsite"); checkL1(); }
  } else if (state.level === 2) {
    if (id==="artifact") talkArtifact();
    else if (id==="knight") talkKnight();
    else if (id==="dinosaur") talkDino();
    else if (id==="painting") talkMuseumPortrait();
    else if (id==="door") examineDoor();
    else if (id==="desk") examineDesk();
    else if (id==="case") addMsg("ai","Glass case. Ancient tools and labels. Nothing moves by itself — only the big exhibits speak.");
  } else if (state.level === 3) {
    if (id==="galleryPortrait") {
      setScene("The portrait's brass plaque reads: 11:47 — the hour the Blackwood trust was changed.");
      talkPortrait();
    } else if (id==="clock") examineClock();
    else if (id==="body"||id==="desk"||id==="letter"||id==="weapon") examineCrimeScene();
    else if (id==="vale") talkVale();
    else if (id==="anna") talkAnna();
    else if (id==="terminal") checkCCTV();
    else if (id==="doorStudy") enterStudy();
    else if (id==="doorHall") leaveStudy();
  }
}

// ----- Level 1 investigates -----
function examineCamp() {
  if (state.memory.campExamined) { addMsg("ai","Campsite already searched."); return; }
  state.memory.campExamined = true; state.info += 20; state.location = "Abandoned Campsite";
  setScene("Collapsed tent, cold ashes, cloth-wrapped key, torn journal page.");
  addMsg("ai","Abandoned in a hurry. Fire dead for hours.");
  addMsg("system",'Journal: "Signal stronger near the ridge. Don\'t trust the phone."');
  addClue("Campsite abandoned; journal warns about the phone");
  if (!state.memory.foundObject) {
    state.memory.foundObject = true;
    state.inventory.push({ id:"key", name:"🗝️ Strange Key", uses:1, desc:"Unknown symbol" });
    state.inventory.push({ id:"journal", name:"📜 Torn Journal", uses:1, desc:"Ridge / phone warning" });
    addMsg("system","You take the Strange Key and journal.");
    addClue("Strange Key recovered from campsite");
  }
  checkL1(); updateUI();
}
function examineRoad() {
  state.memory.roadExamined = true; state.info += 10;
  setScene("Dirt road east. Fresh dual-axle tracks. Boot prints over the mud.");
  addMsg("ai","Vehicle stopped, someone walked to camp, vehicle left.");
  addClue("Vehicle came and left; prints overlay tire tracks");
  checkL1(); updateUI();
}
function examineTrees() {
  state.memory.treesExamined = true; state.info += 8;
  setScene("Broken twigs, crushed undergrowth, dark fabric on a branch.");
  addMsg("ai","Path of movement toward the smoke. Fabric from a long dark coat.");
  addClue("Long dark coat fabric on path to camp");
  checkL1(); updateUI();
}
function examineStream() {
  if (!state.memory.streamUsed) {
    state.memory.streamUsed = true; state.water = Math.min(3.5, state.water+0.8);
    const w = state.inventory.find(i=>i.id==="water"); if (w) w.uses=Math.min(5,w.uses+1);
    addMsg("ai","You refill water from the stream.");
    addClue("Fresh water source south of clearing");
  } else addMsg("ai","Stream still runs clear.");
  updateUI();
}
function checkL1() {
  const n = state.clues.length;
  state.objectives = [
    { text: "Orient — phone, compass, look around", done: state.memory.messagesRead>0 },
    { text: "Investigate campsite", done: state.memory.campExamined },
    { text: "Hill or road survey", done: state.memory.climbedHill || state.memory.roadExamined },
    { text: "Clues " + n + "/" + state.requiredClues, done: n >= state.requiredClues }
  ];
  if (n >= state.requiredClues && !state.levelComplete)
    addMsg("system","Enough clues. When ready: walk the eastern road or type 'head east'.");
  updateUI();
}
function tryLeaveL1() {
  if (state.clues.length < state.requiredClues) {
    addMsg("ai","Not enough information yet. Keep investigating. Clues: "+state.clues.length+"/"+state.requiredClues);
    return;
  }
  advanceTime(40); state.location="Dirt Road — Extraction";
  setScene("Headlights. Black SUV. Driver knows about the key.");
  addMsg("character","You found the key. Get in. The museum is already waking.","Driver");
  addMsg("system","— LEVEL 1 COMPLETE —");
  state.levelComplete = true;
  setTimeout(()=>showScore(1), 1400);
}

// ----- Level 2 -----
function showPhoneNotification(character) {
  const notification=document.getElementById("phoneNotification");
  document.getElementById("phoneNotificationTitle").textContent=`${character.name} · secure case chat`;
  document.getElementById("phoneNotificationText").textContent="A new conversation opened on your field phone.";
  notification.hidden=false;
  clearTimeout(phoneNotificationTimer);
  phoneNotificationTimer=setTimeout(()=>{notification.hidden=true;},2800);
}
function appendPhoneBubble(id,message) {
  const thread=document.getElementById("phoneMessages");
  const bubble=document.createElement("div");
  bubble.className=`phone-message ${message.sender}`;
  const text=document.createElement("p");
  text.textContent=message.text;
  bubble.appendChild(text);
  const time=document.createElement("time");
  time.textContent=message.time;
  bubble.appendChild(time);
  thread.appendChild(bubble);
  thread.scrollTop=thread.scrollHeight;
}
function currentPhoneTime() {
  return `${String(state.hour).padStart(2,"0")}:${String(state.minute).padStart(2,"0")}`;
}
function renderPhoneThread(id) {
  const thread=document.getElementById("phoneMessages");
  thread.replaceChildren();
  (phoneThreads[id]||[]).forEach(message=>appendPhoneBubble(id,message));
  thread.scrollTop=thread.scrollHeight;
}
function updatePhoneMemory(id) {
  const memory=conversationHistory[id];
  const guide=document.getElementById("phoneStoryNote");
  guide.replaceChildren();
  const label=document.createElement("strong");
  label.textContent=memory&&memory.count?`CASE MEMORY · ${memory.count} QUESTIONS`:"FIELD GUIDE";
  const text=document.createElement("span");
  text.textContent=memory&&memory.topics.length
    ? `You have discussed ${memory.topics.slice(-3).join(", ")}. Ask a follow-up or request a recap.`
    : "Ask in your own words. Try “what happened?”, “why?” or “tell me more.” Characters only know what they witnessed.";
  guide.append(label,text);
}
function showPhoneHome() {
  activePhoneApp="home";
  conversationTarget=null;
  document.getElementById("phoneHomeView").hidden=false;
  document.getElementById("phoneAppView").hidden=true;
  document.getElementById("phoneConversationView").hidden=true;
  document.getElementById("phoneTyping").hidden=true;
  document.getElementById("phoneHomeGreeting").textContent=
    state.hour<12?"Good morning, investigator.":state.hour<18?"Good afternoon, investigator.":"Good evening, investigator.";
  document.getElementById("phoneClock").textContent=currentPhoneTime();
  updatePhoneDeviceReadouts();
}
function openFieldPhone() {
  const overlay=document.getElementById("phoneChatOverlay");
  if(overlay.hidden) previousHeldItem=equippedItemId==="phone"?previousHeldItem:equippedItemId;
  conversationTarget=null;
  phoneRigOpen=true;
  if(state.inventory.some(item=>item.id==="phone")) equipHeldItem("phone");
  else phoneRig.visible=true;
  overlay.hidden=false;
  showPhoneHome();
  updateUI();
  document.getElementById("gameCanvas").blur();
}
function phoneBack() {
  conversationTarget=null;
  showPhoneHome();
}
function openPhoneApp(app) {
  if(!document.getElementById("phoneChatOverlay")||document.getElementById("phoneChatOverlay").hidden) return;
  activePhoneApp=app;
  document.getElementById("phoneHomeView").hidden=true;
  document.getElementById("phoneConversationView").hidden=true;
  document.getElementById("phoneAppView").hidden=false;
  const title=document.getElementById("phoneAppTitle");
  const content=document.getElementById("phoneAppContent");
  content.replaceChildren();
  const titles={messages:"Messages",map:"Field map",compass:"Compass",case:"Case file"};
  title.textContent=titles[app]||"Field phone";
  if(app==="messages") renderPhoneMessages(content);
  else if(app==="map") {
    const canvas=document.createElement("canvas");
    canvas.id="phoneMapCanvas";
    canvas.width=360;canvas.height=360;
    canvas.setAttribute("role","img");
    canvas.setAttribute("aria-label","Live tactical map showing your position and case landmarks");
    content.appendChild(canvas);
    const legend=document.createElement("p");
    legend.className="phone-map-status";
    legend.id="phoneMapStatus";
    content.appendChild(legend);
    renderFieldMap(canvas,canvas.getContext("2d"));
    updatePhoneDeviceReadouts();
  } else if(app==="compass") {
    const compass=document.createElement("div");
    compass.className="phone-compass-face";
    compass.innerHTML='<span class="phone-compass-north">N</span><span class="phone-compass-east">E</span><span class="phone-compass-south">S</span><span class="phone-compass-west">W</span><i class="phone-compass-needle"></i><b class="phone-compass-pivot"></b>';
    content.appendChild(compass);
    const reading=document.createElement("p");
    reading.className="phone-compass-reading";
    reading.id="phoneCompassReading";
    content.appendChild(reading);
    const note=document.createElement("p");
    note.className="phone-app-note";
    note.textContent="The red needle points to magnetic north. Turn in place to watch the bearing change.";
    content.appendChild(note);
    updatePhoneDeviceReadouts();
  } else if(app==="case") renderPhoneCase(content);
}
function renderPhoneMessages(content) {
  content.replaceChildren();
  if(state.level===1) {
    const messages=[
      {sender:"UNKNOWN NUMBER",subject:"FIELD WARNING",body:"Don't follow the smoke. The ridge wind is pushing it east. Look for the trail markers before you move.",clue:"Phone: Don't follow the smoke"},
      {sender:"FIELD DISPATCH",subject:"CAMPSITE COMPROMISED",body:"Campsite compromised. East when ready. Keep to the marked road and check the stream for a safe route.",clue:"Phone: campsite compromised, head east"}
    ];
    const intro=document.createElement("p");
    intro.className="phone-app-note";
    intro.textContent="Two encrypted dispatches were recovered from your lock screen.";
    content.appendChild(intro);
    messages.forEach((message,index)=>{
      const card=document.createElement("article");
      card.className="phone-message-card";
      const meta=document.createElement("small");
      meta.textContent=`${message.sender} · ${index<state.memory.messagesRead?"READ":"UNREAD"}`;
      const title=document.createElement("strong");
      title.textContent=message.subject;
      const body=document.createElement("p");
      body.textContent=index<state.memory.messagesRead?message.body:"Encrypted field dispatch. Tap to decrypt and add it to your case file.";
      card.append(meta,title,body);
      if(index===state.memory.messagesRead) {
        const button=document.createElement("button");
        button.type="button";
        button.className="phone-app-action";
        button.textContent="DECRYPT MESSAGE";
        button.addEventListener("click",()=>readFieldMessage(index,message));
        card.appendChild(button);
      }
      content.appendChild(card);
    });
    if(state.memory.messagesRead>=messages.length) {
      const footer=document.createElement("p");
      footer.className="phone-app-note";
      footer.textContent="No further dispatches. The rest of the signal is only static.";
      content.appendChild(footer);
    }
    return;
  }
  const contacts=state.level===2
    ?[["artifact","Egyptian Artifact","Artifact witness channel"],["knight","The Knight","Gallery witness channel"],["dinosaur","Dinosaur Skeleton","Sensor echo channel"],["museumPortrait","Museum Portrait","Canvas witness channel"]]
    :[["vale","Dr. Vale","Primary interview channel"],["anna","Anna","Witness interview channel"]];
  const intro=document.createElement("p");
  intro.className="phone-app-note";
  intro.textContent=state.level===2?"Local museum witness channels are available; they work even without a network.":"Local manor witness channels are available; interviews are stored on this device.";
  content.appendChild(intro);
  contacts.forEach(([id,name,detail])=>{
    const button=document.createElement("button");
    button.type="button";
    button.className="phone-contact-card";
    const initials=name.split(/\s+/).map(part=>part[0]).join("").slice(0,2).toUpperCase();
    const avatar=document.createElement("span");
    avatar.className="phone-contact-avatar";
    avatar.textContent=initials;
    const text=document.createElement("span");
    text.innerHTML=`<strong></strong><small></small>`;
    text.querySelector("strong").textContent=name;
    text.querySelector("small").textContent=detail;
    const action=document.createElement("b");
    action.textContent="›";
    button.append(avatar,text,action);
    button.addEventListener("click",()=>openWitnessConversation(id));
    content.appendChild(button);
  });
}
function openWitnessConversation(id) {
  const startConversation={
    artifact:talkArtifact,knight:talkKnight,dinosaur:talkDino,museumPortrait:talkMuseumPortrait,
    vale:talkVale,anna:talkAnna
  }[id];
  if(startConversation) startConversation();
}
function readFieldMessage(index,message) {
  if(state.level!==1||index!==state.memory.messagesRead) return;
  const phone=state.inventory.find(item=>item.id==="phone");
  if(phone&&phone.uses<=0) {
    addMsg("warning","The field phone battery is depleted. Its saved messages are still available.");
    return;
  }
  if(phone) phone.uses--;
  state.memory.messagesRead++;
  advanceTime(2);
  addMsg("warning",`"${message.body}"`);
  addClue(message.clue);
  if(index===1) state.info=Math.min(100,state.info+8);
  checkL1();
  renderPhoneMessages(document.getElementById("phoneAppContent"));
  updatePhoneDeviceReadouts();
}
function renderPhoneCase(content) {
  const heading=document.createElement("p");
  heading.className="phone-app-note";
  heading.textContent=`LEVEL ${state.level} · ${state.clues.length} CLUES RECORDED`;
  content.appendChild(heading);
  if(!state.clues.length) {
    const empty=document.createElement("p");
    empty.className="phone-empty-state";
    empty.textContent="No evidence filed yet. Inspect the scene, question witnesses, and decrypt dispatches to build your case.";
    content.appendChild(empty);
  } else state.clues.forEach((clue,index)=>{
    const card=document.createElement("article");
    card.className="phone-clue-card";
    const number=document.createElement("span");
    number.textContent=String(index+1).padStart(2,"0");
    const text=document.createElement("p");
    text.textContent=clue;
    card.append(number,text);
    content.appendChild(card);
  });
  const objectives=document.createElement("div");
  objectives.className="phone-objectives";
  state.objectives.forEach(objective=>{
    const row=document.createElement("p");
    row.textContent=`${objective.done?"✓":"○"}  ${objective.text}`;
    objectives.appendChild(row);
  });
  content.appendChild(objectives);
}
function updatePhoneDeviceReadouts() {
  const clock=document.getElementById("phoneClock");
  if(clock) clock.textContent=currentPhoneTime();
  const battery=document.getElementById("phoneBatteryStatus");
  const phone=state.inventory.find(item=>item.id==="phone");
  if(battery) battery.textContent=`BATTERY ${phone?Math.max(0,Math.round(phone.uses/5*100)):0}%`;
  const mapStatus=document.getElementById("phoneMapStatus");
  if(mapStatus) mapStatus.textContent=`${state.location} · ${player.x.toFixed(1)}, ${player.z.toFixed(1)}`;
  const reading=document.getElementById("phoneCompassReading");
  const degrees=(((-player.yaw*180/Math.PI)%360)+360)%360;
  if(reading) reading.textContent=`${degrees.toFixed(0).padStart(3,"0")}°  ${compassCardinal(degrees)}  ·  LIVE BEARING`;
  const phoneNeedle=document.querySelector(".phone-compass-needle");
  if(phoneNeedle) phoneNeedle.style.transform=`translate(-50%,-88%) rotate(${degrees}deg)`;
}
function compassCardinal(degrees) {
  return ["N","NE","E","SE","S","SW","W","NW"][Math.round(degrees/45)%8];
}
function beginCharacterConversation(id, openingLine) {
  const character=characterChatbots[id];
  if (!character) return;
  if (conversationTarget&&conversationTarget!==id) endConversation();
  conversationTarget=id;
  phoneRigOpen=true;
  phoneRig.visible=true;
  if(equippedItemId!=="phone") previousHeldItem=equippedItemId;
  if (state.inventory.some(item=>item.id==="phone")) equipHeldItem("phone");
  const thread=phoneThreads[id]||(phoneThreads[id]=[]);
  if (!thread.length) thread.push({sender:"character",text:openingLine,time:currentPhoneTime()});
  document.getElementById("conversationName").textContent=character.name;
  document.getElementById("phoneAvatar").textContent=character.name.split(/\s+/).map(part=>part[0]).join("").slice(0,2).toUpperCase();
  document.getElementById("phoneContactStatus").textContent=`LEVEL ${state.level} · LOCAL STORY BOT`;
  document.getElementById("phoneClock").textContent=currentPhoneTime();
  updatePhoneMemory(id);
  const suggestions=document.getElementById("conversationSuggestions");
  suggestions.replaceChildren();
  character.questions.forEach(question=>{
    const button=document.createElement("button");
    button.type="button";
    button.className="conversation-suggestion";
    button.textContent=question;
    button.addEventListener("click",()=>askCharacterPrompt(question));
    suggestions.appendChild(button);
  });
  renderPhoneThread(id);
  document.getElementById("phoneChatOverlay").hidden=false;
  document.getElementById("phoneHomeView").hidden=true;
  document.getElementById("phoneAppView").hidden=true;
  document.getElementById("phoneConversationView").hidden=false;
  activePhoneApp="conversation";
  document.getElementById("phoneTyping").hidden=true;
  document.getElementById("phoneMessageInput").disabled=false;
  document.querySelector("#phoneComposer button[type='submit']").disabled=false;
  showPhoneNotification(character);
  document.getElementById("phoneMessageInput").focus();
}
function endConversation() {
  const overlay=document.getElementById("phoneChatOverlay");
  const wasOpen=Boolean(conversationTarget)||(overlay&&!overlay.hidden);
  conversationTarget=null;
  phoneRigOpen=false;
  if (phoneRig) phoneRig.visible=false;
  overlay.hidden=true;
  document.getElementById("phoneHomeView").hidden=false;
  document.getElementById("phoneAppView").hidden=true;
  document.getElementById("phoneConversationView").hidden=true;
  document.getElementById("phoneTyping").hidden=true;
  if (equippedItemId==="phone") {
    const restore=previousHeldItem;
    previousHeldItem=null;
    if (restore&&state.inventory.some(item=>item.id===restore)) equipHeldItem(restore);
    else unequipHeldItem();
  }
  if(wasOpen) {
    updateUI();
    document.getElementById("gameCanvas").focus();
  }
}
function answerCharacterQuestion(id,question) {
  const character=characterChatbots[id];
  if (!character) return "This conversation is unavailable. Try speaking to another witness.";
  const memory=conversationHistory[id]||(conversationHistory[id]={count:0,topics:[],topicCounts:{},lastReply:"",lastTopic:"the case"});
  const normalized=question.toLowerCase().replace(/[^\p{L}\p{N}' ]/gu," ").replace(/\s+/g," ").trim();
  const recapRequest=/(?:what did you say|what did i ask|repeat|say that again|tell me again|remember what|what have we|summari[sz]e|recap|connect (?:the )?clues|what next|give me a hint)/i.test(normalized);
  if (memory.count&&recapRequest) {
    memory.count++;
    return `Let me put it together: ${memory.lastReply} That's the detail I remember about ${memory.lastTopic}.`;
  }
  let answer=character.answers.find(entry=>entry.match.test(normalized));
  const followup=/^(?:why|why did (?:that|it) happen|why is that|why was that|how|how did (?:that|it) happen|how so|tell me more|what do you mean|and then|then what|go on|can you explain|what happened(?: next)?|what about that|what about it)\??$/.test(normalized);
  if (!answer&&followup&&memory.lastTopic) answer=character.answers.find(entry=>entry.topic===memory.lastTopic);
  if (!answer&&/(?:who are you|what are you|your name|what can you do|help me)/i.test(normalized)) {
    memory.count++;
    memory.lastTopic="your role";
    memory.lastReply=`I am ${character.name}. ${character.fallback}`;
    return memory.lastReply;
  }
  if (!answer&&/(?:what do you think|who is guilty|who did it|is .* guilty|should i accuse|your theory)/i.test(normalized)) {
    const collected=state.clues.slice(-3);
    const evidence=collected.length?collected.join("; "):"the details you have asked me about";
    memory.count++;
    memory.lastTopic="the evidence";
    memory.lastReply=`I can only speak from what I witnessed. Your case file currently includes ${evidence}. Compare that with the other witnesses and records before deciding who is responsible.`;
    return memory.lastReply;
  }
  if(!answer&&/^(?:hi|hello|hey|good morning|good evening|are you there)\b/i.test(normalized)) {
    memory.count++;
    memory.lastTopic="the conversation";
    memory.lastReply=`I am here. ${character.fallback}`;
    return memory.lastReply;
  }
  if(!answer&&/^(?:thanks|thank you|got it|okay|ok)\b/i.test(normalized)) {
    memory.count++;
    memory.lastTopic=memory.lastTopic||"the case";
    memory.lastReply="Take your time. Compare what I remember with the other evidence before you decide what happened.";
    return memory.lastReply;
  }
  let reply;
  if (answer) {
    const topicCount=memory.topicCounts[answer.topic]||0;
    reply=Array.isArray(answer.replies)?answer.replies[topicCount%answer.replies.length]:answer.text;
    if(answer.topic) {
      if(!memory.topics.includes(answer.topic)) memory.topics.push(answer.topic);
      memory.topicCounts[answer.topic]=topicCount+1;
      memory.lastTopic=answer.topic;
    }
    if(answer.clue) addClue(answer.clue);
  } else {
    const relevantTopic=memory.lastTopic!=="the case"?` We were just discussing ${memory.lastTopic}; if that is what you mean, ask me to tell you more.`:"";
    reply=`I want to answer carefully, but I don't remember enough to claim that. ${character.fallback}${relevantTopic}`;
    memory.lastTopic="that detail";
  }
  memory.count++;
  memory.lastReply=reply;
  return reply;
}
function sendPhoneMessage(event=null,directText="") {
  if(event) event.preventDefault();
  const id=conversationTarget;
  if(!id||state.levelComplete) return;
  const input=document.getElementById("phoneMessageInput");
  const question=(directText||input.value).trim();
  if(!question) return;
  input.value="";
  const messages=phoneThreads[id]||(phoneThreads[id]=[]);
  messages.push({sender:"player",text:question,time:currentPhoneTime()});
  appendPhoneBubble(id,messages[messages.length-1]);
  state.turn++;
  advanceTime(1);
  document.getElementById("phoneTyping").hidden=false;
  input.disabled=true;
  document.querySelector("#phoneComposer button[type='submit']").disabled=true;
  window.setTimeout(()=>{
    const reply=answerCharacterQuestion(id,question);
    messages.push({sender:"character",text:reply,time:currentPhoneTime()});
    if(conversationTarget===id) {
      appendPhoneBubble(id,messages[messages.length-1]);
      document.getElementById("phoneTyping").hidden=true;
      updatePhoneMemory(id);
      input.disabled=false;
      document.querySelector("#phoneComposer button[type='submit']").disabled=false;
      input.focus();
    }
  },420);
}
function askCharacterPrompt(question) {
  if (!conversationTarget||state.levelComplete) return;
  sendPhoneMessage(null,question);
}
function talkArtifact() {
  if (!state.memory.askedArtifact) state.info += 12;
  state.memory.askedArtifact = true;
  beginCharacterConversation("artifact","The symbols on my base have been humming since 11:03. I am part of the museum's history, not a key to be taken.");
  if (state.memory.foundObject) addClue("The artifact's brass key opens the sealed chamber below the museum");
  checkL2(); updateUI();
}
function talkKnight() {
  if (!state.memory.askedKnight) state.info += 12;
  state.memory.askedKnight = true;
  beginCharacterConversation("knight","I saw a stranger cross the gallery after closing. Long coat. Hard case. No respect for the exhibits.");
  addClue("Long-coat figure after hours with case → Egyptian wing");
  checkL2(); updateUI();
}
function talkDino() {
  if (!state.memory.askedDino) state.info += 14;
  state.memory.askedDino = true;
  beginCharacterConversation("dinosaur","At 11:03, a pulse ran through my bones. I am a museum sensor echo, not a living dinosaur—but I remember the sound.");
  addClue("EM pulse 11:03 PM woke the exhibits");
  checkL2(); updateUI();
}
function talkMuseumPortrait() {
  if (!state.memory.paintingSeen) {
    state.memory.paintingSeen = true;
    state.info += 12;
  }
  setScene("The painted scene shifts: a long coat, a hard case, and a key symbol in the sky.");
  beginCharacterConversation("museumPortrait","The pulse changed my scene. I remember a long coat, a hard case, and a key symbol—but no face.");
  addClue("Painting showed long-coat figure and key symbol");
  checkL2(); updateUI();
}
function talkPortrait() {
  if (!state.memory.portraitQuestioned) state.info += 12;
  state.memory.portraitQuestioned = true;
  const inManor = state.level === 3;
  setScene(inManor
    ? "The portrait's brass plaque reads 11:47 — the hour the Blackwood trust was changed."
    : "A portrait's brass plaque reads 11:47 — the hour the Blackwood trust changed.");
  beginCharacterConversation("portrait",inManor
    ? "The hall clock stopped at 11:47. I was moved from my place above the stairs, and I saw a long-coated figure heading toward the study."
    : "The hall clock stopped at 11:47. I remember a long-coated visitor and the hidden story behind the Blackwood trust.");
  addClue("Portrait witness places a long-coated figure near the study");
  if (inManor) {
    addClue("Portrait plaque links the manor clock to the inheritance change");
    checkL3();
  } else checkL2();
  updateUI();
}
function examinePainting() {
  state.memory.paintingSeen = true; state.info += 12;
  addMsg("ai","Painted scene shifts: long-coat figure, then the key symbol in the sky.");
  addClue("Painting showed long-coat figure and key symbol");
  checkL2(); updateUI();
}
function examineDesk() {
  state.memory.deskSearched = true; state.info += 14;
  addMsg("ai",'Note: "If exhibits wake, transfer has begun. Find original subject. Project Echo cannot finish."');
  addClue("Curator note: Project Echo; find original subject");
  checkL2(); updateUI();
}
function examineDoor() {
  state.memory.doorOpened = true;
  if (state.memory.foundObject) {
    state.location = "Underground Chamber";
    setScene("Servers. Terminal: PROJECT ECHO — SUBJECT MEMORY TRANSFER. Your face — ACTIVE.");
    addMsg("ai","Key fits. You are listed as the active subject of a memory transfer.");
    addClue("PROJECT ECHO: memory transfer; you are active subject");
    state.info += 25;
  } else addMsg("ai","Locked chamber below. Needs a specific key.");
  checkL2(); updateUI();
}
function checkL2() {
  const n = state.clues.length;
  state.objectives = [
    { text: "Question exhibits", done: state.memory.askedArtifact||state.memory.askedKnight||state.memory.askedDino },
    { text: "Search curator desk", done: state.memory.deskSearched },
    { text: "Understand Project Echo", done: state.clues.some(c=>/ECHO|transfer/i.test(c)) },
    { text: "Clues "+n+"/"+state.requiredClues, done: n>=state.requiredClues }
  ];
  if (n>=state.requiredClues && !state.levelComplete)
    addMsg("system",encounterState.active&&!encounterState.cleared
      ?"Enough clues. Repel the gallery wraith with your flashlight, then type 'leave museum'."
      :"Enough. Type 'leave museum' or 'I'm ready' when you understand.");
  updateUI();
}

// ----- Level 3 -----
function enterStudy() {
  state.memory.inStudy = true;
  state.location = "Study — Crime Scene";
  player.x = 0; player.z = -10; player.yaw = Math.PI;
  setScene("The study. Desk, letter, clock in the corner, evidence markers. This is where it happened.");
  addMsg("system","You enter the study. Crime scene tape. Examine everything.");
  if (roomHall) roomHall.visible = false;
  if (roomStudy) roomStudy.visible = true;
  updateUI();
}
function leaveStudy() {
  if(encounterState.active&&!encounterState.cleared&&!encounterState.studyObstacleVaulted) {
    addMsg("warning","The overturned table blocks the exit. Get close and press Space to vault it.");
    return;
  }
  if(encounterState.active&&!encounterState.cleared&&Math.hypot(player.x,player.z+2.2)>2.5) {
    addMsg("warning","Reach the study doorway to get back to the hall.");
    return;
  }
  if(encounterState.active&&!encounterState.cleared&&performance.now()/1000>encounterState.distractedUntil) {
    addMsg("warning","The intruder is between you and the hall. Use a signal flare to distract them, then reach the study door.");
    return;
  }
  if(encounterState.active&&!encounterState.cleared) clearEncounter("You make it back to the lit hall while the intruder is distracted. Help is on the way.");
  state.memory.inStudy = false;
  state.location = "Blackwood Manor — Grand Hall";
  player.x = 0; player.z = 6; player.yaw = Math.PI;
  setScene("Grand hall. Vale near the fireplace. Anna by the stairs. Terminal on the side table.");
  if (roomStudy) roomStudy.visible = false;
  if (roomHall) roomHall.visible = true;
  updateUI();
}
function examineClock() {
  state.memory.clockOpened = true; state.info += 15;
  addMsg("ai","Stopped at 11:47. Back panel: note — transfer window 11:30–12:00, subject must stay unconscious.");
  addClue("Transfer window 11:30–12:00; subject unconscious");
  checkL3(); updateUI();
}
function examineCrimeScene() {
  state.memory.sceneExamined = true; state.info += 16;
  setScene("Letter: \"Original subject still alive. Project Echo must be stopped before—\"");
  addMsg("ai","Prints only on the letter. Weapon wiped clean. You were framed for the words, not the strike.");
  addClue("Prints on letter only; weapon clean; letter about stopping Echo");
  checkL3(); updateUI();
}
function talkVale() {
  if (!state.memory.valeQuestioned) state.info += 12;
  state.memory.valeQuestioned = true;
  beginCharacterConversation("vale","I was in the lab from 10:30 to 11:30. I never entered the study. If you doubt me, check the records.");
  addMsg("system","Vale's left hand trembles.");
  addClue("Vale: lab alibi; hand trembles");
  checkL3(); updateUI();
}
function talkAnna() {
  if (!state.memory.annaQuestioned) state.info += 12;
  state.memory.annaQuestioned = true;
  beginCharacterConversation("anna","Around 11:40, I saw a tall figure in a long coat near the study. I could not see a face, so I will not tell you who it was.");
  addClue("Anna: long-coat at study ~11:40");
  checkL3(); updateUI();
}
function checkCCTV() {
  state.memory.cctvChecked = true; state.info += 20;
  addMsg("ai","11:40–11:52 long-coat enters study. Your room cam: you on the bed until 11:55. You could not be the killer.");
  addClue("CCTV: long-coat in study; you in room whole window");
  checkL3(); updateUI();
}
function checkL3() {
  const n = state.clues.length;
  state.objectives = [
    { text: "Enter study & examine scene/clock", done: state.memory.sceneExamined && state.memory.clockOpened },
    { text: "Question Vale and Anna", done: state.memory.valeQuestioned && state.memory.annaQuestioned },
    { text: "Check CCTV", done: state.memory.cctvChecked },
    { text: "Evidence "+n+"/"+state.requiredClues, done: n>=state.requiredClues }
  ];
  if (n>=state.requiredClues && !state.levelComplete)
    addMsg("system",encounterState.active&&!encounterState.cleared
      ?"Enough evidence. Distract the intruder, vault the table, and reach the hall before presenting your case."
      :"Enough evidence. Type 'prove my innocence' when ready.");
  updateUI();
}
function proveInnocence() {
  if (state.clues.length < state.requiredClues) { addMsg("ai","Need more evidence first."); return; }
  if(encounterState.active&&!encounterState.cleared) {
    addMsg("warning","Reach the hall safely before presenting your case. Distract the intruder with the flare, vault the overturned table, and use the study door.");
    return;
  }
  addMsg("ai","You present the full timeline. Planted key. Camera alibi. Vale breaks.");
  addMsg("character","I only needed the memory. You were supposed to stay asleep.","Dr. Adrian Vale");
  state.levelComplete = true; state.info = 98;
  addMsg("system","— CASE CLOSED — Innocence proven.");
  setTimeout(()=>showScore(3), 1600);
  updateUI();
}

// ---------- WORLD BUILD ----------
function clearWorld() {
  if (hoverOutline) {
    scene.remove(hoverOutline);
    hoverOutline.geometry.dispose();
    hoverOutline.material.dispose();
    hoverOutline = null;
  }
  if (worldGroup) {
    scene.remove(worldGroup);
    disposeObjectResources(worldGroup);
  }
  worldGroup = new THREE.Group(); scene.add(worldGroup);
  interactables = []; grabbables = []; smokeParticles = []; treeMeshes = []; footprintMeshes = []; peopleMeshes = [];
  atmosphereFields=[];
  fireFlames=[]; fireEmbers=[]; waterRipples=[]; interiorFixtures=[]; interiorSwitchMesh=null;
  interiorLightsOn=false; hillMesh = null; fireLight = null; roomStudy = null; roomHall = null; heldObject = null;
  encounterState={level:0,threat:null,active:false,cleared:false,progress:0,distractedUntil:0,failed:false,studyObstacleVaulted:false};
  vaultObstacles=[];vaultJumpTimer=0;
  clearHeldTool();
  const rm = []; scene.traverse(o => { if (o.isLight && o !== flashlight) rm.push(o); });
  rm.forEach(l => scene.remove(l));
}
function disposeObjectResources(root) {
  const disposedTextures = new Set();
  root.traverse(o => {
    if (o.geometry) o.geometry.dispose();
    if (!o.material) return;
    const materials = Array.isArray(o.material) ? o.material : [o.material];
    materials.forEach(material => {
      Object.values(material).forEach(value => {
        if (value && value.isTexture && !disposedTextures.has(value)) {
          disposedTextures.add(value);
          value.dispose();
        }
      });
      material.dispose();
    });
  });
}
function addInt(mesh, id, label, grabbable) {
  mesh.userData.id = id; mesh.userData.label = label;
  mesh.userData.grabbable = !!grabbable;
  interactables.push(mesh); worldGroup.add(mesh);
  if (grabbable) grabbables.push(mesh);
}
function addInteriorFixture(light,intensity,bulb=null) {
  light.intensity=0;
  scene.add(light);
  interiorFixtures.push({light,intensity,bulb});
}
function addAtmosphereField(count,color,width,depth,height,opacity) {
  const mesh = new THREE.InstancedMesh(
    new THREE.SphereGeometry(0.025,6,6),
    new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false}),
    count
  );
  mesh.frustumCulled=false;
  const particles = [];
  const transform = new THREE.Object3D();
  for(let i=0;i<count;i++) {
    const particle = {
      x:(Math.random()-0.5)*width,
      y:0.4+Math.random()*height,
      z:(Math.random()-0.5)*depth,
      speed:0.08+Math.random()*0.13,
      scale:0.55+Math.random()*0.8,
      phase:Math.random()*Math.PI*2
    };
    particles.push(particle);
    transform.position.set(particle.x,particle.y,particle.z);
    transform.scale.setScalar(particle.scale);
    transform.updateMatrix();
    mesh.setMatrixAt(i,transform.matrix);
  }
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  worldGroup.add(mesh);
  atmosphereFields.push({mesh,particles,width,depth,height,transform});
}
function createWallSwitch(x,z,label,parent=worldGroup,rotationY=Math.PI) {
  const device=new THREE.Group();
  const plate=box(0.48,0.64,0.12,0x5d4830,0,0,0);
  plate.material.metalness=0.48; plate.material.roughness=0.38;
  const inset=box(0.32,0.45,0.04,0x252624,0,0,0.08);
  const button=box(0.17,0.23,0.12,0xc9a45f,0,0,0.15);
  button.material.emissive.setHex(0x684624);
  device.add(plate,inset,button);
  device.position.set(x,1.55,z);
  device.rotation.y=rotationY;
  device.userData.switchButton=button;
  interiorSwitchMesh=device;
  device.userData.id="wallSwitch"; device.userData.label=label;
  interactables.push(device); parent.add(device);
}
function createVaultObstacle(level,parent=worldGroup) {
  const obstacle=new THREE.Group();
  let x=0,z=0,halfX=1.7,halfZ=0.55;
  if(level===1) {
    x=4;z=2;
    const trunk=cyl(0.26,0.31,3.8,0x513824,0,0,0,12);
    trunk.rotation.z=Math.PI/2;trunk.rotation.y=0.12;trunk.position.y=0.42;
    obstacle.add(trunk);
    for(let i=0;i<5;i++) {
      const branch=cyl(0.055,0.09,0.8,0x493522,0,0,0,7);
      branch.position.set(-1.15+i*0.55,0.72,0.15);
      branch.rotation.z=-0.68+(i%2)*0.34;
      obstacle.add(branch);
    }
    halfX=1.65;halfZ=0.55;
  } else if(level===2) {
    z=4.4;
    const crate=box(3.7,0.68,0.72,0x594a39,0,0.34,0);
    crate.rotation.y=0.08;obstacle.add(crate);
    for(let i=0;i<4;i++) {
      const shard=box(0.68,0.18,0.16,0x83745e,-1.2+i*0.8,0.78,0.06);
      shard.rotation.z=(i%2?1:-1)*0.22;obstacle.add(shard);
    }
    halfX=1.8;halfZ=0.62;
  } else {
    x=0;z=parent===roomStudy?-3.4:3.45;
    const table=box(3.7,0.42,0.82,0x49382d,0,0.76,0);
    table.rotation.z=0.08;obstacle.add(table);
    for(const side of [-1,1]) {
      const leg=box(0.13,0.72,0.13,0x342820,side*1.35,0.38,0);
      leg.rotation.z=side*0.16;obstacle.add(leg);
    }
    const runner=box(2.1,0.05,0.62,0x8c6b45,0,1.0,0);
    obstacle.add(runner);
    halfX=1.75;halfZ=0.66;
  }
  obstacle.position.set(x,0,z);
  obstacle.traverse(mesh=>{if(mesh.isMesh){mesh.castShadow=true;mesh.receiveShadow=true;}});
  parent.add(obstacle);
  vaultObstacles.push({level,x,z,halfX,halfZ});
}
function createEncounterThreat(level,parent=worldGroup) {
  const group=new THREE.Group();
  const luminous=(color,emissive,opacity=1)=>new THREE.MeshStandardMaterial({
    color,emissive,emissiveIntensity:0.72,roughness:0.82,transparent:opacity<1,opacity,depthWrite:opacity>=1
  });
  if(level===1) {
    const fur=luminous(0x26372b,0x0c190e);
    const creature=ellipsoid(0.62,0.95,0.47,0x26372b,0.9,fur);
    creature.position.y=1.18;group.add(creature);
    const head=ellipsoid(0.48,0.45,0.43,0x354735,0.9,fur);
    head.position.set(0,2.0,-0.05);group.add(head);
    for(const side of [-1,1]) {
      const arm=ellipsoid(0.17,0.72,0.2,0x26372b,0.9,fur);
      arm.position.set(side*0.59,1.25,0.03);arm.rotation.z=side*0.18;group.add(arm);
      const eye=ellipsoid(0.06,0.045,0.035,0xf5c878,0.35,
        new THREE.MeshBasicMaterial({color:0xffc15e}));
      eye.position.set(side*0.19,2.06,-0.43);group.add(eye);
      const antler=cyl(0.035,0.05,0.64,0x786948,side*0.24,2.44,-0.02,6);
      antler.rotation.z=side*0.4;group.add(antler);
    }
    const lowerFace=ellipsoid(0.26,0.11,0.08,0x111812,0.92);
    lowerFace.position.set(0,1.83,-0.42);group.add(lowerFace);
    group.position.set(8,0,-1);
  } else if(level===2) {
    const spiritMaterial=luminous(0x9ccde2,0x4ab3d2,0.56);
    const robe=new THREE.Mesh(new THREE.ConeGeometry(0.76,2.5,9,3,true),spiritMaterial);
    robe.position.y=1.35;group.add(robe);
    for(let i=0;i<3;i++) {
      const wisp=ellipsoid(0.45-i*0.07,0.32,0.4,0xa9dce5,0.4,spiritMaterial);
      wisp.position.set((i-1)*0.34,0.3+i*0.08,0.05);group.add(wisp);
    }
    const face=ellipsoid(0.43,0.47,0.35,0xa9dce5,0.45,spiritMaterial);
    face.position.y=2.48;group.add(face);
    for(const side of [-1,1]) {
      const eye=ellipsoid(0.065,0.09,0.045,0x173a53,0.3,
        new THREE.MeshBasicMaterial({color:0x91e8ff}));
      eye.position.set(side*0.15,2.5,-0.32);group.add(eye);
    }
    group.position.set(0,0,-2);
  } else {
    const coat=luminous(0x20262d,0x070b10);
    const torso=ellipsoid(0.48,0.86,0.31,0x20262d,0.96,coat);
    torso.position.y=1.3;group.add(torso);
    const hood=ellipsoid(0.38,0.44,0.34,0x151b21,0.95,coat);
    hood.position.set(0,2.23,-0.02);group.add(hood);
    const face=ellipsoid(0.24,0.29,0.14,0x5c514b,0.98);
    face.position.set(0,2.2,-0.31);group.add(face);
    for(const side of [-1,1]) {
      const arm=ellipsoid(0.16,0.68,0.18,0x20262d,0.96,coat);
      arm.position.set(side*0.47,1.3,-0.02);arm.rotation.z=side*0.12;group.add(arm);
      const leg=ellipsoid(0.19,0.55,0.23,0x1a2025,0.96,coat);
      leg.position.set(side*0.2,0.45,0.02);group.add(leg);
    }
    const scarf=new THREE.Mesh(new THREE.TorusGeometry(0.29,0.06,7,18),
      new THREE.MeshStandardMaterial({color:0x853c34,roughness:0.95}));
    scarf.position.set(0,1.91,-0.04);group.add(scarf);
    group.position.set(0,0,-1);
  }
  group.visible=false;
  group.traverse(mesh=>{if(mesh.isMesh){mesh.castShadow=true;mesh.receiveShadow=true;}});
  parent.add(group);
  const names={1:"The Ridge Stalker",2:"The Gallery Wraith",3:"The Manor Intruder"};
  encounterState={level,threat:group,active:false,cleared:false,progress:0,distractedUntil:0,failed:false,studyObstacleVaulted:false};
  encounterState.name=names[level];
}
function setEncounterHint(text) {
  const hint=document.getElementById("encounterHint");
  if(hint) hint.textContent=text;
}
function clearEncounter(message) {
  encounterState.cleared=true;
  encounterState.progress=1;
  if(encounterState.threat) encounterState.threat.visible=false;
  const title=document.getElementById("encounterTitle");
  const status=document.getElementById("encounterStatus");
  const progress=document.getElementById("encounterProgress");
  if(title) title.textContent="ROUTE CLEAR";
  if(progress) progress.style.width="100%";
  setEncounterHint("You made it through without anyone getting hurt.");
  if(message) addMsg("system",message);
}
function updateEncounter(dt,time) {
  const status=document.getElementById("encounterStatus");
  if(!status||!encounterState.threat||encounterState.level!==state.level||state.levelComplete) {
    if(status) status.hidden=true;
    return;
  }
  if(encounterState.cleared) {
    status.hidden=false;
    return;
  }
  const canActivate=state.clues.length>=2&&(state.level!==3||state.memory.inStudy);
  if(!canActivate) { status.hidden=true;return; }
  if(!encounterState.active) {
    encounterState.active=true;
    encounterState.threat.visible=true;
    status.hidden=false;
    const messages={
      1:"Movement in the tree line! Keep the flashlight on the creature and find a way around the fallen timber.",
      2:"A cold shape drifts out of the gallery. Use the flashlight to drive it back and vault the fallen display.",
      3:"Someone is blocking the study exit. The flare can create a distraction; use it, vault the debris, and reach the hall."
    };
    addMsg("warning",messages[state.level]);
  }
  status.hidden=false;
  const threat=encounterState.threat;
  const dx=player.x-threat.position.x,dz=player.z-threat.position.z;
  const distance=Math.hypot(dx,dz);
  const forwardX=-Math.sin(player.yaw),forwardZ=-Math.cos(player.yaw);
  const towardX=distance?dx/distance:0,towardZ=distance?dz/distance:0;
  const facing=forwardX*towardX+forwardZ*towardZ;
  const beamHit=state.memory.flashlightOn&&distance<11&&facing>0.72&&state.level<3;
  const distracted=performance.now()/1000<encounterState.distractedUntil;
  const title=document.getElementById("encounterTitle");
  const progress=document.getElementById("encounterProgress");
  if(title) title.textContent=distracted?"DISTRACTION ACTIVE":encounterState.name.toUpperCase();
  const phoneOverlay=document.getElementById("phoneChatOverlay");
  if(document.activeElement===document.getElementById("commandInput")||(phoneOverlay&&!phoneOverlay.hidden)) {
    setEncounterHint("Threat paused while you review clues or use the field phone");
    return;
  }
  if(beamHit) {
    encounterState.progress=Math.min(1,encounterState.progress+dt/(state.level===1?2.3:3.2));
    const away=new THREE.Vector3(-towardX,0,-towardZ);
    threat.position.addScaledVector(away,dt*1.05);
    setEncounterHint("Keep the flashlight trained on it to open the route");
  } else if(distracted) {
    setEncounterHint("DISTRACTED · GET TO THE STUDY DOOR");
  } else {
    encounterState.progress=Math.max(0,encounterState.progress-dt*0.12);
    const speed=state.level===1?1.15:state.level===2?1.48:2.05;
    if(distance>0.2) threat.position.add(new THREE.Vector3(towardX,0,towardZ).multiplyScalar(speed*dt));
    setEncounterHint(state.level===3?"Use the signal flare, then escape to the hall":"Aim the flashlight at the threat");
  }
  if(progress) progress.style.width=`${Math.round(encounterState.progress*100)}%`;
  threat.position.y=state.level===2?0.12+Math.sin(time*2.7)*0.2:0;
  threat.rotation.y=Math.atan2(player.x-threat.position.x,player.z-threat.position.z);
  const pulse=1+Math.sin(time*(state.level===2?3.2:2.1))*0.035;
  threat.scale.set(pulse,1,pulse);
  if(encounterState.progress>=1) clearEncounter(state.level===1
    ?"The flashlight holds the forest creature at bay until it slips back into the trees."
    :"The focused beam dissolves the spectral figure into the exhibit shadows.");
  if(!encounterState.failed&&distance<1.35&&!distracted) {
    encounterState.failed=true;
    status.hidden=false;
    if(title) title.textContent="RETREATING TO SAFE START";
    setEncounterHint("The encounter overwhelmed you. This level is restarting.");
    addMsg("warning","You retreat to safety. The level will restart from its beginning.");
    window.setTimeout(()=>resetLevel(state.level),1800);
  }
}
function setInteriorLights(on) {
  interiorLightsOn=on;
  interiorFixtures.forEach(({light,intensity,bulb})=>{
    light.intensity=on?intensity:0;
    if(bulb) bulb.material.emissiveIntensity=on?0.75:0.08;
  });
  if(interiorSwitchMesh) {
    const button=interiorSwitchMesh.userData.switchButton;
    button.material.color.setHex(on?0xd6be77:0x675541);
    button.material.emissive.setHex(on?0x9e782f:0x21170e);
  }
  updateDayNight();
  setScene(on?"The wall lights glow to life, revealing the room and its hidden details.":"The room falls back into shadow.");
  addMsg("system",on?"The lights switch on. Every corner is easier to inspect.":"The lights are off. The flashlight is still available.");
}
function box(w,h,d,col,x,y,z) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w,h,d), new THREE.MeshStandardMaterial({ color:col, roughness:0.78, metalness:0.06 }));
  m.position.set(x,y,z); m.castShadow=true; m.receiveShadow=true; return m;
}
function ellipsoid(rx,ry,rz,col,roughness=0.78,material=null) {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(1,16,12),
    material || new THREE.MeshStandardMaterial({ color:col, roughness })
  );
  mesh.scale.set(rx,ry,rz);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  return mesh;
}
function boneLink(parent,start,end,radius,material,endRadius=radius) {
  const from = new THREE.Vector3(...start);
  const to = new THREE.Vector3(...end);
  const direction = to.clone().sub(from);
  const mesh = new THREE.Mesh(
    new THREE.CylinderGeometry(endRadius,radius,direction.length(),9),
    material
  );
  mesh.position.copy(from).add(to).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),direction.normalize());
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}
function tiledTexture(path, repeatX, repeatY, colorMap=false) {
  const texture = new THREE.TextureLoader().load(path, undefined, undefined, error => {
    console.error(`Unable to load texture: ${path}`, error);
  });
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(repeatX,repeatY);
  texture.anisotropy = Math.min(4,renderer.capabilities.getMaxAnisotropy());
  if (colorMap) texture.encoding = THREE.sRGBEncoding;
  return texture;
}
function pbrSurface(diffusePath, normalPath, roughnessPath, repeatX, repeatY, tint=0xffffff) {
  return new THREE.MeshStandardMaterial({
    color:tint,
    map:tiledTexture(diffusePath,repeatX,repeatY,true),
    normalMap:tiledTexture(normalPath,repeatX,repeatY),
    roughnessMap:tiledTexture(roughnessPath,repeatX,repeatY),
    normalScale:new THREE.Vector2(0.72,0.72),
    roughness:0.88
  });
}
function configureShadowLight(light, bounds=30) {
  light.castShadow=true;
  light.shadow.mapSize.set(2048,2048);
  light.shadow.camera.left=-bounds;
  light.shadow.camera.right=bounds;
  light.shadow.camera.top=bounds;
  light.shadow.camera.bottom=-bounds;
  light.shadow.camera.near=0.5;
  light.shadow.camera.far=90;
  light.shadow.bias=-0.00025;
  light.shadow.radius=2;
}
function createWallpaperTexture() {
  const canvas = document.createElement("canvas");
  canvas.width = 256; canvas.height = 256;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle="#28303a"; ctx.fillRect(0,0,256,256);
  ctx.strokeStyle="rgba(178,143,95,0.24)"; ctx.lineWidth=2;
  for (let x=16;x<256;x+=32) {
    ctx.beginPath(); ctx.moveTo(x,0); ctx.lineTo(x,256); ctx.stroke();
  }
  ctx.strokeStyle="rgba(201,166,107,0.2)"; ctx.lineWidth=1.5;
  for (let y=16;y<256;y+=32) {
    for (let x=16;x<256;x+=32) {
      ctx.beginPath();
      ctx.ellipse(x,y,5,10,0,0,Math.PI*2);
      ctx.moveTo(x-7,y); ctx.quadraticCurveTo(x,y-9,x+7,y);
      ctx.quadraticCurveTo(x,y+9,x-7,y); ctx.stroke();
    }
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS=THREE.RepeatWrapping; texture.wrapT=THREE.RepeatWrapping;
  texture.repeat.set(2,1);
  texture.encoding=THREE.sRGBEncoding;
  return texture;
}
function cyl(rt,rb,h,col,x,y,z,seg=12) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt,rb,h,seg), new THREE.MeshStandardMaterial({ color:col, roughness:0.85 }));
  m.position.set(x,y,z); m.castShadow=true; return m;
}
function humanoid(x, y, z, bodyCol, label, id) {
  const g = new THREE.Group();
  const coatMaterial = new THREE.MeshStandardMaterial({ color:bodyCol, roughness:0.88 });
  const shirtMaterial = new THREE.MeshStandardMaterial({ color:0xd1c8b6, roughness:0.8 });
  const skinMaterial = new THREE.MeshStandardMaterial({ color:0xb88868, roughness:0.72 });
  const hairMaterial = new THREE.MeshStandardMaterial({ color:0x28221e, roughness:0.95 });
  const trousersMaterial = new THREE.MeshStandardMaterial({ color:0x24232a, roughness:0.92 });
  const shoeMaterial = new THREE.MeshStandardMaterial({ color:0x171516, roughness:0.82 });
  const eyeMaterial = new THREE.MeshStandardMaterial({ color:0x17191c, roughness:0.45 });
  const shirt = ellipsoid(0.26,0.47,0.18,0xd1c8b6,0.8,shirtMaterial);
  shirt.position.y = 1.25; g.add(shirt);
  const coat = ellipsoid(0.4,0.53,0.27,bodyCol,0.88,coatMaterial);
  coat.position.set(0,1.22,-0.025); g.add(coat);
  const lapel = box(0.12,0.45,0.06,0xaaa08d,0.08,1.34,-0.25);
  lapel.rotation.z = -0.18; g.add(lapel);
  const tie = box(0.055,0.43,0.035,0x5b2928,0,1.28,-0.27); g.add(tie);
  const head = ellipsoid(0.22,0.28,0.22,0xc4a882,0.68,skinMaterial);
  head.position.y=1.92; g.add(head);
  const hair = ellipsoid(0.225,0.13,0.23,0x28221e,0.95,hairMaterial);
  hair.position.set(0,2.11,0.015); g.add(hair);
  const nose = ellipsoid(0.045,0.065,0.07,0xb88868,0.72,skinMaterial);
  nose.position.set(0,1.92,-0.23); g.add(nose);
  [-1,1].forEach(side => {
    const eye = ellipsoid(0.023,0.025,0.018,0x17191c,0.45,eyeMaterial);
    eye.position.set(side*0.085,1.97,-0.199); g.add(eye);
    const leg = box(0.17,0.62,0.2,0x24232a,side*0.15,0.43,0);
    leg.material=trousersMaterial; g.add(leg);
    const shoe = ellipsoid(0.13,0.09,0.24,0x171516,0.82,shoeMaterial);
    shoe.position.set(side*0.15,0.09,-0.08); g.add(shoe);
    const arm = ellipsoid(0.115,0.38,0.13,bodyCol,0.88,coatMaterial);
    arm.position.set(side*0.4,1.2,0.01); arm.rotation.z=side*-0.14; g.add(arm);
    const hand = ellipsoid(0.09,0.11,0.08,0xb88868,0.72,skinMaterial);
    hand.position.set(side*0.43,0.83,0.01); g.add(hand);
  });
  const collar = box(0.27,0.1,0.12,0xe1d8c8,0,1.62,-0.2);
  collar.material=shirtMaterial; g.add(collar);
  g.position.set(x, y, z);
  g.userData.id = id; g.userData.label = label;
  g.userData.phase = Math.random()*Math.PI*2;
  peopleMeshes.push(g);
  interactables.push(g); worldGroup.add(g);
  return g;
}

function forestSegmentDistance(x, z, startX, startZ, endX, endZ) {
  const dx = endX-startX, dz = endZ-startZ;
  const lengthSq = dx*dx + dz*dz;
  const t = lengthSq ? Math.max(0,Math.min(1,((x-startX)*dx+(z-startZ)*dz)/lengthSq)) : 0;
  return Math.hypot(x-(startX+t*dx),z-(startZ+t*dz));
}

function forestSpotOpen(x, z, scale) {
  const clearings = [
    [0,10,5.2], [8,-9,5.2], [-10,-6,5], [-5,7,2.8]
  ];
  if (clearings.some(([cx,cz,r]) => Math.hypot(x-cx,z-cz) < r*scale)) return false;
  if (forestSegmentDistance(x,z,14,-10,14,10) < 2.7*scale) return false;
  if (forestSegmentDistance(x,z,-5.5,13,3.5,13) < 2.2*scale) return false;
  return forestSegmentDistance(x,z,1,6,7.5,-6) >= 2.3*scale;
}

function createGrassClumpGeometry() {
  const positions = [];
  const indices = [];
  for (let blade=0;blade<5;blade++) {
    const angle = blade*Math.PI*2/5;
    const dx = Math.cos(angle), dz = Math.sin(angle);
    const sx = -dz*0.055, sz = dx*0.055;
    const bx = dx*0.08, bz = dz*0.08;
    const tipX = dx*(0.2+Math.random()*0.12);
    const tipZ = dz*(0.2+Math.random()*0.12);
    const start = positions.length/3;
    positions.push(
      -sx,0,-sz, sx,0,sz,
      bx-sx*0.55,0.5,-0.04+bz-sz*0.55,
      bx+sx*0.55,0.5,-0.04+bz+sz*0.55,
      tipX,1,tipZ
    );
    indices.push(start,start+1,start+2, start+1,start+3,start+2,
      start+2,start+3,start+4);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position",new THREE.Float32BufferAttribute(positions,3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function buildForest() {
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(60,60,32,32),
    new THREE.MeshStandardMaterial({
      map: new THREE.TextureLoader().load("/assets/forest/forest_ground_diffuse_1k.jpg", undefined, undefined, error => {
        console.error("Unable to load forest floor texture.", error);
      }),
      color:0x91aa83,
      roughness:1
    })
  );
  const groundTexture = ground.material.map;
  groundTexture.wrapS = THREE.RepeatWrapping;
  groundTexture.wrapT = THREE.RepeatWrapping;
  groundTexture.repeat.set(9,9);
  groundTexture.encoding = THREE.sRGBEncoding;
  groundTexture.anisotropy = Math.min(4,renderer.capabilities.getMaxAnisotropy());
  const groundPositions = ground.geometry.attributes.position;
  for (let i=0; i<groundPositions.count; i++) {
    const x = groundPositions.getX(i), z = groundPositions.getY(i);
    groundPositions.setZ(i,Math.sin(x*0.23)*Math.cos(z*0.19)*0.035);
  }
  groundPositions.needsUpdate = true;
  ground.geometry.computeVertexNormals();
  ground.rotation.x = -Math.PI/2;
  ground.receiveShadow = true;
  worldGroup.add(ground);

  const treeLocations = [];

  for (let attempt=0; attempt<8000 && treeLocations.length<200; attempt++) {
    const angle = Math.random()*Math.PI*2;
    const radius = Math.sqrt(Math.random()*28*28);
    const tx = Math.cos(angle)*radius, tz = Math.sin(angle)*radius;
    if (!forestSpotOpen(tx,tz,1.1) ||
        treeLocations.some(([x,z]) => Math.hypot(tx-x,tz-z)<2.1)) continue;
    treeLocations.push([tx,tz]);
  }
  const leafTexture=tiledTexture("/assets/forest/island_tree_leaves_diff_1k.png",1,1,true);
  const leafAlpha=tiledTexture("/assets/forest/island_tree_leaves_alpha_1k.png",1,1);
  const leafMaterial=new THREE.MeshBasicMaterial({
    color:0xffffff,map:leafTexture,alphaMap:leafAlpha,alphaTest:0.22,side:THREE.DoubleSide
  });
  const leafGeometry=new THREE.PlaneGeometry(1,1);
  loadForestTrees(treeLocations,worldGroup,leafGeometry,leafMaterial);

  const understory = new THREE.InstancedMesh(leafGeometry,leafMaterial,3000);
  understory.castShadow=false;
  understory.receiveShadow=false;
  const understoryTransform=new THREE.Object3D();
  let understoryCount=0;
  for (let attempt=0;attempt<5000 && understoryCount<understory.count;attempt++) {
    const angle = Math.random()*Math.PI*2;
    const radius = Math.sqrt(Math.random()*28*28);
    const x = Math.cos(angle)*radius, z = Math.sin(angle)*radius;
    if (!forestSpotOpen(x,z,0.9)) continue;
    const baseAngle=Math.random()*Math.PI*2;
    for (let leaf=0;leaf<6 && understoryCount<understory.count;leaf++) {
      const rotation=baseAngle+leaf*Math.PI/3;
      understoryTransform.position.set(
        x+Math.cos(rotation)*0.12,0.28+Math.random()*0.12,z+Math.sin(rotation)*0.12
      );
      understoryTransform.rotation.set((Math.random()-0.5)*0.25,rotation,0);
      const size=0.26+Math.random()*0.18;
      understoryTransform.scale.set(size,size*1.4,1);
      understoryTransform.updateMatrix();
      understory.setMatrixAt(understoryCount,understoryTransform.matrix);
      understoryCount++;
    }
  }
  understory.count=understoryCount;
  understory.instanceMatrix.needsUpdate=true;
  worldGroup.add(understory);

  const bladeGeometry = createGrassClumpGeometry();
  const bladeMaterial = new THREE.MeshStandardMaterial({
    color:0x507d35, roughness:1, flatShading:true, side:THREE.DoubleSide
  });
  const grass = new THREE.InstancedMesh(bladeGeometry,bladeMaterial,1250);
  grass.castShadow = false;
  grass.receiveShadow = false;
  const grassTransform = new THREE.Object3D();
  const grassColors = [0x3c652c,0x527d35,0x668b3e,0x77964a];
  let bladeCount = 0;
  for (let clump=0; clump<1600 && bladeCount<grass.count; clump++) {
    const angle = Math.random()*Math.PI*2;
    const radius = Math.sqrt(Math.random()*28*28);
    const x = Math.cos(angle)*radius, z = Math.sin(angle)*radius;
    if (!forestSpotOpen(x,z,0.48)) continue;
    const height = 0.3+Math.random()*0.45;
    grassTransform.position.set(x,0.015,z);
    grassTransform.rotation.set(0,Math.random()*Math.PI*2,0);
    grassTransform.scale.set(0.65+Math.random()*0.65,height,0.65+Math.random()*0.65);
    grassTransform.updateMatrix();
    grass.setMatrixAt(bladeCount,grassTransform.matrix);
    grass.setColorAt(bladeCount,new THREE.Color(grassColors[Math.floor(Math.random()*grassColors.length)]));
    bladeCount++;
  }
  grass.count = bladeCount;
  grass.instanceMatrix.needsUpdate = true;
  if (grass.instanceColor) grass.instanceColor.needsUpdate = true;
  worldGroup.add(grass);
}

function loadForestTrees(locations, targetWorld, leafGeometry, leafMaterial) {
  const loader = new GLTFLoader();
  loader.setMeshoptDecoder(MeshoptDecoder);
  loader.load(
    "/assets/forest/fir_sapling.glb",
    gltf => {
      if (worldGroup !== targetWorld || state.level !== 1) {
        disposeObjectResources(gltf.scene);
        return;
      }
      const variants = gltf.scene.children.length ? gltf.scene.children : [gltf.scene];
      locations.forEach(([x,z],index) => {
        const tree = variants[index%variants.length].clone(true);
        tree.updateMatrixWorld(true);
        const bounds = new THREE.Box3().setFromObject(tree);
        const dimensions = bounds.getSize(new THREE.Vector3());
        if (!Number.isFinite(dimensions.y) || dimensions.y <= 0) {
          console.error("Skipping forest tree with invalid model bounds.", tree);
          return;
        }
        tree.position.x -= (bounds.min.x+bounds.max.x)/2;
        tree.position.y -= bounds.min.y;
        tree.position.z -= (bounds.min.z+bounds.max.z)/2;
        const targetHeight = 5+Math.random()*1.5;
        tree.scale.setScalar(targetHeight/dimensions.y);
        tree.traverse(object => {
          if (object.isMesh) { object.castShadow=true; object.receiveShadow=true; }
        });
        tree.updateMatrixWorld(true);
        const scaledHeight = new THREE.Box3().setFromObject(tree).getSize(new THREE.Vector3()).y;
        if (scaledHeight > 0) tree.scale.multiplyScalar(targetHeight/scaledHeight);

        const placement = new THREE.Group();
        placement.position.set(x,0,z);
        placement.rotation.y = Math.random()*Math.PI*2;
        placement.add(tree);
        const cardsPerTree=96;
        const leafCards=new THREE.InstancedMesh(leafGeometry,leafMaterial,cardsPerTree);
        leafCards.castShadow=false;
        leafCards.receiveShadow=false;
        const leafTransform=new THREE.Object3D();
        for(let leafIndex=0;leafIndex<cardsPerTree;leafIndex++) {
          const height=0.14+Math.random()*0.82;
          const crownRadius=(0.15+(1-height)*1.55)*targetHeight/5.5*Math.sqrt(Math.random());
          const angle=Math.random()*Math.PI*2;
          leafTransform.position.set(
            Math.cos(angle)*crownRadius,
            height*targetHeight,
            Math.sin(angle)*crownRadius
          );
          leafTransform.rotation.set((Math.random()-0.5)*0.55,angle+(Math.random()-0.5)*0.85,0);
          leafTransform.scale.set(
            (0.72+Math.random()*0.65)*targetHeight/5.5,
            (0.78+Math.random()*0.72)*targetHeight/5.5,
            1
          );
          leafTransform.updateMatrix();
          leafCards.setMatrixAt(leafIndex,leafTransform.matrix);
        }
        leafCards.instanceMatrix.needsUpdate=true;
        placement.add(leafCards);
        placement.userData.sway = 0.18+Math.random()*0.2;
        placement.userData.phase = Math.random()*Math.PI*2;
        placement.userData.swayAmount = 0.004+Math.random()*0.004;
        targetWorld.add(placement);
        treeMeshes.push(placement);
      });
    },
    undefined,
    error => {
      if (worldGroup !== targetWorld || state.level !== 1) return;
      console.error("Unable to load the bundled forest tree model.",error);
      addMsg("warning","The forest tree model could not be loaded. Check that the game assets are available, then restart the level.");
    }
  );
}

function buildLevel1() {
  clearWorld();
  ambientLight = new THREE.HemisphereLight(0xd5e5c5, 0x414231, 0.65); scene.add(ambientLight);
  sunLight = new THREE.DirectionalLight(0xfff0dd, 1.1); sunLight.position.set(10, 22, 14); sunLight.castShadow = true; scene.add(sunLight);
  configureShadowLight(sunLight,32);
  scene.fog = new THREE.FogExp2(0x0a100c, 0.022);

  buildForest();
  const rockTones=[0x55554b,0x625d52,0x494d46,0x71695b];
  for (let i=0;i<26;i++) {
    const rx=(Math.random()-0.5)*38, rz=(Math.random()-0.5)*38;
    if (!forestSpotOpen(rx,rz,0.7)) continue;
    const rock = new THREE.Mesh(
      new THREE.DodecahedronGeometry(1,0),
      new THREE.MeshStandardMaterial({
        color:rockTones[Math.floor(Math.random()*rockTones.length)],roughness:0.96,flatShading:true
      })
    );
    rock.scale.set(0.3+Math.random()*0.55,0.22+Math.random()*0.45,0.28+Math.random()*0.56);
    rock.rotation.set(Math.random()*0.4,Math.random()*Math.PI,Math.random()*0.4);
    rock.position.set(rx,rock.scale.y*0.68,rz); rock.castShadow=true; rock.receiveShadow=true;
    worldGroup.add(rock);
  }
  for (let i=0;i<8;i++) {
    const log=cyl(0.16,0.2,1.2+Math.random()*0.8,0x513b28,
      (Math.random()-0.5)*20,0.18,(Math.random()-0.5)*22,8);
    log.rotation.z=Math.PI/2+(Math.random()-0.5)*0.16;
    log.rotation.y=Math.random()*Math.PI;
    worldGroup.add(log);
  }

  // A broken, rocky ridgeline rather than a single sharp cone.
  const hillG = new THREE.Group();
  const rockMaterial = new THREE.MeshStandardMaterial({ color:0x494b42,roughness:0.98,flatShading:true });
  const main = new THREE.Mesh(new THREE.IcosahedronGeometry(1,1),rockMaterial);
  main.scale.set(4.9,3.4,4.3); main.position.y=1.9; hillG.add(main);
  const side = new THREE.Mesh(new THREE.DodecahedronGeometry(1,0),rockMaterial);
  side.scale.set(2.6,2.35,2.55); side.position.set(2.8,1.1,1.45); hillG.add(side);
  const side2 = new THREE.Mesh(new THREE.DodecahedronGeometry(1,0),rockMaterial);
  side2.scale.set(2.1,1.85,2.2); side2.position.set(-2.4,0.82,-1.2); hillG.add(side2);
  hillG.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
  hillG.position.set(-10, 0, -6);
  hillMesh = hillG;
  hillG.userData.id = "hill"; hillG.userData.label = "Rocky Hill — SPACE to climb";
  interactables.push(hillG); worldGroup.add(hillG);

  // Campfire, crossed logs, layered flame, sparks and drifting smoke.
  const ash=new THREE.Mesh(new THREE.CircleGeometry(0.82,28),
    new THREE.MeshStandardMaterial({color:0x30271f,roughness:1}));
  ash.rotation.x=-Math.PI/2; ash.position.set(8,0.025,-9); worldGroup.add(ash);
  for (let i=0;i<7;i++) {
    const angle=i*Math.PI*2/7;
    const stone=cyl(0.13,0.17,0.18,[0x625a4b,0x776b56,0x4c4a42][i%3],
      8+Math.cos(angle)*0.72,0.1,-9+Math.sin(angle)*0.72,9);
    stone.rotation.z=(Math.random()-0.5)*0.25; worldGroup.add(stone);
  }
  for (const angle of [-0.72,0.72]) {
    const log=cyl(0.11,0.14,1.12,0x49301e,8,0.2,-9,10);
    log.rotation.x=Math.PI/2; log.rotation.y=angle;
    log.position.set(8,0.2,-9); worldGroup.add(log);
  }
  fireLight = new THREE.PointLight(0xff6826, 2.8, 20, 1.7);
  fireLight.position.set(8, 1.0, -9); fireLight.userData.flicker=1; scene.add(fireLight);
  for (let i=0;i<5;i++) {
    const color=i===0?0x42a7c1:i<3?0xff5b25:0xffb03b;
    const flame=new THREE.Mesh(new THREE.ConeGeometry(0.23-i*0.025,0.72+i*0.12,9),
      new THREE.MeshBasicMaterial({color,transparent:true,opacity:i===0?0.8:0.82,depthWrite:false}));
    flame.position.set(8+(i-2)*0.13,0.61+(i%2)*0.07,-9+(i%3-1)*0.08);
    flame.userData.baseScale=0.8+Math.random()*0.35;
    flame.userData.phase=Math.random()*Math.PI*2;
    worldGroup.add(flame); fireFlames.push(flame);
  }
  for (let i=0;i<18;i++) {
    const ember=new THREE.Mesh(new THREE.SphereGeometry(0.025+Math.random()*0.025,6,5),
      new THREE.MeshBasicMaterial({color:i%3===0?0xffd17b:0xff6b32,transparent:true,opacity:0}));
    ember.position.set(8,0.6,-9);
    ember.userData.life=Math.random()*3; ember.userData.vy=0.55+Math.random()*0.65;
    ember.userData.vx=(Math.random()-0.5)*0.35; ember.userData.vz=(Math.random()-0.5)*0.3;
    worldGroup.add(ember); fireEmbers.push(ember);
  }
  for (let i=0;i<32; i++) {
    const p = new THREE.Mesh(new THREE.SphereGeometry(0.11+Math.random()*0.19, 7, 6),
      new THREE.MeshBasicMaterial({ color: 0x6b6861, transparent: true, opacity: 0.01,depthWrite:false }));
    p.position.set(8+(Math.random()-0.5)*0.36, 0.85+Math.random()*3.8, -9+(Math.random()-0.5)*0.36);
    p.userData.vy = 0.28 + Math.random()*0.42;
    p.userData.life = Math.random()*5;
    p.userData.drift=(Math.random()-0.5)*0.12;
    worldGroup.add(p); smokeParticles.push(p);
  }
  const campHit = box(2.4, 1.2, 2.4, 0x111, 8, 0.6, -9);
  campHit.material.transparent=true; campHit.material.opacity=0.01;
  addInt(campHit, "smoke", "Campsite / Smoke");

  const printShape=new THREE.Shape();
  printShape.moveTo(-0.13,-0.19);
  printShape.bezierCurveTo(-0.15,-0.08,-0.12,0.1,-0.1,0.19);
  printShape.bezierCurveTo(-0.05,0.27,0.07,0.28,0.12,0.19);
  printShape.bezierCurveTo(0.15,0.1,0.13,-0.1,0.12,-0.19);
  printShape.bezierCurveTo(0.09,-0.27,-0.08,-0.27,-0.13,-0.19);
  const printGeometry=new THREE.ShapeGeometry(printShape,12);
  printGeometry.rotateX(-Math.PI/2);
  for (let i=0;i<8;i++) {
    const t = i/7;
    const fx = 1 + t*6.5 + (i%2?0.2:-0.2);
    const fz = 6 - t*12;
    const fp = new THREE.Mesh(printGeometry,new THREE.MeshStandardMaterial({
      color:i%2?0x30241a:0x423126,roughness:1,transparent:true,opacity:0.88
    }));
    fp.position.set(fx,0.035+(i%3)*0.002,fz);
    fp.scale.set(i%2?-1:1,1,0.86+Math.random()*0.22);
    fp.rotation.y=-0.5+(Math.random()-0.5)*0.16;
    addInt(fp, "footprint", "Boot print");
    footprintMeshes.push(fp);
  }

  const roadShape=new THREE.Shape();
  const roadSamples=[];
  for(let i=0;i<=12;i++) {
    const z=-12+i*2;
    roadSamples.push({z,center:14+Math.sin((z+5)*0.16)*0.52,width:2.35+Math.sin(z*0.32)*0.16});
  }
  roadShape.moveTo(roadSamples[0].center-roadSamples[0].width,roadSamples[0].z);
  for(const sample of roadSamples) roadShape.lineTo(sample.center-sample.width,sample.z);
  for(let i=roadSamples.length-1;i>=0;i--)
    roadShape.lineTo(roadSamples[i].center+roadSamples[i].width,roadSamples[i].z);
  roadShape.closePath();
  const road=new THREE.Mesh(new THREE.ShapeGeometry(roadShape,24),new THREE.MeshStandardMaterial({
    color:0x65513b,roughness:1,side:THREE.DoubleSide
  }));
  road.rotation.x=-Math.PI/2; road.position.y=0.035; road.receiveShadow=true;
  road.userData.interactionRoot=true;
  addInt(road,"road","Dirt Road — tire tracks");
  for(const side of [-1,1]) {
    const track=new THREE.Mesh(new THREE.PlaneGeometry(0.34,24),
      new THREE.MeshStandardMaterial({color:0x332a20,roughness:1,transparent:true,opacity:0.6}));
    track.rotation.x=-Math.PI/2; track.position.set(14+side*0.78,0.046,0.15);
    track.rotation.z=side*0.015; worldGroup.add(track);
  }
  for(let i=0;i<110;i++) {
    const sample=roadSamples[Math.floor(Math.random()*roadSamples.length)];
    const gravel=new THREE.Mesh(new THREE.DodecahedronGeometry(0.06+Math.random()*0.09,0),
      new THREE.MeshStandardMaterial({color:[0x80705a,0x443a2e,0x97866d][i%3],roughness:1,flatShading:true}));
    gravel.position.set(sample.center+(Math.random()-0.5)*sample.width*1.7,0.05,sample.z+(Math.random()-0.5)*1.5);
    gravel.scale.set(1,0.3,0.7); gravel.rotation.y=Math.random()*Math.PI;
    worldGroup.add(gravel);
  }
  const th = box(3.5, 2.5, 3.5, 0x111, -5, 1.2, 7); th.material.transparent=true; th.material.opacity=0.01;
  addInt(th, "trees", "Dense Trees — trail");
  const streamShape=new THREE.Shape();
  const streamCenters=[];
  for(let i=0;i<=14;i++) streamCenters.push({x:-7+i*0.85,z:13+Math.sin(i*0.55)*0.55,width:0.72+Math.sin(i*0.8)*0.1});
  streamShape.moveTo(streamCenters[0].x,streamCenters[0].z-streamCenters[0].width);
  for(const sample of streamCenters) streamShape.lineTo(sample.x,sample.z-sample.width);
  for(let i=streamCenters.length-1;i>=0;i--) streamShape.lineTo(streamCenters[i].x,streamCenters[i].z+streamCenters[i].width);
  streamShape.closePath();
  const stream=new THREE.Mesh(new THREE.ShapeGeometry(streamShape,28),
    new THREE.MeshPhysicalMaterial({color:0x4e9a9b,roughness:0.16,metalness:0.12,transparent:true,opacity:0.86,side:THREE.DoubleSide}));
  stream.rotation.x=-Math.PI/2; stream.position.set(0,0.055,26);
  addInt(stream,"stream","Clear running stream");
  for(let i=1;i<streamCenters.length-1;i+=2) {
    const sample=streamCenters[i];
    const ripple=new THREE.Mesh(new THREE.TorusGeometry(0.28,0.012,5,20),
      new THREE.MeshBasicMaterial({color:0xb2e0d6,transparent:true,opacity:0.34}));
    ripple.rotation.x=Math.PI/2; ripple.position.set(sample.x,0.07,sample.z);
    ripple.userData.phase=Math.random()*Math.PI*2; worldGroup.add(ripple); waterRipples.push(ripple);
  }
  for(let i=0;i<44;i++) {
    const sample=streamCenters[Math.floor(Math.random()*streamCenters.length)];
    const pebble=new THREE.Mesh(new THREE.DodecahedronGeometry(0.1+Math.random()*0.16,0),
      new THREE.MeshStandardMaterial({color:[0x716c5f,0x8a806e,0x545750][i%3],roughness:1,flatShading:true}));
    pebble.position.set(sample.x+(Math.random()-0.5)*1.9,0.07,sample.z+(Math.random()-0.5)*2);
    pebble.scale.set(1.3,0.45,0.8); worldGroup.add(pebble);
  }

  // Grabbable: stick, stone
  const stick = box(0.08, 0.08, 0.7, 0x5a3a20, 1.5, 0.2, 8);
  stick.rotation.z = 0.3; addInt(stick, "stick", "Fallen stick", true);
  const stone = box(0.25, 0.15, 0.2, 0x666660, -1, 0.12, 9); addInt(stone, "stone", "Sharp stone", true);

  player = { x:0, y:1.6, z:10, yaw:-0.36, pitch:0, onGround:true };
  createVaultObstacle(1);
  createEncounterThreat(1);
  state.hour=14; state.minute=32; updateDayNight();
}

function buildLevel2() {
  clearWorld();
  interiorLightsOn=false;
  ambientLight = new THREE.HemisphereLight(0x3b526a, 0x292019, 0.9); scene.add(ambientLight);
  sunLight = new THREE.DirectionalLight(0xb8c5df, 0.48); sunLight.position.set(0,12,4); scene.add(sunLight);
  configureShadowLight(sunLight,24);
  const spot = new THREE.SpotLight(0xffd8a1, 2.1, 32, Math.PI/4.5, 0.5, 1.4);
  spot.position.set(0, 9, 2); spot.target.position.set(0,0,-6); addInteriorFixture(spot,4.5); scene.add(spot.target);
  const coolLight = new THREE.PointLight(0x6986b2, 2.4, 20);
  coolLight.position.set(-8,4,1); addInteriorFixture(coolLight,2.4);
  const goldLight = new THREE.PointLight(0xe6a75a, 3.2, 18);
  goldLight.position.set(-7,3,-8); addInteriorFixture(goldLight,3.2);
  const redLight = new THREE.PointLight(0xd75a37, 1.4, 16);
  redLight.position.set(0,3,-11); addInteriorFixture(redLight,1.4);
  scene.fog = new THREE.Fog(0x0c0a08, 10, 32);
  addAtmosphereField(54,0xe5c78b,26,26,7.2,0.3);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(32,32),
    pbrSurface("/assets/interiors/marble_diff_1k.jpg","/assets/interiors/marble_normal_1k.jpg",
      "/assets/interiors/marble_roughness_1k.jpg",8,8,0x77736e)
  );
  floor.rotation.x = -Math.PI/2; floor.receiveShadow = true; worldGroup.add(floor);

  const wm = new THREE.MeshStandardMaterial({ color:0x26303a, roughness:0.88 });
  [[0,5,-13],[0,5,13],[-14,5,0],[14,5,0]].forEach((p,i)=>{
    const w=new THREE.Mesh(new THREE.PlaneGeometry(32,11),wm); w.position.set(...p);
    if(i>=2)w.rotation.y=Math.PI/2*(i===2?1:-1); if(i===1)w.rotation.y=Math.PI; worldGroup.add(w);
    const skirting = box(i<2?32:0.35,0.42,i<2?0.32:32,0x4b3426,
      p[0],0.22,p[2]);
    worldGroup.add(skirting);
  });
  worldGroup.add(box(32,0.35,32,0x191d24,0,9,-1));
  for (let i=-2;i<=2;i++) if(i) {
    const x=i*5.5;
    worldGroup.add(cyl(0.49,0.53,8,0x6d6251,x,4,-11,20));
    worldGroup.add(cyl(0.72,0.68,0.34,0x82735c,x,0.2,-11,20));
    worldGroup.add(cyl(0.67,0.57,0.3,0x82735c,x,7.85,-11,20));
    worldGroup.add(cyl(0.56,0.56,0.12,0xb09868,x,0.42,-11,20));
    worldGroup.add(cyl(0.56,0.56,0.12,0xb09868,x,7.58,-11,20));
  }
  for (let i=-2;i<=2;i++) worldGroup.add(box(28,0.24,0.42,0x392b21,0,8.45,i*4));

  const goldMaterial = new THREE.MeshStandardMaterial({ color:0xc99c52, metalness:0.68, roughness:0.3 });
  const stoneMaterial = new THREE.MeshStandardMaterial({ color:0x8a7860, roughness:0.78 });
  const glassMaterial = new THREE.MeshStandardMaterial({
    color:0x9cc4d1, metalness:0.18, roughness:0.15, transparent:true, opacity:0.14, depthWrite:false
  });
  const glassCabinet=(x,z,width,height,depth)=>{
    const cabinet=new THREE.Group();
    const glassPanel=(w,h,d,px,py,pz)=>{
      const panel=box(w,h,d,0xffffff,px,py,pz);
      panel.material=glassMaterial; cabinet.add(panel);
    };
    glassPanel(0.055,height,depth,-width/2,height/2,0);
    glassPanel(0.055,height,depth,width/2,height/2,0);
    glassPanel(width,height,0.055,0,height/2,-depth/2);
    glassPanel(width,height,0.055,0,height/2,depth/2);
    glassPanel(width,0.045,depth,0,height,0);
    const frame=new THREE.MeshStandardMaterial({color:0x8b754f,metalness:0.56,roughness:0.38});
    for(const sx of [-1,1]) for(const sz of [-1,1]) {
      const post=new THREE.Mesh(new THREE.BoxGeometry(0.07,height+0.05,0.07),frame);
      post.position.set(sx*width/2,height/2,sz*depth/2); cabinet.add(post);
    }
    const trim=new THREE.Mesh(new THREE.BoxGeometry(width+0.08,0.08,depth+0.08),frame);
    trim.position.y=height; cabinet.add(trim);
    cabinet.position.set(x,0,z); worldGroup.add(cabinet);
  };
  const pedestal = (x,z) => {
    worldGroup.add(box(1.8,1.25,1.8,0x302820,x,0.62,z));
    worldGroup.add(box(2.05,0.12,2.05,0x8a7046,x,1.3,z));
    worldGroup.add(box(1.92,0.14,1.92,0x17191e,x,1.4,z));
  };

  pedestal(-7,-8);
  const artifact = new THREE.Group();
  const vaseProfile = [
    new THREE.Vector2(0.16,0),new THREE.Vector2(0.28,0.12),new THREE.Vector2(0.42,0.4),
    new THREE.Vector2(0.34,0.68),new THREE.Vector2(0.2,0.82),new THREE.Vector2(0.18,1.02),
    new THREE.Vector2(0.28,1.06),new THREE.Vector2(0.28,1.14),new THREE.Vector2(0.14,1.16)
  ];
  const vase = new THREE.Mesh(new THREE.LatheGeometry(vaseProfile,20),goldMaterial);
  vase.position.set(0,1.48,0); vase.castShadow=true; artifact.add(vase);
  const vaseNeck = cyl(0.19,0.24,0.08,0x8f5f2a,0,2.48,0,20);
  artifact.add(vaseNeck);
  const emblem = new THREE.Mesh(new THREE.TorusGeometry(0.2,0.035,8,20),goldMaterial);
  emblem.position.set(0,2.02,0.35); artifact.add(emblem);
  artifact.position.set(-7,0,-8);
  addInt(artifact,"artifact","Egyptian Artifact");
  artifact.userData.bob=2; artifact.userData.baseY=0;
  glassCabinet(-7,-8,2.5,4.05,2.2);

  pedestal(7,-8);
  const knight = new THREE.Group();
  const armor = new THREE.MeshStandardMaterial({ color:0x77818a, metalness:0.76, roughness:0.28 });
  const darkArmor = new THREE.MeshStandardMaterial({ color:0x303943, metalness:0.48, roughness:0.42 });
  const helm = ellipsoid(0.33,0.38,0.3,0x77818a,0.28,armor);
  helm.position.set(7,3.08,-8); knight.add(helm);
  knight.add(box(0.47,0.18,0.08,0x252c34,7,3.06,-8.29));
  knight.add(ellipsoid(0.49,0.65,0.32,0x77818a,0.3,armor).translateY(2.15).translateX(7).translateZ(-8));
  knight.add(box(0.16,0.7,0.12,0x9b8051,7,2.02,-8.36));
  for (const side of [-1,1]) {
    knight.add(ellipsoid(0.23,0.24,0.24,0x68737e,0.3,armor).translateX(7+side*0.44).translateY(2.52).translateZ(-8));
    knight.add(ellipsoid(0.17,0.5,0.2,0x555f69,0.35,armor).translateX(7+side*0.17).translateY(1.42).translateZ(-8));
    knight.add(ellipsoid(0.13,0.4,0.14,0x29313a,0.45,darkArmor).translateX(7+side*0.17).translateY(0.28).translateZ(-8));
    knight.add(box(0.23,0.2,0.24,0x69737b,7+side*0.17,0.88,-7.98));
    knight.add(box(0.28,0.24,0.29,0x69737b,7+side*0.17,2.52,-7.96));
  }
  const cloak = ellipsoid(0.47,0.83,0.17,0x482733,0.82);
  cloak.position.set(7,1.85,-8.44); knight.add(cloak);
  const breastplate = new THREE.Mesh(new THREE.TorusGeometry(0.28,0.025,6,24),
    new THREE.MeshStandardMaterial({color:0xd9b96d,metalness:0.78,roughness:0.27}));
  breastplate.scale.set(1,1.2,0.4); breastplate.position.set(7,2.2,-7.66); knight.add(breastplate);
  for(let row=0;row<3;row++) for(let col=0;col<3;col++) {
    const rivet=ellipsoid(0.035,0.035,0.025,0xe2c37b,0.28);
    rivet.position.set(6.88+col*0.12,1.93+row*0.13,-7.66);
    knight.add(rivet);
  }
  const shield = box(0.62,0.92,0.18,0x753941,6.32,1.72,-7.7);
  shield.rotation.z=-0.08; knight.add(shield);
  const shieldBorder = new THREE.Mesh(new THREE.TorusGeometry(0.32,0.028,6,4),
    new THREE.MeshStandardMaterial({color:0xd2ae68,metalness:0.72,roughness:0.29}));
  shieldBorder.scale.set(0.95,1.42,0.4); shieldBorder.position.set(6.32,1.73,-7.59); knight.add(shieldBorder);
  const shieldMark = ellipsoid(0.11,0.27,0.045,0xe0c27c,0.28);
  shieldMark.position.set(6.32,1.74,-7.58); knight.add(shieldMark);
  const sword = box(0.075,1.55,0.07,0xb7c4c6,7.88,1.76,-7.7);
  sword.rotation.z=0.11; knight.add(sword);
  knight.add(box(0.43,0.09,0.11,0xb79456,7.88,1.13,-7.67));
  knight.add(box(0.11,0.32,0.11,0x49332a,7.88,0.95,-7.68));
  const visor = box(0.4,0.16,0.035,0x172129,7,3.03,-7.69);
  knight.add(visor);
  const visorGlowMaterial = new THREE.MeshStandardMaterial({
    color:0xf0b95d,emissive:0x943d18,emissiveIntensity:0.65,roughness:0.38
  });
  for(const eyeX of [6.9,7.1]) {
    const eye=box(0.075,0.025,0.025,0xe7a94a,eyeX,3.05,-7.66);
    eye.material=visorGlowMaterial; knight.add(eye);
  }
  const plume = new THREE.Mesh(new THREE.ConeGeometry(0.12,0.8,9),new THREE.MeshStandardMaterial({color:0x9d3542,roughness:0.7}));
  plume.position.set(7,3.56,-8.06); knight.add(plume);
  const helmetCrest = new THREE.Mesh(new THREE.TorusGeometry(0.27,0.025,6,22),
    new THREE.MeshStandardMaterial({color:0xd1ad68,metalness:0.76,roughness:0.3}));
  helmetCrest.position.set(7,3.25,-8.01); knight.add(helmetCrest);
  knight.userData.visorGlow = visorGlowMaterial;
  addInt(knight,"knight","Medieval Knight");
  glassCabinet(7,-8,2.7,4.15,2.35);

  const dinosaur = new THREE.Group();
  const bone = new THREE.MeshStandardMaterial({ color:0xb5a27e, roughness:0.8 });
  for (let i=0;i<15;i++) {
    const x=-3.9+i*0.39;
    const size=0.18-Math.max(0,-x-1.6)*0.024;
    const vertebra = ellipsoid(size,0.13,size,0xb5a27e,0.8,bone);
    vertebra.position.set(x,2.18,-11); dinosaur.add(vertebra);
  }
  const skull = ellipsoid(0.72,0.43,0.48,0xb5a27e,0.78,bone);
  skull.position.set(2.1,2.42,-11); dinosaur.add(skull);
  const snout=ellipsoid(0.5,0.23,0.38,0xa49170,0.78,bone);
  snout.position.set(2.55,2.26,-10.78); dinosaur.add(snout);
  const jaw = box(0.9,0.14,0.65,0x8e7c61,2.35,2.03,-11.05); dinosaur.add(jaw);
  const toothMaterial=new THREE.MeshStandardMaterial({color:0xe2d6b7,roughness:0.72});
  for(let tooth=0;tooth<6;tooth++) {
    const fang=new THREE.Mesh(new THREE.ConeGeometry(0.045,0.16,7),toothMaterial);
    fang.position.set(2.05+tooth*0.15,2.1,-10.57);
    fang.rotation.z=Math.PI; dinosaur.add(fang);
  }
  const eyeSocketMaterial = new THREE.MeshStandardMaterial({color:0x171715,roughness:0.75});
  for (const side of [-1,1]) {
    for(let ribIndex=0;ribIndex<5;ribIndex++) {
      const rib = new THREE.Mesh(new THREE.TorusGeometry(0.47,0.045,7,16,Math.PI),bone);
      rib.position.set(-0.82+ribIndex*0.33,2.05,-11+side*0.1);
      rib.rotation.z=Math.PI; rib.scale.set(0.86,1.06,0.75); dinosaur.add(rib);
    }
    const eye = ellipsoid(0.09,0.085,0.055,0x17202b,0.75,eyeSocketMaterial);
    eye.position.set(2.19+side*0.2,2.53,-10.56); dinosaur.add(eye);
    boneLink(dinosaur,[1.55,2.13,-11+side*0.12],[1.94,1.8,-11+side*0.22],0.07,bone,0.06);
  }
  boneLink(dinosaur,[-1.42,1.96,-11],[-1.72,1.14,-11],0.12,bone,0.1);
  boneLink(dinosaur,[0.25,1.96,-11],[0.63,1.15,-11],0.12,bone,0.1);
  boneLink(dinosaur,[-1.72,1.14,-11],[-1.38,0.31,-11],0.09,bone,0.11);
  boneLink(dinosaur,[0.63,1.15,-11],[0.9,0.31,-11],0.09,bone,0.11);
  dinosaur.add(ellipsoid(0.42,0.23,0.36,0xb5a27e,0.82,bone).translateX(-1.02).translateY(1.91).translateZ(-11));
  for(let tail=0;tail<9;tail++) {
    const x=-2.3-tail*0.29, scale=0.14-tail*0.009;
    const joint=ellipsoid(scale,scale*0.82,scale,0x9b896d,0.82,bone);
    joint.position.set(x,1.72-tail*0.015,-11); dinosaur.add(joint);
  }
  for(const footX of [-1.4,0.88]) for(const toe of [-1,0,1]) {
    const toeBone=new THREE.Mesh(new THREE.ConeGeometry(0.075,0.23,7),bone);
    toeBone.rotation.z=Math.PI/2;
    toeBone.position.set(footX+0.13,0.17,-10.96+toe*0.13);
    dinosaur.add(toeBone);
  }
  dinosaur.add(cyl(0.075,0.11,1.25,0xb5a27e,-1.45,0.78,-11,10));
  dinosaur.add(cyl(0.075,0.11,1.3,0xb5a27e,0.75,0.75,-11,10));
  addInt(dinosaur,"dinosaur","Dinosaur Skeleton");
  glassCabinet(0.45,-11,5.8,3.35,2.45);

  const painting = new THREE.Group();
  painting.add(box(2.85,2.12,0.14,0x8b6840,11,3.25,-3));
  painting.add(box(2.55,1.84,0.1,0x26363c,11,3.25,-2.91));
  const paintedMoon = ellipsoid(0.32,0.32,0.03,0xc5a55e,0.8);
  paintedMoon.position.set(11.55,3.67,-2.84); painting.add(paintedMoon);
  const silhouette = new THREE.Mesh(new THREE.ConeGeometry(0.42,1.3,7),new THREE.MeshStandardMaterial({color:0x151c22,roughness:1}));
  silhouette.position.set(10.72,2.95,-2.84); painting.add(silhouette);
  for (const [x,y,w,h] of [[11,4.3,2.85,0.1],[11,2.2,2.85,0.1],[9.62,3.25,0.1,2.2],[12.38,3.25,0.1,2.2]]) {
    painting.add(box(w,h,0.18,0x967443,x,y,-2.84));
  }
  addInt(painting,"painting","Suspicious Painting");

  const door = new THREE.Group();
  door.add(box(2.15,3.1,0.3,0x59412d,-12.5,1.55,2));
  door.add(box(1.82,2.78,0.12,0x32261e,-12.5,1.57,1.78));
  door.add(box(1.5,2.35,0.1,0x4b3828,-12.5,1.52,1.68));
  door.add(cyl(0.09,0.09,0.09,0xc99c52,-11.92,1.45,1.59,12));
  for (const y of [0.08,3.08]) door.add(box(2.5,0.18,0.55,0x967443,-12.5,y,2));
  addInt(door,"door","Service Door / Chamber");

  const desk = new THREE.Group();
  desk.add(box(3.15,0.25,1.55,0x493124,3.5,1.12,6));
  desk.add(box(3.25,0.12,1.65,0x8a6842,3.5,1.29,6));
  for (const x of [2.3,4.7]) for (const z of [5.45,6.55]) desk.add(box(0.16,1,0.16,0x30231c,x,0.52,z));
  desk.add(box(1.05,0.38,0.9,0x30231c,3.5,0.8,5.95));
  desk.add(box(0.78,0.05,0.5,0x493124,3.5,0.9,5.48));
  addInt(desk,"desk","Curator's Desk");

  // Grabbable note on desk
  const note = box(0.35,0.02,0.25,0xe8e0d0,3.2,1.05,6.2);
  note.rotation.y = -0.22;
  addInt(note,"note","Handwritten note", true);
  note.userData.onGrab = () => { if (!state.memory.deskSearched) examineDesk(); };

  for (let i=0;i<4;i++) {
    const x=-6+i*3.5,z=1;
    const caseGroup=new THREE.Group();
    caseGroup.add(box(1.45,0.12,1.05,0x4b3b2a,x,0.08,z));
    caseGroup.add(box(1.45,0.1,1.05,0x8b754f,x,1.62,z));
    const goldRelic=new THREE.MeshStandardMaterial({color:0xc39b50,metalness:0.68,roughness:0.32});
    const stoneRelic=new THREE.MeshStandardMaterial({color:i===1?0x927e61:0x777263,roughness:0.88});
    if(i===0) {
      const miniVase=new THREE.Mesh(new THREE.LatheGeometry([
        new THREE.Vector2(0.08,0),new THREE.Vector2(0.18,0.08),new THREE.Vector2(0.23,0.28),
        new THREE.Vector2(0.14,0.42),new THREE.Vector2(0.11,0.58),new THREE.Vector2(0.2,0.62)
      ],14),goldRelic);
      miniVase.position.set(x-0.25,0.22,z); miniVase.castShadow=true; caseGroup.add(miniVase);
      caseGroup.add(cyl(0.025,0.025,0.25,0x8b693d,x+0.3,0.36,z+0.1,8));
    } else if(i===1) {
      const mask=ellipsoid(0.32,0.38,0.16,0x786344,0.62,goldRelic);
      mask.position.set(x,0.65,z); caseGroup.add(mask);
      for(const eyeX of [-0.12,0.12]) {
        const eye=new THREE.Mesh(new THREE.SphereGeometry(0.045,8,6),
          new THREE.MeshStandardMaterial({color:0x201b17,roughness:0.8}));
        eye.position.set(x+eyeX,0.7,z+0.145); caseGroup.add(eye);
      }
    } else if(i===2) {
      const tablet=box(0.48,0.72,0.13,0x887a60,x,0.55,z);
      tablet.material=stoneRelic; tablet.rotation.z=-0.12; caseGroup.add(tablet);
      for(let row=0;row<4;row++) caseGroup.add(box(0.2,0.018,0.012,0x3b3023,x,0.76-row*0.13,z+0.08));
    } else {
      const bust=ellipsoid(0.26,0.36,0.22,0x777263,0.84,stoneRelic);
      bust.position.set(x,0.62,z); caseGroup.add(bust);
      const head=ellipsoid(0.22,0.24,0.2,0x777263,0.84,stoneRelic);
      head.position.set(x,1.08,z); caseGroup.add(head);
      caseGroup.add(box(0.65,0.05,0.42,0xb2935e,x,0.25,z));
    }
    for (const dx of [-0.68,0.68]) for (const dz of [-0.48,0.48]) {
      caseGroup.add(cyl(0.035,0.035,1.52,0x8b754f,x+dx,0.85,z+dz,8));
    }
    const glass=box(1.3,1.42,0.88,0xffffff,x,0.86,z);
    glass.material=glassMaterial; caseGroup.add(glass);
    addInt(caseGroup,"case","Illuminated display case");
  }

  for (const x of [-10,0,10]) {
    const ceilingLamp = new THREE.Group();
    ceilingLamp.add(cyl(0.08,0.08,0.6,0x8f744a,x,8.2,3,10));
    const bulb=new THREE.Mesh(new THREE.SphereGeometry(0.28,12,8),new THREE.MeshStandardMaterial({
      color:0xffd38a,emissive:0xffa83d,emissiveIntensity:0.7,roughness:0.35
    }));
    bulb.position.set(x,7.85,3); ceilingLamp.add(bulb);
    worldGroup.add(ceilingLamp);
    const lamp = new THREE.PointLight(0xffc978,2.6,16);
    lamp.position.set(x,7.4,3); addInteriorFixture(lamp,2.6,bulb);
  }
  const entranceWall=new THREE.Mesh(new THREE.PlaneGeometry(3.1,3.2),
    new THREE.MeshStandardMaterial({color:0x303a40,roughness:0.9}));
  entranceWall.position.set(-2.4,1.6,8.86); worldGroup.add(entranceWall);
  worldGroup.add(box(3.2,0.22,0.16,0x56412e,-2.4,0.12,8.84));
  createWallSwitch(-2.4,8.74,"Brass Museum Light Switch",worldGroup,0);

  player={x:0,y:1.6,z:10,yaw:0,pitch:0,onGround:true};
  createVaultObstacle(2);
  createEncounterThreat(2);
  state.hour=23; state.minute=42; updateDayNight();
}

function buildLevel3() {
  clearWorld();
  interiorLightsOn=false;
  ambientLight = new THREE.HemisphereLight(0x8292a3,0x30211c,0.78); scene.add(ambientLight);
  sunLight = new THREE.DirectionalLight(0x7187a6,0.48); sunLight.position.set(2,10,3); scene.add(sunLight);
  configureShadowLight(sunLight,22);
  const hearthLight = new THREE.PointLight(0xff7137,2.4,17,1.7);
  hearthLight.position.set(7.6,2.1,-0.6); scene.add(hearthLight);
  const deskLight = new THREE.PointLight(0xffc16b,3.2,14,1.8);
  deskLight.position.set(1.5,2.7,-9); addInteriorFixture(deskLight,3.2);
  const windowLight = new THREE.PointLight(0x6d8ab8,2,18,1.5);
  windowLight.position.set(-7,3,3); addInteriorFixture(windowLight,2);
  scene.fog = new THREE.Fog(0x080b12,11,34);
  addAtmosphereField(38,0xa9c4df,19,17,4.8,0.24);
  addAtmosphereField(22,0xe2a878,19,17,3.8,0.22);

  // HALL group
  roomHall = new THREE.Group(); worldGroup.add(roomHall);
  const floorH = new THREE.Mesh(
    new THREE.PlaneGeometry(22,18),
    pbrSurface("/assets/interiors/wood_floor_diff_1k.jpg","/assets/interiors/wood_floor_normal_1k.jpg",
      "/assets/interiors/wood_floor_roughness_1k.jpg",5,4,0x807166)
  );
  floorH.rotation.x = -Math.PI/2; floorH.receiveShadow = true; roomHall.add(floorH);
  const wm = new THREE.MeshStandardMaterial({
    color:0x8a8180,roughness:0.92,map:createWallpaperTexture(),side:THREE.DoubleSide
  });
  [[0,5,8],[0,5,-2],[-10,5,3],[10,5,3]].forEach((p,i)=>{
    const w=new THREE.Mesh(new THREE.PlaneGeometry(i<2?22:16,10),wm); w.position.set(...p);
    if(i>=2)w.rotation.y=Math.PI/2*(i===2?1:-1); if(i===0)w.rotation.y=Math.PI; roomHall.add(w);
    roomHall.add(box(i<2?22:0.32,0.42,i<2?0.32:16,0x413029,p[0],0.22,p[2]));
    roomHall.add(box(i<2?22:0.28,0.2,i<2?0.26:16,0x6f5540,p[0],4.82,p[2]));
  });
  roomHall.add(box(22,0.35,18,0x17151a,0,5,-0.8));
  const rug = box(7,0.035,4.4,0x482532,0,0.025,3);
  roomHall.add(rug);
  for (const [x,z,w,d] of [[0,0.82,7,0.08],[0,5.18,7,0.08],[-3.45,3,0.08,4.4],[3.45,3,0.08,4.4]]) {
    roomHall.add(box(w,0.025,d,0xb48c52,x,0.05,z));
  }
  roomHall.add(box(8,0.08,0.18,0x75523b,0,0.08,7.88));
  roomHall.add(box(8,0.08,0.18,0x75523b,0,0.08,-1.88));

  const fireplace = new THREE.Group();
  fireplace.add(box(2.7,3.5,0.65,0x393034,8.65,1.8,-0.25));
  fireplace.add(box(1.6,1.8,0.22,0x100f13,8.65,0.92,-0.62));
  fireplace.add(box(3.2,0.24,0.82,0x886648,8.65,3.62,-0.25));
  fireplace.add(box(2.1,0.16,0.5,0x70533e,8.65,0.12,-0.25));
  for (let i=0;i<3;i++) {
    const flame=new THREE.Mesh(new THREE.ConeGeometry(0.18+Math.random()*0.1,0.85+Math.random()*0.5,8),
      new THREE.MeshBasicMaterial({color:i===1?0xff9b38:0xff5328,transparent:true,opacity:0.78}));
    flame.position.set(8.15+i*0.45,0.75,-0.5); fireplace.add(flame);
  }
  roomHall.add(fireplace);

  const staircase = new THREE.Group();
  for (let i=0;i<8;i++) {
    const step=box(2.2,0.32,0.72,0x554239,-8.8,0.18+i*0.32,5.6-i*0.72);
    staircase.add(step);
    staircase.add(box(2.24,0.055,0.12,0x806044,-8.8,0.36+i*0.32,5.96-i*0.72));
    for(const side of [-1,1]) staircase.add(box(0.07,0.62,0.07,0x74573f,
      -8.8+side*1.02,0.68+i*0.32,5.6-i*0.72));
  }
  for(const side of [-1,1]) {
    const handrail=cyl(0.065,0.065,5.56,0x806044,-8.8+side*1.02,1.8,3.08,10);
    handrail.rotation.x=-Math.atan2(5.04,2.24); staircase.add(handrail);
  }
  roomHall.add(staircase);
  const upperLanding=box(3.7,0.26,3.3,0x514039,-8.45,2.72,-1.05);
  upperLanding.material=pbrSurface("/assets/interiors/wood_floor_diff_1k.jpg",
    "/assets/interiors/wood_floor_normal_1k.jpg","/assets/interiors/wood_floor_roughness_1k.jpg",1,1,0x8a7664);
  upperLanding.receiveShadow=true; roomHall.add(upperLanding);
  const landingRail=box(0.12,0.86,3.3,0x49362c,-6.62,3.22,-1.05);
  roomHall.add(landingRail);
  for(let i=0;i<6;i++) roomHall.add(box(0.1,0.82,0.07,0x92734f,-6.62,3.2,-2.45+i*0.56));
  const portrait=new THREE.Group();
  portrait.add(box(1.15,1.45,0.12,0x967344,-8.45,4.05,-1.94));
  portrait.add(box(0.91,1.2,0.05,0x29313a,-8.45,4.05,-1.85));
  portrait.add(ellipsoid(0.22,0.28,0.12,0x99856c,0.8).translateX(-8.45).translateY(4.28).translateZ(-1.8));
  portrait.add(new THREE.Mesh(new THREE.ConeGeometry(0.4,0.65,7),
    new THREE.MeshStandardMaterial({color:0x33262a,roughness:0.9})).translateX(-8.45).translateY(3.78).translateZ(-1.82));
  portrait.userData.id="galleryPortrait"; portrait.userData.label="Portrait above the staircase";
  roomHall.add(portrait); interactables.push(portrait);
  createWallSwitch(1.65,-1.86,"Grand Hall Light Switch",roomHall,0);

  const chandelier = new THREE.Group();
  chandelier.add(cyl(0.08,0.08,1.4,0x927548,0,4.35,2,10));
  chandelier.add(new THREE.Mesh(new THREE.TorusGeometry(0.82,0.07,8,32),new THREE.MeshStandardMaterial({
    color:0x9c7c4f,metalness:0.65,roughness:0.36
  })).translateY(3.75).translateZ(2));
  for (let i=0;i<6;i++) {
    const a=i*Math.PI/3;
    const candle=new THREE.Mesh(new THREE.CylinderGeometry(0.045,0.055,0.42,8),
      new THREE.MeshStandardMaterial({color:0xe9d8b8,roughness:0.8}));
    candle.position.set(Math.cos(a)*0.82,3.75,2+Math.sin(a)*0.82); chandelier.add(candle);
    const flame=new THREE.Mesh(new THREE.SphereGeometry(0.075,8,8),
      new THREE.MeshBasicMaterial({color:0xffc76b}));
    flame.position.set(candle.position.x,4.0,candle.position.z); chandelier.add(flame);
  }
  roomHall.add(chandelier);

  roomHall.add(humanoid(6.5,0,2,0x242632,"Dr. Adrian Vale","vale"));
  roomHall.add(humanoid(-4,0,4,0x463234,"Anna — Housekeeper","anna"));
  const term = box(1.5, 1.15, 0.7, 0x1a2030, 5, 0.6, 5.5);
  term.userData.id="terminal"; term.userData.label="Security Terminal / CCTV";
  term.material.emissive.setHex(0x111c2d);
  interactables.push(term); roomHall.add(term);
  const screen = box(1.28,0.78,0.06,0x182d42,5,1.33,5.12);
  screen.material.emissive.setHex(0x15334f);
  roomHall.add(screen);
  for (let i=0;i<5;i++) roomHall.add(box(0.9,0.018,0.015,0x55a1c9,5,1.58-i*0.13,5.07));
  const sideTable = new THREE.Group();
  sideTable.add(box(1.2,0.14,0.75,0x47352c,-5.6,0.82,5));
  for (const x of [-6,-5.2]) sideTable.add(box(0.08,0.8,0.08,0x342820,x,0.4,5));
  roomHall.add(sideTable);

  // Door to study
  const doorS = box(1.8, 2.6, 0.25, 0x3a2a22, 0, 1.3, -1.8);
  doorS.userData.id="doorStudy"; doorS.userData.label="Door to Study — Crime Scene";
  interactables.push(doorS); roomHall.add(doorS);
  roomHall.add(box(2.3,3,0.16,0x7e5c3e,0,1.52,-1.98));
  roomHall.add(box(1.9,2.65,0.12,0x32251f,0,1.52,-1.86));
  roomHall.add(cyl(0.07,0.07,0.08,0xc99c52,0.65,1.42,-1.76,12));
  roomHall.add(box(2.2,0.06,0.06,0xccaa22,0,1.5,-1.5));

  // STUDY group (starts hidden)
  roomStudy = new THREE.Group(); roomStudy.visible = false; worldGroup.add(roomStudy);
  const floorS = new THREE.Mesh(
    new THREE.PlaneGeometry(14,12),
    pbrSurface("/assets/interiors/wood_floor_diff_1k.jpg","/assets/interiors/wood_floor_normal_1k.jpg",
      "/assets/interiors/wood_floor_roughness_1k.jpg",4,3,0x786b62)
  );
  floorS.rotation.x = -Math.PI/2; floorS.position.z = -8; floorS.receiveShadow = true; roomStudy.add(floorS);
  [[0,5,-14],[0,5,-2],[-7,5,-8],[7,5,-8]].forEach((p,i)=>{
    const w=new THREE.Mesh(new THREE.PlaneGeometry(i<2?14:12,10),wm); w.position.set(...p);
    if(i>=2)w.rotation.y=Math.PI/2*(i===2?1:-1); if(i===1)w.rotation.y=Math.PI; roomStudy.add(w);
    roomStudy.add(box(i<2?14:0.3,0.42,i<2?0.3:12,0x413029,p[0],0.22,p[2]));
    roomStudy.add(box(i<2?14:0.26,0.2,i<2?0.26:12,0x6f5540,p[0],4.82,p[2]));
  });
  roomStudy.add(box(14,0.35,12,0x17151a,0,5,-8));
  const studyRug=box(6,0.035,3.8,0x38232a,0,0.025,-7.2); roomStudy.add(studyRug);
  for (const [x,z,w,d] of [[0,-5.35,6,0.07],[0,-9.05,6,0.07],[-2.96,-7.2,0.07,3.7],[2.96,-7.2,0.07,3.7]]) {
    roomStudy.add(box(w,0.025,d,0x9e7c50,x,0.05,z));
  }
  const window = new THREE.Group();
  window.add(box(2.2,2.8,0.18,0x312722,-5.8,3,-13.72));
  window.add(box(1.8,2.4,0.1,0x152130,-5.8,3,-13.6));
  window.add(box(0.12,2.4,0.12,0x876648,-5.8,3,-13.5));
  window.add(box(1.8,0.12,0.12,0x876648,-5.8,3,-13.5));
  window.add(box(0.08,2.4,0.1,0x876648,-5.8,3,-13.48));
  roomStudy.add(window);
  const curtains=new THREE.MeshStandardMaterial({color:0x53333a,roughness:0.98});
  const curtainLeft=box(0.3,3.4,0.2,0x53333a,-7,3,-13.45);
  const curtainRight=box(0.3,3.4,0.2,0x53333a,-4.6,3,-13.45);
  curtainLeft.material=curtains; curtainRight.material=curtains;
  roomStudy.add(curtainLeft,curtainRight);

  // Desk + crime props
  const desk = new THREE.Group();
  desk.add(box(3.3,0.2,1.65,0x503526,1.5,1.08,-9));
  desk.add(box(3.45,0.12,1.78,0x906944,1.5,1.23,-9));
  for (const x of [0.25,2.75]) for (const z of [-9.55,-8.45]) {
    desk.add(box(0.14,1.02,0.14,0x34251e,x,0.51,z));
  }
  desk.add(box(1.05,0.48,1.25,0x38271f,1.5,0.72,-9.05));
  desk.add(box(0.82,0.04,0.72,0x68472f,1.5,0.84,-8.36));
  addInt(desk,"desk","Crime Scene Desk"); roomStudy.add(desk);

  const letter = box(0.55,0.025,0.38,0xe4dcc8,1.1,1.35,-8.85);
  letter.rotation.y=0.18;
  letter.material.roughness=0.92;
  letter.userData.id="letter"; letter.userData.label="Unfinished letter"; letter.userData.grabbable=true;
  interactables.push(letter); roomStudy.add(letter);
  const ink = box(0.008,0.003,0.25,0x665b4a,1.07,1.37,-8.85);
  ink.rotation.y=0.18; roomStudy.add(ink);
  const weapon = new THREE.Group();
  weapon.add(box(0.075,0.07,0.52,0x44464a,0,0,0));
  weapon.add(box(0.11,0.09,0.21,0x513b2d,0,0,0.36));
  weapon.position.set(2.5,1.34,-9.1);
  weapon.rotation.y=0.24;
  weapon.userData.id="weapon"; weapon.userData.label="Weapon (wiped clean)"; weapon.userData.grabbable=true;
  interactables.push(weapon); roomStudy.add(weapon);
  // Evidence markers
  for (let i=0;i<3;i++) {
    const m = cyl(0.12, 0.12, 0.05, 0xeeaa22, 0.5+i*0.8, 0.03, -7.5-i*0.3, 8);
    roomStudy.add(m);
  }
  // Dark stain (tasteful)
  const stain = ellipsoid(0.52,0.015,0.35,0x351d20,0.98);
  stain.position.set(2.0,0.02,-8.2);
  roomStudy.add(stain);

  const clock = new THREE.Group();
  clock.add(box(1.35,3.75,0.58,0x4a3022,-4.5,1.87,-12));
  clock.add(box(1.12,3.48,0.18,0x211b1a,-4.5,1.88,-11.67));
  clock.add(box(0.84,1.5,0.12,0x6c4930,-4.5,0.88,-11.55));
  const face=new THREE.Mesh(new THREE.CircleGeometry(0.37,32),
    new THREE.MeshStandardMaterial({color:0xe2d4b5,roughness:0.84}));
  face.position.set(-4.5,2.88,-11.53); clock.add(face);
  const clockRing=new THREE.Mesh(new THREE.TorusGeometry(0.4,0.055,8,32),
    new THREE.MeshStandardMaterial({color:0xc09a60,metalness:0.55,roughness:0.4}));
  clockRing.position.set(-4.5,2.88,-11.5); clock.add(clockRing);
  for (let i=0;i<12;i++) {
    const angle=i*Math.PI/6;
    const marker=box(0.035,0.1,0.025,0x463626,
      -4.5+Math.sin(angle)*0.29,2.88+Math.cos(angle)*0.29,-11.5);
    marker.rotation.z=-angle; clock.add(marker);
  }
  clock.add(box(0.025,0.23,0.025,0x2b211b,-4.5,2.9,-11.48));
  clock.add(box(0.18,0.025,0.025,0x2b211b,-4.55,2.82,-11.47));
  const pendulum=new THREE.Mesh(new THREE.TorusGeometry(0.18,0.025,8,20),
    new THREE.MeshStandardMaterial({color:0xb99459,metalness:0.65,roughness:0.38}));
  pendulum.position.set(-4.5,0.76,-11.5); clock.add(pendulum);
  addInt(clock,"clock","Grandfather Clock 11:47"); roomStudy.add(clock);

  const doorH = new THREE.Group();
  doorH.add(box(2.15,3,0.28,0x75583e,0,1.5,-2.2));
  doorH.add(box(1.83,2.7,0.12,0x3c2d26,0,1.5,-2.02));
  doorH.add(box(0.65,1.8,0.1,0x614631,-0.48,1.48,-1.91));
  doorH.add(box(0.65,1.8,0.1,0x614631,0.48,1.48,-1.91));
  doorH.add(cyl(0.07,0.07,0.08,0xc99c52,0.72,1.4,-1.83,12));
  doorH.userData.id="doorHall"; doorH.userData.label="Return to Hall";
  interactables.push(doorH); roomStudy.add(doorH);

  const deskLamp=new THREE.Group();
  deskLamp.add(cyl(0.2,0.2,0.08,0x88704d,2.25,1.34,-9,16));
  const arm=new THREE.Mesh(new THREE.CylinderGeometry(0.035,0.045,0.72,8),
    new THREE.MeshStandardMaterial({color:0x93774e,metalness:0.58,roughness:0.36}));
  arm.position.set(2.25,1.7,-9); arm.rotation.z=-0.28; deskLamp.add(arm);
  const shade=new THREE.Mesh(new THREE.CylinderGeometry(0.14,0.34,0.3,16,1,true),
    new THREE.MeshStandardMaterial({color:0xc8a66f,roughness:0.5,side:THREE.DoubleSide}));
  shade.position.set(2.05,2.03,-9); shade.rotation.z=-0.22; deskLamp.add(shade);
  roomStudy.add(deskLamp);
  const studyLamp = new THREE.PointLight(0xffbe69,1.6,12,1.7);
  studyLamp.position.set(2.05,2,-9); roomStudy.add(studyLamp);

  player={x:0,y:1.6,z:6,yaw:0,pitch:0,onGround:true};
  createVaultObstacle(3);
  createVaultObstacle(3,roomStudy);
  createEncounterThreat(3,roomStudy);
  state.hour=2; state.minute=17; updateDayNight();
}

// ---------- LOOP ----------
function updatePlayer(dt) {
  const speed = (keys["ShiftLeft"]?6.5:4)*dt;
  vaultJumpTimer=Math.max(0,vaultJumpTimer-dt);
  const f = new THREE.Vector3(-Math.sin(player.yaw),0,-Math.cos(player.yaw));
  const r = new THREE.Vector3(Math.cos(player.yaw),0,-Math.sin(player.yaw));
  let mx=0,mz=0;
  if (keys["KeyW"]||keys["ArrowUp"]||keys["btn_forward"]){mx+=f.x;mz+=f.z;}
  if (keys["KeyS"]||keys["ArrowDown"]||keys["btn_back"]){mx-=f.x;mz-=f.z;}
  if (keys["KeyA"]||keys["ArrowLeft"]||keys["btn_left"]){mx-=r.x;mz-=r.z;}
  if (keys["KeyD"]||keys["ArrowRight"]||keys["btn_right"]){mx+=r.x;mz+=r.z;}
  if (mx||mz) {
    const l=Math.hypot(mx,mz),nextX=THREE.MathUtils.clamp(player.x+mx/l*speed,-15,15),
      nextZ=THREE.MathUtils.clamp(player.z+mz/l*speed,-15,15);
    const blocked=vaultJumpTimer<=0&&vaultObstacles.some(obstacle=>{
      const currentInside=Math.abs(player.x-obstacle.x)<obstacle.halfX&&Math.abs(player.z-obstacle.z)<obstacle.halfZ;
      const nextInside=Math.abs(nextX-obstacle.x)<obstacle.halfX&&Math.abs(nextZ-obstacle.z)<obstacle.halfZ;
      return nextInside&&!currentInside;
    });
    if(!blocked) { player.x=nextX;player.z=nextZ; }
  }
  if(vaultJumpTimer>0) player.y=1.6+Math.sin((1-vaultJumpTimer/0.82)*Math.PI)*0.95;
  else if(state.level!==3||!state.memory.inStudy) player.y=THREE.MathUtils.lerp(player.y,1.6,1-Math.exp(-dt*12));
  if (!player.onGround && hillMesh) {
    const d=Math.hypot(player.x-hillMesh.position.x, player.z-hillMesh.position.z);
    if (d<5.5) player.y=THREE.MathUtils.lerp(player.y, Math.max(1.6,4.5-d*0.5), 0.1);
    else { player.y=THREE.MathUtils.lerp(player.y,1.6,0.12); if(Math.abs(player.y-1.6)<0.04){player.y=1.6;player.onGround=true;} }
  }
  let targetY=player.y;
  if(state.level===3&&!state.memory.inStudy) {
    const onSteps=player.x>=-10.15&&player.x<=-7.35&&player.z>=0.2&&player.z<=6.1;
    const onLanding=player.x>=-10.35&&player.x<=-6.55&&player.z>=-2.7&&player.z<=0.75;
    if(onSteps) {
      const stepIndex=THREE.MathUtils.clamp(Math.floor((5.96-player.z)/0.72),0,7);
      targetY=1.6+stepIndex*0.32;
    } else if(onLanding) targetY=4.45;
    else targetY=1.6;
    player.y=THREE.MathUtils.lerp(player.y,targetY,1-Math.exp(-dt*13));
  }
  cameraTarget.set(player.x,player.y,player.z);
  camera.position.lerp(cameraTarget,1-Math.exp(-dt*18));
  camera.rotation.order="YXZ"; camera.rotation.y=player.yaw; camera.rotation.x=player.pitch;
  // Held object follows camera
  if (heldObject) {
    const hold = new THREE.Vector3(0.35, -0.2, -0.9).applyQuaternion(camera.quaternion);
    heldObject.position.copy(camera.position).add(hold);
    heldObject.quaternion.copy(camera.quaternion);
  }
}
function checkHover() {
  interactionRaycaster.near=0.1; interactionRaycaster.far=8;
  interactionRaycaster.setFromCamera(new THREE.Vector2(0,0), camera);
  const hits = interactionRaycaster.intersectObjects(interactables, true);
  const prompt = document.getElementById("interactPrompt");
  const cross = document.getElementById("crosshair");
  let target = null;
  for (const hit of hits) {
    if (heldObject) {
      let selectedObject=hit.object;
      while (selectedObject && selectedObject!==heldObject) selectedObject=selectedObject.parent;
      if (selectedObject===heldObject) continue;
    }
    let o = hit.object;
    while (o && !o.userData.id) o = o.parent;
    if (!o || !o.userData.id) continue;
    let visible = true;
    for (let parent=o;parent;parent=parent.parent) if (!parent.visible) { visible=false; break; }
    if (visible) { target=o; break; }
  }
  if (target) {
    currentHover = target;
    if (hoverOutline && hoverOutline.userData.target !== target) {
      scene.remove(hoverOutline);
      hoverOutline.geometry.dispose();
      hoverOutline.material.dispose();
      hoverOutline=null;
    }
    if (!hoverOutline) {
      hoverOutline=new THREE.BoxHelper(target,0xe4c98c);
      hoverOutline.userData.target=target;
      hoverOutline.material.transparent=true;
      hoverOutline.material.opacity=0.82;
      hoverOutline.material.depthTest=false;
      hoverOutline.renderOrder=12;
      scene.add(hoverOutline);
    }
    hoverOutline.visible=true;
    hoverOutline.update();
    const isCharacter=Boolean(characterChatbots[target.userData.id]);
    const g = target.userData.id==="wallSwitch" ? " · click to switch"
      : target.userData.grabbable ? " · E to pick up" : isCharacter ? " · click to talk"
      : " · click to inspect";
    prompt.textContent = (target.userData.label||target.userData.id) + g;
    prompt.classList.add("show"); cross.classList.add("active");
    updateActionButton();
    return;
  }
  if (hoverOutline) hoverOutline.visible=false;
  currentHover=null; prompt.classList.remove("show"); cross.classList.remove("active");
  updateActionButton();
}
function updateActionButton() {
  const actionButton=document.getElementById("actionButton");
  if (!actionButton) return;
  actionButton.textContent=equippedItemId&&["food","water","meds","flare"].includes(equippedItemId)
    ? equippedItemId==="flare"?"USE FLARE":"USE "+equippedItemId.toUpperCase()
    : heldObject?"DROP":currentHover&&currentHover.userData.id==="wallSwitch"?"SWITCH"
    :currentHover&&currentHover.userData.grabbable?"PICK UP"
    :currentHover&&characterChatbots[currentHover.userData.id]?"TALK":"INSPECT";
}
function renderFieldMap(canvas,ctx,paper=false) {
  if(!canvas||!ctx) return;
  const width=canvas.width,height=canvas.height,pad=Math.max(14,width*0.055);
  const extent=state.level===1?30:state.level===2?16:12;
  const point=(x,z)=>({x:pad+(x+extent)/(extent*2)*(width-pad*2),y:pad+(z+extent)/(extent*2)*(height-pad*2)});
  ctx.clearRect(0,0,width,height);
  ctx.fillStyle=paper?"#8b7851":"#15211c";ctx.fillRect(0,0,width,height);
  ctx.fillStyle=paper?"#e1d1a5":"#203126";ctx.fillRect(pad,pad,width-pad*2,height-pad*2);
  ctx.save();
  ctx.beginPath();ctx.rect(pad,pad,width-pad*2,height-pad*2);ctx.clip();
  ctx.strokeStyle=paper?"rgba(86,78,54,0.15)":"rgba(204,218,184,0.11)";
  ctx.lineWidth=Math.max(1,width/300);
  const gridStep=extent/3;
  for(let i=-extent;i<=extent;i+=gridStep) {
    const vertical=point(i,-extent),horizontal=point(-extent,i);
    ctx.beginPath();ctx.moveTo(vertical.x,pad);ctx.lineTo(vertical.x,height-pad);ctx.stroke();
    ctx.beginPath();ctx.moveTo(pad,horizontal.y);ctx.lineTo(width-pad,horizontal.y);ctx.stroke();
  }
  const line=(points,color,lineWidth)=>{
    ctx.strokeStyle=color;ctx.lineWidth=lineWidth;ctx.lineJoin="round";ctx.lineCap="round";
    ctx.beginPath();
    points.forEach(([x,z],index)=>{
      const p=point(x,z);
      if(index===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);
    });
    ctx.stroke();
  };
  const landmark=(x,z,color,label)=>{
    const p=point(x,z),r=Math.max(3,width/54);
    ctx.fillStyle=color;ctx.beginPath();ctx.arc(p.x,p.y,r,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=paper?"#344333":"#f2e8d2";ctx.font=`${Math.max(9,width/30)}px sans-serif`;
    ctx.fillText(label,p.x+r+3,p.y+Math.max(3,width/100));
  };
  if(state.level===1) {
    line(Array.from({length:15},(_,i)=>{const z=-12+i*2;return [14+Math.sin((z+5)*0.16)*0.52,z];}),"#927552",Math.max(3,width/50));
    line(Array.from({length:15},(_,i)=>[-7+i*0.85,13+Math.sin(i*0.55)*0.55]),"#65bcb2",Math.max(2,width/80));
    if(paper) {
      const hill=point(-10,-6),unit=(width-pad*2)/(extent*2);
      ctx.strokeStyle="rgba(102,112,74,0.3)";ctx.lineWidth=1.2;
      for(let ring=1;ring<=5;ring++) {
        ctx.beginPath();
        ctx.ellipse(hill.x,hill.y,unit*(2.1+ring*0.58),unit*(1.9+ring*0.5),-0.18,0,Math.PI*2);
        ctx.stroke();
      }
    }
    landmark(8,-9,"#ff9b45","Camp");
    landmark(-10,-6,"#a6b49b","Hill");
    landmark(14,1,"#c3a278","Road");
    landmark(-1,13,"#72c9bf","Stream");
    landmark(0,10,"#e2d4ad","Start");
  } else if(state.level===2) {
    line([[-14,-14],[14,-14],[14,14],[-14,14],[-14,-14]],"#b29a6d",Math.max(2,width/90));
    line([[-14,0],[14,0]],"#635e55",Math.max(2,width/100));
    line([[0,-14],[0,14]],"#635e55",Math.max(2,width/100));
    landmark(-7,-7,"#d4ad66","Egyptian wing");
    landmark(7,-7,"#9cb7ca","Dinosaur");
    landmark(-7,6,"#d38b70","Knight");
    landmark(7,6,"#bca5d5","Portrait");
    landmark(0,11,"#e2d4ad","Entrance");
    ctx.fillStyle="rgba(218,198,154,0.1)";
    const topLeft=point(-14,-14),bottomRight=point(14,14);
    ctx.fillRect(topLeft.x,topLeft.y,bottomRight.x-topLeft.x,bottomRight.y-topLeft.y);
  } else {
    line([[-11,-6],[11,-6],[11,8],[-11,8],[-11,-6]],"#b29a6d",Math.max(2,width/90));
    line([[-5,-6],[-5,8]],"#635e55",Math.max(2,width/100));
    line([[5,-6],[5,8]],"#635e55",Math.max(2,width/100));
    line([[-5,-6],[-5,-10],[5,-10],[5,-6]],"#b29a6d",Math.max(2,width/90));
    landmark(8,0,"#ed9a65","Fireplace");
    landmark(-8,3,"#c6ad7c","Stairs");
    landmark(0,6,"#8cb7c2","Hall");
    landmark(0,-8,"#d3a665","Study");
    landmark(4,1,"#a2bb91","Terminal");
  }
  const playerPoint=point(player.x,player.z);
  ctx.save();
  ctx.translate(playerPoint.x,playerPoint.y);
  ctx.rotate(-player.yaw);
  ctx.fillStyle=paper?"#b84632":"#f5d26c";ctx.strokeStyle="#362c1c";ctx.lineWidth=Math.max(1,width/180);
  ctx.beginPath();ctx.moveTo(0,-Math.max(7,width/24));ctx.lineTo(-Math.max(4,width/44),Math.max(4,width/40));ctx.lineTo(Math.max(4,width/44),Math.max(4,width/40));ctx.closePath();
  ctx.fill();ctx.stroke();
  ctx.restore();
  ctx.restore();
  ctx.fillStyle=paper?"#334331":"#f4e4c4";ctx.font=`bold ${Math.max(10,width/28)}px sans-serif`;
  ctx.fillText(state.level===1?"FIELD":"FLOOR PLAN",pad+2,pad+Math.max(12,width/22));
  ctx.fillStyle=paper?"#713e2e":"#dfc978";ctx.font=`bold ${Math.max(11,width/24)}px sans-serif`;
  ctx.fillText("N",width/2-4,pad+Math.max(12,width/22));
  if(paper) {
    ctx.fillStyle="#5d5037";ctx.font="10px sans-serif";
    ctx.fillText(`ECHOES FIELD SHEET  ·  ${player.x.toFixed(1)}, ${player.z.toFixed(1)}`,pad+2,height-pad/2);
  }
}
function updateMiniMap(now) {
  const canvas=document.getElementById("miniMap");
  if(!canvas||!mapContext) return;
  const hud=document.getElementById("mapHud");
  const visible=state.level===1;
  hud.hidden=!visible;
  if(now-lastMapUpdate<100) return;
  lastMapUpdate=now;
  renderFieldMap(canvas,mapContext);
  if(mapToolCanvas) {
    renderFieldMap(mapToolCanvas,mapToolCanvas.getContext("2d"),true);
    if(mapToolTexture) mapToolTexture.needsUpdate=true;
  }
  const phoneMap=document.getElementById("phoneMapCanvas");
  if(phoneMap) renderFieldMap(phoneMap,phoneMap.getContext("2d"));
}
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clockSys.getDelta(), 0.05);
  const t = clockSys.elapsedTime;
  if(compassNeedle) compassNeedle.rotation.z=-player.yaw;
  if(t-lastPhoneReadoutUpdate>0.15) {
    lastPhoneReadoutUpdate=t;
    updatePhoneDeviceReadouts();
    drawPhoneScreen();
  }
  if(phoneRig) {
    const targetY=phoneRigOpen?-0.26:-0.58;
    phoneRig.position.y+=(targetY-phoneRig.position.y)*Math.min(1,dt*7);
    if(phoneRigOpen) {
      phoneRig.rotation.z=-0.08+Math.sin(t*0.85)*0.012;
      phoneRig.position.x=-0.3+Math.sin(t*0.65)*0.008;
    }
  }
  if (document.getElementById("game").classList.contains("active")) {
    updatePlayer(dt); checkHover();
    updateEncounter(dt,t);
    // Tree sway
    treeMeshes.forEach(tr => {
      tr.rotation.z = Math.sin(t * tr.userData.sway + tr.userData.phase) * tr.userData.swayAmount;
      tr.rotation.x = Math.cos(t * tr.userData.sway * 0.7 + tr.userData.phase) * tr.userData.swayAmount*0.6;
    });
    // Firelight, flame, smoke and ember animation.
    if(fireLight) fireLight.intensity=2.25+Math.sin(t*18)*0.35+Math.sin(t*31+0.7)*0.22;
    fireFlames.forEach(flame=>{
      const flicker=0.82+Math.sin(t*12+flame.userData.phase)*0.2+Math.sin(t*23+flame.userData.phase)*0.12;
      flame.scale.set(flame.userData.baseScale*flicker,flame.userData.baseScale*(0.78+flicker*0.32),flame.userData.baseScale*flicker);
      flame.rotation.y=Math.sin(t*5+flame.userData.phase)*0.22;
    });
    fireEmbers.forEach(ember=>{
      ember.userData.life+=dt;
      if(ember.userData.life>1.9) {
        ember.userData.life=0; ember.position.set(8+(Math.random()-0.5)*0.5,0.55,-9+(Math.random()-0.5)*0.5);
      }
      ember.position.y+=ember.userData.vy*dt;
      ember.position.x+=ember.userData.vx*dt; ember.position.z+=ember.userData.vz*dt;
      ember.material.opacity=Math.max(0,0.9-ember.userData.life*0.52);
    });
    smokeParticles.forEach(p => {
      p.position.y += p.userData.vy * dt;
      p.position.x += (p.userData.drift+Math.sin(t*0.8+p.userData.life)*0.08)*dt;
      p.userData.life += dt;
      if (p.position.y > 6) { p.position.set(8+(Math.random()-0.5)*0.34,0.78,-9+(Math.random()-0.5)*0.34); p.userData.life=0; }
      p.material.opacity = Math.max(0.005,0.18-p.userData.life*0.03);
      const s = 0.72 + p.userData.life * 0.16;
      p.scale.setScalar(s);
    });
    waterRipples.forEach(ripple=>{
      const pulse=0.78+Math.sin(t*1.5+ripple.userData.phase)*0.17;
      ripple.scale.setScalar(pulse); ripple.material.opacity=0.2+0.14*pulse;
    });
    atmosphereFields.forEach(field=>{
      field.particles.forEach((particle,index)=>{
        particle.y+=particle.speed*dt;
        particle.x+=Math.sin(t*0.55+particle.phase)*dt*0.12;
        if(particle.y>field.height+0.4) {
          particle.y=0.35;
          particle.x=(Math.random()-0.5)*field.width;
          particle.z=(Math.random()-0.5)*field.depth;
        }
        field.transform.position.set(particle.x,particle.y,particle.z);
        field.transform.scale.setScalar(particle.scale);
        field.transform.updateMatrix();
        field.mesh.setMatrixAt(index,field.transform.matrix);
      });
      field.mesh.instanceMatrix.needsUpdate=true;
    });
    if (worldGroup) worldGroup.children.forEach(c => {
      if (c.userData.bob) c.position.y = c.userData.baseY + Math.sin(t*1.5+c.userData.bob)*0.05;
    });
  }
  updateMiniMap(performance.now());
  renderer.render(scene, camera);
}

// ---------- UI ----------
function addClue(text) {
  if (state.clues.includes(text)) return;
  state.clues.push(text);
  const investigator = activeInvestigator();
  addMsg("system", "🔎 TEAM CLUE " + state.clues.length + ": " + text + (investigator ? ` · recorded by ${investigator.name}` : ""));
  state.info = Math.min(100, state.info + 6);
}
function showHome() {
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
  document.getElementById("home").classList.add("active");
  document.getElementById("sideMenu").classList.remove("open");
}
function showHowTo() {
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
  document.getElementById("howto").classList.add("active");
}
function showMultiplayer() {
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
  document.getElementById("multiplayer").classList.add("active");
}
const investigationRoles = ["FIELD SCOUT","ARCHIVIST","EVIDENCE ANALYST","CASE REPORTER"];
function activeInvestigator() {
  return investigationTeam.members[investigationTeam.activeIndex] || null;
}
function refreshTeamFields() {
  const count=Number(document.getElementById("playerCount").value);
  document.querySelectorAll(".team-player-field[data-player-index]").forEach(field=>{
    const visible=Number(field.dataset.playerIndex)<count;
    field.hidden=!visible;
    field.querySelector("input").required=visible;
  });
}
function updateTeamUI() {
  const teamHud = document.getElementById("teamHud");
  const investigator = activeInvestigator();
  teamHud.hidden = !investigator;
  if (investigator) document.getElementById("activeInvestigator").textContent = `${investigator.role} · ${investigator.name}`;
}
function passInvestigator() {
  if (investigationTeam.members.length < 2) return;
  investigationTeam.activeIndex = (investigationTeam.activeIndex + 1) % investigationTeam.members.length;
  updateTeamUI();
  const investigator = activeInvestigator();
  addMsg("system", `Case hand-off complete. ${investigator.name} is now leading the investigation.`);
}
function startLocalCoop() {
  const count = Number(document.getElementById("playerCount").value);
  const members = Array.from({length: count}, (_,index) => ({
    name: document.getElementById(`playerName${index+1}`).value.trim(),
    role: investigationRoles[index]
  }));
  const missing = members.findIndex(member => !member.name);
  const validation = document.getElementById("teamValidation");
  if (count < 2 || count > 4 || members.length !== count) {
    validation.textContent = "Choose a team of two to four investigators.";
    validation.hidden = false;
    return;
  }
  if (missing !== -1) {
    validation.textContent = `Enter a name for Investigator ${missing+1} to start the team case.`;
    validation.hidden = false;
    document.getElementById(`playerName${missing+1}`).focus();
    return;
  }
  validation.hidden = true;
  startJourney(members);
}
function startJourney(members=[]) {
  investigationTeam = { members, activeIndex: 0 };
  conversationHistory = {};
  phoneThreads = {};
  document.querySelectorAll(".screen").forEach(s=>s.classList.remove("active"));
  document.getElementById("game").classList.add("active");
  document.getElementById("game").dataset.level="1";
  if (!renderer) initThree();
  onResize(); resetLevel(1);
  updateTeamUI();
  document.getElementById("introOverlay").classList.add("active");
  document.getElementById("introTitle").textContent = "LEVEL 1 — THE UNKNOWN";
  document.getElementById("introText").textContent = "Find 4 clues before you can leave. Follow the field map, watch the firelight, and use E to handle items.";
}
function closeIntro() {
  document.getElementById("introOverlay").classList.remove("active");
  document.getElementById("gameCanvas").focus();
  onResize();
  if (state.level === 1) showInstr("BRIEFING — LEVEL 1", "<b>Goal:</b> Find at least <b>4 clues</b> before leaving.<br><br>• <b>WASD</b> move · Drag to look<br>• Follow the live field map to the camp, hill, road and stream<br>• <b>F</b> flashlight · <b>SPACE</b> climb the hill or vault nearby timber<br>• Hold and use the signal flare with <b>E</b> if needed<br>• Click or tap the campsite, trees, road and footprints<br><br>Encounters are non-lethal: use the flashlight to hold the forest creature back. Watch the smoke. Follow the prints.");
  else if (state.level === 2) showInstr("BRIEFING — LEVEL 2", "<b>Goal:</b> Uncover Project Echo — <b>4 clues</b>.<br><br>• Find the brass wall switch to light the museum<br>• Question the artifact, knight, dinosaur skeleton, and painted witness<br>• Search the curator's desk; click the portrait to talk or type <b>examine painting</b> to inspect it<br>• Use the flashlight or a signal flare to get past the non-lethal gallery wraith; press <b>SPACE</b> near the fallen display to vault it<br>• In team mode, pass the investigation between players; all discoveries are shared");
  else showInstr("BRIEFING — LEVEL 3", "<b>Goal:</b> Prove innocence — <b>5 evidence</b> pieces.<br><br>• Find the wall switch and click it to light the hall<br>• Walk up the staircase to reach the portrait landing<br>• Enter the <b>Study</b> through the door and inspect the clock, letter and weapon<br>• Question Vale and Anna; check the security terminal<br>• If the intruder appears, hold and use the signal flare, vault the overturned table with <b>SPACE</b>, and reach the study door before the distraction ends<br>• Return to the hall, then type <b>prove my innocence</b>");
}
function toggleMenu(){document.getElementById("sideMenu").classList.toggle("open");}
function restartLevel(){resetLevel(state.level);document.getElementById("sideMenu").classList.remove("open");addMsg("system","Restarted.");}

function updateUI() {
  document.getElementById("game").dataset.level=String(state.level);
  document.getElementById("location").textContent = state.location;
  updateTimeDisplay();
  document.getElementById("health").textContent = Math.round(state.health)+"%";
  document.getElementById("food").textContent = state.food.toFixed(1)+"d";
  document.getElementById("water").textContent = state.water.toFixed(1)+"d";
  document.getElementById("safety").textContent = Math.round(state.safety)+"%";
  document.getElementById("info").textContent = Math.round(state.info)+"%";
  document.getElementById("levelBadge").textContent = state.level===1?"LEVEL 1 — THE UNKNOWN":state.level===2?"LEVEL 2 — MUSEUM AFTER DARK":"LEVEL 3 — THE FINAL CASE";
  const sdgRule = sdgRules[state.level];
  document.getElementById("sdgRuleLabel").textContent = sdgRule.label;
  document.getElementById("sdgRuleText").textContent = sdgRule.rule;
  document.getElementById("inventory").innerHTML = state.inventory.map(i=>{
    const hl=/key|journal|flashlight|flare/i.test(i.id)?" highlight":"";
    const selected=equippedItemId===i.id?" selected":"";
    const uses=Number.isFinite(i.uses)?`<small>×${i.uses}</small>`:"";
    return `<button type="button" class="inv-item${hl}${selected}" title="${i.desc}" aria-pressed="${equippedItemId===i.id}" onclick="useItemById('${i.id}')"><span>${i.name}</span>${uses}</button>`;
  }).join("");
  document.getElementById("objectivesList").innerHTML = state.objectives.map(o=>`<li class="${o.done?"done":""}">${o.text}</li>`).join("");
  const commandHint = document.getElementById("commandHint");
  if (commandHint) {
    commandHint.textContent = state.level===1 ? "Try: examine road · check phone · head east"
      : state.level===2 ? "Try: question the knight · ask the portrait · open chamber"
      : "Try: talk to Vale · message Anna · check CCTV";
  }
  updateActionButton();
  updateMusicButton();
  const lightButton=document.querySelector(".quick-tool[aria-label='Toggle flashlight']");
  if(lightButton) {
    lightButton.textContent=state.memory.flashlightOn?"🔦 LIGHT ON":"🔦 LIGHT";
    lightButton.setAttribute("aria-pressed",String(state.memory.flashlightOn));
  }
  const mapHud=document.getElementById("mapHud");
  if(mapHud) mapHud.hidden=state.level!==1;
  updateTeamUI();
}
function setScene(t){document.getElementById("sceneText").textContent=t;}
function addMsg(type,text,name){
  const investigator = activeInvestigator();
  if(type === "player" && investigator) text = `${investigator.name} · ${text}`;
  const log=document.getElementById("chatLog");
  const div=document.createElement("div"); div.className="msg "+type;
  if(type==="character"&&name) div.innerHTML=`<div class="name">${name}</div>${text}`;
  else div.textContent=text;
  log.appendChild(div); log.scrollTop=log.scrollHeight;
}

function resetLevel(lvl) {
  if (!document.getElementById("phoneChatOverlay").hidden) endConversation();
  clearHeldTool();
  if(phoneRig) phoneRig.visible=false;
  phoneRigOpen=false;
  previousHeldItem=null;
  const encounterStatus=document.getElementById("encounterStatus");
  if(encounterStatus) encounterStatus.hidden=true;
  state.level=lvl; state.turn=0; state.levelComplete=false; state.clues=[];
  state.memory.flashlightOn=false;
  if(flashlight) flashlight.intensity=0;
  state.requiredClues = lvl===1?4:lvl===2?4:5;
  document.getElementById("chatLog").innerHTML="";
  if (lvl===1) {
    Object.assign(state.memory,{foundObject:false,campExamined:false,climbedHill:false,roadExamined:false,treesExamined:false,streamUsed:false,messagesRead:0,flashlightOn:false});
    buildLevel1();
    state.health=85;state.food=3;state.water=2.5;state.safety=60;state.info=10;
    state.location="Unknown Wilderness";
    state.inventory=[
      {id:"food",name:"🥫 Food",uses:3,desc:"Rations"},{id:"water",name:"💧 Water",uses:3,desc:"Water"},
      {id:"flashlight",name:"🔦 Flashlight",uses:40,desc:"F to toggle"},{id:"meds",name:"🩹 Meds",uses:2,desc:"Heal"},
      {id:"phone",name:"📱 Phone",uses:5,desc:"Messages, live map, compass & case file"},
      {id:"map",name:"🗺️ Map",uses:Infinity,desc:"Hold a live map of your current level"},
      {id:"compass",name:"🧭 Compass",uses:Infinity,desc:"Hold to read a live north bearing"},
      {id:"flare",name:"🟠 Signal Flare",uses:2,desc:"Bright, non-harmful distraction · E to use"}
    ];
    state.objectives=[{text:"Orient yourself",done:false},{text:"Investigate campsite",done:false},{text:"Hill or road",done:false},{text:"Clues 0/4",done:false}];
    setScene("Use the field map to find the stream, hill, camp and road. Follow the footprints.");
    addMsg("system","You wake with almost no memory.");
    addMsg("warning",'"Don\'t follow the smoke."');
  } else if (lvl===2) {
    Object.assign(state.memory,{askedArtifact:false,askedKnight:false,askedDino:false,portraitQuestioned:false,paintingSeen:false,deskSearched:false,doorOpened:false});
    buildLevel2();
    state.health=95;state.food=3;state.water=3;state.safety=70;state.info=25;
    state.location="Museum — Egyptian Wing";
    state.inventory=[
      {id:"flashlight",name:"🔦 Flashlight",uses:30,desc:"F"},
      {id:"phone",name:"📱 Phone",uses:3,desc:"Offline witness channels & case file"},
      {id:"map",name:"🗺️ Map",uses:Infinity,desc:"Hold a live museum floor plan"},
      {id:"compass",name:"🧭 Compass",uses:Infinity,desc:"Hold to read a live north bearing"},
      {id:"flare",name:"🟠 Signal Flare",uses:1,desc:"Bright, non-harmful distraction · E to use"}
    ];
    if(state.memory.foundObject){state.inventory.push({id:"key",name:"🗝️ Strange Key",uses:1,desc:"Chamber"});state.inventory.push({id:"journal",name:"📜 Torn Journal",uses:1,desc:"Warning"});}
    state.objectives=[{text:"Question exhibits",done:false},{text:"Search desk",done:false},{text:"Project Echo",done:false},{text:"Clues 0/4",done:false}];
    setScene("Find the brass wall switch to light the museum, then inspect the exhibits.");
    addMsg("system","Doors sealed. Exhibits are conscious.");
  } else {
    Object.assign(state.memory,{clockOpened:false,sceneExamined:false,valeQuestioned:false,annaQuestioned:false,cctvChecked:false,inStudy:false,portraitQuestioned:false});
    buildLevel3();
    state.health=100;state.food=3;state.water=3;state.safety=45;state.info=20;
    state.location="Blackwood Manor — Grand Hall";
    state.inventory=[
      {id:"flashlight",name:"🔦 Flashlight",uses:25,desc:"F"},
      {id:"phone",name:"📱 Phone",uses:2,desc:"Offline witness channels & case file"},
      {id:"map",name:"🗺️ Map",uses:Infinity,desc:"Hold a live manor floor plan"},
      {id:"compass",name:"🧭 Compass",uses:Infinity,desc:"Hold to read a live north bearing"},
      {id:"flare",name:"🟠 Signal Flare",uses:2,desc:"Bright, non-harmful distraction · E to use"}
    ];
    if(state.memory.foundObject) state.inventory.push({id:"key",name:"🗝️ Strange Key",uses:1,desc:"Echo link"});
    state.objectives=[{text:"Enter study",done:false},{text:"Question Vale & Anna",done:false},{text:"CCTV",done:false},{text:"Evidence 0/5",done:false}];
    setScene("Find the wall switch, inspect the hall, and walk up the staircase to the portrait landing.");
    addMsg("system","You are the primary suspect. Enter the study. Build the case.");
  }
  updateUI(); onResize(); startLevelMusic(lvl);
}

function sendCommand() {
  const input=document.getElementById("commandInput");
  const text=input.value.trim(); if(!text||state.levelComplete)return;
  input.value="";
  if(conversationTarget) { sendPhoneMessage(null,text); return; }
  addMsg("player",text); state.turn++; advanceTime(1);
  const c=text.toLowerCase();
  if (/^(help|commands|what can i do|what should i do)\??$/.test(c)) { showCommandHelp(); return; }
  if(/flashlight|torch|^f$|light on/.test(c)){toggleFlashlight();return;}
  if(/climb/.test(c)){tryClimb();return;}
  if(/grab|pick up|drop|put down/.test(c)){toggleGrab();return;}
  if(/eat|food/.test(c)){useItemById("food");return;}
  if(/drink|water/.test(c)){useItemById("water");return;}
  if(/med|heal/.test(c)){useItemById("meds");return;}
  if(/phone|message/.test(c)){useItemById("phone");return;}
  if(/compass/.test(c)){useItemById("compass");return;}
  if(state.level===1){
    if(/\b(?:leave|exit|head east|go east|walk east|follow (?:the )?road|take (?:the )?road|ready)\b/.test(c)){tryLeaveL1();return;}
    if(/camp|smoke|fire|tent/.test(c)){examineCamp();return;}
    if(/hill|ridge|climb/.test(c)){tryClimb();return;}
    if(/road|track|tire/.test(c)){examineRoad();return;}
    if(/tree|fabric|print|foot/.test(c)){examineTrees();return;}
    if(/stream|refill/.test(c)){examineStream();return;}
    if(/where|direction/.test(c)){addMsg("ai","Smoke north, hill west, road east, water south. Find 4 clues. Type 'help' for commands.");return;}
    addMsg("ai","I didn't recognize that action. Type 'help' to see commands for this level.");
  } else if(state.level===2){
    if(/leave|ready|understand|continue/.test(c)&&state.clues.length>=state.requiredClues){
      if(encounterState.active&&!encounterState.cleared){addMsg("warning","The gallery wraith still blocks the exit. Use the flashlight or a flare before leaving.");return;}
      state.levelComplete=true;addMsg("system","— LEVEL 2 COMPLETE —");setTimeout(()=>showScore(2),1200);return;
    }
    if(/artifact|egyptian|statue/.test(c)){talkArtifact();return;}
    if(/knight|armor|figure/.test(c)){talkKnight();return;}
    if(/dino|skeleton|pulse/.test(c)){talkDino();return;}
    if(/painting|portrait/.test(c)){
      if(/talk|ask|chat/.test(c)) talkMuseumPortrait();
      else examinePainting();
      return;
    }
    if(/desk|curator|note/.test(c)){examineDesk();return;}
    if(/door|chamber|key|open/.test(c)){examineDoor();return;}
    addMsg("ai","I didn't recognize that action. Type 'help' to see commands for this level.");
  } else {
    if(/prove|innocent|accuse/.test(c)){proveInnocence();return;}
    if(/study|enter study|crime/.test(c)){enterStudy();return;}
    if(/hall|leave study|back/.test(c)){leaveStudy();return;}
    if(/clock/.test(c)){examineClock();return;}
    if(/desk|letter|weapon|body|scene/.test(c)){examineCrimeScene();return;}
    if(/vale|doctor/.test(c)){talkVale();return;}
    if(/anna|maid/.test(c)){talkAnna();return;}
    if(/camera|cctv|terminal|footage/.test(c)){checkCCTV();return;}
    addMsg("ai","I didn't recognize that action. Type 'help' to see commands for this level.");
  }
  updateUI();
}
function showCommandHelp() {
  const instructions = state.level===1
    ? "Level 1: examine camp, road, trees, or stream; use phone or compass; climb the hill; press Space near fallen timber to vault it. Hold the flashlight on the forest creature or use a signal flare, then leave after finding 4 clues."
    : state.level===2
    ? "Level 2: click the Egyptian artifact, knight, dinosaur, or painting to open its field-phone chat. Ask in your own words or tap a suggested question. Examine the curator desk, use the flashlight or signal flare to get past the wraith, and leave after finding 4 clues. Press Space near the fallen display to vault it."
    : "Level 3: enter the study; examine the clock, letter, or weapon; click Vale, Anna, or the portrait to open a private field-phone chat. Ask follow-ups or request a recap, then check CCTV. If the intruder appears, hold and use the signal flare, press Space near the overturned table, reach the study door, and return to the hall before proving your innocence.";
  const teamTip = investigationTeam.members.length > 1 ? ` Team mode: press PASS TO NEXT or P to hand over the shared investigation.` : "";
  addMsg("ai",instructions + teamTip);
}
document.getElementById("commandInput").addEventListener("keydown",e=>{if(e.key==="Enter")sendCommand();});

function showScore(level) {
  level=level||state.level;
  const overlay=document.getElementById("scoreOverlay");
  const scores = level===1
    ? {"Clues":Math.min(100,state.clues.length*22),"Tools":82,"Safety":Math.round(state.safety),"Info":Math.min(100,state.info)}
    : level===2
    ? {"Clues":Math.min(100,state.clues.length*20),"Exhibits":88,"Echo":state.clues.some(c=>/ECHO/i.test(c))?95:50,"Info":Math.min(100,state.info)}
    : {"Evidence":Math.min(100,state.clues.length*18),"Interrogation":92,"Timeline":94,"Proof":96};
  const totalScore=Math.round(Object.values(scores).reduce((a,b)=>a+b,0)/4);
  const scoreCard=overlay.querySelector(".score-card");
  const finalCase=level===3&&state.levelComplete;
  scoreCard.classList.toggle("final-score",finalCase);
  document.getElementById("scoreTitle").textContent=finalCase?"CONGRATULATIONS!":level===1?"LEVEL 1 COMPLETE":level===2?"LEVEL 2 COMPLETE":"CASE REVIEW";
  document.getElementById("scoreMessage").textContent=finalCase
    ?"All three cases are solved. You uncovered the truth behind ECHOES and cleared your name."
    :"Case complete. Your discoveries carry forward into the next investigation.";
  document.getElementById("scoreTotal").textContent=totalScore+"/100";
  document.getElementById("scoreBreakdown").innerHTML=Object.entries(scores).map(([k,v])=>`<div class="score-row"><span>${k}</span><span>${v}</span></div>`).join("");
  document.getElementById("rank").textContent=totalScore>=85?(level===3?"🏆 MASTER INVESTIGATOR":"INVESTIGATOR"):"SURVIVOR";
  const nextBtn=document.getElementById("nextLevelBtn");
  if(level===1){nextBtn.textContent="ENTER LEVEL 2";nextBtn.onclick=()=>{overlay.classList.remove("active");startLevel(2);};}
  else if(level===2){nextBtn.textContent="ENTER LEVEL 3";nextBtn.onclick=()=>{overlay.classList.remove("active");startLevel(3);};}
  else{nextBtn.textContent="RETURN TO MENU";nextBtn.onclick=()=>{overlay.classList.remove("active");showHome();};}
  const confetti=document.getElementById("confettiLayer");
  confetti.replaceChildren();
  if(finalCase) {
    const colors=["#d3b77e","#e9d59e","#78b9a3","#8eb7d3","#d98576","#f4ead0"];
    const pieces=document.createDocumentFragment();
    for(let i=0;i<90;i++) {
      const piece=document.createElement("span");
      piece.className="confetti-piece";
      piece.style.left=`${Math.random()*100}%`;
      piece.style.backgroundColor=colors[i%colors.length];
      piece.style.setProperty("--fall-duration",`${4+Math.random()*4}s`);
      piece.style.setProperty("--fall-delay",`${Math.random()*3}s`);
      piece.style.setProperty("--drift",`${(Math.random()-0.5)*220}px`);
      pieces.appendChild(piece);
    }
    confetti.appendChild(pieces);
  }
  overlay.classList.add("active");
}
function startLevel(lvl) {
  document.getElementById("introOverlay").classList.add("active");
  document.getElementById("introTitle").textContent=lvl===2?"LEVEL 2 — MUSEUM AFTER DARK":"LEVEL 3 — THE FINAL CASE";
  document.getElementById("introText").textContent=lvl===2
    ?"Night. Find the wall switch, light the museum, and uncover 4 clues about Project Echo."
    :"Find the hall switch, climb the staircase, and gather 5 pieces of evidence to prove your innocence.";
  resetLevel(lvl);
}
document.getElementById("playerCount").addEventListener("change",refreshTeamFields);
document.querySelectorAll(".team-player-field input").forEach(input=>{
  input.addEventListener("input",()=>{
    document.getElementById("teamValidation").hidden=true;
  });
});
refreshTeamFields();
updateUI();
