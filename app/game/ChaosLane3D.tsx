"use client";

import {
  useEffect,
  useRef,
} from "react";

import * as THREE from "three";

import {
  loadPlayerModel,
} from "@/app/game/core/PlayerModel";

import {
  createGameLogic,
} from "@/app/game/core/GameLogic";

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

const CAMERA_OFFSET =
  new THREE.Vector3(
    12.5,
    18,
    12.5
  );

export default function ChaosLane3D() {
  const mountRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const joystickRef =
    useRef<JoystickState>({
      x: 0,
      y: 0,
    });

  const joystickKnobRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const pointerIdRef =
    useRef<number | null>(
      null
    );

  const playerRef =
    useRef<THREE.Object3D | null>(
      null
    );

  const mixerRef =
    useRef<THREE.AnimationMixer | null>(
      null
    );

  const gameLogicRef =
    useRef<
      ReturnType<
        typeof createGameLogic
      > | null
    >(null);

  const setMoveBySpeedRef =
    useRef<(speed: number) => void>(
      () => {}
    );

  const playAnimOnceRef =
    useRef<(file: string) => void>(
      () => {}
    );

  useEffect(() => {
    const mount =
      mountRef.current;

    if (!mount) {
      return;
    }

    let disposed = false;
    let frameId = 0;

    let activeChunkX =
      Number.NaN;

    let activeChunkZ =
      Number.NaN;

    let chunkLoading = false;

    let nextChunkX =
      Number.NaN;

    let nextChunkZ =
      Number.NaN;

    const scene =
      new THREE.Scene();

    scene.background =
      new THREE.Color(
        0x303534
      );

    scene.fog =
      new THREE.Fog(
        0x303534,
        120,
        285
      );

    const camera =
      new THREE.PerspectiveCamera(
        56,
        window.innerWidth /
          window.innerHeight,
        0.1,
        350
      );

    const renderer =
      new THREE.WebGLRenderer({
        antialias: true,
        powerPreference:
          "high-performance",
      });

    renderer.setSize(
      window.innerWidth,
      window.innerHeight
    );

    renderer.setPixelRatio(
      Math.min(
        window.devicePixelRatio,
        1.3
      )
    );

    renderer.outputColorSpace =
      THREE.SRGBColorSpace;

    renderer.toneMapping =
      THREE.ACESFilmicToneMapping;

    renderer.toneMappingExposure =
      1.3;

    renderer.shadowMap.enabled =
      true;

    renderer.shadowMap.type =
      THREE.PCFSoftShadowMap;

    renderer.domElement.style.width =
      "100%";

    renderer.domElement.style.height =
      "100%";

    renderer.domElement.style.display =
      "block";

    renderer.domElement.style.touchAction =
      "none";

    mount.appendChild(
      renderer.domElement
    );

    const hemisphereLight =
      new THREE.HemisphereLight(
        0xe4ebff,
        0x4a514b,
        1.7
      );

    scene.add(
      hemisphereLight
    );

    const ambientLight =
      new THREE.AmbientLight(
        0xffffff,
        0.32
      );

    scene.add(
      ambientLight
    );

    const sun =
      new THREE.DirectionalLight(
        0xfff0d8,
        2.15
      );

    sun.position.set(
      35,
      55,
      25
    );

    sun.castShadow = true;

    sun.shadow.mapSize.set(
      1024,
      1024
    );

    sun.shadow.camera.left =
      -48;

    sun.shadow.camera.right =
      48;

    sun.shadow.camera.top =
      48;

    sun.shadow.camera.bottom =
      -48;

    sun.shadow.camera.near =
      1;

    sun.shadow.camera.far =
      140;

    sun.shadow.bias =
      -0.00025;

    sun.shadow.normalBias =
      0.025;

    scene.add(sun);
    scene.add(sun.target);

    const loadingGeometry =
      new THREE.PlaneGeometry(
        280,
        280
      );

    const loadingMaterial =
      new THREE.MeshStandardMaterial({
        color: 0x2d3331,
        roughness: 1,
      });

    const loadingGround =
      new THREE.Mesh(
        loadingGeometry,
        loadingMaterial
      );

    loadingGround.rotation.x =
      -Math.PI / 2;

    loadingGround.position.y =
      -0.1;

    loadingGround.receiveShadow =
      true;

    scene.add(
      loadingGround
    );

    let loadingDisposed =
      false;

    const removeLoadingGround =
      () => {
        if (loadingDisposed) {
          return;
        }

        loadingDisposed = true;

        loadingGround
          .removeFromParent();

        loadingGeometry.dispose();
        loadingMaterial.dispose();
      };

    const clock =
      new THREE.Clock();

    const cameraDesired =
      new THREE.Vector3();

    const cameraTarget =
      new THREE.Vector3();

    const occlusionTarget =
      new THREE.Vector3();

    const requestChunkUpdate = (
      player: THREE.Object3D
    ) => {
      const { cx, cz } =
        getChunkCoord(
          player.position.x,
          player.position.z
        );

      nextChunkX = cx;
      nextChunkZ = cz;

      if (
        cx === activeChunkX &&
        cz === activeChunkZ
      ) {
        return;
      }

      if (chunkLoading) {
        return;
      }

      chunkLoading = true;

      void (async () => {
        try {
          while (
            !disposed &&
            (
              activeChunkX !==
                nextChunkX ||
              activeChunkZ !==
                nextChunkZ
            )
          ) {
            const targetX =
              nextChunkX;

            const targetZ =
              nextChunkZ;

            await updateChunks(
              scene,
              player.position.x,
              player.position.z,
              1
            );

            activeChunkX =
              targetX;

            activeChunkZ =
              targetZ;
          }
        } catch (error) {
          console.error(
            "Chunk update failed:",
            error
          );
        } finally {
          chunkLoading = false;
        }
      })();
    };

    const updateCamera = (
      player: THREE.Object3D,
      delta: number
    ) => {
      cameraDesired.set(
        player.position.x +
          CAMERA_OFFSET.x,
        player.position.y +
          CAMERA_OFFSET.y,
        player.position.z +
          CAMERA_OFFSET.z
      );

      const cameraLerp =
        1 -
        Math.exp(
          -6 * delta
        );

      camera.position.lerp(
        cameraDesired,
        cameraLerp
      );

      cameraTarget.set(
        player.position.x,
        player.position.y + 1.65,
        player.position.z
      );

      occlusionTarget.copy(
        cameraTarget
      );

      updateCameraOcclusion(
        camera,
        occlusionTarget,
        delta
      );

      camera.lookAt(
        cameraTarget
      );
    };

    const updateSun = (
      player: THREE.Object3D
    ) => {
      sun.position.set(
        player.position.x + 35,
        player.position.y + 55,
        player.position.z + 25
      );

      sun.target.position.set(
        player.position.x,
        player.position.y,
        player.position.z
      );

      sun.target
        .updateMatrixWorld();
    };

    const animate = () => {
      if (disposed) {
        return;
      }

      frameId =
        requestAnimationFrame(
          animate
        );

      const delta =
        Math.min(
          clock.getDelta(),
          0.05
        );

      mixerRef.current?.update(
        delta
      );

      updateWorldAnimations(
        clock.elapsedTime
      );

      const joystick =
        joystickRef.current;

      const movementAmount =
        Math.min(
          1,
          Math.hypot(
            joystick.x,
            joystick.y
          )
        );

      setMoveBySpeedRef.current(
        movementAmount
      );

      const player =
        playerRef.current;

      const gameLogic =
        gameLogicRef.current;

      if (
        player &&
        gameLogic &&
        player.visible
      ) {
        const previousX =
          player.position.x;

        const previousZ =
          player.position.z;

        gameLogic.update(
          delta,
          joystick
        );

        resolveWorldCollision(
          player,
          previousX,
          previousZ,
          0.38
        );

        updatePlayerWorldHeight(
          player,
          delta
        );

        requestChunkUpdate(
          player
        );

        updateCamera(
          player,
          delta
        );

        updateSun(
          player
        );
      }

      renderer.render(
        scene,
        camera
      );
    };

    const handleResize = () => {
      camera.aspect =
        window.innerWidth /
        window.innerHeight;

      camera
        .updateProjectionMatrix();

      renderer.setSize(
        window.innerWidth,
        window.innerHeight
      );

      renderer.setPixelRatio(
        Math.min(
          window.devicePixelRatio,
          1.3
        )
      );
    };

    window.addEventListener(
      "resize",
      handleResize
    );

    const startGame =
      async () => {
        try {
          generateChunk(
            scene,
            0,
            0
          );

          const playerResult =
            await loadPlayerModel(
              scene
            );

          if (disposed) {
            playerResult.player
              .removeFromParent();

            return;
          }

          const {
            player,
            mixer,
            setMoveBySpeed,
            playAnimOnce,
          } = playerResult;

          playerRef.current =
            player;

          mixerRef.current =
            mixer;

          setMoveBySpeedRef.current =
            setMoveBySpeed;

          playAnimOnceRef.current =
            playAnimOnce;

          player.scale.setScalar(
            1.4
          );

          player.visible = false;

          await updateChunks(
            scene,
            0,
            0,
            1
          );

          const spawn =
            findSafeSpawnPosition(
              0,
              0,
              0.5
            );

          player.position.copy(
            spawn
          );

          gameLogicRef.current =
            createGameLogic(
              player
            );

          const spawnChunk =
            getChunkCoord(
              player.position.x,
              player.position.z
            );

          activeChunkX =
            spawnChunk.cx;

          activeChunkZ =
            spawnChunk.cz;

          nextChunkX =
            spawnChunk.cx;

          nextChunkZ =
            spawnChunk.cz;

          camera.position.set(
            player.position.x +
              CAMERA_OFFSET.x,
            player.position.y +
              CAMERA_OFFSET.y,
            player.position.z +
              CAMERA_OFFSET.z
          );

          cameraTarget.set(
            player.position.x,
            player.position.y + 1.65,
            player.position.z
          );

          camera.lookAt(
            cameraTarget
          );

          updateSun(
            player
          );

          removeLoadingGround();

          player.visible = true;
        } catch (error) {
          console.error(
            "Game startup failed:",
            error
          );

          removeLoadingGround();
        }
      };

    void startGame();
    animate();

    return () => {
      disposed = true;

      cancelAnimationFrame(
        frameId
      );

      window.removeEventListener(
        "resize",
        handleResize
      );

      mixerRef.current
        ?.stopAllAction();

      destroyAllChunks();

      playerRef.current
        ?.removeFromParent();

      playerRef.current = null;
      mixerRef.current = null;
      gameLogicRef.current = null;

      joystickRef.current = {
        x: 0,
        y: 0,
      };

      pointerIdRef.current =
        null;

      removeLoadingGround();

      scene.clear();

      renderer.dispose();
      renderer.forceContextLoss();

      if (
        renderer.domElement
          .parentNode === mount
      ) {
        mount.removeChild(
          renderer.domElement
        );
      }
    };
  }, []);

  const updateJoystick = (
    element: HTMLDivElement,
    clientX: number,
    clientY: number
  ) => {
    const rect =
      element.getBoundingClientRect();

    const centerX =
      rect.left +
      rect.width / 2;

    const centerY =
      rect.top +
      rect.height / 2;

    const rawX =
      clientX - centerX;

    const rawY =
      clientY - centerY;

    const radius =
      Math.min(
        rect.width,
        rect.height
      ) * 0.34;

    const distance =
      Math.hypot(
        rawX,
        rawY
      );

    const multiplier =
      distance > radius
        ? radius / distance
        : 1;

    const knobX =
      rawX * multiplier;

    const knobY =
      rawY * multiplier;

    joystickRef.current = {
      x: knobX / radius,
      y: -knobY / radius,
    };

    if (
      joystickKnobRef.current
    ) {
      joystickKnobRef.current
        .style.transform =
        `translate3d(${knobX}px, ${knobY}px, 0)`;
    }
  };

  const resetJoystick = () => {
    joystickRef.current = {
      x: 0,
      y: 0,
    };

    pointerIdRef.current =
      null;

    if (
      joystickKnobRef.current
    ) {
      joystickKnobRef.current
        .style.transform =
        "translate3d(0, 0, 0)";
    }

    setMoveBySpeedRef.current(
      0
    );
  };

  const handlePointerDown = (
    event:
      React.PointerEvent<HTMLDivElement>
  ) => {
    event.preventDefault();

    pointerIdRef.current =
      event.pointerId;

    event.currentTarget
      .setPointerCapture(
        event.pointerId
      );

    updateJoystick(
      event.currentTarget,
      event.clientX,
      event.clientY
    );
  };

  const handlePointerMove = (
    event:
      React.PointerEvent<HTMLDivElement>
  ) => {
    if (
      pointerIdRef.current !==
      event.pointerId
    ) {
      return;
    }

    updateJoystick(
      event.currentTarget,
      event.clientX,
      event.clientY
    );
  };

  const handlePointerEnd = (
    event:
      React.PointerEvent<HTMLDivElement>
  ) => {
    if (
      pointerIdRef.current !==
      event.pointerId
    ) {
      return;
    }

    if (
      event.currentTarget
        .hasPointerCapture(
          event.pointerId
        )
    ) {
      event.currentTarget
        .releasePointerCapture(
          event.pointerId
        );
    }

    resetJoystick();
  };

  const playAction = (
    file: string
  ) => {
    playAnimOnceRef.current(
      file
    );
  };

  return (
    <div className="fixed inset-0 h-full w-full select-none overflow-hidden bg-black">
      <div
        ref={mountRef}
        className="h-full w-full"
      />

      <div
        className="absolute bottom-8 left-8 flex h-28 w-28 touch-none items-center justify-center rounded-full border border-white/10 bg-black/30 shadow-[0_0_20px_rgba(0,0,0,.45)] backdrop-blur-xl"
        onPointerDown={
          handlePointerDown
        }
        onPointerMove={
          handlePointerMove
        }
        onPointerUp={
          handlePointerEnd
        }
        onPointerCancel={
          handlePointerEnd
        }
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

              playAction(
                "Combo Punch.glb"
              );
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

              playAction(
                "Mma Kick.glb"
              );
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

            playAction(
              "Jumping.glb"
            );
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
