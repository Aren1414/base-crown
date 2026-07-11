import * as THREE from "three";

export function createGameLogic(scene: THREE.Scene, playerGroup: THREE.Group) {
  let lane = 0;
  let speed = 0.38;
  let jumpVelocity = 0;
  let isJumping = false;
  let score = 0;
  let gameOver = false;

  const obstacles: THREE.Mesh[] = [];
  const obstacleGeo = new THREE.BoxGeometry(1.6, 2.4, 1.6);
  const obstacleMat = new THREE.MeshStandardMaterial({
    color: "#ef4444",
    emissive: "#b91c1c",
    metalness: 0.4,
    roughness: 0.4,
  });

  const spawnObstacle = () => {
    const laneIndex = Math.floor(Math.random() * 3) - 1;
    const zPos = -40 - Math.random() * 80;
    const obstacle = new THREE.Mesh(obstacleGeo, obstacleMat);
    obstacle.position.set(laneIndex * 2, 0, zPos);
    obstacle.castShadow = true;
    scene.add(obstacle);
    obstacles.push(obstacle);
  };

  for (let i = 0; i < 16; i++) spawnObstacle();

  const update = (delta: number, playAction: (key: string) => void) => {
    if (gameOver) return { score, gameOver };

    playerGroup.position.z -= speed;
    playerGroup.position.x = THREE.MathUtils.lerp(playerGroup.position.x, lane * 2, 0.18);

    if (isJumping) {
      jumpVelocity -= 22 * delta;
      playerGroup.position.y += jumpVelocity * delta;
      if (playerGroup.position.y <= 0) {
        playerGroup.position.y = 0;
        isJumping = false;
        jumpVelocity = 0;
        playAction("run");
      }
    }

    obstacles.forEach((obs) => {
      if (obs.position.z > playerGroup.position.z + 10) {
        obs.position.z = playerGroup.position.z - 60 - Math.random() * 60;
        const laneIndex = Math.floor(Math.random() * 3) - 1;
        obs.position.x = laneIndex * 2;
      }

      const dx = obs.position.x - playerGroup.position.x;
      const dy = obs.position.y - playerGroup.position.y;
      const dz = obs.position.z - playerGroup.position.z;
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

      if (dist < 1.6) {
        gameOver = true;
        playAction("death");
      }
    });

    score += Math.floor(speed * 12);

    return { score, gameOver };
  };

  const handleKey = (e: KeyboardEvent, playAction: (key: string) => void) => {
    if (gameOver) return;
    if (e.key === "ArrowLeft" && lane > -1) lane--;
    if (e.key === "ArrowRight" && lane < 1) lane++;
    if (e.key === "ArrowUp" && !isJumping) {
      isJumping = true;
      jumpVelocity = 14;
      playAction("landing");
    }
  };

  const handleJoy = (x: number, y: number, playAction: (key: string) => void) => {
    if (gameOver) return;
    if (x < -0.2 && lane > -1) lane = -1;
    else if (x > 0.2 && lane < 1) lane = 1;
    else if (Math.abs(x) <= 0.2) lane = 0;

    if (y > 0.6 && !isJumping) {
      isJumping = true;
      jumpVelocity = 14;
      playAction("landing");
    }
  };

  return { update, handleKey, handleJoy };
}
