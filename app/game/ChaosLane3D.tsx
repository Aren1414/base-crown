'use client';

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export default function ChaosLane3D() {
  const mountRef = useRef<HTMLDivElement>(null);

  const joyRef = useRef({ x: 0, y: 0 });
  const playerRef = useRef<THREE.Object3D | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const idleRef = useRef<THREE.AnimationAction | null>(null);
  const walkRef = useRef<THREE.AnimationAction | null>(null);
  const runRef = useRef<THREE.AnimationAction | null>(null);
  const currentActionRef = useRef<THREE.AnimationAction | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#000000");

    const camera = new THREE.PerspectiveCamera(
      65,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );

    camera.position.set(0, 2.2, 8);
    camera.lookAt(0, 1.6, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);

    const light = new THREE.DirectionalLight(0xffffff, 1.4);
    light.position.set(3, 8, 5);
    scene.add(light);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
    scene.add(hemi);

    (async () => {
      const loader = new GLTFLoader();

      const glb = await loader.loadAsync("/models/modeling1.glb");
      const player = glb.scene;

      player.scale.set(1.6, 1.6, 1.6);
      player.position.set(0, -0.3, 0);
      scene.add(player);
      playerRef.current = player;

      const mixer = new THREE.AnimationMixer(player);
      mixerRef.current = mixer;

      const idle = await loader.loadAsync("/models/Breathing Idle.glb");
      idleRef.current = mixer.clipAction(idle.animations[0]);
      idleRef.current.play();
      currentActionRef.current = idleRef.current;

      const walk = await loader.loadAsync("/models/Catwalk Walk Forward Arc 90L.glb");
      walkRef.current = mixer.clipAction(walk.animations[0]);

      const run = await loader.loadAsync("/models/Running.glb");
      runRef.current = mixer.clipAction(run.animations[0]);

      const clock = new THREE.Clock();

      let introTime = 0;
      let introDone = false;

      const animate = () => {
        requestAnimationFrame(animate);

        const delta = clock.getDelta();
        mixer.update(delta);

        const j = joyRef.current;

        if (playerRef.current) {
          const forward = new THREE.Vector3(0, 0, -1);
          forward.applyAxisAngle(new THREE.Vector3(0, 1, 0), playerRef.current.rotation.y);

          const right = new THREE.Vector3(1, 0, 0);
          right.applyAxisAngle(new THREE.Vector3(0, 1, 0), playerRef.current.rotation.y);

          const speed = 0.08;

          playerRef.current.position.addScaledVector(forward, j.y * speed);
          playerRef.current.position.addScaledVector(right, j.x * speed);

          if (Math.abs(j.x) > 0.05 || Math.abs(j.y) > 0.05) {
            const angle = Math.atan2(j.x, j.y);
            playerRef.current.rotation.y = angle;
          }
        }

        const movementSpeed = Math.sqrt(j.x * j.x + j.y * j.y);

        let targetAnim = idleRef.current;
        if (movementSpeed > 0.1 && movementSpeed < 0.6) targetAnim = walkRef.current;
        if (movementSpeed >= 0.6) targetAnim = runRef.current;

        if (targetAnim !== currentActionRef.current) {
          currentActionRef.current?.crossFadeTo(targetAnim, 0.2, false);
          targetAnim.play();
          currentActionRef.current = targetAnim;
        }

        if (!introDone) {
          introTime += delta;
          const t = Math.min(introTime / 4.0, 1);

          if (t <= 0.35) {
            const tt = t / 0.35;
            camera.position.lerpVectors(
              new THREE.Vector3(0, 2.2, 8),
              new THREE.VectorVector3(0, 2.4, 2.0),
              tt
            );
          } else if (t <= 0.75) {
            const tt = (t - 0.35) / 0.4;
            const radius = 2.0;
            const height = 2.4;
            const angle = tt * Math.PI;
            camera.position.set(Math.sin(angle) * radius, height, Math.cos(angle) * radius);
          } else {
            const tt = (t - 0.75) / 0.25;
            camera.position.lerpVectors(
              new THREE.Vector3(0, 2.4, -2.0),
              new THREE.Vector3(0, 2.6, -6.0),
              tt
            );
            playerRef.current.scale.set(1.2, 1.2, 1.2);
            playerRef.current.position.y = -0.4;
          }

          camera.lookAt(0, 1.8, 0);

          if (t >= 1) introDone = true;
        } else {
          if (playerRef.current) {
            const target = new THREE.Vector3(
              playerRef.current.position.x,
              playerRef.current.position.y + 1.6,
              playerRef.current.position.z
            );

            const offset = new THREE.Vector3(0, 1.0, -4.0);
            const desired = target.clone().add(offset);

            camera.position.lerp(desired, 0.12);
            camera.lookAt(target);
          }
        }

        renderer.render(scene, camera);
      };

      animate();
    })();

    return () => renderer.dispose();
  }, []);

  const handleJoy = (e: any) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.touches[0].clientX - (rect.left + rect.width / 2);
    const y = e.touches[0].clientY - (rect.top + rect.height / 2);
    joyRef.current = {
      x: Math.max(-1, Math.min(1, x / 50)),
      y: Math.max(-1, Math.min(1, y / 50)),
    };
  };

  const resetJoy = () => {
    joyRef.current = { x: 0, y: 0 };
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-black overflow-hidden">
      <div ref={mountRef} className="w-full h-full" />

      <div
        className="absolute bottom-8 left-8 w-28 h-28 rounded-full bg-black/30 border border-white/10 backdrop-blur-xl shadow-xl flex items-center justify-center"
        onTouchMove={handleJoy}
        onTouchEnd={resetJoy}
        onTouchStart={handleJoy}
      >
        <div className="w-12 h-12 rounded-full bg-zinc-300/60 shadow-xl" />
      </div>

      <div className="absolute bottom-8 right-8 flex flex-col gap-4">
        <div className="flex gap-4">
          <button id="btn-punch" className="w-14 h-14 rounded-full bg-black/30 border border-white/15 backdrop-blur-xl shadow-xl flex items-center justify-center active:scale-90 transition-all">
            <svg width="26" height="26" fill="white"><path d="M4 14l6 6 12-12-2-2-10 10-4-4z" /></svg>
          </button>
          <button id="btn-kick" className="w-14 h-14 rounded-full bg-black/30 border border-white/15 backdrop-blur-xl shadow-xl flex items-center justify-center active:scale-90 transition-all">
            <svg width="26" height="26" fill="white"><path d="M3 20l8-8-2-2-8 8zM14 4l8 8-2 2-8-8z" /></svg>
          </button>
        </div>
        <button id="btn-jump" className="w-14 h-14 rounded-full bg-black/30 border border-white/15 backdrop-blur-xl shadow-xl flex items-center justify-center active:scale-90 transition-all mx-auto">
          <svg width="26" height="26" fill="white"><path d="M12 2l6 10h-4v10h-4V12H6z" /></svg>
        </button>
      </div>
    </div>
  );
      }
