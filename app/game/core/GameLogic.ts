import * as THREE from "three";

export function createGameLogic(player: THREE.Object3D) {
  const forward = new THREE.Vector3(0, 0, -1);
  const right = new THREE.Vector3(1, 0, 0);
  const speed = 0.08;

  const update = (delta: number, joy: { x: number; y: number }) => {
    player.position.addScaledVector(forward, joy.y * speed);
    player.position.addScaledVector(right, joy.x * speed);
  };

  return { update };
}
