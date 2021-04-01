import { COLLISION_LAYERS } from "./constants";
import { SHAPE, TYPE } from "three-ammo/constants";

console.log("!!!max-additions.js!!!");

/// utils

function createElement(htmlString) {
  var div = document.createElement('div');
  div.innerHTML = htmlString.trim();
  return div.firstChild; 
}

function randInt(min, max) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min) + min); // max exclusive, min inclusive
}

/// constants

const MIC_PRESENCE_VOLUME_THRESHOLD = 0.00001;
const SPEECH_ORB_LIFETIME = 1000 * 30;
const MIN_SPEECH_TICKS_FOR_EVENT = 10;
const CONTINUOUS_SPEECH_LENIENCY_TICKS = 5;
const ORB_CONTAINER_POS = [7,0,2]; //[0,0,0]
const ORB_CONTAINER_SIZE = 1;
const ORB_CONTAINER_DEPTH = 4;

/// main code

const interval = setInterval(initMaxAdditions, 10);

function initMaxAdditions(scene) {
  if (!window.APP || !window.APP.scene) return;
  clearInterval(interval);
  console.log("!!!initMaxAdditions!!!");

  // when we receive an utterance from another client, call handleUtterance
  NAF.connection.subscribeToDataChannel("utterance", handleUtterance);

  // periodically poll for voice input to spawn utterances for this client
  setInterval(speechTick, 20);

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
    wall.setAttribute("material", "color:orange;transparent:true;opacity:0.5");
    wall.setAttribute("position", wallPositions[i]);
    wall.setAttribute("body-helper", {type: TYPE.STATIC});
    wall.setAttribute("shape-helper", {type: SHAPE.BOX});
    APP.scene.appendChild(wall);
  }
}


function handleUtterance(senderId, dataType, data, targetId) {
  console.log(senderId, dataType, data, targetId);
  spawnOrb(data, "red");
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
  orb.setAttribute("geometry", "primitive:sphere");
  orb.setAttribute("material", `color:${color};shader:flat`);
  orb.setAttribute("position", `${pos[0]} ${pos[1] + 5} ${pos[2]}`);
  orb.setAttribute("scale", `${size} ${size} ${size}`);

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
let continuousSpeechLeniencyTicks = 0;
let ticksOfContinuousSpeech = 0;

function speechTick() {
  const playerInfo = APP.componentRegistry["player-info"][0];
  const muted = playerInfo.data.muted;
  const localAudioAnalyser = window.APP.scene.systems["local-audio-analyser"];
  const speaking = !muted && localAudioAnalyser.volume > MIC_PRESENCE_VOLUME_THRESHOLD;
  if (speaking) {
    ticksOfContinuousSpeech += 1;
    continuousSpeechLeniencyTicks = CONTINUOUS_SPEECH_LENIENCY_TICKS;
  }
  else {
    if (continuousSpeechLeniencyTicks > 0) {
      continuousSpeechLeniencyTicks -= 1;
    }
    if (continuousSpeechLeniencyTicks <= 0
        && ticksOfContinuousSpeech >= MIN_SPEECH_TICKS_FOR_EVENT) {
      // speech event ended
      const orbSize = ticksOfContinuousSpeech * 0.005;
      spawnOrb(orbSize);
      NAF.connection.broadcastData("utterance", orbSize);
      ticksOfContinuousSpeech = 0;
    }
  }
}
