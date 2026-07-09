'use client';

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

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
    renderer.outputEncoding = THREE.sRGBEncoding;

    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.9;

    mountRef.current.appendChild(renderer.domElement);

    // HDRI Environment
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();

    new RGBELoader().load("/studio_small_03_1k.hdr", (hdrTexture) => {
      const envMap = pmrem.fromEquirectangular(hdrTexture).texture;
      scene.environment = envMap;
      scene.background = new THREE.Color("#0a0a0a");
    });

    // Lights
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.55);
    keyLight.position.set(6, 10, 4);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.45);
    fillLight.position.set(-6, 8, -3);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.5);
    rimLight.position.set(0, 9, -10);
    scene.add(rimLight);

    const faceLight = new THREE.DirectionalLight(0xffffff, 0.55);
    faceLight.position.set(0, 4, 3);
    scene.add(faceLight);

    // Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.minDistance = 3;
    controls.maxDistance = 25;

    // Load Model + Animation
    (async () => {
      const loader = new GLTFLoader();

      // مدل اصلی کاراکتر
      const glbModel = await loader.loadAsync(
        "/models/Meshy_AI_Frosted_Aurora_biped_Character_output-optimized (1).glb"
      );
      const player = glbModel.scene;
      player.scale.set(1, 1, 1);
      scene.add(player);

      // متریال طبیعی
      player.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.material) {
          obj.material.envMapIntensity = 0.35;
          obj.material.roughness = 0.72;
          obj.material.metalness = 0.02;
        }
      });

      // Mixer برای انیمیشن
      const mixer = new THREE.AnimationMixer(player);

      // انیمیشن جداگانه (Walking)
      const glbAnim = await loader.loadAsync(
        "/models/ImageToStl.com_Walking+(4).glb"
      );
      if (glbAnim.animations.length > 0) {
        const clip = glbAnim.animations[0];
        const action = mixer.clipAction(clip);
        action.play();
      }

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
