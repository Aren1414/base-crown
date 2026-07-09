'use client';

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export default function ChaosLane3D() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color("#000000");

    // Camera
    const camera = new THREE.PerspectiveCamera(
      65,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    camera.position.set(0, 4.5, 10);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.85;
    mountRef.current.appendChild(renderer.domElement);

    // Lights
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.5);
    keyLight.position.set(6, 10, 4);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
    fillLight.position.set(-6, 8, -3);
    scene.add(fillLight);

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    // Loader
    (async () => {
      const loader = new GLTFLoader();

      // مدل اصلی
      const glbModel = await loader.loadAsync("/models/modeling.glb");
      const player = glbModel.scene;
      player.scale.set(1, 1, 1);
      scene.add(player);

      // متریال طبیعی
      player.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.material) {
          obj.material.envMapIntensity = 0.3;
          obj.material.roughness = 0.7;
          obj.material.metalness = 0.05;
        }
      });

      // Mixer
      const mixer = new THREE.AnimationMixer(player);

      // Idle پیش‌فرض
      const idleAnim = await loader.loadAsync("/models/Breathing Idle.glb");
      const idleClip = idleAnim.animations[0];
      const idleAction = mixer.clipAction(idleClip);
      idleAction.play();

      // تابع اجرای انیمیشن
      const playAnimation = async (file: string) => {
        const anim = await loader.loadAsync(`/models/${file}`);
        if (anim.animations.length > 0) {
          mixer.stopAllAction();
          const clip = anim.animations[0];
          const action = mixer.clipAction(clip);
          action.reset().play();
        }
      };

      // دکمه‌ها
      document.getElementById("btn-walk")?.addEventListener("click", () => playAnimation("Catwalk Walk Forward Arc 90L.glb"));
      document.getElementById("btn-run")?.addEventListener("click", () => playAnimation("Running.glb"));
      document.getElementById("btn-fast-run")?.addEventListener("click", () => playAnimation("Fast Run.glb"));
      document.getElementById("btn-jump")?.addEventListener("click", () => playAnimation("Jumping.glb"));
      document.getElementById("btn-punch")?.addEventListener("click", () => playAnimation("Combo Punch.glb"));
      document.getElementById("btn-elbow")?.addEventListener("click", () => playAnimation("Punch To Elbow Combo.glb"));
      document.getElementById("btn-kick")?.addEventListener("click", () => playAnimation("Mma Kick.glb"));
      document.getElementById("btn-flip-kick")?.addEventListener("click", () => playAnimation("Flip Kick.glb"));
      document.getElementById("btn-hit")?.addEventListener("click", () => playAnimation("Kidney Hit.glb"));
      document.getElementById("btn-death-f")?.addEventListener("click", () => playAnimation("Standing Death Forward.glb"));
      document.getElementById("btn-death-b")?.addEventListener("click", () => playAnimation("Standing Death Backward.glb"));
      document.getElementById("btn-react")?.addEventListener("click", () => playAnimation("Standing React Small From Right.glb"));
      document.getElementById("btn-twist")?.addEventListener("click", () => playAnimation("Catwalk Idle To Twist R.glb"));
      document.getElementById("btn-turn")?.addEventListener("click", () => playAnimation("Catwalk Walk Forward Turn 90L.glb"));

      // Loop
      const clock = new THREE.Clock();
      const animate = () => {
        requestAnimationFrame(animate);
        const delta = clock.getDelta();
        mixer.update(delta);
        controls.update();
        renderer.render(scene, camera);
      };
      animate();
    })();

    return () => {
      renderer.dispose();
    };
  }, []);

  return (
    <div className="w-full h-screen bg-black text-white relative overflow-hidden">
      <div ref={mountRef} className="w-full h-full" />
      {/* دکمه‌ها */}
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
