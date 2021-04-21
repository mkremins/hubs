// Useful Links
// https://github.com/mozilla/hubs/blob/f7a74cab8ba6babdbe188d7755ce46764fc1bac3/doc/creating-networked-interactables.md#creating-new-networked-interactables

import { COLLISION_LAYERS } from "./constants";
import { SHAPE, TYPE } from "three-ammo/constants";

console.log("[ George's Module Loaded ]");

// Utility

function createElement(htmlString) {
  const div = document.createElement("div");
  div.innerHTML = htmlString.trim();

  return div.firstChild;
}

// Config

const BARGE_TICKRATE = 10;
const BARGE_SPEED = 1;
const BARGE_STARTING_POS = [10, 5, 5];

// Main

let interval = null;
let barge = null;
const doMove = true;

function bargeTick() {
  if (!barge) {
    return;
  }

  // Make a button to toggle this?
  if (doMove) {
    let currentPos = barge.getAttribute("position");
    currentPos = { x: currentPos.x, y: currentPos.y + 0.001 * BARGE_SPEED, z: currentPos.z };

    barge.setAttribute("position", currentPos);
    console.log(barge.getAttribute("position"));
  }
}

function init(scene) {
  if (!window.APP || !window.APP.scene) {
    return;
  }

  console.log("[ George's Module Initializing ]");
  clearInterval(interval);

  setInterval(bargeTick, BARGE_TICKRATE);
  barge = document.createElement("a-entity");

  // Need to make sure this networks properly.
  // I think it won't sync fully until it gets added to hubs.html? Still investigating.

  barge.setAttribute("geometry", {
    primitive: "box",
    width: 2,
    height: 1,
    depth: 4
  });

  barge.setAttribute("material", { color: "white" });
  barge.setAttribute("position", BARGE_STARTING_POS);
  barge.setAttribute("body-helper", {
    type: TYPE.DYNAMIC,
    mass: 1,
    collisionFilterGroup: COLLISION_LAYERS.INTERACTABLES,
    collisionFilterMask: COLLISION_LAYERS.DEFAULT_INTERACTABLE
  });
  barge.setAttribute("shape-helper", {
    type: SHAPE.BOX
  });
  barge.setAttribute("set-unowned-body-kinematic", "");
  barge.setAttribute("floaty-object", {
    modifyGravityOnRelease: false,
    autoLockOnLoad: true,
    gravitySpeedLimit: 0,
    reduceAngularFloat: true
  });

  APP.scene.appendChild(barge);
}

interval = setInterval(init, 10);
