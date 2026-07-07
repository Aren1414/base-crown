'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from '@/app/lib/GLTFLoader';

const animations = {
  hit_head: 'https://pixeldrain.com/l/ou6WZuKR#item=0',
  walk: 'https://pixeldrain.com/l/ou6WZuKR#item=1',
  idle: 'https://pixeldrain.com/l/ou6WZuKR#item=2',
  death: 'https://pixeldrain.com/l/ou6WZuKR#item=3',
  hit_side: 'https://pixeldrain.com/l/ou6WZuKR#item=4',
  kick_crescent: 'https://pixeldrain.com/l/ou6WZuKR#item=5',
  landing: 'https://pixeldrain.com/l/ou6WZuKR#item=6',
  kick_basic: 'https://pixeldrain.com/l/ou6WZuKR#item=7',
  kick_mma: 'https://pixeldrain.com/l/ou6WZuKR#item=8',
  punch_bag: 'https://pixeldrain.com/l/ou6WZuKR#item=9',
  run: 'https://pixeldrain.com/l/ou6WZuKR#item=10',
  punch_uppercut: 'https://pixeldrain.com/l/ou6WZuKR#item=11',
};

export default function ChaosLane3D() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog('#020617', 10, 80);

    const camera = new THREE.PerspectiveCamera(
      65,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    camera.position.set(0, 6, 14);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);

    const hemiLight = new THREE.HemisphereLight(0x4f46e5, 0x020617, 1);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.6);
    dirLight.position.set(10, 20, 10);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const groundGeo = new THREE.BoxGeometry(14, 0.6, 320);
    const groundMat = new THREE.MeshStandardMaterial({
      color: '#0a0f1f',
      emissive: '#0f172a',
      metalness: 0.5,
      roughness: 0.4,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.set(0, -1.4, -140);
    ground.receiveShadow = true;
    scene.add(ground);

    const neonLaneGeo = new THREE.BoxGeometry(0.12, 0.08, 320);
    const neonLeft = new THREE.Mesh(
      neonLaneGeo,
      new THREE.MeshStandardMaterial({
        color: '#22c55e',
        emissive: '#22c55e',
        emissiveIntensity: 2,
      })
    );
    neonLeft.position.set(-2, -0.95, -140);

    const neonCenter = new THREE.Mesh(
      neonLaneGeo,
      new THREE.MeshStandardMaterial({
        color: '#38bdf8',
        emissive: '#38bdf8',
        emissiveIntensity: 2,
      })
    );
    neonCenter.position.set(0, -0.95, -140);

    const neonRight = new THREE.Mesh(
      neonLaneGeo,
      new THREE.MeshStandardMaterial({
        color: '#f97316',
        emissive: '#f97316',
        emissiveIntensity: 2,
      })
    );
    neonRight.position.set(2, -0.95, -140);

    scene.add(neonLeft, neonCenter, neonRight);

    const starsGeo = new THREE.BufferGeometry();
    const starCount = 600;
    const positions = new Float32Array(starCount * 3);
    for (let i = 0; i < starCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 80;
      positions[i * 3 + 1] = Math.random() * 30 + 5;
      positions[i * 3 + 2] = -Math.random() * 200 - 40;
    }
    starsGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const starsMat = new THREE.PointsMaterial({
      color: '#38bdf8',
      size: 0.18,
    });
    const stars = new THREE.Points(starsGeo, starsMat);
    scene.add(stars);

    // PLAYER MODEL + ANIMATIONS
    const loader = new GLTFLoader();
    const playerGroup = new THREE.Group();
    scene.add(playerGroup);

    const mixer = new THREE.AnimationMixer(playerGroup);
    const actions: Record<string, THREE.AnimationAction | undefined> = {};
    let currentAction: THREE.AnimationAction | null = null;

    const loadAnim = (name: keyof typeof animations) =>
      new Promise<THREE.AnimationClip | null>((resolve) => {
        loader.load(
          animations[name],
          (gltf: any) => {
            const clip = gltf.animations?.[0] ?? null;
            resolve(clip);
          },
          undefined,
          () => resolve(null)
        );
      });

    const playAction = (key: string) => {
      const action = actions[key];
      if (!action) return;
      if (currentAction) currentAction.fadeOut(0.1);
      action.reset().fadeIn(0.1).play();
      currentAction = action;
    };

    loader.load(
      animations.idle,
      (gltf: any) => {
        const model = gltf.scene;
        model.traverse((obj: any) => {
          if (obj.isMesh) {
            obj.castShadow = true;
            obj.receiveShadow = true;
          }
        });
        playerGroup.add(model);

        const idleClip = gltf.animations?.[0];
        actions.idle = mixer.clipAction(idleClip);

        Promise.all([
          loadAnim('walk'),
          loadAnim('run'),
          loadAnim('landing'),
          loadAnim('hit_head'),
          loadAnim('hit_side'),
          loadAnim('kick_basic'),
          loadAnim('kick_mma'),
          loadAnim('kick_crescent'),
          loadAnim('punch_bag'),
          loadAnim('punch_uppercut'),
          loadAnim('death'),
        ]).then(
          ([
            walkClip,
            runClip,
            landingClip,
            hitHeadClip,
            hitSideClip,
            kickBasicClip,
            kickMmaClip,
            kickCrescentClip,
            punchBagClip,
            punchUppercutClip,
            deathClip,
          ]) => {
            if (walkClip) actions.walk = mixer.clipAction(walkClip);
            if (runClip) actions.run = mixer.clipAction(runClip);
            if (landingClip) actions.landing = mixer.clipAction(landingClip);
            if (hitHeadClip) actions.hit_head = mixer.clipAction(hitHeadClip);
            if (hitSideClip) actions.hit_side = mixer.clipAction(hitSideClip);
            if (kickBasicClip) actions.kick_basic = mixer.clipAction(kickBasicClip);
            if (kickMmaClip) actions.kick_mma = mixer.clipAction(kickMmaClip);
            if (kickCrescentClip)
              actions.kick_crescent = mixer.clipAction(kickCrescentClip);
            if (punchBagClip) actions.punch_bag = mixer.clipAction(punchBagClip);
            if (punchUppercutClip)
              actions.punch_uppercut = mixer.clipAction(punchUppercutClip);
            if (deathClip) actions.death = mixer.clipAction(deathClip);

            playAction('idle');
          }
        );
      }
    );

    let lane = 0;
    let speed = 0.38;
    let jumpVelocity = 0;
    let isJumping = false;
    let currentScore = 0;
    let isGameOver = false;

    const obstacles: THREE.Mesh[] = [];
    const obstacleGeo = new THREE.BoxGeometry(1.6, 2.4, 1.6);
    const obstacleMat = new THREE.MeshStandardMaterial({
      color: '#ef4444',
      emissive: '#b91c1c',
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

    for (let i = 0; i < 16; i++) {
      spawnObstacle();
    }

    const clock = new THREE.Clock();

    const animate = () => {
      if (isGameOver) {
        renderer.render(scene, camera);
        return;
      }

      requestAnimationFrame(animate);

      const delta = clock.getDelta();

      playerGroup.position.z -= speed;
      playerGroup.position.x = THREE.MathUtils.lerp(
        playerGroup.position.x,
        lane * 2,
        0.18
      );

      if (isJumping) {
        jumpVelocity -= 22 * delta;
        playerGroup.position.y += jumpVelocity * delta;
        if (playerGroup.position.y <= 0) {
          playerGroup.position.y = 0;
          isJumping = false;
          jumpVelocity = 0;
          playAction('run');
        }
      }

      mixer.update(delta);

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
          isGameOver = true;
          setGameOver(true);
          setBestScore((prev) => (currentScore > prev ? currentScore : prev));
          playAction('death');
        }
      });

      currentScore += Math.floor(speed * 12);
      setScore(currentScore);

      stars.rotation.z += 0.02 * delta;

      renderer.render(scene, camera);
    };

    animate();

    const handleKey = (e: KeyboardEvent) => {
      if (isGameOver) return;
      if (e.key === 'ArrowLeft' && lane > -1) lane--;
      if (e.key === 'ArrowRight' && lane < 1) lane++;
      if (e.key === 'ArrowUp' && !isJumping) {
        isJumping = true;
        jumpVelocity = 14;
        playAction('landing');
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
            <div className="text-xs opacity-70 mt-2">Refresh to play again</div>
          </div>
        </div>
      )}
    </div>
  );
        }
