'use client';

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { loadPlayerModel } from "@/app/game/core/PlayerModel";
import { createGameLogic } from "@/app/game/core/GameLogic";

export default function ChaosLane3D() {
  const mountRef = useRef<HTMLDivElement | null>(null);

  const joyRef = useRef({ x: 0, y: 0 });
  const playerRef = useRef<THREE.Object3D | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const setMoveBySpeedRef = useRef<(speed: number) => void>(() => {});
  const playAnimOnceRef = useRef<(file: string) => void>(() => {});
  const gameLogicRef = useRef<ReturnType<typeof createGameLogic> | null>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#000000");

    // ایزومتریک: زاویه ثابت + ارتفاع مناسب موبایل
    const camera = new THREE.PerspectiveCamera(
      65,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );

    // زاویه ایزومتریک اصلاح‌شده
    camera.position.set(7, 12, 7);
    camera.lookAt(0, 0, 0);

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

    // زمین حرفه‌ای‌تر برای ایزومتریک
    const texLoader = new THREE.TextureLoader();
    const groundTexture = texLoader.load(
      "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/terrain/grasslight-big.jpg"
    );
    groundTexture.wrapS = THREE.RepeatWrapping;
    groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.repeat.set(40, 40);

    const groundGeo = new THREE.PlaneGeometry(400, 400);
    const groundMat = new THREE.MeshStandardMaterial({
      map: groundTexture,
      roughness: 0.9,
      metalness: 0.0
    });

    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.5;
    scene.add(ground);

    // ساختمان‌ها (بدون تغییر)
    const buildingMat = new THREE.MeshStandardMaterial({ color: "#333333" });

    function addBuilding(x: number, z: number, w: number, h: number, d: number) {
      const geo = new THREE.BoxGeometry(w, h, d);
      const mesh = new THREE.Mesh(geo, buildingMat);
      mesh.position.set(x, h / 2 - 0.5, z);
      scene.add(mesh);
    }

    addBuilding(20, 20, 10, 25, 10);
    addBuilding(-25, 10, 12, 30, 12);
    addBuilding(15, -30, 14, 22, 14);
    addBuilding(-35, -25, 10, 18, 10);

    (async () => {
      const { player, mixer, setMoveBySpeed, playAnimOnce } =
        await loadPlayerModel(scene);

      playerRef.current = player;
      mixerRef.current = mixer;
      setMoveBySpeedRef.current = setMoveBySpeed;
      playAnimOnceRef.current = playAnimOnce;

      // کاراکتر بزرگ‌تر برای ایزومتریک
      player.scale.set(1.4, 1.4, 1.4);

      const gameLogic = createGameLogic(player);
      gameLogicRef.current = gameLogic;

      const actionButtons = [
        { id: "btn-punch", file: "Combo Punch.glb" },
        { id: "btn-kick", file: "Mma Kick.glb" },
        { id: "btn-jump", file: "Jumping.glb" },
      ];

      actionButtons.forEach(({ id, file }) => {
        const btn = document.getElementById(id);
        if (!btn) return;
        const handler = () => playAnimOnceRef.current(file);
        btn.addEventListener("touchstart", handler, { passive: true });
        btn.addEventListener("mousedown", handler);
      });

      const clock = new THREE.Clock();

      const animate = () => {
        requestAnimationFrame(animate);

        const delta = clock.getDelta();
        mixerRef.current?.update(delta);

        const j = joyRef.current;

        const movementSpeed = Math.sqrt(j.x * j.x + j.y * j.y);
        setMoveBySpeedRef.current(movementSpeed);

        if (playerRef.current && gameLogicRef.current) {
          gameLogicRef.current.update(delta, j);
        }

        // ایزومتریک: دوربین فقط موقعیت را دنبال می‌کند، زاویه ثابت می‌ماند
        if (playerRef.current) {
          const p = playerRef.current.position;

          camera.position.set(
            p.x + 7,
            p.y + 12,
            p.z + 7
          );

          camera.lookAt(p.x, p.y + 1.5, p.z);
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
      y: Math.max(-1, Math.min(1, -(y / 50))),
    };
  };

  const resetJoy = () => {
    joyRef.current = { x: 0, y: 0 };
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
