import * as THREE from "three";

export function createGameLogic(player: THREE.Object3D) {
  const forward = new THREE.Vector3(0, 0, -1);
  const right = new THREE.Vector3(1, 0, 0);
  const moveSpeed = 0.08;

  const update = (delta: number, joy: { x: number; y: number }) => {
    const { x, y } = joy;

    // فقط جابه‌جایی؛ چرخش دست نمی‌زنیم تا همیشه پشت کاراکتر به دوربین باشد
    player.position.addScaledVector(forward, y * moveSpeed);
    player.position.addScaledVector(right, x * moveSpeed);
  };

  return { update };
}
