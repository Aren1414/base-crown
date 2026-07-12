import * as THREE from "three";

export function createGameLogic(player: THREE.Object3D) {
  const walkSpeed = 0.06;
  const runSpeed = 0.12;

  const update = (delta: number, joy: { x: number; y: number }) => {
    let { x, y } = joy;

    if (x === 0 && y === 0) return;

    // 🔥 اصلاح جهت چپ/راست
    x = -x;

    // شدت جوی‌استیک
    const intensity = Math.sqrt(x * x + y * y);
    const speed = intensity < 0.6 ? walkSpeed : runSpeed;

    // 🔥 جهت حرکت
    const moveDir = new THREE.Vector3(x, 0, -y);

    // 🔥 اگر جلو/چپ/راست می‌ریم → کاراکتر بچرخه
    if (y <= 0) {
      if (moveDir.lengthSq() > 0) {
        const targetAngle = Math.atan2(moveDir.x, moveDir.z);
        player.rotation.y = targetAngle;
      }
    }

    // 🔥 اگر عقب می‌ریم → کاراکتر نباید بچرخه
    // فقط عقب‌عقب بره
    // یعنی y > 0 → چرخش حذف میشه

    // 🔥 حرکت واقعی
    moveDir.normalize();
    player.position.addScaledVector(moveDir, speed);
  };

  return { update };
}
