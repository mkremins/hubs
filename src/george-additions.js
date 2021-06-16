import { Vector3 } from "three";
import { SOUND_SPAWN_EMOJI } from "./systems/sound-effects-system";
import { waitForDOMContentLoaded } from "./utils/async-utils";

let lastKeyChange = 0;
const positionTable = [];

AFRAME.registerSystem("socialvr-barge", {
  init() {
    this.barge = null;
  },

  registerBarge(ent) {
    if (this.barge != null) {
      this.barge.remove();
    }

    this.barge = ent;

    for (let i = 1; i < 100; i++) {
      const wpname = "Waypoint_" + i;
      const wp = document.querySelector("." + wpname);

      if (wp) {
        positionTable.push(wp.object3D.position);
      }
    }

    console.log(`Registered ${positionTable.length} waypoints for the barge.`);

    if (positionTable.length < 1) {
      console.warn("No waypoints found!");
      console.warn("Registering some default waypoints for the barge.");

      positionTable.push(new Vector3(25, 0, 0));
      positionTable.push(new Vector3(25, 0, 25));
      positionTable.push(new Vector3(0, 25, 0));
      positionTable.push(new Vector3(0, 0, 0));
    }

    // We need to push a blank vector for the end.
    positionTable.push(new Vector3(0, 0, 0));

    console.log(positionTable);

    ent.el.emit("bargeregistered", { bargeEnt: ent });

    // Util
    //window.startBarge = this.barge.startBarge.bind(this.barge);
    //window.stopBarge = this.barge.stopBarge.bind(this.barge);
    //window.resetBarge = this.barge.resetBarge.bind(this.barge);
  },

  unregisterBarge() {
    this.barge = null;
  }
});

// Barge Component
AFRAME.registerComponent("socialvr-barge", {
  schema: {
    width: { type: "number", default: 4 },
    height: { type: "number", default: 1 },
    depth: { type: "number", default: 4 },
    speed: { type: "number", default: 1 },
    moving: { type: "boolean", default: false },
    targetKey: { type: "number", default: 0 }
  },

  init() {
    // Mesh
    this.geometry = new THREE.BoxBufferGeometry(this.data.width, this.data.height, this.data.depth);
    this.material = new THREE.MeshStandardMaterial({ color: "#AAA" });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.directionVec3 = new THREE.Vector3();

    this.el.setObject3D("mesh", this.mesh);
    this.el.addEventListener("startBargeEvent", this.startBarge.bind(this));
    this.el.addEventListener("stopBargeEvent", this.stopBarge.bind(this));
    this.el.addEventListener("resetBargeEvent", this.resetBarge.bind(this));

    NAF.connection.subscribeToDataChannel("startBarge", this._startBarge.bind(this));
    NAF.connection.subscribeToDataChannel("stopBarge", this._stopBarge.bind(this));
    NAF.connection.subscribeToDataChannel("resetBarge", this._resetBarge.bind(this));

    this.system.registerBarge(this);
  },

  remove() {
    this.el.removeObject3D("mesh");
    this.system.unregisterBarge();
  },

  tick(time, timeDelta) {
    if (this.data.moving) {
      const currentPosition = this.el.object3D.position;
      const targetPosition = positionTable[this.data.targetKey];
      const directionVec3 = this.directionVec3;

      if (!targetPosition) {
        return;
      }

      directionVec3.copy(targetPosition).sub(currentPosition);
      const distance = directionVec3.length();

      // Only move if the distance is enough to consider moving.
      if (currentPosition.distanceToSquared(targetPosition) > 1) {
        const factor = this.data.speed / distance;

        ["x", "y", "z"].forEach(function(axis) {
          directionVec3[axis] *= factor * (timeDelta / 1000);
        });

        this.el.setAttribute("position", {
          x: currentPosition.x + directionVec3.x,
          y: currentPosition.y + directionVec3.y,
          z: currentPosition.z + directionVec3.z
        });

        // Move avatar with the barge.
        const bargeMinX = currentPosition.x - this.data.width / 2;
        const bargeMaxX = currentPosition.x + this.data.width / 2;
        const bargeMinZ = currentPosition.z - this.data.depth / 2;
        const bargeMaxZ = currentPosition.z + this.data.depth / 2;

        // const characterController = AFRAME.scenes[0].systems["hubs-systems"].characterController;
        const avatar = window.APP.componentRegistry["player-info"][0].el;
        const avatarPosition = avatar.getAttribute("position");

        if (
          avatarPosition.x >= bargeMinX &&
          avatarPosition.x <= bargeMaxX &&
          avatarPosition.z >= bargeMinZ &&
          avatarPosition.z <= bargeMaxZ
        ) {
          avatar.setAttribute("position", {
            x: avatarPosition.x + directionVec3.x,
            y: avatarPosition.y + directionVec3.y,
            z: avatarPosition.z + directionVec3.z
          });
        }
      } else {
        if (lastKeyChange) {
          if (time >= lastKeyChange) {
            lastKeyChange = time + 100;
            this.data.targetKey = this.data.targetKey + 1;
            console.log("GOING TO NEW POSITION!");
            console.log("TARGET KEY: " + this.data.targetKey);
            console.log("TARGET POSITION: " + JSON.stringify(targetPosition));
          } else {
            console.log("I'm not allowed to do that yet!!!");
            console.log("LAST KEY CHANGE: " + lastKeyChange);
            console.log("TIME: " + time);
          }
        } else {
          // First time we're setting the key.
          lastKeyChange = time + 100;
          this.data.targetKey = this.data.targetKey + 1;
          console.log("GOING TO NEW POSITION!");
          console.log("TARGET KEY: " + this.data.targetKey);
          console.log("TARGET POSITION: " + JSON.stringify(targetPosition));
        }
      }
    }
  },

  // eslint-disable-next-line no-unused-vars
  _startBarge(senderId, dataType, data, targetId) {
    this.data.moving = true;
  },

  // eslint-disable-next-line no-unused-vars
  _stopBarge(senderId, dataType, data, targetId) {
    this.data.moving = false;
  },

  // eslint-disable-next-line no-unused-vars
  _resetBarge(senderId, dataType, data, targetId) {
    this.data.moving = false;
    this.data.targetKey = 0;
    this.el.setAttribute("position", { x: 0, y: 0, z: 0 });
  },

  startBarge() {
    console.log("Barge - Starting");

    this._startBarge(null, null, {});
    NAF.connection.broadcastData("startBarge", {});
  },

  stopBarge() {
    console.log("Barge - Stopping");

    this._stopBarge(null, null, {});
    NAF.connection.broadcastData("stopBarge", {});
  },

  resetBarge() {
    console.log("Barge - Resetting");

    this._resetBarge(null, null, {});
    NAF.connection.broadcastData("resetBarge", {});
  }
});

