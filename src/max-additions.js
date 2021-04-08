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
const SPEECH_ORB_LIFETIME = 1000 * 30;

/// main code

const interval = setInterval(initMaxAdditions, 10);

function initMaxAdditions(scene) {
  if (!window.APP || !window.APP.scene) return;
  clearInterval(interval);
  console.log("!!!initMaxAdditions!!!");

  // when we receive an utterance from another client, call handleUtterance
  NAF.connection.subscribeToDataChannel("utterance", handleUtterance);

  // periodically poll for voice input to spawn utterances for this client
  setInterval(speechTick, SPEECH_TIME_PER_TICK);

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

  // give unhatted avatars hats
  // FIXME: don't poll for this, do it once on new user entry event
  setInterval(function() {
    for (let playerInfo of APP.componentRegistry["player-info"]) {
      spawnHat(playerInfo);
    }
  }, 1000);
}


function spawnHat(playerInfo) {
  // bail out early if hat already present
  const avatar = playerInfo.el;
  if (avatar.querySelector(".hat")) return;

  // create, color, position, and scale the hat
  const hat = document.createElement("a-entity");
  hat.classList.add("hat");
  hat.setAttribute("geometry", "primitive:cylinder;radius:0.15;height:0.1");
  const color = sessionIDToColor(playerInfo.playerSessionId);
  hat.setAttribute("material", `color:${color};shader:flat`);
  hat.setAttribute("position", "0 1.8 0");

  // add the hat to the avatar
  avatar.appendChild(hat);

  return hat;
}


function sessionIDToColor(sessionID) {
  return "#" + sessionID.substring(0,6); // just use first 6 chars lol
}


function handleUtterance(senderId, dataType, data, targetId) {
  console.log(senderId, dataType, data, targetId);
  spawnOrb(data.size, sessionIDToColor(data.speaker));
}


function spawnOrb(size, color) {
  color = color || "yellow";
  console.log("spawnOrb", size, color);

  /*
  // get the avatar position for orb placement
  const playerInfo = APP.componentRegistry["player-info"][0];
  const avatar = playerInfo.el.object3D;
  */

  // create, color, position, and scale the orb
  const pos = ORB_CONTAINER_POS;
  const orb = document.createElement("a-entity");
  orb.setAttribute("geometry", `primitive:sphere;radius:${size}`);
  orb.setAttribute("material", `color:${color};shader:flat`);
  orb.setAttribute("position", `${pos[0]} ${pos[1] + 5} ${pos[2]}`);

  // add physics and a collider
  orb.setAttribute("body-helper", {
    collisionFilterMask: COLLISION_LAYERS.ALL,
    gravity: {x: 0, y: -9.8, z: 0}
  });
  orb.setAttribute("shape-helper", {type: SHAPE.SPHERE});

  // add the orb to the scene
  APP.scene.appendChild(orb);

  // queue the orb for deletion later
  setTimeout(() => orb.remove(), SPEECH_ORB_LIFETIME);

  return orb;
}


// track how much the local user is talking
let continuousSpeechTime = 0;
let continuousSpeechLeniencyTime = 0;

function doSpeechEvent(speechTime) {
  const orbSize = scale(
    speechTime,
    MIN_SPEECH_TIME_FOR_EVENT,
    MAX_SPEECH_TIME_FOR_EVENT,
    MIN_ORB_SIZE,
    MAX_ORB_SIZE
  );
  const speaker = APP.componentRegistry["player-info"][0].playerSessionId;
  spawnOrb(orbSize, sessionIDToColor(speaker));
  NAF.connection.broadcastData("utterance", {size: orbSize, speaker: speaker});
}

function speechTick() {
  const playerInfo = APP.componentRegistry["player-info"][0];
  const muted = playerInfo.data.muted;
  const localAudioAnalyser = window.APP.scene.systems["local-audio-analyser"];
  const speaking = !muted && localAudioAnalyser.volume > MIC_PRESENCE_VOLUME_THRESHOLD;
  if (speaking) {
    continuousSpeechTime += SPEECH_TIME_PER_TICK;
    continuousSpeechLeniencyTime = CONTINUOUS_SPEECH_LENIENCY_TIME;
    // if this is a single really long speech event, break it off and start a new one
    if (continuousSpeechTime >= MAX_SPEECH_TIME_FOR_EVENT) {
      doSpeechEvent(continuousSpeechTime);
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
      doSpeechEvent(continuousSpeechTime);
      continuousSpeechTime = 0;
    }
  }
}
