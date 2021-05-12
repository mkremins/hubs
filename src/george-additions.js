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

    // Networking
    NAF.connection.subscribeToDataChannel("startBarge", this.barge._startBarge);
    NAF.connection.subscribeToDataChannel("stopBarge", this.barge._stopBarge);
    NAF.connection.subscribeToDataChannel("resetBarge", this.barge._resetBarge);

    // Util
    //window.startBarge = this.barge.startBarge.bind(this.barge);
    //window.stopBarge = this.barge.stopBarge.bind(this.barge);
    //window.resetBarge = this.barge.resetBarge.bind(this.barge);
  },

  unregisterBarge() {
    this.barge = null;

    NAF.connection.unsubscribeToDataChannel("startBarge");
    NAF.connection.unsubscribeToDataChannel("stopBarge");
    NAF.connection.unsubscribeToDataChannel("resetBarge");
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

// Go Button Component
AFRAME.registerComponent("socialvr-barge-button-go", {
  schema: {
    barge: { type: "selector", default: "a-entity[socialvr-barge]" }
  },

  init() {
    this.onClick = this.onClick.bind(this);
    this.el.object3D.addEventListener("interact", this.onClick);
  },

  onClick: function() {
    this.el.emit("startBargeEvent");
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
    const buttonGoEl = document.createElement("a-box");
    const buttonGoElText = document.createElement("a-entity");

    // Go Button
    buttonGoEl.setAttribute("width", "0.2");
    buttonGoEl.setAttribute("height", "0.2");
    buttonGoEl.setAttribute("depth", "0.2");
    buttonGoEl.setAttribute("material", "color: #27AE60");
    buttonGoEl.setAttribute("socialvr-barge-button-go", "");
    buttonGoEl.setAttribute("is-remote-hover-target", "");
    buttonGoEl.setAttribute("tags", "singleActionButton: true");
    buttonGoEl.setAttribute("css-class", "interactable");
    buttonGoEl.setAttribute("animation", {
      property: "rotation",
      to: "0, 360, 0",
      easing: "linear",
      loop: true,
      dur: 10000
    });
    buttonGoEl.setAttribute("position", {
      x: bargeEl.object3D.position.x + (2 - 0.2),
      y: bargeEl.object3D.position.y + 1,
      z: bargeEl.object3D.position.z
    });

    // Text
    buttonGoElText.setAttribute("text", "value: GO; align: center;");
    buttonGoElText.setAttribute("rotation", "0 180 0");
    buttonGoElText.setAttribute("position", "0 0.2 0");

    buttonGoEl.appendChild(buttonGoElText);
    bargeEl.appendChild(buttonGoEl);

    // Bind functions after parenting
    buttonGoElText.setAttribute("barge", "0 0.2 0");
    buttonGoEl.setAttribute("barge", event.detail.bargeEnt);
  });

  sceneEl.appendChild(bargeEl);
});
