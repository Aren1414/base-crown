'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

export default function ChaosLane3D() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#020617');

    const camera = new THREE.PerspectiveCamera(
      60,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    camera.position.set(0, 4, 8);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 10, 5);
    scene.add(light);

    const ambient = new THREE.AmbientLight(0xffffff, 0.3);
    scene.add(ambient);

    const groundGeo = new THREE.BoxGeometry(10, 0.5, 200);
    const groundMat = new THREE.MeshStandardMaterial({ color: '#0f172a' });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.set(0, -1, -80);
    scene.add(ground);

    const playerGeo = new THREE.BoxGeometry(1, 2, 1);
    const playerMat = new THREE.MeshStandardMaterial({ color: '#22c55e' });
    const player = new THREE.Mesh(playerGeo, playerMat);
    player.position.set(0, 0, 0);
    scene.add(player);

    let lane = 0;
    let speed = 0.25;
    let jumpVelocity = 0;
    let isJumping = false;
    let currentScore = 0;
    let isGameOver = false;

    const obstacles: THREE.Mesh[] = [];
    const obstacleGeo = new THREE.BoxGeometry(1.5, 2, 1.5);
    const obstacleMat = new THREE.MeshStandardMaterial({ color: '#ef4444' });

    const spawnObstacle = () => {
      const laneIndex = Math.floor(Math.random() * 3) - 1;
      const zPos = player.position.z - 60 - Math.random() * 40;
      const obstacle = new THREE.Mesh(obstacleGeo, obstacleMat);
      obstacle.position.set(laneIndex * 2, 0, zPos);
      scene.add(obstacle);
      obstacles.push(obstacle);
    };

    for (let i = 0; i < 12; i++) {
      spawnObstacle();
    }

    const clock = new THREE.Clock();

    const animate = () => {
      if (isGameOver) return;

      requestAnimationFrame(animate);

      const delta = clock.getDelta();

      player.position.z -= speed;
      player.position.x = THREE.MathUtils.lerp(player.position.x, lane * 2, 0.2);

      if (isJumping) {
        jumpVelocity -= 20 * delta;
        player.position.y += jumpVelocity * delta;
        if (player.position.y <= 0) {
          player.position.y = 0;
          isJumping = false;
          jumpVelocity = 0;
        }
      }

      obstacles.forEach((obs) => {
        if (obs.position.z > player.position.z + 10) {
          obs.position.z = player.position.z - 60 - Math.random() * 40;
          const laneIndex = Math.floor(Math.random() * 3) - 1;
          obs.position.x = laneIndex * 2;
        }

        const dx = obs.position.x - player.position.x;
        const dy = obs.position.y - player.position.y;
        const dz = obs.position.z - player.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < 1.5) {
          isGameOver = true;
          setGameOver(true);
          setBestScore((prev) => (currentScore > prev ? currentScore : prev));
        }
      });

      currentScore += Math.floor(speed * 10);
      setScore(currentScore);

      renderer.render(scene, camera);
    };

    animate();

    const handleKey = (e: KeyboardEvent) => {
      if (isGameOver) return;
      if (e.key === 'ArrowLeft' && lane > -1) lane--;
      if (e.key === 'ArrowRight' && lane < 1) lane++;
      if (e.key === 'ArrowUp' && !isJumping) {
        isJumping = true;
        jumpVelocity = 12;
      }
    };

    window.addEventListener('keydown', handleKey);

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('resize', handleResize);
      mountRef.current?.removeChild(renderer.domElement);
    };
  }, []);

  const moveLane = (dir: -1 | 1) => {
    const event = new KeyboardEvent('keydown', {
      key: dir === -1 ? 'ArrowLeft' : 'ArrowRight',
    });
    window.dispatchEvent(event);
  };

  const jump = () => {
    const event = new KeyboardEvent('keydown', { key: 'ArrowUp' });
    window.dispatchEvent(event);
  };

  return (
    <div className="w-full h-screen bg-black text-white relative overflow-hidden">
      <div ref={mountRef} className="w-full h-full" />
      <div className="absolute top-4 left-0 right-0 flex justify-center gap-8 text-sm">
        <div className="px-3 py-1 rounded-full bg-white/10 backdrop-blur">
          Score: {score}
        </div>
        <div className="px-3 py-1 rounded-full bg-white/10 backdrop-blur">
          Best: {bestScore}
        </div>
      </div>
      <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-10">
        <button
          onClick={() => moveLane(-1)}
          className="w-14 h-14 rounded-full bg-white/10 border border-white/20 text-xl active:bg-white/20"
        >
          ◀
        </button>
        <button
          onClick={jump}
          className="w-16 h-16 rounded-full bg-blue-600/80 border border-blue-300/40 text-2xl active:bg-blue-700/80"
        >
          ⬆
        </button>
        <button
          onClick={() => moveLane(1)}
          className="w-14 h-14 rounded-full bg-white/10 border border-white/20 text-xl active:bg-white/20"
        >
          ▶
        </button>
      </div>
      {gameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <div className="px-6 py-4 rounded-2xl bg-zinc-900 text-center space-y-2">
            <div className="text-lg font-semibold">Game Over</div>
            <div className="text-sm">Score: {score}</div>
            <div className="text-sm">Best: {bestScore}</div>
            <div className="text-xs opacity-70 mt-2">
              Refresh to play again
            </div>
          </div>
        </div>
      )}
    </div>
  );
        }
