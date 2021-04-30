console.log("[ George's Module Loaded ]");

// Config

const BARGE_TICKRATE = 10;
const BARGE_SPEED = 1;
const BARGE_STARTING_POS = [10, 5, 5];
const BARGE_X_SIZE = 2;
const BARGE_Z_SIZE = 4;

// Main

let interval = null;
let barge = null;
let doMove = false;

function bargeTick() {
  if (!barge) {
    return;
  }

  if (doMove) {
    const currentPos = barge.getAttribute("position");

    barge.setAttribute("position", {
      x: currentPos.x + 0.001 * BARGE_SPEED,
      y: currentPos.y,
      z: currentPos.z
    });

    // get X/Z bounds of barge
    const bargeMinX = currentPos.x - BARGE_X_SIZE / 2;
    const bargeMaxX = currentPos.x + BARGE_X_SIZE / 2;
    const bargeMinZ = currentPos.z - BARGE_Z_SIZE / 2;
    const bargeMaxZ = currentPos.z + BARGE_Z_SIZE / 2;

    // check if local user's avatar inside barge X/Z column; move it along with the barge if so
    const avatar = APP.componentRegistry["player-info"][0].el;
    const pos = avatar.getAttribute("position");
    if (pos.x >= bargeMinX && pos.x <= bargeMaxX && pos.z >= bargeMinZ && pos.z <= bargeMaxZ) {
      pos.x += 0.001 * BARGE_SPEED;
      avatar.setAttribute("position", pos);
    }
  }
}

function spawnBarge() {
  if (!barge) {
    barge = document.createElement("a-entity");
    barge.setAttribute("position", BARGE_STARTING_POS);
    barge.setAttribute("geometry", {
      primitive: "box",
      width: BARGE_X_SIZE,
      height: 1,
      depth: BARGE_Z_SIZE
    });
    barge.setAttribute("material", {
      color: "white",
      shader: "flat"
    });

    setInterval(bargeTick, BARGE_TICKRATE);
    // eslint-disable-next-line no-undef
    APP.scene.appendChild(barge);
  }
}

function startBarge() {
  if (!barge) {
    return;
  }

  doMove = true;
}

function stopBarge() {
  if (!barge) {
    return;
  }

  doMove = false;
}

function init() {
  if (!window.APP || !window.APP.scene) {
    return;
  }

  clearInterval(interval);
  console.log("[ George's Module Initializing ]");

  spawnBarge();

  NAF.connection.subscribeToDataChannel("startBarge", startBarge);
  NAF.connection.subscribeToDataChannel("stopBarge", stopBarge);

  // make these fns available from the console. FIXME shouldn't need this outside of testing?
  window.startBarge = startBarge;
  window.stopBarge = stopBarge;
}

interval = setInterval(init, 10);
