'use client';

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export default function ChaosLane3D() {
  const mountRef = useRef<HTMLDivElement>(null);

  // وضعیت Joystick
  const [joy, setJoy] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!mountRef.current) return;

    // صحنه
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#000000");

    // دوربین – کاراکتر دقیقاً وسط
    const camera = new THREE.PerspectiveCamera(
      65,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    camera.position.set(0, 2, 6);
    camera.lookAt(0, 1, 0);

    // رندرر – کیفیت موبایل
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setSize(window.innerWidth, window.innerHeight, false);
    mountRef.current.appendChild(renderer.domElement);

    // نور حرفه‌ای
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.4);
    keyLight.position.set(3, 8, 5);
    scene.add(keyLight);

    const fillLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.8);
    scene.add(fillLight);

    // کنترل دوربین
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.target.set(0, 1, 0);

    (async () => {
      const loader = new GLTFLoader();

      try {
        const glbModel = await loader.loadAsync("/models/modeling1.glb");
        const player = glbModel.scene;

        // شارپ کردن تکسچرها
        player.traverse((obj) => {
          if (obj instanceof THREE.Mesh && obj.material && obj.material.map) {
            const map = obj.material.map;
            map.generateMipmaps = true;
            map.minFilter = THREE.LinearMipmapLinearFilter;
            map.magFilter = THREE.LinearFilter;
            map.needsUpdate = true;
          }
        });

        player.scale.set(1.5, 1.5, 1.5);
        player.position.set(0, 0, 0);
        scene.add(player);

        const mixer = new THREE.AnimationMixer(player);

        // Idle
        let idleAction: THREE.AnimationAction | null = null;
        try {
          const idleAnim = await loader.loadAsync("/models/Breathing Idle.glb");
          if (idleAnim.animations.length > 0) {
            idleAction = mixer.clipAction(idleAnim.animations[0]);
            idleAction.play();
          }
        } catch {}

        // اجرای انیمیشن
        const playAnim = async (file: string) => {
          const url = `/models/${file}`;
          try {
            const res = await fetch(url);
            if (!res.ok) return;

            const anim = await loader.loadAsync(url);
            if (anim.animations.length > 0) {
              mixer.stopAllAction();
              const action = mixer.clipAction(anim.animations[0]);
              action.reset().play();

              setTimeout(() => {
                mixer.stopAllAction();
                idleAction?.reset().play();
              }, Math.min(anim.animations[0].duration * 1000, 3000));
            }
          } catch {}
        };

        // دکمه‌های اکشن
        const actionButtons = [
          { id: "btn-punch", file: "Combo Punch.glb" },
          { id: "btn-kick", file: "Mma Kick.glb" },
          { id: "btn-jump", file: "Jumping.glb" },
        ];

        actionButtons.forEach(({ id, file }) => {
          const btn = document.getElementById(id);
          if (!btn) return;

          const handler = () => playAnim(file);
          btn.addEventListener("touchstart", handler, { passive: true });
          btn.addEventListener("mousedown", handler);
        });

        const clock = new THREE.Clock();
        const animate = () => {
          requestAnimationFrame(animate);

          const delta = clock.getDelta();
          mixer.update(delta);

          // حرکت با Joystick
          if (joy.x !== 0 || joy.y !== 0) {
            player.position.x += joy.x * 0.08;
            player.position.z += joy.y * 0.08;
          }

          controls.update();
          renderer.render(scene, camera);
        };
        animate();
      } catch {}
    })();

    return () => {
      renderer.dispose();
    };
  }, [joy]);

  // کنترل Joystick
  const handleJoy = (e: any) => {
    const rect = e.target.getBoundingClientRect();
    const x = e.touches[0].clientX - (rect.left + rect.width / 2);
    const y = e.touches[0].clientY - (rect.top + rect.height / 2);

    setJoy({
      x: Math.max(-1, Math.min(1, x / 40)),
      y: Math.max(-1, Math.min(1, y / 40)),
    });
  };

  const resetJoy = () => setJoy({ x: 0, y: 0 });

  return (
    <div className="w-full h-screen bg-black relative overflow-hidden">
      <div ref={mountRef} className="w-full h-full" />

      {/* Joystick حرفه‌ای سمت چپ */}
      <div
        className="absolute bottom-10 left-10 w-32 h-32 bg-white/10 rounded-full flex items-center justify-center"
        onTouchMove={handleJoy}
        onTouchEnd={resetJoy}
      >
        <div className="w-14 h-14 bg-white/40 rounded-full"></div>
      </div>

      {/* دکمه‌های اکشن – حلالی، شفاف، سفید، بدون متن */}
      <div className="absolute bottom-10 right-10 flex flex-col gap-4">
        <button
          id="btn-punch"
          className="w-14 h-14 rounded-full bg-white/20 border border-white/40 flex items-center justify-center active:bg-white/40"
        >
          <span className="text-white text-xl">✊</span>
        </button>

        <button
          id="btn-kick"
          className="w-14 h-14 rounded-full bg-white/20 border border-white/40 flex items-center justify-center active:bg-white/40"
        >
          <span className="text-white text-xl">🦵</span>
        </button>

        <button
          id="btn-jump"
          className="w-14 h-14 rounded-full bg-white/20 border border-white/40 flex items-center justify-center active:bg-white/40"
        >
          <span className="text-white text-xl">⬆️</span>
        </button>
      </div>
    </div>
  );
          }
