import { SOUND_SNAP_ROTATE } from "../../systems/sound-effects-system";

AFRAME.registerComponent("socialvr-barge-button-reset", {
  init() {
    this.onClick = this.onClick.bind(this);
    this.el.object3D.addEventListener("interact", this.onClick);
  },

  onClick: function() {
    this.el.emit("resetBargeEvent");
    this.el.sceneEl.systems["hubs-systems"].soundEffectsSystem.playPositionalSoundFollowing(
      SOUND_SNAP_ROTATE,
      this.el.object3D
    );
  }
});
