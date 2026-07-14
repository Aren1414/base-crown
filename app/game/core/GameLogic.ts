import * as THREE from "three";

export function createGameLogic(player: THREE.Object3D) {
  const walkSpeed = 4;   // سرعت واقعی
  const runSpeed = 7;

  const update = (delta: number, joy: { x: number; y: number }) => {
    const { x, y } = joy;

    if (x === 0 && y === 0) return;

    const intensity = Math.sqrt(x * x + y * y);
    const speed = intensity < 0.6 ? walkSpeed : runSpeed;

    // جلو واقعی = -y
    const forward = -y;

    const moveDir = new THREE.Vector3(x, 0, forward);

    // چرخش صحیح کاراکتر
    if (Math.abs(x) > 0.01 || Math.abs(forward) > 0.01) {
      const angle = Math.atan2(moveDir.x, moveDir.z);
      player.rotation.y = angle;
    }

    // حرکت پیوسته واقعی
    moveDir.normalize();
    player.position.addScaledVector(moveDir, speed * delta);
  };

  return { update };
}
