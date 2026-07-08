'use client';

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { loadPlayerModel } from "./core/PlayerModel";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";

export default function ChaosLane3D() {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!mountRef.current) return;

    // Scene
    const scene = new THREE.Scene();

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

    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1; // طبیعی‌تر

    mountRef.current.appendChild(renderer.domElement);

    // HDRI
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();

    new RGBELoader().load(
      "/studio_small_03_1k.hdr",
      (hdrTexture) => {
        const envMap = pmrem.fromEquirectangular(hdrTexture).texture;
        scene.environment = envMap;
        scene.background = new THREE.Color("#0a0a0a");
      }
    );

    // Lights (متعادل‌تر)
    const keyLight = new THREE.DirectionalLight(0xffffff, 1.6);
    keyLight.position.set(10, 15, 10);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.9);
    fillLight.position.set(-10, 10, -5);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 1.1);
    rimLight.position.set(0, 12, -15);
    scene.add(rimLight);

    const faceLight = new THREE.DirectionalLight(0xffffff, 1.4);
    faceLight.position.set(0, 6, 6);
    scene.add(faceLight);

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.rotateSpeed = 0.8;
    controls.zoomSpeed = 1.0;
    controls.panSpeed = 0.8;
    controls.minDistance = 3;
    controls.maxDistance = 25;

    // Load Model
    (async () => {
      const { playerGroup, mixer } = await loadPlayerModel(scene);

      // متریال طبیعی‌تر
      playerGroup.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.material) {
          obj.material.envMapIntensity = 0.9;   // کمتر، طبیعی‌تر
          obj.material.roughness = 0.55;        // پوست و لباس طبیعی
          obj.material.metalness = 0.05;        // خیلی کم، طبیعی
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
