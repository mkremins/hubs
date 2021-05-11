AFRAME.registerSystem("socialvr-barge", {
  init() {
    this.barge = null;
  },

  registerBarge(ent) {
    if (this.barge != null) {
      this.barge.remove();
    }

    this.barge = ent;

    // Networking
    NAF.connection.subscribeToDataChannel("startBarge", this.barge._startBarge);
    NAF.connection.subscribeToDataChannel("stopBarge", this.barge._stopBarge);
    NAF.connection.subscribeToDataChannel("resetBarge", this.barge._resetBarge);

    // Util
    window.startBarge = this.barge.startBarge.bind(this.barge);
    window.stopBarge = this.barge.stopBarge.bind(this.barge);
    window.resetBarge = this.barge.resetBarge.bind(this.barge);
  },

  unregisterBarge() {
    this.barge = null;

    NAF.connection.unsubscribeToDataChannel("startBarge");
    NAF.connection.unsubscribeToDataChannel("stopBarge");
    NAF.connection.unsubscribeToDataChannel("resetBarge");
  }
});

AFRAME.registerComponent("socialvr-barge-button-go", {
  init() {
    this.geometry = new THREE.BoxBufferGeometry(1, 1, 1);
    this.material = new THREE.MeshStandardMaterial({ color: "#27AE60" });
    this.mesh = new THREE.Mesh(this.geometry, this.material);

    this.el.setObject3D("mesh", this.mesh);
    this.el.classList.add("interactable");
  },

  remove: function() {
    this.el.removeObject3D("mesh");
  }
});

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
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const sceneEl = document.querySelector("a-scene");
  const entityEl = document.createElement("a-entity");

  entityEl.setAttribute("socialvr-barge", "");
  sceneEl.appendChild(entityEl);
});
