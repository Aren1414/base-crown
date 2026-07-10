'use client';

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export default function ChaosLane3D() {
  const mountRef = useRef<HTMLDivElement>(null);

  // وضعیت Joystick
  const joyRef = useRef({ x: 0, y: 0 });

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

    // کنترل دوربین – فقط چرخش، نه جابه‌جایی
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.enableRotate = true;
    controls.target.set(0, 1, 0);

    (async () => {
      const loader = new GLTFLoader();

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
      const idleAnim = await loader.loadAsync("/models/Breathing Idle.glb");
      const idleAction = mixer.clipAction(idleAnim.animations[0]);
      idleAction.play();

      // اجرای انیمیشن
      const playAnim = async (file: string) => {
        const anim = await loader.loadAsync(`/models/${file}`);
        mixer.stopAllAction();
        const action = mixer.clipAction(anim.animations[0]);
        action.reset().play();

        setTimeout(() => {
          mixer.stopAllAction();
          idleAction.reset().play();
        }, Math.min(anim.animations[0].duration * 1000, 3000));
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
        const j = joyRef.current;
        player.position.x += j.x * 0.08;
        player.position.z += j.y * 0.08;

        controls.update();
        renderer.render(scene, camera);
      };
      animate();
    })();

    return () => renderer.dispose();
  }, []);

  // کنترل Joystick
  const handleJoy = (e: any) => {
    e.preventDefault();

    const rect = e.target.getBoundingClientRect();
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
    <div className="w-full h-screen bg-black relative overflow-hidden">
      <div ref={mountRef} className="w-full h-full" />

      {/* Joystick AAA – کوچکتر، حرفه‌ای */}
      <div
        className="absolute bottom-10 left-10 w-28 h-28 rounded-full bg-black/30 border border-white/10 backdrop-blur-xl shadow-[0_0_20px_rgba(0,0,0,.45)] flex items-center justify-center"
        onTouchMove={handleJoy}
        onTouchEnd={resetJoy}
      >
        <div className="w-12 h-12 rounded-full bg-zinc-300/60 shadow-xl"></div>
      </div>

      {/* دکمه‌های اکشن – چیدمان مثلثی */}
      <div className="absolute bottom-10 right-10 flex flex-col gap-4">
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
