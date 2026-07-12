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

    // 🔥 جهت واقعی مدل (نه جهت فرضی)
    const forward = new THREE.Vector3();
    player.getWorldDirection(forward);   // جهت واقعی مدل
    forward.y = 0;
    forward.normalize();

    // 🔥 جهت راست واقعی مدل
    const right = new THREE.Vector3();
    right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize();

    // حرکت جلو/عقب
    player.position.addScaledVector(forward, -y * speed);

    // حرکت چپ/راست
    player.position.addScaledVector(right, x * speed);

    // 🔥 کاراکتر همیشه پشتش به دوربین باشد
    player.rotation.y = 0;
  };

  return { update };
}
