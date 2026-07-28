"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { loadPlayerModel } from "@/app/game/core/PlayerModel";
import { createGameLogic } from "@/app/game/core/GameLogic";
import {
  destroyAllChunks,
  findSafeSpawnPosition,
  generateChunk,
  getChunkCoord,
  resolveWorldCollision,
  updateCameraOcclusion,
  updateChunks,
  updatePlayerWorldHeight,
  updateWorldAnimations,
} from "@/app/game/world/WorldManager";

type JoystickState = {
  x: number;
  y: number;
};

const CAMERA_OFFSET = new THREE.Vector3(12.5, 18, 12.5);
const PLAYER_COLLISION_RADIUS = 0.38;
const PLAYER_TARGET_HEIGHT = 1.65;
const MAX_DELTA = 0.05;
const CAMERA_SMOOTHING = 6;
const MOVE_EPSILON = 0.000001;

export default function ChaosLane3D() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const joystickRef = useRef<JoystickState>({ x: 0, y: 0 });
  const joystickKnobRef = useRef<HTMLDivElement | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const playerRef = useRef<THREE.Object3D | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const gameLogicRef = useRef<ReturnType<typeof createGameLogic> | null>(null);
  const setMoveBySpeedRef = useRef<(speed: number) => void>(() => {});
  const playAnimOnceRef = useRef<(file: string) => void>(() => {});

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    const isMobile =
      window.matchMedia("(pointer: coarse)").matches ||
      /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);

    const pixelRatioLimit = isMobile ? 1.1 : 1.45;
    const shadowMapSize = isMobile ? 512 : 1024;
    const occlusionInterval = 1 / (isMobile ? 24 : 40);
    const sunInterval = 1 / (isMobile ? 24 : 40);

    let disposed = false;
    let frameId = 0;
    let resizeFrameId = 0;
    let activeChunkX = Number.NaN;
    let activeChunkZ = Number.NaN;
    let nextChunkX = Number.NaN;
    let nextChunkZ = Number.NaN;
    let chunkLoading = false;
    let loadingDisposed = false;
    let lastMovementAmount = -1;
    let occlusionAccumulator = 0;
    let sunAccumulator = 0;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x303534);
    scene.fog = new THREE.Fog(0x303534, 120, 285);

    const getViewportSize = () => {
      const width = Math.max(1, mount.clientWidth || window.innerWidth);
      const height = Math.max(1, mount.clientHeight || window.innerHeight);
      return { width, height };
    };

    const initialSize = getViewportSize();
    const camera = new THREE.PerspectiveCamera(
      56,
      initialSize.width / initialSize.height,
      0.1,
      350
    );

    const renderer = new THREE.WebGLRenderer({
      antialias: !isMobile,
      powerPreference: "high-performance",
    });

    renderer.setSize(initialSize.width, initialSize.height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, pixelRatioLimit));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.3;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = isMobile
      ? THREE.PCFShadowMap
      : THREE.PCFSoftShadowMap;
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.touchAction = "none";
    mount.appendChild(renderer.domElement);

    const hemisphereLight = new THREE.HemisphereLight(0xe4ebff, 0x4a514b, 1.7);
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.32);
    const sun = new THREE.DirectionalLight(0xfff0d8, 2.15);

    sun.position.set(35, 55, 25);
    sun.castShadow = true;
    sun.shadow.mapSize.set(shadowMapSize, shadowMapSize);
    sun.shadow.camera.left = -48;
    sun.shadow.camera.right = 48;
    sun.shadow.camera.top = 48;
    sun.shadow.camera.bottom = -48;
    sun.shadow.camera.near = 1;
    sun.shadow.camera.far = 140;
    sun.shadow.bias = -0.00025;
    sun.shadow.normalBias = 0.025;

    scene.add(hemisphereLight, ambientLight, sun, sun.target);

    const loadingGeometry = new THREE.PlaneGeometry(280, 280);
    const loadingMaterial = new THREE.MeshStandardMaterial({
      color: 0x2d3331,
      roughness: 1,
    });
    const loadingGround = new THREE.Mesh(loadingGeometry, loadingMaterial);

    loadingGround.rotation.x = -Math.PI / 2;
    loadingGround.position.y = -0.1;
    loadingGround.receiveShadow = true;
    scene.add(loadingGround);

    const removeLoadingGround = () => {
      if (loadingDisposed) return;
      loadingDisposed = true;
      loadingGround.removeFromParent();
      loadingGeometry.dispose();
      loadingMaterial.dispose();
    };

    const clock = new THREE.Clock();
    const cameraDesired = new THREE.Vector3();
    const cameraTarget = new THREE.Vector3();
    const occlusionTarget = new THREE.Vector3();

    const updateSun = (player: THREE.Object3D) => {
      sun.position.set(
        player.position.x + 35,
        player.position.y + 55,
        player.position.z + 25
      );
      sun.target.position.copy(player.position);
      sun.target.updateMatrixWorld();
    };

    const requestChunkUpdate = (player: THREE.Object3D) => {
      const { cx, cz } = getChunkCoord(player.position.x, player.position.z);

      if (cx === nextChunkX && cz === nextChunkZ) return;

      nextChunkX = cx;
      nextChunkZ = cz;

      if (cx === activeChunkX && cz === activeChunkZ) return;
      if (chunkLoading) return;

      chunkLoading = true;

      void (async () => {
        try {
          while (
            !disposed &&
            (activeChunkX !== nextChunkX || activeChunkZ !== nextChunkZ)
          ) {
            const targetX = nextChunkX;
            const targetZ = nextChunkZ;
            await updateChunks(
              scene,
              player.position.x,
              player.position.z,
              1
            );

            if (disposed) return;

            activeChunkX = targetX;
            activeChunkZ = targetZ;
          }
        } catch (error) {
          console.error("Chunk update failed:", error);
        } finally {
          chunkLoading = false;
        }
      })();
    };

    const updateCamera = (
      player: THREE.Object3D,
      delta: number,
      runOcclusion: boolean,
      occlusionDelta: number
    ) => {
      cameraDesired.set(
        player.position.x + CAMERA_OFFSET.x,
        player.position.y + CAMERA_OFFSET.y,
        player.position.z + CAMERA_OFFSET.z
      );

      camera.position.lerp(
        cameraDesired,
        1 - Math.exp(-CAMERA_SMOOTHING * delta)
      );

      cameraTarget.set(
        player.position.x,
        player.position.y + PLAYER_TARGET_HEIGHT,
        player.position.z
      );

      if (runOcclusion) {
        occlusionTarget.copy(cameraTarget);
        updateCameraOcclusion(camera, occlusionTarget, occlusionDelta);
      }

      camera.lookAt(cameraTarget);
    };

    const animate = () => {
      if (disposed) return;

      frameId = requestAnimationFrame(animate);

      const delta = Math.min(clock.getDelta(), MAX_DELTA);
      mixerRef.current?.update(delta);
      updateWorldAnimations(clock.elapsedTime);

      const joystick = joystickRef.current;
      const movementAmount = Math.min(1, Math.hypot(joystick.x, joystick.y));

      if (Math.abs(movementAmount - lastMovementAmount) > 0.001) {
        lastMovementAmount = movementAmount;
        setMoveBySpeedRef.current(movementAmount);
      }

      const player = playerRef.current;
      const gameLogic = gameLogicRef.current;

      if (player && gameLogic && player.visible) {
        const previousX = player.position.x;
        const previousZ = player.position.z;

        gameLogic.update(delta, joystick);

        const movedX = player.position.x - previousX;
        const movedZ = player.position.z - previousZ;
        const moved = movedX * movedX + movedZ * movedZ > MOVE_EPSILON;

        if (moved) {
          resolveWorldCollision(
            player,
            previousX,
            previousZ,
            PLAYER_COLLISION_RADIUS
          );
          requestChunkUpdate(player);
        }

        updatePlayerWorldHeight(player, delta);

        occlusionAccumulator += delta;
        const runOcclusion = occlusionAccumulator >= occlusionInterval;
        const occlusionDelta = occlusionAccumulator;

        if (runOcclusion) {
          occlusionAccumulator = 0;
        }

        updateCamera(player, delta, runOcclusion, occlusionDelta);

        sunAccumulator += delta;
        if (sunAccumulator >= sunInterval) {
          sunAccumulator = 0;
          updateSun(player);
        }
      }

      renderer.render(scene, camera);
    };

    const applyResize = () => {
      resizeFrameId = 0;
      const { width, height } = getViewportSize();
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
      renderer.setPixelRatio(
        Math.min(window.devicePixelRatio, pixelRatioLimit)
      );
    };

    const handleResize = () => {
      if (resizeFrameId) cancelAnimationFrame(resizeFrameId);
      resizeFrameId = requestAnimationFrame(applyResize);
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) clock.getDelta();
    };

    window.addEventListener("resize", handleResize, { passive: true });
    document.addEventListener("visibilitychange", handleVisibilityChange);

    const startGame = async () => {
      try {
        generateChunk(scene, 0, 0);

        const playerResult = await loadPlayerModel(scene);

        if (disposed) {
          playerResult.player.removeFromParent();
          return;
        }

        const { player, mixer, setMoveBySpeed, playAnimOnce } = playerResult;

        playerRef.current = player;
        mixerRef.current = mixer;
        setMoveBySpeedRef.current = setMoveBySpeed;
        playAnimOnceRef.current = playAnimOnce;

        player.scale.setScalar(1.4);
        player.visible = false;

        await updateChunks(scene, 0, 0, 1);

        if (disposed) {
          player.removeFromParent();
          return;
        }

        const spawn = findSafeSpawnPosition(0, 0, 0.5);
        player.position.copy(spawn);
        gameLogicRef.current = createGameLogic(player);

        const spawnChunk = getChunkCoord(
          player.position.x,
          player.position.z
        );

        activeChunkX = spawnChunk.cx;
        activeChunkZ = spawnChunk.cz;
        nextChunkX = spawnChunk.cx;
        nextChunkZ = spawnChunk.cz;

        camera.position.set(
          player.position.x + CAMERA_OFFSET.x,
          player.position.y + CAMERA_OFFSET.y,
          player.position.z + CAMERA_OFFSET.z
        );

        cameraTarget.set(
          player.position.x,
          player.position.y + PLAYER_TARGET_HEIGHT,
          player.position.z
        );

        camera.lookAt(cameraTarget);
        updateSun(player);
        removeLoadingGround();
        player.visible = true;
      } catch (error) {
        console.error("Game startup failed:", error);
        removeLoadingGround();
      }
    };

    void startGame();
    animate();

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);

      if (resizeFrameId) {
        cancelAnimationFrame(resizeFrameId);
      }

      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", handleVisibilityChange);

      mixerRef.current?.stopAllAction();
      destroyAllChunks();
      playerRef.current?.removeFromParent();

      playerRef.current = null;
      mixerRef.current = null;
      gameLogicRef.current = null;
      setMoveBySpeedRef.current = () => {};
      playAnimOnceRef.current = () => {};
      joystickRef.current = { x: 0, y: 0 };
      pointerIdRef.current = null;

      removeLoadingGround();
      scene.clear();
      renderer.dispose();
      renderer.forceContextLoss();

      if (renderer.domElement.parentNode === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  const updateJoystick = (
    element: HTMLDivElement,
    clientX: number,
    clientY: number
  ) => {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const rawX = clientX - centerX;
    const rawY = clientY - centerY;
    const radius = Math.max(1, Math.min(rect.width, rect.height) * 0.34);
    const distance = Math.hypot(rawX, rawY);
    const multiplier = distance > radius ? radius / distance : 1;
    const knobX = rawX * multiplier;
    const knobY = rawY * multiplier;

    joystickRef.current.x = knobX / radius;
    joystickRef.current.y = -knobY / radius;

    if (joystickKnobRef.current) {
      joystickKnobRef.current.style.transform =
        `translate3d(${knobX}px, ${knobY}px, 0)`;
    }
  };

  const resetJoystick = () => {
    joystickRef.current.x = 0;
    joystickRef.current.y = 0;
    pointerIdRef.current = null;

    if (joystickKnobRef.current) {
      joystickKnobRef.current.style.transform = "translate3d(0, 0, 0)";
    }

    setMoveBySpeedRef.current(0);
  };

  const handlePointerDown = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    event.preventDefault();
    pointerIdRef.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);
    updateJoystick(
      event.currentTarget,
      event.clientX,
      event.clientY
    );
  };

  const handlePointerMove = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    if (pointerIdRef.current !== event.pointerId) return;

    updateJoystick(
      event.currentTarget,
      event.clientX,
      event.clientY
    );
  };

  const handlePointerEnd = (
    event: React.PointerEvent<HTMLDivElement>
  ) => {
    if (pointerIdRef.current !== event.pointerId) return;

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    resetJoystick();
  };

  const playAction = (file: string) => {
    playAnimOnceRef.current(file);
  };

  return (
    <div className="fixed inset-0 h-full w-full select-none overflow-hidden bg-black">
      <div ref={mountRef} className="h-full w-full" />

      <div
        className="absolute bottom-8 left-8 flex h-28 w-28 touch-none items-center justify-center rounded-full border border-white/10 bg-black/30 shadow-[0_0_20px_rgba(0,0,0,.45)] backdrop-blur-xl"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        <div
          ref={joystickKnobRef}
          className="pointer-events-none h-12 w-12 rounded-full border border-white/20 bg-zinc-300/60 shadow-xl"
        />
      </div>

      <div className="absolute bottom-8 right-8 flex touch-none flex-col gap-4">
        <div className="flex gap-4">
          <button
            type="button"
            aria-label="Punch"
            onPointerDown={(event) => {
              event.preventDefault();
              playAction("Combo Punch.glb");
            }}
            className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-black/30 shadow-xl backdrop-blur-xl active:scale-90"
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 26 26"
              fill="white"
              aria-hidden="true"
            >
              <path d="M4 14l6 6 12-12-2-2-10 10-4-4z" />
            </svg>
          </button>

          <button
            type="button"
            aria-label="Kick"
            onPointerDown={(event) => {
              event.preventDefault();
              playAction("Mma Kick.glb");
            }}
            className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-black/30 shadow-xl backdrop-blur-xl active:scale-90"
          >
            <svg
              width="26"
              height="26"
              viewBox="0 0 26 26"
              fill="white"
              aria-hidden="true"
            >
              <path d="M3 20l8-8-2-2-8 8zM14 4l8 8-2 2-8-8z" />
            </svg>
          </button>
        </div>

        <button
          type="button"
          aria-label="Jump"
          onPointerDown={(event) => {
            event.preventDefault();
            playAction("Jumping.glb");
          }}
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-black/30 shadow-xl backdrop-blur-xl active:scale-90"
        >
          <svg
            width="26"
            height="26"
            viewBox="0 0 26 26"
            fill="white"
            aria-hidden="true"
          >
            <path d="M12 2l6 10h-4v10h-4V12H6z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