// Reset Button Component
AFRAME.registerComponent("socialvr-barge-button-reset", {
  init() {
    this.onClick = this.onClick.bind(this);
    this.el.object3D.addEventListener("interact", this.onClick);
  },

  onClick: function() {
    this.el.emit("resetBargeEvent");
    this.el.sceneEl.systems["hubs-systems"].soundEffectsSystem.playPositionalSoundFollowing(
      SOUND_SPAWN_EMOJI,
      this.el.object3D
    );
  }
});

// Go Button Component
AFRAME.registerComponent("socialvr-barge-button-go", {
  init() {
    this.onClick = this.onClick.bind(this);
    this.el.object3D.addEventListener("interact", this.onClick);
  },

  onClick: function() {
    this.el.emit("startBargeEvent");
    this.el.sceneEl.systems["hubs-systems"].soundEffectsSystem.playPositionalSoundFollowing(
      SOUND_SPAWN_EMOJI,
      this.el.object3D
    );
  }
});

// Stop Button Component
AFRAME.registerComponent("socialvr-barge-button-stop", {
  init() {
    this.onClick = this.onClick.bind(this);
    this.el.object3D.addEventListener("interact", this.onClick);
  },

  onClick: function() {
    this.el.emit("stopBargeEvent");
    this.el.sceneEl.systems["hubs-systems"].soundEffectsSystem.playPositionalSoundFollowing(
      SOUND_SPAWN_EMOJI,
      this.el.object3D
    );
  }
});

