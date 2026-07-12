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

    // 🔥 جهت جلو واقعی مدل
    const forward = new THREE.Vector3(0, 0, 1);

    // 🔥 جهت عقب واقعی مدل
    const backward = new THREE.Vector3(0, 0, -1);

    // 🔥 جهت راست واقعی مدل
    const right = new THREE.Vector3(1, 0, 0);

    // 🔥 جهت چپ واقعی مدل
    const left = new THREE.Vector3(-1, 0, 0);

    // 🔥 ساخت جهت حرکت
    let moveDir = new THREE.Vector3();

    // جلو
    if (y < 0) moveDir.add(forward);

    // عقب
    if (y > 0) moveDir.add(backward);

    // راست
    if (x > 0) moveDir.add(right);

    // چپ
    if (x < 0) moveDir.add(left);

    // 🔥 چرخش فقط برای جلو/چپ/راست
    if (y <= 0) {
      const targetAngle = Math.atan2(moveDir.x, moveDir.z);
      player.rotation.y = targetAngle;
    }

    // 🔥 حرکت واقعی
    moveDir.normalize();
    player.position.addScaledVector(moveDir, speed);
  };

  return { update };
}
