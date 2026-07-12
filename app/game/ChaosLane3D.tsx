'use client';

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { loadPlayerModel } from "@/app/game/core/PlayerModel";

export default function ChaosLane3D() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const joyRef = useRef({ x: 0, y: 0 });
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const setMoveBySpeedRef = useRef<(speed: number) => void>(() => {});
  const playAnimOnceRef = useRef<(file: string) => Promise<void>>(
    async () => {}
  );
  const playerRef = useRef<THREE.Group | null>(null);

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
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);

    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(3, 8, 5);
    scene.add(keyLight);

    const fillLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
    scene.add(fillLight);

    (async () => {
      const { player, mixer, setMoveBySpeed, playAnimOnce } =
        await loadPlayerModel(scene);

      scene.add(player);

      playerRef.current = player;
      mixerRef.current = mixer;
      setMoveBySpeedRef.current = setMoveBySpeed;
      playAnimOnceRef.current = playAnimOnce;

      const clock = new THREE.Clock();

      let introTime = 0;
      const introDuration = 4.0;
      let introDone = false;

      const animate = () => {
        requestAnimationFrame(animate);

        const delta = clock.getDelta();
        mixerRef.current?.update(delta);

        const j = joyRef.current;
        const movementSpeed = Math.sqrt(j.x * j.x + j.y * j.y);

        // کنترل انیمیشن راه رفتن / دویدن / ایستادن
        setMoveBySpeedRef.current(movementSpeed);

        // حرکت کاراکتر با جوی‌استیک
        if (playerRef.current) {
          const forward = new THREE.Vector3(0, 0, -1);
          const right = new THREE.Vector3(1, 0, 0);
          const speed = 0.08;

          playerRef.current.position.addScaledVector(forward, j.y * speed);
          playerRef.current.position.addScaledVector(right, j.x * speed);
        }

        introTime += delta;
        const t = Math.min(introTime / introDuration, 1);

        // ورود دوربین از جلو → چرخش → پشت کاراکتر
        if (!introDone) {
          if (t <= 0.35) {
            const tt = t / 0.35;
            const farPos = new THREE.Vector3(0, 2.2, 8);
            const closePos = new THREE.Vector3(0, 2.4, 2.0);
            const currentPos = new THREE.Vector3().lerpVectors(farPos, closePos, tt);
            camera.position.copy(currentPos);
          } else if (t <= 0.75) {
            const tt = (t - 0.35) / 0.4;
            const radius = 2.0;
            const height = 2.4;
            const angle = Math.PI + tt * Math.PI;
            const x = Math.sin(angle) * radius;
            const z = Math.cos(angle) * radius;
            camera.position.set(x, height, z);
          } else {
            const tt = (t - 0.75) / 0.25;
            const startPos = new THREE.Vector3(0, 2.4, -2.0);
            const endPos = new THREE.Vector3(0, 2.6, -6.0);
            const currentPos = new THREE.Vector3().lerpVectors(startPos, endPos, tt);
            camera.position.copy(currentPos);

            if (playerRef.current) {
              const startScale = 1.6;
              const endScale = 1.2;
              const s = startScale + (endScale - startScale) * tt;
              playerRef.current.scale.set(s, s, s);
              playerRef.current.position.y = -0.4;
            }

            if (tt >= 1.0) introDone = true;
          }

          camera.lookAt(0, 1.8, 0);
        } else {
          // دوربین همیشه پشت کاراکتر و دنبالش
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

    return () => {
      renderer.dispose();
    };
  }, []);

  const handleJoy = (e: React.TouchEvent<HTMLDivElement>) => {
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
    // با رها شدن جوی‌استیک، سرعت صفر می‌شود → setMoveBySpeed خودکار انیمیشن ایستادن را نگه می‌دارد
    setMoveBySpeedRef.current(0);
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-black overflow-hidden">
      <div ref={mountRef} className="w-full h-full" />

      <div
        className="absolute bottom-8 left-8 w-28 h-28 rounded-full bg-black/30 border border-white/10 backdrop-blur-xl shadow-[0_0_20px_rgba(0,0,0,.45)] flex items-center justify-center touch-none"
        onTouchMove={handleJoy}
        onTouchEnd={resetJoy}
        onTouchStart={handleJoy}
      >
        <div className="w-12 h-12 rounded-full bg-zinc-300/60 shadow-xl" />
      </div>

      <div className="absolute bottom-8 right-8 flex flex-col gap-4">
        <div className="flex gap-4">
          <button
            id="btn-punch"
            className="w-14 h-14 rounded-full bg-black/30 border border-white/15 backdrop-blur-xl shadow-xl flex items-center justify-center active:scale-90 transition-all"
          >
            <svg width="26" height="26" fill="white">
              <path d="M4 14l6 6 12-12-2-2-10 10-4-4z" />
            </svg>
          </button>
          <button
            id="btn-kick"
            className="w-14 h-14 rounded-full bg-black/30 border border-white/15 backdrop-blur-xl shadow-xl flex items-center justify-center active:scale-90 transition-all"
          >
            <svg width="26" height="26" fill="white">
              <path d="M3 20l8-8-2-2-8 8zM14 4l8 8-2 2-8-8z" />
            </svg>
          </button>
        </div>
        <button
          id="btn-jump"
          className="w-14 h-14 rounded-full bg-black/30 border border-white/15 backdrop-blur-xl shadow-xl flex items-center justify-center active:scale-90 transition-all mx-auto"
        >
          <svg width="26" height="26" fill="white">
            <path d="M12 2l6 10h-4v10h-4V12H6z" />
          </svg>
        </button>
      </div>
    </div>
  );
                           }
