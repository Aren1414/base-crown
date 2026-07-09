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
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.85;

    mountRef.current.appendChild(renderer.domElement);

    // Cache برای بهینه‌سازی
    THREE.Cache.enabled = true;

    // HDRI Environment
    const pmrem = new THREE.PMREMGenerator(renderer);
    pmrem.compileEquirectangularShader();

    new RGBELoader().load("/studio_small_03_1k.hdr", (hdrTexture) => {
      const envMap = pmrem.fromEquirectangular(hdrTexture).texture;
      scene.environment = envMap;
      scene.background = new THREE.Color("#0a0a0a");
    });

    // Lights (شدت کمتر برای جزئیات بهتر)
    const keyLight = new THREE.DirectionalLight(0xffffff, 0.35);
    keyLight.position.set(6, 10, 4);
    scene.add(keyLight);

    const fillLight = new THREE.DirectionalLight(0xffffff, 0.25);
    fillLight.position.set(-6, 8, -3);
    scene.add(fillLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 0.3);
    rimLight.position.set(0, 9, -10);
    scene.add(rimLight);

    const faceLight = new THREE.DirectionalLight(0xffffff, 0.4);
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

      // Mixer برای انیمیشن
      const mixer = new THREE.AnimationMixer(player);

      // لیست انیمیشن‌ها
      const animations = [
        "Breathing Idle.glb",
        "Running.glb",
        "Fast Run.glb",
        "Jumping.glb",
        "Combo Punch.glb",
        "Punch To Elbow Combo.glb",
        "Mma Kick.glb",
        "Flip Kick.glb",
        "Kidney Hit.glb",
        "Standing Death Forward.glb",
        "Standing Death Backward.glb",
        "Standing React Small From Right.glb",
        "Catwalk Idle To Twist R.glb",
        "Catwalk Walk Forward Arc 90L.glb",
        "Catwalk Walk Forward Turn 90L.glb"
      ];

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

      // شروع با Idle
      await playAnimation("Breathing Idle.glb");

      // هر 8 ثانیه یک انیمیشن رندوم
      setInterval(() => {
        const random = animations[Math.floor(Math.random() * animations.length)];
        playAnimation(random);
      }, 8000);

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
