'use client';

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export default function ChaosLane3D() {
  const mountRef = useRef<HTMLDivElement>(null);

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

    // رندرر – کیفیت موبایل درست
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
        // مدل اصلی
        const glbModel = await loader.loadAsync("/models/modeling1.glb");
        const player = glbModel.scene;

        // شارپ کردن تکسچرها – بدون ارور TS
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
            const idleClip = idleAnim.animations[0];
            idleAction = mixer.clipAction(idleClip);
            idleAction.play();
          }
        } catch {}

        // اجرای انیمیشن
        const playAnimation = async (file: string) => {
          const url = `/models/${file}`;
          try {
            const res = await fetch(url);
            if (!res.ok) return;

            const anim = await loader.loadAsync(url);
            if (anim.animations.length > 0) {
              mixer.stopAllAction();
              const clip = anim.animations[0];
              const action = mixer.clipAction(clip);
              action.reset().play();

              setTimeout(() => {
                mixer.stopAllAction();
                idleAction?.reset().play();
                player.position.set(0, 0, 0);
                player.scale.set(1.5, 1.5, 1.5);
              }, Math.min(clip.duration * 1000, 3000));
            }
          } catch {}
        };

        // دکمه‌ها – فقط آیکون، کوچک، شفاف، حرفه‌ای
        const buttons = [
          { id: "btn-walk", file: "Catwalk Walk Forward Arc 90L.glb" },
          { id: "btn-run", file: "Running.glb" },
          { id: "btn-fast-run", file: "Fast Run.glb" },
          { id: "btn-jump", file: "Jumping.glb" },
          { id: "btn-punch", file: "Combo Punch.glb" },
          { id: "btn-kick", file: "Mma Kick.glb" },
          { id: "btn-hit", file: "Kidney Hit.glb" },
          { id: "btn-death-f", file: "Standing Death Forward.glb" },
          { id: "btn-death-b", file: "Standing Death Backward.glb" },
          { id: "btn-react", file: "Standing React Small From Right.glb" },
          { id: "btn-twist", file: "Catwalk Idle To Twist R.glb" },
          { id: "btn-turn", file: "Catwalk Walk Forward Turn 90L.glb" },
        ];

        buttons.forEach(({ id, file }) => {
          const btn = document.getElementById(id);
          if (!btn) return;

          // لمس و کلیک – بدون فریز صفحه
          const handler = () => playAnimation(file);
          btn.addEventListener("touchstart", handler, { passive: true });
          btn.addEventListener("mousedown", handler);
        });

        const clock = new THREE.Clock();
        const animate = () => {
          requestAnimationFrame(animate);
          const delta = clock.getDelta();
          mixer.update(delta);
          controls.update();
          renderer.render(scene, camera);
        };
        animate();
      } catch {}
    })();

    return () => {
      renderer.dispose();
    };
  }, []);

  return (
    <div className="w-full h-screen bg-black relative overflow-hidden">
      <div ref={mountRef} className="w-full h-full" />

      {/* دکمه‌های اکشن سمت راست – استایل بازی حرفه‌ای */}
      <div className="absolute bottom-8 right-8 grid grid-cols-3 gap-3">
        {/* Walk */}
        <button
          id="btn-walk"
          className="w-12 h-12 rounded-full bg-white/15 border border-white/40 flex items-center justify-center active:bg-white/30"
        >
          <span className="text-white text-xs">🚶</span>
        </button>
        {/* Run */}
        <button
          id="btn-run"
          className="w-12 h-12 rounded-full bg-white/15 border border-white/40 flex items-center justify-center active:bg-white/30"
        >
          <span className="text-white text-xs">🏃</span>
        </button>
        {/* Fast */}
        <button
          id="btn-fast-run"
          className="w-12 h-12 rounded-full bg-white/15 border border-white/40 flex items-center justify-center active:bg-white/30"
        >
          <span className="text-white text-xs">⚡</span>
        </button>
        {/* Jump */}
        <button
          id="btn-jump"
          className="w-12 h-12 rounded-full bg-white/15 border border-white/40 flex items-center justify-center active:bg-white/30"
        >
          <span className="text-white text-xs">⬆️</span>
        </button>
        {/* Punch */}
        <button
          id="btn-punch"
          className="w-12 h-12 rounded-full bg-white/15 border border-white/40 flex items-center justify-center active:bg-white/30"
        >
          <span className="text-white text-xs">✊</span>
        </button>
        {/* Kick */}
        <button
          id="btn-kick"
          className="w-12 h-12 rounded-full bg-white/15 border border-white/40 flex items-center justify-center active:bg-white/30"
        >
          <span className="text-white text-xs">🦵</span>
        </button>
        {/* Hit */}
        <button
          id="btn-hit"
          className="w-12 h-12 rounded-full bg-white/15 border border-white/40 flex items-center justify-center active:bg-white/30"
        >
          <span className="text-white text-xs">💥</span>
        </button>
        {/* Death F */}
        <button
          id="btn-death-f"
          className="w-12 h-12 rounded-full bg-white/15 border border-white/40 flex items-center justify-center active:bg-white/30"
        >
          <span className="text-white text-xs">☠️</span>
        </button>
        {/* Death B */}
        <button
          id="btn-death-b"
          className="w-12 h-12 rounded-full bg-white/15 border border-white/40 flex items-center justify-center active:bg-white/30"
        >
          <span className="text-white text-xs">↩️</span>
        </button>
        {/* React */}
        <button
          id="btn-react"
          className="w-12 h-12 rounded-full bg-white/15 border border-white/40 flex items-center justify-center active:bg-white/30"
        >
          <span className="text-white text-xs">❗</span>
        </button>
        {/* Twist */}
        <button
          id="btn-twist"
          className="w-12 h-12 rounded-full bg-white/15 border border-white/40 flex items-center justify-center active:bg-white/30"
        >
          <span className="text-white text-xs">🔄</span>
        </button>
        {/* Turn */}
        <button
          id="btn-turn"
          className="w-12 h-12 rounded-full bg-white/15 border border-white/40 flex items-center justify-center active:bg-white/30"
        >
          <span className="text-white text-xs">↪️</span>
        </button>
      </div>
    </div>
  );
                         }
