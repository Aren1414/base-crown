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

    // 🔥 جهت حرکت با شدت واقعی (بدون normalize)
    const moveDir = new THREE.Vector3(
      x * intensity,   // چپ/راست با زاویه زیاد
      0,
      -y * intensity   // عقب‌عقب کاملاً درست
    );

    // 🔥 حرکت واقعی
    player.position.addScaledVector(moveDir, speed);

    // 🔥 کاراکتر همیشه پشتش به دوربین باشد
    player.rotation.y = 0;
  };

  return { update };
}
