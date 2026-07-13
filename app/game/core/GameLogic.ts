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
    const forwardBackward = -y;   // 🔥 فقط همین خط اصلاح شد

    const intensity = Math.sqrt(x * x + forwardBackward * forwardBackward);
    const speed = intensity < 0.6 ? walkSpeed : runSpeed;

    const moveDir = new THREE.Vector3(
      x,              // چپ/راست کاملاً مثل قبل
      0,
      forwardBackward // جلو/عقب کاملاً درست شد
    );

    // 🔥 چرخش فقط وقتی جلو می‌ریم (مثل قبل)
    if (forwardBackward < 0) {
      const dir = moveDir.clone();
      dir.y = 0;
      if (dir.lengthSq() > 0) {
        dir.normalize();
        const angle = Math.atan2(dir.x, dir.z);
        player.rotation.y = angle;
      }
    }

    // 🔥 عقب‌عقب → بدون چرخش (مثل قبل)

    moveDir.normalize();
    player.position.addScaledVector(moveDir, speed);
  };

  return { update };
}
