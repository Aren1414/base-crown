'use client';

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export default function ChaosLane3D() {
  const mountRef = useRef<HTMLDivElement>(null);

  // وضعیت Joystick
  const [joystick, setJoystick] = useState({ x: 0, y: 0 });

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
    camera.position.set(0, 2, 6);

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

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

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

        let idleAction: THREE.AnimationAction | null = null;
        try {
          const idleAnim = await loader.loadAsync("/models/Breathing Idle.glb");
          if (idleAnim.animations.length > 0) {
            const idleClip = idleAnim.animations[0];
            idleAction = mixer.clipAction(idleClip);
            idleAction.play();
          }
        } catch {}

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
              }, Math.min(clip.duration * 1000, 3000));
            }
          } catch {}
        };

        const buttons = [
          { id: "btn-walk", file: "Catwalk Walk Forward Arc 90L.glb" },
          { id: "btn-run", file: "Running.glb" },
          { id: "btn-fast-run", file: "Fast Run.glb" },
          { id: "btn-jump", file: "Jumping.glb" },
          { id: "btn-punch", file: "Combo Punch.glb" },
          { id: "btn-elbow", file: "Punch To Elbow Combo.glb" },
          { id: "btn-kick", file: "Mma Kick.glb" },
          { id: "btn-flip-kick", file: "Flip Kick.glb" },
          { id: "btn-hit", file: "Kidney Hit.glb" },
          { id: "btn-death-f", file: "Standing Death Forward.glb" },
          { id: "btn-death-b", file: "Standing Death Backward.glb" },
          { id: "btn-react", file: "Standing React Small From Right.glb" },
          { id: "btn-twist", file: "Catwalk Idle To Twist R.glb" },
          { id: "btn-turn", file: "Catwalk Walk Forward Turn 90L.glb" },
        ];

        buttons.forEach(({ id, file }) => {
          const btn = document.getElementById(id);
          btn?.addEventListener("touchstart", () => playAnimation(file));
          btn?.addEventListener("mousedown", () => playAnimation(file));
        });

        const clock = new THREE.Clock();
        const animate = () => {
          requestAnimationFrame(animate);

          const delta = clock.getDelta();
          mixer.update(delta);

          // حرکت با Joystick
          if (joystick.x !== 0 || joystick.y !== 0) {
            player.position.x += joystick.x * 0.05;
            player.position.z += joystick.y * 0.05;
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
  }, [joystick]);

  // Joystick کنترل
  const handleJoystick = (e: any) => {
    const rect = e.target.getBoundingClientRect();
    const x = e.touches[0].clientX - (rect.left + rect.width / 2);
    const y = e.touches[0].clientY - (rect.top + rect.height / 2);

    setJoystick({
      x: Math.max(-1, Math.min(1, x / 40)),
      y: Math.max(-1, Math.min(1, y / 40)),
    });
  };

  const resetJoystick = () => {
    setJoystick({ x: 0, y: 0 });
  };

  return (
    <div className="w-full h-screen bg-black">
      <div ref={mountRef} className="w-full h-full" />

      {/* Joystick سمت چپ */}
      <div
        className="absolute bottom-10 left-10 w-32 h-32 bg-white/10 rounded-full flex items-center justify-center"
        onTouchMove={handleJoystick}
        onTouchEnd={resetJoystick}
      >
        <div className="w-16 h-16 bg-white/40 rounded-full"></div>
      </div>

      {/* دکمه‌های اکشن سمت راست */}
      <div className="absolute bottom-10 right-10 grid grid-cols-2 gap-4">
        <button id="btn-walk" className="w-20 h-20 bg-blue-600 text-white rounded-full">Walk</button>
        <button id="btn-run" className="w-20 h-20 bg-green-600 text-white rounded-full">Run</button>
        <button id="btn-jump" className="w-20 h-20 bg-yellow-500 text-black rounded-full">Jump</button>
        <button id="btn-punch" className="w-20 h-20 bg-red-600 text-white rounded-full">Punch</button>
        <button id="btn-kick" className="w-20 h-20 bg-purple-600 text-white rounded-full">Kick</button>
        <button id="btn-hit" className="w-20 h-20 bg-orange-600 text-white rounded-full">Hit</button>
      </div>
    </div>
  );
              }
