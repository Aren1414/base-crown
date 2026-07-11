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

    // شروع: دور، روبه‌روی کاراکتر
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
      const loader = new GLTFLoader();

      const glbModel = await loader.loadAsync("/models/modeling1.glb");
      const player = glbModel.scene;

      player.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.material && obj.material.map) {
          const map = obj.material.map;
          map.generateMipmaps = true;
          map.minFilter = THREE.LinearMipmapLinearFilter;
          map.magFilter = THREE.LinearFilter;
          map.needsUpdate = true;
        }
      });

      // اندازه اولیه برای ورود
      player.scale.set(1.6, 1.6, 1.6);
      // کمی پایین‌تر تا بعد از چرخش، کاراکتر جلو نباشد
      player.position.set(0, -0.3, 0);
      scene.add(player);
      playerRef.current = player;

      const mixer = new THREE.AnimationMixer(player);
      mixerRef.current = mixer;

      const idleAnim = await loader.loadAsync("/models/Breathing Idle.glb");
      idleRef.current = mixer.clipAction(idleAnim.animations[0]);
      idleRef.current.play();
      currentActionRef.current = idleRef.current;

      const walkAnim = await loader.loadAsync("/models/Catwalk Walk Forward Arc 90L.glb");
      walkRef.current = mixer.clipAction(walkAnim.animations[0]);

      const runAnim = await loader.loadAsync("/models/Running.glb");
      runRef.current = mixer.clipAction(runAnim.animations[0]);

      const playAnimOnce = async (file: string) => {
        if (!mixerRef.current) return;
        const anim = await loader.loadAsync(`/models/${file}`);
        const action = mixerRef.current.clipAction(anim.animations[0]);
        action.reset().play();
        setTimeout(() => {
          action.stop();
          if (currentActionRef.current) currentActionRef.current.play();
        }, Math.min(anim.animations[0].duration * 1000, 3000));
      };

      const actionButtons = [
        { id: "btn-punch", file: "Combo Punch.glb" },
        { id: "btn-kick", file: "Mma Kick.glb" },
        { id: "btn-jump", file: "Jumping.glb" },
      ];

      actionButtons.forEach(({ id, file }) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        const handler = () => playAnimOnce(file);
        btn.addEventListener("touchstart", handler, { passive: true });
        btn.addEventListener("mousedown", handler);
      });

      const clock = new THREE.Clock();

      let introTime = 0;
      const introDuration = 4.0;

      const animate = () => {
        requestAnimationFrame(animate);

        const delta = clock.getDelta();
        mixer.update(delta);

        // حرکت با Joystick
        const j = joyRef.current;
        if (playerRef.current) {
          playerRef.current.position.x += j.x * 0.08;
          playerRef.current.position.z += j.y * 0.08;
        }

        // انتخاب انیمیشن بر اساس سرعت
        const speed = Math.sqrt(j.x * j.x + j.y * j.y);
        let targetAction: THREE.AnimationAction | null = null;
        if (speed < 0.1) {
          targetAction = idleRef.current;
        } else if (speed < 0.6) {
          targetAction = walkRef.current;
        } else {
          targetAction = runRef.current;
        }
        if (targetAction && targetAction !== currentActionRef.current) {
          currentActionRef.current?.stop();
          targetAction.reset().play();
          currentActionRef.current = targetAction;
        }

        // انیمیشن دوربین + کوچک شدن کاراکتر بعد از چرخش
        introTime += delta;
        const t = Math.min(introTime / introDuration, 1); // 0 → 1

        // فاز ۱: از دور → نزدیک نیم‌تنه بالا (0 تا 0.35)
        if (t <= 0.35) {
          const tt = t / 0.35;
          const farPos = new THREE.Vector3(0, 2.2, 8);
          // ارتفاع بیشتر تا سر کامل داخل فریم باشد، پاها خارج شوند
          const closePos = new THREE.Vector3(0, 2.4, 2.0);
          const currentPos = new THREE.Vector3().lerpVectors(farPos, closePos, tt);
          camera.position.copy(currentPos);
        } else if (t <= 0.75) {
          // فاز ۲: چرخش نزدیک دور کاراکتر (0.35 تا 0.75)
          const tt = (t - 0.35) / 0.4;
          const radius = 2.0;
          const height = 2.4;

          const angle = 0 + tt * Math.PI;

          const x = Math.sin(angle) * radius;
          const z = Math.cos(angle) * radius;

          camera.position.set(x, height, z);
        } else {
          // فاز ۳: عقب رفتن برای نمایش صحنه و کوچک‌تر شدن کاراکتر (0.75 تا 1)
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
            // کمی پایین‌تر نگه داشتن کاراکتر تا جلو نباشد
            playerRef.current.position.y = -0.4;
          }
        }

        // نگاه به بالاتنه و سر
        camera.lookAt(0, 1.8, 0);

        renderer.render(scene, camera);
      };
      animate();
    })();

    return () => renderer.dispose();
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
  };

  return (
    <div className="fixed inset-0 w-full h-full bg-black overflow-hidden">
      <div ref={mountRef} className="w-full h-full" />

      {/* Joystick */}
      <div
        className="absolute bottom-8 left-8 w-28 h-28 rounded-full bg-black/30 border border-white/10 backdrop-blur-xl shadow-[0_0_20px_rgba(0,0,0,.45)] flex items-center justify-center touch-none"
        onTouchMove={handleJoy}
        onTouchEnd={resetJoy}
        onTouchStart={handleJoy}
      >
        <div className="w-12 h-12 rounded-full bg-zinc-300/60 shadow-xl" />
      </div>

      {/* دکمه‌های اکشن */}
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
