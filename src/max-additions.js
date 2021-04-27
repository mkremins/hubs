import { COLLISION_LAYERS } from "./constants";
import { SHAPE, TYPE } from "three-ammo/constants";

console.log("!!!max-additions.js!!!");

/// utils

function createElement(htmlString) {
  var div = document.createElement('div');
  div.innerHTML = htmlString.trim();
  return div.firstChild; 
}

function scale(num, oldLower, oldUpper, newLower, newUpper) {
  const oldRange = oldUpper - oldLower;
  const newRange = newUpper - newLower;
  return (((num - oldLower) / oldRange) * newRange) + newLower;
}

function randInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min); // max exclusive, min inclusive
}

/// constants

const MIC_PRESENCE_VOLUME_THRESHOLD = 0.00001;

const SPEECH_TIME_PER_TICK = 10; // every speech tick = 10ms of realtime
const MIN_SPEECH_TIME_FOR_EVENT = 100; // 0.1s realtime
const MAX_SPEECH_TIME_FOR_EVENT = 5000; // 5s realtime
const CONTINUOUS_SPEECH_LENIENCY_TIME = 100; // 0.1s realtime

const ORB_CONTAINER_POS = [7,0,2]; //[0,0,0]
const ORB_CONTAINER_SIZE = 1;
const ORB_CONTAINER_DEPTH = 4;

const MIN_ORB_SIZE = 0.05;
const MAX_ORB_SIZE = 0.9;
const SPEECH_ORB_LIFETIME = 1000 * 60 * 5; // 5mins realtime
const ORB_GROWTH_PER_TICK =
  (MAX_ORB_SIZE - MIN_ORB_SIZE) /
  ((MAX_SPEECH_TIME_FOR_EVENT - MIN_SPEECH_TIME_FOR_EVENT) / SPEECH_TIME_PER_TICK);

/// main code

const interval = setInterval(initMaxAdditions, 10);

function initMaxAdditions(scene) {
  if (!window.APP || !window.APP.scene) return;
  clearInterval(interval);
  console.log("!!!initMaxAdditions!!!");

  // when we receive a speech event from another client, call the appropriate handler
  NAF.connection.subscribeToDataChannel("startSpeech", startSpeech);
  NAF.connection.subscribeToDataChannel("stopSpeech", stopSpeech);

  // periodically poll for voice input to spawn utterances for this client
  setInterval(speechTick, SPEECH_TIME_PER_TICK);

  /*
  // spawn orb container
  const radius = ORB_CONTAINER_SIZE;
  const center = ORB_CONTAINER_POS;
  center[1] = ORB_CONTAINER_DEPTH / 2;
  const wallPositions = [
    `${center[0] - radius} ${center[1]} ${center[2]}`,
    `${center[0]} ${center[1]} ${center[2] - radius}`,
    `${center[0] + radius} ${center[1]} ${center[2]}`,
    `${center[0]} ${center[1]} ${center[2] + radius}`
  ];
  const wallOrientations = ["vert", "horiz", "vert", "horiz"];
  for (let i = 0; i < 4; i++) {
    const isVert = wallOrientations[i] === "vert";
    const wall = document.createElement("a-entity");
    wall.setAttribute("geometry", {
      primitive: "box",
      width: isVert ? "0.1" : radius * 2,
      height: ORB_CONTAINER_DEPTH,
      depth: isVert ? radius * 2 : "0.1"
    });
    wall.setAttribute("material", "color:white;transparent:true;opacity:0.5");
    wall.setAttribute("position", wallPositions[i]);
    wall.setAttribute("body-helper", {type: TYPE.STATIC});
    wall.setAttribute("shape-helper", {type: SHAPE.BOX});
    APP.scene.appendChild(wall);
  }
  */

  // give unhatted avatars hats
  // FIXME: don't poll for this, do it once on new user entry event
  setInterval(function() {
    for (let playerInfo of APP.componentRegistry["player-info"]) {
      spawnHat(playerInfo);
    }
  }, 1000);

  // disable multiple spawn on all super-spawners
  const spawners = document.querySelectorAll("[super-spawner].interactable");
  const cooldown = 1000 * 60 * 60 * 24 * 7; // one week is probably enough
  spawners.forEach(function(spawner) {
    console.log("disabling multiple spawn:", spawner);
    spawner.components["super-spawner"].data.spawnCooldown = cooldown;
  });
}


function spawnHat(playerInfo) {
  // bail out early if session ID not yet assigned
  if (!playerInfo.playerSessionId) return;

  // bail out early if avatar not yet loaded, or hat already present
  const avatar = playerInfo.el;
  if (!avatar.querySelector(".Spine")) return;
  if (avatar.querySelector(".hat")) return;

  // create, color, position, and scale the hat
  const hat = document.createElement("a-entity");
  hat.classList.add("hat");
  hat.setAttribute("geometry", "primitive:cylinder;radius:0.16;height:0.25");
  const color = sessionIDToColor(playerInfo.playerSessionId);
  hat.setAttribute("material", `color:${color};shader:flat`);
  hat.setAttribute("position", "0 0 0");

  // add the hat to the avatar
  avatar.querySelector(".Spine").appendChild(hat);

  return hat;
}


function sessionIDToColor(sessionID) {
  return "#" + sessionID.substring(0,6); // just use first 6 chars lol
}

function getPlayerInfo(sessionID) {
  const playerInfos = APP.componentRegistry["player-info"];
  return playerInfos.find(pi => pi.playerSessionId === sessionID);
}


