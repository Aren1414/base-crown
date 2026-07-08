'use client';

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { loadPlayerModel } from "./core/PlayerModel";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";

export default function ChaosLane3D() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog("#020617", 10, 80);

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
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);

    // Lights
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x020617, 1.4);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.2);
    dirLight.position.set(8, 18, 12);
    dirLight.castShadow = true;
    scene.add(dirLight);

    // Orbit Controls (برای چرخاندن مدل)
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.8;
    controls.zoomSpeed = 1.0;
    controls.panSpeed = 0.8;

    // محدود کردن زوم
    controls.minDistance = 3;
    controls.maxDistance = 25;

    // مدل را لود کن
    (async () => {
      const { playerGroup, mixer } = await loadPlayerModel(scene);

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

    // Cleanup
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
