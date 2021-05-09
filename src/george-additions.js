AFRAME.registerComponent("socialvr-barge", {
  schema: {
    width: { type: "number", default: 3 },
    height: { type: "number", default: 1 },
    depth: { type: "number", default: 4 },
    speed: { type: "number", default: 1 },
    moving: { type: "boolean", default: false }
  },

  init() {
    const data = this.data;
    const el = this.el;

    this.geometry = new THREE.BoxBufferGeometry(data.width, data.height, data.depth);
    this.material = new THREE.MeshStandardMaterial({ color: "#AAA" });
    this.mesh = new THREE.Mesh(this.geometry, this.material);
    el.setObject3D("mesh", this.mesh);

    window.startBarge = this.startBarge.bind(this);
    window.stopBarge = this.stopBarge.bind(this);
  },

  remove: function() {
    this.el.removeObject3D("mesh");
  },

  tick(time, timeDelta) {
    if (this.data.moving) {
      const currentPosition = this.el.object3D.position;
      const factor = this.data.speed;

      this.el.setAttribute("position", {
        x: currentPosition.x + factor * (timeDelta / 1000),
        y: currentPosition.y,
        z: currentPosition.z
      });
    }
  },

  startBarge() {
    this.data.moving = true;
  },

  stopBarge() {
    this.data.moving = false;
  }
});

document.addEventListener("DOMContentLoaded", () => {
  const sceneEl = document.querySelector("a-scene");
  const entityEl = document.createElement("a-entity");

  entityEl.setAttribute("socialvr-barge", "");
  sceneEl.appendChild(entityEl);
});
