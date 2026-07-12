import * as THREE from "three";

export function createGameLogic(player: THREE.Object3D) {
  const forward = new THREE.Vector3(0, 0, -1);
  const right = new THREE.Vector3(1, 0, 0);
  const moveSpeed = 0.08;

  const update = (delta: number, joy: { x: number; y: number }) => {
    const { x, y } = joy;

    // اگر هیچ حرکتی نیست، فقط موقعیت را دست‌نخورده بگذار
    if (x === 0 && y === 0) return;

    // حرکت روی محور جلو/عقب و چپ/راست
    player.position.addScaledVector(forward, y * moveSpeed);
    player.position.addScaledVector(right, x * moveSpeed);

    // ❌ هیچ‌وقت کاراکتر را به سمت دوربین نچرخان
    // پشت کاراکتر همیشه به دوربین باشد → rotation ثابت
    player.rotation.y = 0;
  };

  return { update };
}