let activeSpeechOrbs = {};

function startSpeech(senderId, dataType, data, targetId) {
  console.log("startSpeech", senderId, dataType, data, targetId);
  const activeOrb = activeSpeechOrbs[data.speaker];
  if (activeOrb) {
    activeOrb.classList.add("finished"); // FIXME replace w/ stopSpeech call for consistency?
  }
  const playerInfo = getPlayerInfo(data.speaker);
  const newOrb = spawnOrb(MIN_ORB_SIZE, sessionIDToColor(data.speaker));
  activeSpeechOrbs[data.speaker] = newOrb;

  // position the orb relative to the player and the center of the scene
  const centerObj = document.querySelector(".Table");
  const centerPos = centerObj
    ? centerObj.object3D.position.clone()
    : new THREE.Vector3(...ORB_CONTAINER_POS);
  centerPos.y = 3;
  const playerPos = playerInfo.el.object3D.position.clone();
  playerPos.y = 3;
  const offset = new THREE.Vector3().subVectors(playerPos, centerPos).normalize();
  const orbPos = new THREE.Vector3().addVectors(centerPos, offset);
  newOrb.setAttribute("position", orbPos);
}

function stopSpeech(senderId, dataType, data, targetId) {
  console.log("stopSpeech", senderId, dataType, data, targetId);
  const activeOrb = activeSpeechOrbs[data.speaker];
  if (activeOrb) {
    activeOrb.setAttribute("geometry", `primitive:cylinder;radius:0.1;height:${data.size}`);
    activeOrb.classList.add("finished");
    delete activeSpeechOrbs[data.speaker];
  }
}


function spawnOrb(size, color) {
  color = color || "yellow";
  console.log("spawnOrb", size, color);

  // create, color, position, and scale the orb
  //const pos = ORB_CONTAINER_POS;
  const orb = document.createElement("a-entity");
  orb.classList.add("speechOrb");
  orb.setAttribute("geometry", `primitive:cylinder;radius:0.1;height:${size}`);
  orb.setAttribute("material", `color:${color};shader:flat`);
  //orb.setAttribute("position", `${pos[0]} ${pos[1] + 5} ${pos[2]}`);

  /*
  // add physics and a collider
  orb.setAttribute("body-helper", {
    collisionFilterMask: COLLISION_LAYERS.ALL,
    gravity: {x: 0, y: -9.8, z: 0}
  });
  orb.setAttribute("shape-helper", {type: SHAPE.SPHERE});
  */

  // add the orb to the scene
  APP.scene.appendChild(orb);

  // queue the orb for deletion later
  setTimeout(() => orb.remove(), SPEECH_ORB_LIFETIME);

  return orb;
}


// track how much the local user is talking
let continuousSpeechTime = 0;
let continuousSpeechLeniencyTime = 0;

function doStopSpeech(speechTime) {
  const orbSize = scale(
    speechTime,
    MIN_SPEECH_TIME_FOR_EVENT,
    MAX_SPEECH_TIME_FOR_EVENT,
    MIN_ORB_SIZE,
    MAX_ORB_SIZE
  );
  const speaker = APP.componentRegistry["player-info"][0].playerSessionId;
  const eventData = {size: orbSize, speaker: speaker};
  stopSpeech(null, null, eventData); // local
  NAF.connection.broadcastData("stopSpeech", eventData); // networked
}

function speechTick() {
  const playerInfo = APP.componentRegistry["player-info"][0];
  const muted = playerInfo.data.muted;
  const localAudioAnalyser = window.APP.scene.systems["local-audio-analyser"];
  const speaking = !muted && localAudioAnalyser.volume > MIC_PRESENCE_VOLUME_THRESHOLD;

  // maintain speech event state of local user, send events as needed
  if (speaking) {
    if (continuousSpeechTime === 0) {
      // speech event started
      const eventData = {speaker: playerInfo.playerSessionId};
      startSpeech(null, null, eventData); // local
      NAF.connection.broadcastData("startSpeech", eventData); // networked
    }
    continuousSpeechTime += SPEECH_TIME_PER_TICK;
    continuousSpeechLeniencyTime = CONTINUOUS_SPEECH_LENIENCY_TIME;
    // if this is a single really long speech event, break it off and start a new one
    if (continuousSpeechTime >= MAX_SPEECH_TIME_FOR_EVENT) {
      doStopSpeech(continuousSpeechTime);
      continuousSpeechTime = 0;
    }
  }
  else {
    if (continuousSpeechLeniencyTime > 0) {
      continuousSpeechLeniencyTime -= SPEECH_TIME_PER_TICK;
    }
    if (continuousSpeechLeniencyTime <= 0
        && continuousSpeechTime >= MIN_SPEECH_TIME_FOR_EVENT) {
      // speech event ended
      doStopSpeech(continuousSpeechTime);
      continuousSpeechTime = 0;
    }
  }

  // update speech orb sizes and positions
  for (let finishedOrb of document.querySelectorAll(".speechOrb.finished")) {
    const pos = finishedOrb.getAttribute("position");
    pos.y += 0.001;
    finishedOrb.setAttribute("position", pos);
  }
  for (let activeOrb of Object.values(activeSpeechOrbs)) {
    const size = activeOrb.getAttribute("geometry").height + ORB_GROWTH_PER_TICK;
    activeOrb.setAttribute("geometry", `primitive:cylinder;radius:0.1;height:${size}`);
  }
}
