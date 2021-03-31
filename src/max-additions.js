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
const SPEECH_ORB_LIFETIME = 10000;
const MIN_SPEECH_TICKS_FOR_EVENT = 10;
const CONTINUOUS_SPEECH_LENIENCY_TICKS = 5;

/// main code

const interval = setInterval(initMaxAdditions, 10);

function initMaxAdditions(scene) {
  if (!window.APP || !window.APP.scene) return;
  clearInterval(interval);
  console.log("!!!initMaxAdditions!!!");

  // add the speechOrb template to the DOM
  const assetsEl = document.querySelector("a-assets");
  const orbTemplate = createElement(`
  <template id="speechOrb-drawing">
    <a-entity class="speechOrb"
              geometry="primitive:sphere"
              material="color:yellow;shader:flat">
    </a-entity>
  </template>
  `);
  assetsEl.appendChild(orbTemplate);

  // add a NAF schema to sync physics + color across network
  NAF.schemas.add({
    template: "#speechOrb-drawing",
    components: [
      "position", "rotation", "scale", "material", "body-helper",
    ]
  });

  setInterval(speechTick, 20);
}


function spawnOrb(size, color) {
  color = color || "red";
  console.log("spawnOrb", size, color);

  // get the avatar position for orb placement
  const playerInfo = APP.componentRegistry["player-info"][0];
  const avatar = playerInfo.el.object3D;

  // create, color, position, and scale the orb
  const orb = document.createElement("a-entity");
  orb.setAttribute("networked", "template:#speechOrb-drawing");
  orb.setAttribute("material", `color:${color};shader:flat`); // FIXME doesn't work
  orb.setAttribute("position", `${avatar.position.x} 3 ${avatar.position.z}`);
  orb.setAttribute("scale", `${size} ${size} ${size}`);

  /*
  // add physics (FIXME wow this is broken)
  orb.setAttribute("body-helper", {
    //collisionFilterMask: -1, // FIXME doesn't actually collide with anything i think
    gravity: {x: 0, y: -1, z: 0}
  });
  */

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
  const localAudioAnalyser = window.APP.scene.systems["local-audio-analyser"];
  const speaking = localAudioAnalyser.volume > MIC_PRESENCE_VOLUME_THRESHOLD;
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
      spawnOrb(ticksOfContinuousSpeech * 0.01);
      ticksOfContinuousSpeech = 0;
    }
  }
}
