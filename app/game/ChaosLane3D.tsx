"use client";

import { useEffect, useRef, type PointerEvent as ReactPointerEvent } from "react";
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

type JoystickState = { x: number; y: number };
type GameLogic = ReturnType<typeof createGameLogic>;

const CAMERA_OFFSET = new THREE.Vector3(12.5, 18, 12.5);
const CAMERA_TARGET_HEIGHT = 1.65;
const CHUNK_DISTANCE = 1;
const HEIGHT_INTERVAL = 1 / 30;
const OCCLUSION_INTERVAL = 1 / 20;
const WORLD_ANIMATION_INTERVAL = 1 / 30;
const CHUNK_CHECK_INTERVAL = 0.12;

const ACTIONS = [
  { label: "Punch", file: "Combo Punch.glb", path: "M4 14l6 6 12-12-2-2-10 10-4-4z" },
  { label: "Kick", file: "Mma Kick.glb", path: "M3 20l8-8-2-2-8 8zM14 4l8 8-2 2-8-8z" },
] as const;

export default function ChaosLane3D() {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const joystickRef = useRef<JoystickState>({ x: 0, y: 0 });
  const joystickKnobRef = useRef<HTMLDivElement | null>(null);
  const joystickRectRef = useRef<DOMRect | null>(null);
  const pointerIdRef = useRef<number | null>(null);
  const playerRef = useRef<THREE.Object3D | null>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const gameLogicRef = useRef<GameLogic | null>(null);
  const setMoveBySpeedRef = useRef<(speed: number) => void>(() => {});
  const playAnimOnceRef = useRef<(file: string) => void>(() => {});

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let disposed = false;
    let running = false;
    let frameId = 0;
    let activeChunkX = Number.NaN;
    let activeChunkZ = Number.NaN;
    let nextChunkX = Number.NaN;
    let nextChunkZ = Number.NaN;
    let chunkLoading = false;
    let lastMoveAmount = -1;
    let elapsed = 0;
    let heightTimer = 0;
    let occlusionTimer = 0;
    let worldAnimationTimer = 0;
    let chunkCheckTimer = 0;
    let viewportWidth = 0;
    let viewportHeight = 0;

    const scene = new THREE.Scene();
    const skyColor = new THREE.Color(0x303534);
    scene.background = skyColor;
    scene.fog = new THREE.Fog(skyColor, 105, 230);

    const camera = new THREE.PerspectiveCamera(56, 1, 0.1, 260);
    const renderer = new THREE.WebGLRenderer({
      antialias: false,
      alpha: false,
      depth: true,
      stencil: false,
      precision: "mediump",
      powerPreference: "high-performance",
      preserveDrawingBuffer: false,
    });

    renderer.setPixelRatio(1);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.shadowMap.enabled = false;
    renderer.domElement.style.cssText = "width:100%;height:100%;display:block;touch-action:none";
    mount.appendChild(renderer.domElement);

    const hemisphereLight = new THREE.HemisphereLight(0xe4ebff, 0x4a514b, 1.75);
    const sun = new THREE.DirectionalLight(0xfff0d8, 2.1);
    sun.position.set(35, 55, 25);
    sun.target.position.set(0, 0, 0);
    scene.add(hemisphereLight, sun, sun.target);

    const loadingGeometry = new THREE.PlaneGeometry(280, 280, 1, 1);
    const loadingMaterial = new THREE.MeshBasicMaterial({ color: 0x2d3331 });
    const loadingGround = new THREE.Mesh(loadingGeometry, loadingMaterial);
    loadingGround.rotation.x = -Math.PI / 2;
    loadingGround.position.y = -0.1;
    loadingGround.updateMatrix();
    loadingGround.matrixAutoUpdate = false;
    scene.add(loadingGround);

    let loadingDisposed = false;
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

    const resizeRenderer = () => {
      const width = Math.max(1, mount.clientWidth || window.innerWidth);
      const height = Math.max(1, mount.clientHeight || window.innerHeight);
      if (width === viewportWidth && height === viewportHeight) return;
      viewportWidth = width;
      viewportHeight = height;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };

    const requestChunkUpdate = (player: THREE.Object3D) => {
      const { cx, cz } = getChunkCoord(player.position.x, player.position.z);
      nextChunkX = cx;
      nextChunkZ = cz;
      if ((cx === activeChunkX && cz === activeChunkZ) || chunkLoading) return;

      chunkLoading = true;
      void (async () => {
        try {
          while (!disposed && (activeChunkX !== nextChunkX || activeChunkZ !== nextChunkZ)) {
            const targetX = nextChunkX;
            const targetZ = nextChunkZ;
            await updateChunks(scene, player.position.x, player.position.z, CHUNK_DISTANCE);
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

    const updateCamera = (player: THREE.Object3D, delta: number) => {
      cameraDesired.set(
        player.position.x + CAMERA_OFFSET.x,
        player.position.y + CAMERA_OFFSET.y,
        player.position.z + CAMERA_OFFSET.z,
      );
      camera.position.lerp(cameraDesired, 1 - Math.exp(-6 * delta));
      cameraTarget.set(player.position.x, player.position.y + CAMERA_TARGET_HEIGHT, player.position.z);

      occlusionTimer += delta;
      if (occlusionTimer >= OCCLUSION_INTERVAL) {
        occlusionTarget.copy(cameraTarget);
        updateCameraOcclusion(camera, occlusionTarget, occlusionTimer);
        occlusionTimer = 0;
      }
      camera.lookAt(cameraTarget);
    };

    const animate = () => {
      if (!running || disposed) return;
      frameId = requestAnimationFrame(animate);

      const delta = Math.min(clock.getDelta(), 0.05);
      elapsed += delta;
      mixerRef.current?.update(delta);

      worldAnimationTimer += delta;
      if (worldAnimationTimer >= WORLD_ANIMATION_INTERVAL) {
        updateWorldAnimations(elapsed);
        worldAnimationTimer = 0;
      }

      const joystick = joystickRef.current;
      const movementAmount = Math.min(1, Math.hypot(joystick.x, joystick.y));
      if (Math.abs(movementAmount - lastMoveAmount) > 0.015) {
        lastMoveAmount = movementAmount;
        setMoveBySpeedRef.current(movementAmount);
      }

      const player = playerRef.current;
      const gameLogic = gameLogicRef.current;
      if (player && gameLogic && player.visible) {
        const previousX = player.position.x;
        const previousZ = player.position.z;
        gameLogic.update(delta, joystick);
        resolveWorldCollision(player, previousX, previousZ, 0.38);

        heightTimer += delta;
        if (heightTimer >= HEIGHT_INTERVAL) {
          updatePlayerWorldHeight(player, heightTimer);
          heightTimer = 0;
        }

        chunkCheckTimer += delta;
        if (chunkCheckTimer >= CHUNK_CHECK_INTERVAL) {
          requestChunkUpdate(player);
          chunkCheckTimer = 0;
        }

        updateCamera(player, delta);
      }

      renderer.render(scene, camera);
    };

    const startLoop = () => {
      if (disposed || running || document.hidden) return;
      running = true;
      clock.getDelta();
      frameId = requestAnimationFrame(animate);
    };

    const stopLoop = () => {
      if (!running) return;
      running = false;
      cancelAnimationFrame(frameId);
      frameId = 0;
    };

    const handleVisibility = () => (document.hidden ? stopLoop() : startLoop());
    resizeRenderer();
    window.addEventListener("resize", resizeRenderer, { passive: true });
    document.addEventListener("visibilitychange", handleVisibility);

    const startGame = async () => {
      try {
        generateChunk(scene, 0, 0);
        const result = await loadPlayerModel(scene);
        const { player, mixer, setMoveBySpeed, playAnimOnce } = result;

        if (disposed) {
          mixer.stopAllAction();
          player.removeFromParent();
          return;
        }

        player.scale.setScalar(1.4);
        player.visible = false;
        await updateChunks(scene, 0, 0, CHUNK_DISTANCE);

        if (disposed) {
          mixer.stopAllAction();
          player.removeFromParent();
          return;
        }

        playerRef.current = player;
        mixerRef.current = mixer;
        setMoveBySpeedRef.current = setMoveBySpeed;
        playAnimOnceRef.current = playAnimOnce;

        player.position.copy(findSafeSpawnPosition(0, 0, 0.5));
        gameLogicRef.current = createGameLogic(player);

        const spawnChunk = getChunkCoord(player.position.x, player.position.z);
        activeChunkX = nextChunkX = spawnChunk.cx;
        activeChunkZ = nextChunkZ = spawnChunk.cz;

        camera.position.set(
          player.position.x + CAMERA_OFFSET.x,
          player.position.y + CAMERA_OFFSET.y,
          player.position.z + CAMERA_OFFSET.z,
        );
        cameraTarget.set(player.position.x, player.position.y + CAMERA_TARGET_HEIGHT, player.position.z);
        camera.lookAt(cameraTarget);

        removeLoadingGround();
        player.visible = true;
      } catch (error) {
        console.error("Game startup failed:", error);
        removeLoadingGround();
      }
    };

    void startGame();
    startLoop();

    return () => {
      disposed = true;
      stopLoop();
      window.removeEventListener("resize", resizeRenderer);
      document.removeEventListener("visibilitychange", handleVisibility);
      mixerRef.current?.stopAllAction();
      destroyAllChunks();
      playerRef.current?.removeFromParent();
      playerRef.current = null;
      mixerRef.current = null;
      gameLogicRef.current = null;
      joystickRef.current = { x: 0, y: 0 };
      joystickRectRef.current = null;
      pointerIdRef.current = null;
      removeLoadingGround();
      scene.clear();
      renderer.dispose();
      renderer.forceContextLoss();
      renderer.domElement.remove();
    };
  }, []);

  const updateJoystick = (clientX: number, clientY: number) => {
    const rect = joystickRectRef.current;
    if (!rect) return;

    const rawX = clientX - (rect.left + rect.width / 2);
    const rawY = clientY - (rect.top + rect.height / 2);
    const radius = Math.max(1, Math.min(rect.width, rect.height) * 0.34);
    const distance = Math.hypot(rawX, rawY);
    const multiplier = distance > radius ? radius / distance : 1;
    const knobX = rawX * multiplier;
    const knobY = rawY * multiplier;

    joystickRef.current.x = knobX / radius;
    joystickRef.current.y = -knobY / radius;
    if (joystickKnobRef.current) {
      joystickKnobRef.current.style.transform = `translate3d(${knobX}px,${knobY}px,0)`;
    }
  };

  const resetJoystick = () => {
    joystickRef.current.x = 0;
    joystickRef.current.y = 0;
    joystickRectRef.current = null;
    pointerIdRef.current = null;
    if (joystickKnobRef.current) joystickKnobRef.current.style.transform = "translate3d(0,0,0)";
    setMoveBySpeedRef.current(0);
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    pointerIdRef.current = event.pointerId;
    joystickRectRef.current = event.currentTarget.getBoundingClientRect();
    event.currentTarget.setPointerCapture(event.pointerId);
    updateJoystick(event.clientX, event.clientY);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;
    event.preventDefault();
    updateJoystick(event.clientX, event.clientY);
  };

  const handlePointerEnd = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (pointerIdRef.current !== event.pointerId) return;
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
    resetJoystick();
  };

  const triggerAction = (event: ReactPointerEvent<HTMLButtonElement>, file: string) => {
    event.preventDefault();
    playAnimOnceRef.current(file);
  };

  return (
    <div className="fixed inset-0 h-full w-full select-none overflow-hidden bg-black">
      <div ref={mountRef} className="h-full w-full" />

      <div
        className="absolute bottom-8 left-8 flex h-28 w-28 touch-none items-center justify-center rounded-full border border-white/10 bg-black/55 shadow-[0_0_16px_rgba(0,0,0,.45)]"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerEnd}
        onPointerCancel={handlePointerEnd}
      >
        <div
          ref={joystickKnobRef}
          className="pointer-events-none h-12 w-12 rounded-full border border-white/20 bg-zinc-300/70 shadow-lg will-change-transform"
        />
      </div>

      <div className="absolute bottom-8 right-8 flex touch-none flex-col gap-4">
        <div className="flex gap-4">
          {ACTIONS.map((action) => (
            <button
              key={action.file}
              type="button"
              aria-label={action.label}
              onPointerDown={(event) => triggerAction(event, action.file)}
              className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-black/55 shadow-lg active:scale-90"
            >
              <svg width="26" height="26" viewBox="0 0 26 26" fill="white" aria-hidden="true">
                <path d={action.path} />
              </svg>
            </button>
          ))}
        </div>

        <button
          type="button"
          aria-label="Jump"
          onPointerDown={(event) => triggerAction(event, "Jumping.glb")}
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-black/55 shadow-lg active:scale-90"
        >
          <svg width="26" height="26" viewBox="0 0 26 26" fill="white" aria-hidden="true">
            <path d="M12 2l6 10h-4v10h-4V12H6z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
