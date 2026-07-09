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
    scene.background = new THREE.Color("#000000"); // پس‌زمینه سیاه

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

      try {
        // مدل اصلی کاراکتر
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
      } catch (err) {
        console.error("مدل لود نشد:", err);

        // تست: مکعب ساده اضافه کن تا مطمئن بشی صحنه کار می‌کنه
        const cube = new THREE.Mesh(
          new THREE.BoxGeometry(2, 2, 2),
          new THREE.MeshStandardMaterial({ color: "red" })
        );
        scene.add(cube);
      }

      const animate = () => {
        requestAnimationFrame(animate);
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
    </div>
  );
}
