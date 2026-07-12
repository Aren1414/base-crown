import * as THREE from "three";

export function createGameLogic(player: THREE.Object3D) {
  const moveSpeedWalk = 0.06;   
  const moveSpeedRun = 0.12;    

  const update = (delta: number, joy: { x: number; y: number }) => {
    const { x, y } = joy;

    
    if (x === 0 && y === 0) return;

    
    const intensity = Math.sqrt(x * x + y * y);

    
    const speed = intensity < 0.6 ? moveSpeedWalk : moveSpeedRun;

    
    const forward = new THREE.Vector3(0, 0, -1); 
    const right = new THREE.Vector3(1, 0, 0);    

    
    player.position.addScaledVector(forward, y * speed);

    
    player.position.addScaledVector(right, x * speed);

    
    player.rotation.y = 0;
  };

  return { update };
}
