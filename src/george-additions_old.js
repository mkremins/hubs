console.log("[ George's Module Loaded ]");

// Config

const BARGE_TICKRATE = 10;
const BARGE_STARTING_POS = [10, 5, 5];
const BARGE_X_SIZE = 2;
const BARGE_Z_SIZE = 4;
let BARGE_SPEED = 1;

// Main

let interval = null;
let barge = null;
const controls = null;
let doMove = false;

function bargeTick() {
  if (barge) {
    const currentPos = barge.getAttribute("position");

    if (doMove) {
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
      // eslint-disable-next-line no-undef
      const avatar = APP.componentRegistry["player-info"][0].el;
      const pos = avatar.getAttribute("position");

      if (pos.x >= bargeMinX && pos.x <= bargeMaxX && pos.z >= bargeMinZ && pos.z <= bargeMaxZ) {
        pos.x += 0.001 * BARGE_SPEED;
        avatar.setAttribute("position", pos);
      }

      if (controls) {
        barge.setAttribute("position", {
          x: currentPos.x,
          y: currentPos.y + 1,
          z: currentPos.z
        });
      }
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

    /**
    if (!controls) {
      controls = document.createElement("a-entity");
      controls.classList.add("hud penhud");
      controls.setAttribute("position", BARGE_STARTING_POS);
      controls.setAttribute("material", "alphaTest:0.1");
      controls.setAttribute("is-remote-hover-target");
      controls.setAttribute("sprite");
      controls.setAttribute("icon-button", {
        tooltip: "#hud-tooltip",
        tooltipText: "Pen",
        activeTooltipText: "Pen",
        image: "pen_off.png",
        hoverImage: "pen_off-hover.png",
        activeImage: "pen_on.png",
        activeHoverImage: "pen_on-hover.png",
        disabledImage: "pen_off-disabled.png"
      });
      controls.setAttribute("scale", {
        x: 0.2,
        y: 0.2,
        z: 0.2
      });

      // eslint-disable-next-line no-undef
      // APP.scene.appendChild(controls);
    } else {
      console.warn("Cannot Create: Barge Controls already exists.");
    }
    */
  } else {
    console.warn("Cannot Create: Barge already exists.");
  }
}

function startBarge(senderId, dataType, data, targetId) {
  console.log("startBarge", senderId, dataType, data, targetId);

  doMove = true;
}

function stopBarge(senderId, dataType, data, targetId) {
  console.log("stopBarge", senderId, dataType, data, targetId);

  doMove = false;
}

function setBargeSpeed(senderId, dataType, data, targetId) {
  console.log("setBargeSpeed", senderId, dataType, data, targetId);

  BARGE_SPEED = data.speed;
}

function doStartBarge() {
  if (!barge) {
    console.warn("Cannot Start: Barge is non-existant.");
    return;
  }

  const eventData = { startedAt: barge.getAttribute("position") };
  startBarge(null, null, eventData); // local
  NAF.connection.broadcastData("startBarge", eventData); // networked
}

function doStopBarge() {
  if (barge) {
    const eventData = { stoppedAt: barge.getAttribute("position") };

    stopBarge(null, null, eventData); // local
    NAF.connection.broadcastData("startBarge", eventData); // networked
  } else {
    console.warn("Cannot Stop: Barge is non-existant.");
  }
}

function doSetBargeSpeed(amount) {
  if (barge) {
    const s = parseFloat(amount);

    if (isNaN(s)) {
      console.warn("Cannot Change Speed: Desired Speed is NaN.");
    } else {
      const eventData = { speed: s };

      setBargeSpeed(null, null, eventData); // local
      NAF.connection.broadcastData("setBargeSpeed", eventData); // networked
    }
  } else {
    console.warn("Cannot Change Speed: Barge is non-existant.");
  }
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
  NAF.connection.subscribeToDataChannel("setBargeSpeed", setBargeSpeed);

  // make these fns available from the console. FIXME shouldn't need this outside of testing?
  window.startBarge = doStartBarge;
  window.stopBarge = doStopBarge;
  window.setBargeSpeed = doSetBargeSpeed;
}

interval = setInterval(init, 10);
