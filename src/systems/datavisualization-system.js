/* Visualize Research Data */

import { Vector3 } from "three";

export class DataVisualizationSystem {
  constructor(scene) {
    this.scene = scene;
    this.avatars = new Set();
    this.ropeMaterial = new THREE.LineBasicMaterial({
      color: 0x0000ff,
      linecap: "square"
    });

    this.scene.addEventListener("enter-vr", () => {
      console.log("Someone joined!");
      this.avatars.add({ player: "cool" });
    });

    this.scene.addEventListener("exit-vr", () => {
      console.log("Someone left!");
      this.avatars.delete({ player: "cool" });
    });
  }

  drawRope() {
    const avatars = document.querySelectorAll(".AvatarRoot");

    for (let i = 0; i < avatars.length; i++) {
      const a = avatars[i];
      const b = avatars[i + 1];

      if (a && b && a.object3D && b.object3D) {
        if (a === b) return;

        const ap = new Vector3();
        const bp = new Vector3();

        a.object3D.getWorldPosition(ap);
        b.object3D.getWorldPosition(bp);

        //console.log(ap.distanceTo(bp));
      }
    }
  }

  tick() {
    if (!this.scene.is("entered")) return;

    this.drawRope();
  }
}
