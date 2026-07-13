import * as THREE from "three";

export function createGameLogic(player: THREE.Object3D) {
  const walkSpeed = 0.06;
  const runSpeed = 0.12;

  const update = (delta: number, joy: { x: number; y: number }) => {
    let { x, y } = joy;

    if (x === 0 && y === 0) return;

    // 🔥 اصلاح جهت چپ/راست
    x = -x;

    // 🔥 جهت جلو/عقب را درست می‌کنیم
    // بالا = جلو → y منفی
    // پایین = عقب → y مثبت
    const forwardBackward = y; // بدون معکوس‌کاری اضافی

    // شدت جوی‌استیک
    const intensity = Math.sqrt(x * x + forwardBackward * forwardBackward);
    const speed = intensity < 0.6 ? walkSpeed : runSpeed;

    // 🔥 جهت حرکت واقعی
    const moveDir = new THREE.Vector3(
      x,                     // چپ/راست
      0,
      forwardBackward        // جلو/عقب واقعی
    );

    // 🔥 چرخش فقط وقتی جلو می‌ریم
    if (forwardBackward < 0) {
      const dir = moveDir.clone();
      dir.y = 0;
      if (dir.lengthSq() > 0) {
        dir.normalize();
        const angle = Math.atan2(dir.x, dir.z);
        player.rotation.y = angle;
      }
    }

    // 🔥 عقب‌عقب → بدون چرخش
    // forwardBackward > 0 یعنی عقب

    moveDir.normalize();
    player.position.addScaledVector(moveDir, speed);
  };

  return { update };
}
