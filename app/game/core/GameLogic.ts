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

    // جهت حرکت
    const moveDir = new THREE.Vector3(x, 0, -y);

    // 🔥 چرخش فقط وقتی جلو/چپ/راست می‌ریم
    if (y <= 0) {
      // یعنی جلو یا چپ یا راست
      if (moveDir.lengthSq() > 0) {
        moveDir.normalize();
        const targetAngle = Math.atan2(moveDir.x, moveDir.z);
        player.rotation.y = targetAngle;
      }
    }

    // 🔥 وقتی عقب می‌ریم → کارکتر نباید بچرخه
    // یعنی y > 0 → فقط عقب‌عقب بره
    // هیچ چرخشی انجام نمی‌دیم

    // 🔥 حرکت واقعی
    player.position.addScaledVector(moveDir.normalize(), speed);
  };

  return { update };
}
