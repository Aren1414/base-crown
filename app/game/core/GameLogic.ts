import * as THREE from "three";

export function createGameLogic(player: THREE.Object3D) {
  const walkSpeed = 0.06;
  const runSpeed = 0.12;

  const update = (delta: number, joy: { x: number; y: number }) => {
    let { x, y } = joy;

    if (x === 0 && y === 0) return;

    // ❗ چپ/راست برعکس بود → این خط باید حذف شود
    // x = -x;

    // جلو/عقب
    const forwardBackward = y;

    const intensity = Math.sqrt(x * x + forwardBackward * forwardBackward);
    const speed = intensity < 0.6 ? walkSpeed : runSpeed;

    const moveDir = new THREE.Vector3(x, 0, forwardBackward);

    // 🔥 چرخش جلو + چپ + راست
    if (forwardBackward < 0 || Math.abs(x) > 0.05) {
      const angle = Math.PI + Math.atan2(x, -forwardBackward);
      player.rotation.y = angle;
    }

    moveDir.normalize();
    player.position.addScaledVector(moveDir, speed);
  };

  return { update };
}
