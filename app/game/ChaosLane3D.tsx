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
    camera.position.set(0, 2, 6); // نزدیک‌تر و پایین‌تر برای دید بهتر

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
        const glbModel = await loader.loadAsync("/models/modeling.glb");
        const player = glbModel.scene;

        // مقیاس و موقعیت مطمئن
        player.scale.set(1, 1, 1);
        player.position.set(0, 0, 0);

        scene.add(player);
      } catch (err) {
        console.error("مدل لود نشد:", err);

        // تست: مکعب قرمز
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
    <div className="w-full h-screen bg-black">
      <div ref={mountRef} className="w-full h-full" />
    </div>
  );
}
