console.log("[ George's Module Loaded ]");

// Config

const BARGE_TICKRATE = 10;
const BARGE_SPEED = 1;
const BARGE_STARTING_POS = [10, 5, 5];

// Main

let interval = null;
let barge = null;
let doMove = true;

function bargeTick() {
  if (!barge) {
    return;
  }

  if (doMove) {
    const currentPos = barge.getAttribute("position");

    barge.setAttribute("position", {
      x: currentPos.x,
      y: currentPos.y + 0.001 * BARGE_SPEED,
      z: currentPos.z
    });
  }
}

function spawnBarge() {
  if (!barge) {
    barge = document.createElement("a-entity");
    barge.setAttribute("position", BARGE_STARTING_POS);
    barge.setAttribute("geometry", {
      primitive: "box",
      width: 2,
      height: 1,
      depth: 4
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
}

interval = setInterval(init, 10);
