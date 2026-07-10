'use client';

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export default function ChaosLane3D() {
  const mountRef = useRef<HTMLDivElement>(null);

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
          if (obj.isMesh && obj.material.map) {
            obj.material.map.generateMipmaps = true;
            obj.material.map.minFilter = THREE.LinearMipmapLinearFilter;
            obj.material.map.magFilter = THREE.LinearFilter;
            obj.material.map.needsUpdate = true;
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
                player.position.set(0, 0, 0);
                player.scale.set(1.5, 1.5, 1.5);
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
    <div className="w-full h-screen bg-black">
      <div ref={mountRef} className="w-full h-full" />

      {/* دکمه‌های جهت سمت چپ */}
      <div className="absolute bottom-6 left-6 flex flex-col gap-3">
        <button className="w-14 h-14 bg-gray-700 text-white rounded-full">←</button>
        <button className="w-14 h-14 bg-gray-700 text-white rounded-full">→</button>
      </div>

      {/* دکمه‌های حرکات سمت راست */}
      <div className="absolute bottom-6 right-6 grid grid-cols-2 gap-3">
        <button id="btn-walk" className="px-4 py-2 bg-gray-700 text-white rounded-full">Walk</button>
        <button id="btn-run" className="px-4 py-2 bg-gray-700 text-white rounded-full">Run</button>
        <button id="btn-fast-run" className="px-4 py-2 bg-gray-700 text-white rounded-full">Fast</button>
        <button id="btn-jump" className="px-4 py-2 bg-gray-700 text-white rounded-full">Jump</button>
        <button id="btn-punch" className="px-4 py-2 bg-gray-700 text-white rounded-full">Punch</button>
        <button id="btn-elbow" className="px-4 py-2 bg-gray-700 text-white rounded-full">Elbow</button>
        <button id="btn-kick" className="px-4 py-2 bg-gray-700 text-white rounded-full">Kick</button>
        <button id="btn-flip-kick" className="px-4 py-2 bg-gray-700 text-white rounded-full">Flip</button>
        <button id="btn-hit" className="px-4 py-2 bg-gray-700 text-white rounded-full">Hit</button>
        <button id="btn-death-f" className="px-4 py-2 bg-gray-700 text-white rounded-full">Death F</button>
        <button id="btn-death-b" className="px-4 py-2 bg-gray-700 text-white rounded-full">Death B</button>
        <button id="btn-react" className="px-4 py-2 bg-gray-700 text-white rounded-full">React</button>
        <button id="btn-twist" className="px-4 py-2 bg-gray-700 text-white rounded-full">Twist</button>
        <button id="btn-turn" className="px-4 py-2 bg-gray-700 text-white rounded-full">Turn</button>
      </div>
    </div>
  );
           }
