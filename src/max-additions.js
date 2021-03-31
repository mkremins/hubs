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
}


function handleUtterance(senderId, dataType, data, targetId) {
  console.log(senderId, dataType, data, targetId);
  spawnOrb(data, "red");
}


function spawnOrb(size, color) {
  color = color || "yellow";
  console.log("spawnOrb", size, color);

  // get the avatar position for orb placement
  const playerInfo = APP.componentRegistry["player-info"][0];
  const avatar = playerInfo.el.object3D;

  // create, color, position, and scale the orb
  const orb = document.createElement("a-entity");
  orb.setAttribute("geometry", "primitive:sphere");
  orb.setAttribute("material", `color:${color};shader:flat`);
  orb.setAttribute("position", `0 5 0`);
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
