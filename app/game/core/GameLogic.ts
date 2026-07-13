import * as THREE from "three";

export function createGameLogic(player: THREE.Object3D) {
  const walkSpeed = 0.06;
  const runSpeed = 0.12;

  const update = (delta: number, joy: { x: number; y: number }) => {
    let { x, y } = joy;

    if (x === 0 && y === 0) return;

    // چپ/راست
    x = -x;

    // جلو/عقب (بدون معکوس‌کاری اضافی)
    const forwardBackward = y;

    const intensity = Math.sqrt(x * x + forwardBackward * forwardBackward);
    const speed = intensity < 0.6 ? walkSpeed : runSpeed;

    // جهت حرکت
    const moveDir = new THREE.Vector3(
      x,
      0,
      forwardBackward
    );

    // 🔥 چرخش فقط برای چپ/راست
    if (Math.abs(x) > 0.05) {
      // پایهٔ چرخش = پشت به ما (π)
      // زاویهٔ چپ/راست = فقط از X ساخته می‌شود
      const angle = Math.PI + Math.atan2(x, 1);
      player.rotation.y = angle;
    }

    // 🔥 جلو/عقب → بدون چرخش
    // یعنی اگر فقط y حرکت کنه، چرخش نمی‌کنیم

    moveDir.normalize();
    player.position.addScaledVector(moveDir, speed);
  };

  return { update };
}
