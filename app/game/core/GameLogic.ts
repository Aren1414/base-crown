import * as THREE from "three";

export function createGameLogic(player: THREE.Object3D) {
  const walkSpeed = 0.06;
  const runSpeed = 0.12;

  const update = (delta: number, joy: { x: number; y: number }) => {
    let { x, y } = joy;

    if (x === 0 && y === 0) return;

    // 🔥 اصلاح جهت چپ/راست (معکوس کردن محور X)
    x = -x;

    // شدت جوی‌استیک برای انتخاب سرعت
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
    // یعنی y > 0 → فقط عقب‌عقب بره
    // هیچ چرخشی انجام نمی‌دیم

    // 🔥 حرکت واقعی
    moveDir.normalize();
    player.position.addScaledVector(moveDir, speed);
  };

  return { update };
}
