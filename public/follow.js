AFRAME.registerComponent('follow', {
  schema: {
    target: {type: 'selector'},
  },
  init: function () {
    var el = this.el;
    this.targetPos = new THREE.Vector3();
    this.targetRot = new THREE.Quaternion();
  },
  tick: function () {
    this.data.target.object3D.getWorldPosition(this.targetPos);
    this.data.target.object3D.getWorldQuaternion(this.targetRot);
    this.el.object3D.position.set(this.targetPos.x, this.targetPos.y, this.targetPos.z);
    this.el.object3D.setRotationFromQuaternion(this.targetRot);
  }
});