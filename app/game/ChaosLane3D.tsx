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

    const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 200);
    camera.position.set(0, 2, 6);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    mountRef.current.appendChild(renderer.domElement);

    const light = new THREE.DirectionalLight(0xffffff, 1);
    light.position.set(5, 10, 5);
    scene.add(light);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    (async () => {
      const loader = new GLTFLoader();

      try {
        // مدل اصلی
        const glbModel = await loader.loadAsync("/models/modeling.glb");
        const player = glbModel.scene;
        player.scale.set(1.5, 1.5, 1.5);
        player.position.set(0, 0, 0);
        scene.add(player);

        const mixer = new THREE.AnimationMixer(player);

        // Idle پیش‌فرض
        let idleAction: THREE.AnimationAction | null = null;
        try {
          const idleAnim = await loader.loadAsync("/models/Breathing Idle.glb");
          if (idleAnim.animations.length > 0) {
            const idleClip = idleAnim.animations[0];
            idleAction = mixer.clipAction(idleClip);
            idleAction.play();
            console.log("Idle animation loaded successfully.");
          } else {
            console.warn("Idle animation file has no clips.");
          }
        } catch (err) {
          console.error("Failed to load Idle animation:", err);
        }

        // تابع اجرای انیمیشن با هندلینگ خطا
        const playAnimation = async (file: string) => {
          try {
            const anim = await loader.loadAsync(`/models/${file}`);
            if (anim.animations.length > 0) {
              mixer.stopAllAction();
              const clip = anim.animations[0];
              const action = mixer.clipAction(clip);
              action.reset().play();
              console.log(`Playing animation: ${file}`);

              // بعد از مدت زمان انیمیشن یا 3 ثانیه، برگشت به Idle
              setTimeout(() => {
                mixer.stopAllAction();
                if (idleAction) {
                  idleAction.reset().play();
                  console.log("Returned to Idle.");
                }
                player.position.set(0, 0, 0);
                player.scale.set(1.5, 1.5, 1.5);
              }, Math.min(clip.duration * 1000, 3000));
            } else {
              console.warn(`Animation file ${file} has no clips.`);
            }
          } catch (err) {
            console.error(`Failed to load animation ${file}:`, err);
          }
        };

        // دکمه‌ها فقط یک بار bind می‌شن
        const buttons: { id: string; file: string }[] = [
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
          if (btn) {
            btn.addEventListener("click", () => playAnimation(file));
          }
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
      } catch (err) {
        console.error("Failed to load main model:", err);
      }
    })();

    return () => {
      renderer.dispose();
    };
  }, []);

  return (
    <div className="w-full h-screen bg-black">
      <div ref={mountRef} className="w-full h-full" />
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex flex-wrap gap-2">
        <button id="btn-walk" className="px-3 py-1 bg-gray-700 text-white rounded">Walk</button>
        <button id="btn-run" className="px-3 py-1 bg-gray-700 text-white rounded">Run</button>
        <button id="btn-fast-run" className="px-3 py-1 bg-gray-700 text-white rounded">Fast Run</button>
        <button id="btn-jump" className="px-3 py-1 bg-gray-700 text-white rounded">Jump</button>
        <button id="btn-punch" className="px-3 py-1 bg-gray-700 text-white rounded">Punch</button>
        <button id="btn-elbow" className="px-3 py-1 bg-gray-700 text-white rounded">Punch+Elbow</button>
        <button id="btn-kick" className="px-3 py-1 bg-gray-700 text-white rounded">Kick</button>
        <button id="btn-flip-kick" className="px-3 py-1 bg-gray-700 text-white rounded">Flip Kick</button>
        <button id="btn-hit" className="px-3 py-1 bg-gray-700 text-white rounded">Hit</button>
        <button id="btn-death-f" className="px-3 py-1 bg-gray-700 text-white rounded">Death F</button>
        <button id="btn-death-b" className="px-3 py-1 bg-gray-700 text-white rounded">Death B</button>
        <button id="btn-react" className="px-3 py-1 bg-gray-700 text-white rounded">React</button>
        <button id="btn-twist" className="px-3 py-1 bg-gray-700 text-white rounded">Twist</button>
        <button id="btn-turn" className="px-3 py-1 bg-gray-700 text-white rounded">Turn</button>
      </div>
    </div>
  );
          }