waitForDOMContentLoaded().then(() => {
  setTimeout(function() {
    const sceneEl = document.querySelector("a-scene");
    const bargeEl = document.createElement("a-entity");

    bargeEl.setAttribute("socialvr-barge", "");
    bargeEl.addEventListener("bargeregistered", function(event) {
      const bargeEl = event.detail.bargeEnt.el;

      /** 
      // Reset Button
      */
      const buttonResetEl = document.createElement("a-sphere");
      const buttonResetTextEl = document.createElement("a-entity");

      buttonResetEl.setAttribute("radius", "0.15");
      buttonResetEl.setAttribute("material", "color: #3B56DC");
      buttonResetEl.setAttribute("socialvr-barge-button-reset", "");
      buttonResetEl.setAttribute("is-remote-hover-target", "");
      buttonResetEl.setAttribute("hoverable-visuals", "");
      buttonResetEl.setAttribute("tags", "singleActionButton: true");
      buttonResetEl.setAttribute("css-class", "interactable");
      /**
      buttonResetEl.setAttribute("animation", {
        property: "rotation",
        to: "0, 360, 0",
        easing: "linear",
        loop: true,
        dur: 10000
      });
      */
      buttonResetEl.setAttribute("position", {
        x: bargeEl.object3D.position.x + (2 - 0.2),
        y: bargeEl.object3D.position.y + 1,
        z: bargeEl.object3D.position.z // Center
      });

      // Go Button - Text
      buttonResetTextEl.setAttribute("text", "value: RESET; align: center;");
      buttonResetTextEl.setAttribute("rotation", "0 270 0");
      buttonResetTextEl.setAttribute("position", "0 0.2 0");

      buttonResetEl.appendChild(buttonResetTextEl);
      bargeEl.appendChild(buttonResetEl);

      /** 
      // Go Button
      */
      const buttonGoEl = document.createElement("a-sphere");
      const buttonGoTextEl = document.createElement("a-entity");

      buttonGoEl.setAttribute("radius", "0.15");
      buttonGoEl.setAttribute("material", "color: #32CD32");
      buttonGoEl.setAttribute("socialvr-barge-button-go", "");
      buttonGoEl.setAttribute("is-remote-hover-target", "");
      buttonGoEl.setAttribute("hoverable-visuals", "");
      buttonGoEl.setAttribute("tags", "singleActionButton: true");
      buttonGoEl.setAttribute("css-class", "interactable");
      /**
      buttonGoEl.setAttribute("animation", {
        property: "rotation",
        to: "0, 360, 0",
        easing: "linear",
        loop: true,
        dur: 10000
      });
      */
      buttonGoEl.setAttribute("position", {
        x: bargeEl.object3D.position.x + (2 - 0.2),
        y: bargeEl.object3D.position.y + 1,
        z: bargeEl.object3D.position.z + 1 // Right
      });

      // Go Button - Text
      buttonGoTextEl.setAttribute("text", "value: GO; align: center;");
      buttonGoTextEl.setAttribute("rotation", "0 270 0");
      buttonGoTextEl.setAttribute("position", "0 0.2 0");

      buttonGoEl.appendChild(buttonGoTextEl);
      bargeEl.appendChild(buttonGoEl);

      /** 
      // Stop Button
      */
      const buttonStopEl = document.createElement("a-sphere");
      const buttonStopTextEl = document.createElement("a-entity");

      buttonStopEl.setAttribute("radius", "0.15");
      buttonStopEl.setAttribute("material", "color: #FF0000");
      buttonStopEl.setAttribute("socialvr-barge-button-stop", "");
      buttonStopEl.setAttribute("is-remote-hover-target", "");
      buttonStopEl.setAttribute("hoverable-visuals", "");
      buttonStopEl.setAttribute("tags", "singleActionButton: true");
      buttonStopEl.setAttribute("css-class", "interactable");
      /**
          buttonStopEl.setAttribute("animation", {
            property: "rotation",
            to: "0, 360, 0",
            easing: "linear",
            loop: true,
            dur: 10000
          });
          */
      buttonStopEl.setAttribute("position", {
        x: bargeEl.object3D.position.x + (2 - 0.2),
        y: bargeEl.object3D.position.y + 1,
        z: bargeEl.object3D.position.z - 1 // Left
      });

      // Stop Button - Text
      buttonStopTextEl.setAttribute("text", "value: STOP; align: center;");
      buttonStopTextEl.setAttribute("rotation", "0 270 0");
      buttonStopTextEl.setAttribute("position", "0 0.2 0");

      buttonStopEl.appendChild(buttonStopTextEl);
      bargeEl.appendChild(buttonStopEl);
    });

    sceneEl.appendChild(bargeEl);
  }, 1000);
});
