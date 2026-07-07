'use client';

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { loadPlayerModel } from "./core/PlayerModel";
import { createGameLogic } from "./core/GameLogic";

export default function ChaosLane3D() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [score, setScore] = useState(0);
  const [bestScore, setBestScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    if (!mountRef.current) return;

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog("#020617", 10, 80);

    const camera = new THREE.PerspectiveCamera(
      65,
      window.innerWidth / window.innerHeight,
      0.1,
      200
    );
    camera.position.set(0, 4.5, 10);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.shadowMap.enabled = true;
    mountRef.current.appendChild(renderer.domElement);

    const hemiLight = new THREE.HemisphereLight(0x4f46e5, 0x020617, 1.4);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.2);
    dirLight.position.set(8, 18, 12);
    dirLight.castShadow = true;
    scene.add(dirLight);

    (async () => {
      const { playerGroup, mixer, playAction } = await loadPlayerModel(scene);
      const game = createGameLogic(scene, playerGroup);

      const clock = new THREE.Clock();

      const animate = () => {
        requestAnimationFrame(animate);

        const delta = clock.getDelta();
        mixer.update(delta);

        const { score: s, gameOver: over } = game.update(delta, playAction);
        setScore(s);

        if (over) {
          setGameOver(true);
          setBestScore((prev) => (s > prev ? s : prev));
        }

        renderer.render(scene, camera);
      };

      animate();

      const keyHandler = (e: KeyboardEvent) => {
        game.handleKey(e, playAction);
      };

      window.addEventListener("keydown", keyHandler);

      return () => {
        window.removeEventListener("keydown", keyHandler);
      };
    })();
  }, []);

  return (
    <div className="w-full h-screen bg-black text-white relative overflow-hidden">
      <div ref={mountRef} className="w-full h-full" />

      <div className="absolute top-4 left-0 right-0 flex justify-center gap-8 text-sm">
        <div className="px-3 py-1 rounded-full bg-white/10 backdrop-blur">
          Score: {score}
        </div>
        <div className="px-3 py-1 rounded-full bg-white/10 backdrop-blur">
          Best: {bestScore}
        </div>
      </div>

      {!gameOver && (
        <div className="absolute bottom-6 left-0 right-0 flex justify-center gap-10">
          <button
            onClick={() =>
              window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowLeft" }))
            }
            className="w-14 h-14 rounded-full bg-white/10 border border-white/20 text-xl active:bg-white/20"
          >
            ◀
          </button>

          <button
            onClick={() =>
              window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowUp" }))
            }
            className="w-16 h-16 rounded-full bg-blue-600/80 border border-blue-300/40 text-2xl active:bg-blue-700/80"
          >
            ⬆
          </button>

          <button
            onClick={() =>
              window.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight" }))
            }
            className="w-14 h-14 rounded-full bg-white/10 border border-white/20 text-xl active:bg-white/20"
          >
            ▶
          </button>
        </div>
      )}

      {gameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <div className="px-6 py-4 rounded-2xl bg-zinc-900 text-center space-y-2">
            <div className="text-lg font-semibold">Game Over</div>
            <div className="text-sm">Score: {score}</div>
            <div className="text-sm">Best: {bestScore}</div>
            <div className="text-xs opacity-70 mt-2">Refresh to play again</div>
          </div>
        </div>
      )}
    </div>
  );
}
