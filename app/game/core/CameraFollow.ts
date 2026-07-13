import * as THREE from "three";

export function createCameraFollow(camera: THREE.Camera, player: THREE.Object3D) {
  const baseOffset = new THREE.Vector3(0, 1.6, -4); // فاصله پشت کاراکتر
  const temp = new THREE.Vector3();

  let sideTimer = 0;
  let backTimer = 0;

  const update = (delta: number, joy: { x: number; y: number }) => {
    const { x, y } = joy;

    // موقعیت هدف کاراکتر
    const target = temp.set(
      player.position.x,
      player.position.y + 1.6,
      player.position.z
    );

    // آفست پایه پشت کاراکتر
    const offset = baseOffset.clone().applyAxisAngle(
      new THREE.Vector3(0, 1, 0),
      player.rotation.y
    );

    // 🔥 چپ/راست کم → از پهلو همراه
    if (Math.abs(x) > 0.1 && Math.abs(x) < 0.4) {
      sideTimer += delta;
      offset.x += x * 1.2;
    }

    // 🔥 چپ/راست زیاد → کامل پشت کاراکتر
    if (Math.abs(x) >= 0.4) {
      sideTimer += delta;
      // هیچ چیز خاصی لازم نیست، آفست خودش پشت کاراکتره
    } else {
      sideTimer = 0;
    }

    // 🔥 عقب کم → دوربین تکون نخوره
    if (y > 0 && y < 0.3) {
      backTimer += delta;
      // هیچ چرخشی انجام نمی‌شود
    }

    // 🔥 عقب زیاد → دوربین سریع پشت کاراکتر قرار بگیرد
    if (y >= 0.3) {
      backTimer += delta;
      // آفست پشت کاراکتره، پس همین کافیست
    } else {
      backTimer = 0;
    }

    // 🔥 موقعیت نهایی دوربین
    const desired = target.clone().add(offset);

    // 🔥 حرکت نرم دوربین
    camera.position.lerp(desired, 0.18);

    // 🔥 دوربین همیشه پشت کاراکتر نگاه کند
    camera.lookAt(target);
  };

  return { update };
}
