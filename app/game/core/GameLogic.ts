import * as THREE from "three";

export function createGameLogic(player: THREE.Object3D) {
  const walkSpeed = 0.06;
  const runSpeed = 0.12;

  const update = (delta: number, joy: { x: number; y: number }) => {
    let { x, y } = joy;

    if (x === 0 && y === 0) return;

    // اصلاح جهت چپ/راست
    x = -x;

    // شدت جوی‌استیک
    const intensity = Math.sqrt(x * x + y * y);
    const speed = intensity < 0.6 ? walkSpeed : runSpeed;

    // جهت حرکت
    const moveDir = new THREE.Vector3(x, 0, -y);

    // 🔥 اگر عقب می‌ریم → جهت را کاملاً معکوس کن
    if (y > 0) {
      moveDir.set(0, 0, 1);   // دقیقاً عقب‌عقب
    }

    // 🔥 اگر جلو/چپ/راست می‌ریم → همان رفتار قبلی
    if (y <= 0) {
      if (moveDir.lengthSq() > 0) {
        const targetAngle = Math.atan2(moveDir.x, moveDir.z);
        player.rotation.y = targetAngle;
      }
    }

    // حرکت واقعی
    moveDir.normalize();
    player.position.addScaledVector(moveDir, speed);
  };

  return { update };
}
