import * as THREE from "three";

export function createGameLogic(player: THREE.Object3D) {
  const walkSpeed = 0.06;
  const runSpeed = 0.12;

  const update = (delta: number, joy: { x: number; y: number }) => {
    let { x, y } = joy;

    if (x === 0 && y === 0) return;

    // 🔥 اصلاح جهت چپ/راست (این درست بود)
    x = -x;

    // 🔥 جلو/عقب واقعی
    // بالا = جلو → y منفی
    // پایین = عقب → y مثبت
    const forwardBackward = -y;   // فقط همین خط جهت عقب را درست می‌کند

    const intensity = Math.sqrt(x * x + forwardBackward * forwardBackward);
    const speed = intensity < 0.6 ? walkSpeed : runSpeed;

    // 🔥 جهت حرکت واقعی — بدون چرخش
    const moveDir = new THREE.Vector3(
      x * 1.8,          // چپ/راست قوی‌تر و واضح‌تر
      0,
      forwardBackward   // جلو/عقب واقعی
    );

    // 🔥 هیچ چرخشی انجام نمی‌شود
    // کاراکتر همیشه پشتش به ما می‌ماند
    // player.rotation.y = player.rotation.y;

    // ❗ normalize حذف شد تا چپ/راست ضعیف نشود
    player.position.addScaledVector(moveDir, speed);
  };

  return { update };
}
