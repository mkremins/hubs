import { Vector3 } from "three";
import { getCurrentPlayerHeight } from "../../utils/get-current-player-height";

let positions = [];
let lastKeyChange = 0;

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
    this.geometry = new THREE.BoxBufferGeometry(this.data.width, this.data.height, this.data.depth);
    this.material = new THREE.MeshStandardMaterial({ color: "#AAA" });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    this.direction = new THREE.Vector3();

    this.el.setObject3D("mesh", this.mesh);

    // Client
    this.el.addEventListener("startBargeEvent", this.startBarge.bind(this));
    this.el.addEventListener("stopBargeEvent", this.stopBarge.bind(this));
    this.el.addEventListener("resetBargeEvent", this.resetBarge.bind(this));

    // Broadcast Event
    NAF.connection.subscribeToDataChannel("startBarge", this._startBarge.bind(this));
    NAF.connection.subscribeToDataChannel("stopBarge", this._stopBarge.bind(this));
    NAF.connection.subscribeToDataChannel("resetBarge", this._resetBarge.bind(this));

    this.system.register(this);
  },

  remove() {
    this.el.removeObject3D("mesh");
    this.system.unregister();
  },

  tick(t, dt) {
    const position = this.el.object3D.position;
    const bargeMinX = position.x - this.data.width / 2;
    const bargeMaxX = position.x + this.data.width / 2;
    const bargeMinZ = position.z - this.data.depth / 2;
    const bargeMaxZ = position.z + this.data.depth / 2;

    const avatar = window.APP.componentRegistry["player-info"][0];
    const avposition = avatar.el.getAttribute("position");
    const characterController = this.el.sceneEl.systems["hubs-systems"].characterController;

    if (this.data.moving) {
      const targetPosition = positions[this.data.targetKey];
      const direction = this.direction;

      if (!targetPosition) {
        this.data.moving = false;
        return;
      }

      direction.copy(targetPosition).sub(position);

      if (position.distanceToSquared(targetPosition) >= 1) {
        const factor = this.data.speed / direction.length();

        ["x", "y", "z"].forEach(function(axis) {
          direction[axis] *= factor * (dt / 1000);
        });

        this.el.setAttribute("position", {
          x: position.x + direction.x,
          y: position.y + direction.y,
          z: position.z + direction.z
        });

        if (
          avposition.x >= bargeMinX &&
          avposition.x <= bargeMaxX &&
          avposition.z >= bargeMinZ &&
          avposition.z <= bargeMaxZ
        ) {
          characterController.barge = true;

          avatar.el.setAttribute("position", {
            x: avposition.x + direction.x,
            y: position.y - this.data.height / 2 + getCurrentPlayerHeight() / 2,
            z: avposition.z + direction.z
          });
        } else {
          characterController.barge = false;
        }
      } else {
        if (
          avposition.x < bargeMinX &&
          avposition.x > bargeMaxX &&
          avposition.z < bargeMinZ &&
          avposition.z > bargeMaxZ
        ) {
          characterController.barge = false;
        }

        if (isNaN(lastKeyChange) || t >= lastKeyChange) {
          lastKeyChange = t + 100;
          this.data.targetKey = this.data.targetKey + 1;
        }

        // console.log(t);
        console.log(this.data.targetKey);
      }
    } else {
      if (
        avposition.x >= bargeMinX &&
        avposition.x <= bargeMaxX &&
        avposition.z >= bargeMinZ &&
        avposition.z <= bargeMaxZ
      ) {
        characterController.barge = true;

        avatar.el.setAttribute("position", {
          x: avposition.x,
          y: position.y - this.data.height / 2 + getCurrentPlayerHeight() / 2,
          z: avposition.z
        });
      } else {
        characterController.barge = false;
      }
    }
  },

  // eslint-disable-next-line no-unused-vars
  _startBarge(senderId, dataType, data, targetId) {
    positions = [];

    for (let i = 1; i < 100; i++) {
      const wp = document.querySelector(".Waypoint_" + i);

      if (wp) {
        positions.push(wp.object3D.position.negate());
      }
    }

    if (positions.length >= 1) {
      console.log(`Registered ${positions.length} waypoints for the barge.`);
    } else {
      console.warn("No waypoints found!");
      console.warn("Registering some default waypoints for the barge.");

      positions.push(new Vector3(8.48, 0, 0.67));
      positions.push(new Vector3(8.48, 0, 14.67));
      positions.push(new Vector3(-3.51, 0, 14.67));
      positions.push(new Vector3(-3.51, 0, 24.67));
    }

    console.log(positions);
    this.data.moving = true;
  },

  // eslint-disable-next-line no-unused-vars
  _stopBarge(senderId, dataType, data, targetId) {
    this.data.moving = false;
  },

  // eslint-disable-next-line no-unused-vars
  _resetBarge(senderId, dataType, data, targetId) {
    const avatar = window.APP.componentRegistry["player-info"][0];
    const avposition = avatar.el.getAttribute("position");
    const bargeMinX = this.el.object3D.position.x - this.data.width / 2;
    const bargeMaxX = this.el.object3D.position.x + this.data.width / 2;
    const bargeMinZ = this.el.object3D.position.z - this.data.depth / 2;
    const bargeMaxZ = this.el.object3D.position.z + this.data.depth / 2;

    this.data.targetKey = 0;
    this.data.moving = false;
    this.el.setAttribute("position", { x: 0, y: 0, z: 0 });
    if (
      avposition.x >= bargeMinX &&
      avposition.x <= bargeMaxX &&
      avposition.z >= bargeMinZ &&
      avposition.z <= bargeMaxZ
    ) {
      avatar.el.setAttribute("position", { x: 0, y: 0, z: 0 });
    }
  },

  startBarge() {
    this._startBarge(null, null, {});
    NAF.connection.broadcastData("startBarge", {});
  },

  stopBarge() {
    this._stopBarge(null, null, {});
    NAF.connection.broadcastData("stopBarge", {});
  },

  resetBarge() {
    this._resetBarge(null, null, {});
    NAF.connection.broadcastData("resetBarge", {});
  }
});
