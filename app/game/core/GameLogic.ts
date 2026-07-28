import * as THREE from "three";

export function createGameLogic(
  player: THREE.Object3D
) {
  const walkSpeed = 5;
  const runSpeed = 11.5;
  const runThresholdSquared = 0.36;
  const minimumInputSquared = 0.0001;
  const moveDirection = new THREE.Vector3();

  const update = (
    delta: number,
    joy: {
      x: number;
      y: number;
    }
  ) => {
    const x = joy.x;
    const forward = -joy.y;
    const intensitySquared =
      x * x + forward * forward;

    if (
      intensitySquared <
      minimumInputSquared
    ) {
      return;
    }

    const speed =
      intensitySquared <
      runThresholdSquared
        ? walkSpeed
        : runSpeed;

    player.rotation.y = Math.atan2(
      x,
      forward
    );

    const inverseLength =
      1 / Math.sqrt(intensitySquared);

    moveDirection.set(
      x * inverseLength,
      0,
      forward * inverseLength
    );

    player.position.addScaledVector(
      moveDirection,
      speed * delta
    );
  };

  return {
    update,
  };
}
