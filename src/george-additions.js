import { SOUND_PIN } from "./systems/sound-effects-system";

AFRAME.registerSystem("socialvr-barge", {
  init() {
    this.barge = null;
  },

  registerBarge(ent) {
    if (this.barge != null) {
      this.barge.remove();
    }

    this.barge = ent;
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
    moving: { type: "boolean", default: false }
  },

  init() {
    // Mesh
    this.geometry = new THREE.BoxBufferGeometry(this.data.width, this.data.height, this.data.depth);
    this.material = new THREE.MeshStandardMaterial({ color: "#AAA" });
    this.mesh = new THREE.Mesh(this.geometry, this.material);

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

      // Move the barge.
      this.el.setAttribute("position", {
        x: currentPosition.x + (this.data.speed / 1000) * timeDelta,
        y: currentPosition.y,
        z: currentPosition.z
      });

      // Move avatar with the barge.
      const bargeMinX = currentPosition.x - this.data.width / 2;
      const bargeMaxX = currentPosition.x + this.data.width / 2;
      const bargeMinZ = currentPosition.z - this.data.depth / 2;
      const bargeMaxZ = currentPosition.z + this.data.depth / 2;

      const avatar = window.APP.componentRegistry["player-info"][0].el;
      const avatarPosition = avatar.getAttribute("position");

      if (
        avatarPosition.x >= bargeMinX &&
        avatarPosition.x <= bargeMaxX &&
        avatarPosition.z >= bargeMinZ &&
        avatarPosition.z <= bargeMaxZ
      ) {
        avatarPosition.x = avatarPosition.x + (this.data.speed / 1000) * timeDelta;
        avatar.setAttribute("position", avatarPosition);
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
    this.el.sceneEl.systems["hubs-systems"].soundEffectsSystem.playSoundOneShot(SOUND_PIN);
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
    this.el.sceneEl.systems["hubs-systems"].soundEffectsSystem.playSoundOneShot(SOUND_PIN);
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
    this.el.sceneEl.systems["hubs-systems"].soundEffectsSystem.playSoundOneShot(SOUND_PIN);
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const sceneEl = document.querySelector("a-scene");
  const bargeEl = document.createElement("a-entity");

  bargeEl.setAttribute("socialvr-barge", "");
  bargeEl.addEventListener("bargeregistered", function(event) {
    // console.log("NEW ENT REGISTERED", event.detail.bargeEnt);
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
});
