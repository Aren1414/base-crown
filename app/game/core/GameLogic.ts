import * as THREE from "three";

export function createGameLogic(player: THREE.Object3D) {
  const walkSpeed = 0.06;
  const runSpeed = 0.12;

  const update = (delta: number, joy: { x: number; y: number }) => {
    const { x, y } = joy;

    if (x === 0 && y === 0) return;

    const intensity = Math.sqrt(x * x + y * y);
    const speed = intensity < 0.6 ? walkSpeed : runSpeed;

    // جلو = -Z
    // عقب = +Z
    const moveDir = new THREE.Vector3(
      x,
      0,
      -y
    );

    // ❗ هیچ چرخشی انجام نمی‌شود
    // کاراکتر همیشه پشتش به ما می‌ماند

    moveDir.normalize();
    player.position.addScaledVector(moveDir, speed);
  };

  return { update };
}
