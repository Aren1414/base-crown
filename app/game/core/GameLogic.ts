import * as THREE from "three";

export function createGameLogic(player: THREE.Object3D) {
  const walkSpeed = 0.06;
  const runSpeed = 0.12;

  const update = (delta: number, joy: { x: number; y: number }) => {
    const { x, y } = joy;

    if (x === 0 && y === 0) return;

    // شدت جوی‌استیک برای انتخاب سرعت
    const intensity = Math.sqrt(x * x + y * y);
    const speed = intensity < 0.6 ? walkSpeed : runSpeed;

    // جهت حرکت
    const moveDir = new THREE.Vector3(x, 0, -y);

    // اگر جهت صفر نیست → بچرخ
    if (moveDir.lengthSq() > 0) {
      moveDir.normalize();

      // 🔥 چرخش کاراکتر به سمت جهت حرکت
      const targetAngle = Math.atan2(moveDir.x, moveDir.z);
      player.rotation.y = targetAngle;
    }

    // 🔥 حرکت واقعی
    player.position.addScaledVector(moveDir, speed);
  };

  return { update };
}
