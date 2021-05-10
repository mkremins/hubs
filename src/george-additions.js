AFRAME.registerSystem("socialvr-barge", {
  init() {
    this.barge = null;
  },

  registerBarge(ent) {
    if (this.barge != null) {
      this.barge.remove();
    }

    this.barge = ent;
    setInterval(() => {
      this.barge.startBarge();
      setInterval(() => {
        this.barge.stopBarge();
      }, 5000);
    }, 10000);
  },

  unregisterBarge() {
    this.barge = null;
  }
});

AFRAME.registerComponent("socialvr-barge", {
  schema: {
    width: { type: "number", default: 3 },
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
    this.el.setAttribute("networked", "template:#barge-drawing;attachTemplateToLocal:false;");
    this.system.registerBarge(this);

    console.log("\n\n\n\n\n\n\n");
    console.log(this.system);
    console.log("\n\n\n\n\n\n\n");
  },

  remove() {
    this.el.removeObject3D("mesh");
    this.system.unregisterBarge();
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

function createElement(htmlString) {
  const div = document.createElement("div");
  div.innerHTML = htmlString.trim();

  return div.firstChild;
}

document.addEventListener("DOMContentLoaded", () => {
  // Create template
  const assetsEl = document.querySelector("a-assets");
  const bargeTemplate = createElement(`
    <template id="barge-drawing">
      <a-entity socialvr-barge></a-entity>
    </template>
  `);

  assetsEl.appendChild(bargeTemplate);

  NAF.schemas.add({
    template: "#barge-drawing",
    components: ["socialvr-barge"]
  });

  // Create entity
  const sceneEl = document.querySelector("a-scene");
  const entityEl = document.createElement("a-entity");

  entityEl.setAttribute("socialvr-barge", "");
  sceneEl.appendChild(entityEl);
});
