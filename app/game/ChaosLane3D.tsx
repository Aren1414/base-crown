'use client';

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
  getChunkCoord,
  updateChunks,
  resolveWorldCollision,
  destroyAllChunks,
} from "@/app/game/world/WorldManager";

export default function ChaosLane3D() {
  const mountRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const joyRef =
    useRef({
      x: 0,
      y: 0,
    });

  const playerRef =
    useRef<THREE.Object3D | null>(
      null
    );

  const mixerRef =
    useRef<THREE.AnimationMixer | null>(
      null
    );

  const setMoveBySpeedRef =
    useRef<
      (speed: number) => void
    >(() => {});

  const playAnimOnceRef =
    useRef<
      (file: string) => void
    >(() => {});

  const gameLogicRef =
    useRef<
      ReturnType<
        typeof createGameLogic
      > | null
    >(null);

  useEffect(() => {
    const mount =
      mountRef.current;

    if (!mount) {
      return;
    }

    let disposed = false;

    let animationFrameId = 0;

    let currentChunkX =
      Number.NaN;

    let currentChunkZ =
      Number.NaN;

    let chunkUpdateRunning =
      false;

    const scene =
      new THREE.Scene();

    scene.background =
      new THREE.Color(
        0x161817
      );

    scene.fog =
      new THREE.Fog(
        0x161817,
        100,
        280
      );

    const camera =
      new THREE.PerspectiveCamera(
        58,
        window.innerWidth /
          window.innerHeight,
        0.1,
        350
      );

    camera.position.set(
      11,
      16,
      11
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
        1.5
      )
    );

    renderer.outputColorSpace =
      THREE.SRGBColorSpace;

    renderer.toneMapping =
      THREE.ACESFilmicToneMapping;

    renderer.toneMappingExposure =
      1.35;

    renderer.shadowMap.enabled =
      true;

    renderer.shadowMap.type =
      THREE.PCFSoftShadowMap;

    mount.appendChild(
      renderer.domElement
    );

    const hemisphereLight =
      new THREE.HemisphereLight(
        0xdde6ff,
        0x30332d,
        1.5
      );

    scene.add(
      hemisphereLight
    );

    const directionalLight =
      new THREE.DirectionalLight(
        0xffeed8,
        2.1
      );

    directionalLight.position.set(
      35,
      55,
      25
    );

    directionalLight.castShadow =
      true;

    directionalLight.shadow.mapSize.set(
      1024,
      1024
    );

    directionalLight.shadow.camera.left =
      -80;

    directionalLight.shadow.camera.right =
      80;

    directionalLight.shadow.camera.top =
      80;

    directionalLight.shadow.camera.bottom =
      -80;

    directionalLight.shadow.camera.near =
      1;

    directionalLight.shadow.camera.far =
      180;

    scene.add(
      directionalLight
    );

    scene.add(
      directionalLight.target
    );

    const clock =
      new THREE.Clock();

    const desiredCameraPosition =
      new THREE.Vector3();

    const cameraTarget =
      new THREE.Vector3();

    const updateWorldIfNeeded =
      async (
        playerX: number,
        playerZ: number
      ): Promise<void> => {
        const { cx, cz } =
          getChunkCoord(
            playerX,
            playerZ
          );

        if (
          cx === currentChunkX &&
          cz === currentChunkZ
        ) {
          return;
        }

        if (
          chunkUpdateRunning
        ) {
          return;
        }

        chunkUpdateRunning =
          true;

        try {
          await updateChunks(
            scene,
            playerX,
            playerZ
          );

          currentChunkX = cx;
          currentChunkZ = cz;
        } catch (error) {
          console.error(
            "World update failed:",
            error
          );
        } finally {
          chunkUpdateRunning =
            false;
        }
      };

    const buttonHandlers:
      Array<{
        element: HTMLElement;
        handler: () => void;
      }> = [];

    const handleResize = () => {
      camera.aspect =
        window.innerWidth /
        window.innerHeight;

      camera.updateProjectionMatrix();

      renderer.setSize(
        window.innerWidth,
        window.innerHeight
      );

      renderer.setPixelRatio(
        Math.min(
          window.devicePixelRatio,
          1.5
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
          const {
            player,
            mixer,
            setMoveBySpeed,
            playAnimOnce,
          } =
            await loadPlayerModel(
              scene
            );

          if (disposed) {
            player.removeFromParent();
            return;
          }

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

          const gameLogic =
            createGameLogic(
              player
            );

          gameLogicRef.current =
            gameLogic;

          const actionButtons = [
            {
              id: "btn-punch",
              file:
                "Combo Punch.glb",
            },
            {
              id: "btn-kick",
              file:
                "Mma Kick.glb",
            },
            {
              id: "btn-jump",
              file:
                "Jumping.glb",
            },
          ];

          for (
            const action
            of actionButtons
          ) {
            const button =
              document.getElementById(
                action.id
              );

            if (!button) {
              continue;
            }

            const handler = () => {
              playAnimOnceRef.current(
                action.file
              );
            };

            button.addEventListener(
              "touchstart",
              handler,
              {
                passive: true,
              }
            );

            button.addEventListener(
              "mousedown",
              handler
            );

            buttonHandlers.push({
              element: button,
              handler,
            });
          }

          await updateWorldIfNeeded(
            player.position.x,
            player.position.z
          );

          const animate = () => {
            if (disposed) {
              return;
            }

            animationFrameId =
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

            const joystick =
              joyRef.current;

            const movementSpeed =
              Math.min(
                1,
                Math.sqrt(
                  joystick.x *
                    joystick.x +
                    joystick.y *
                    joystick.y
                )
              );

            setMoveBySpeedRef.current(
              movementSpeed
            );

            const currentPlayer =
              playerRef.current;

            const gameLogic =
              gameLogicRef.current;

            if (
              currentPlayer &&
              gameLogic
            ) {
              const previousX =
                currentPlayer
                  .position.x;

              const previousZ =
                currentPlayer
                  .position.z;

              gameLogic.update(
                delta,
                joystick
              );

              resolveWorldCollision(
                currentPlayer,
                previousX,
                previousZ,
                0.7
              );

              void updateWorldIfNeeded(
                currentPlayer
                  .position.x,
                currentPlayer
                  .position.z
              );

              desiredCameraPosition.set(
                currentPlayer
                  .position.x +
                  12,

                currentPlayer
                  .position.y +
                  17,

                currentPlayer
                  .position.z +
                  12
              );

              camera.position.lerp(
                desiredCameraPosition,
                0.08
              );

              cameraTarget.set(
                currentPlayer
                  .position.x,

                currentPlayer
                  .position.y +
                  2,

                currentPlayer
                  .position.z
              );

              camera.lookAt(
                cameraTarget
              );

              directionalLight.position.set(
                currentPlayer
                  .position.x +
                  35,

                currentPlayer
                  .position.y +
                  55,

                currentPlayer
                  .position.z +
                  25
              );

              directionalLight
                .target
                .position
                .set(
                  currentPlayer
                    .position.x,

                  currentPlayer
                    .position.y,

                  currentPlayer
                    .position.z
                );

              directionalLight
                .target
                .updateMatrixWorld();
            }

            renderer.render(
              scene,
              camera
            );
          };

          animate();
        } catch (error) {
          console.error(
            "Game startup failed:",
            error
          );
        }
      };

    void startGame();

    return () => {
      disposed = true;

      cancelAnimationFrame(
        animationFrameId
      );

      window.removeEventListener(
        "resize",
        handleResize
      );

      for (
        const item
        of buttonHandlers
      ) {
        item.element
          .removeEventListener(
            "touchstart",
            item.handler
          );

        item.element
          .removeEventListener(
            "mousedown",
            item.handler
          );
      }

      mixerRef.current
        ?.stopAllAction();

      destroyAllChunks();

      playerRef.current =
        null;

      mixerRef.current =
        null;

      gameLogicRef.current =
        null;

      scene.clear();

      renderer.dispose();

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

  const handleJoy = (
    event:
      React.TouchEvent<HTMLDivElement>
  ) => {
    event.preventDefault();

    const touch =
      event.touches[0];

    if (!touch) {
      return;
    }

    const rect =
      event.currentTarget
        .getBoundingClientRect();

    const x =
      touch.clientX -
      (
        rect.left +
        rect.width / 2
      );

    const y =
      touch.clientY -
      (
        rect.top +
        rect.height / 2
      );

    joyRef.current = {
      x: Math.max(
        -1,
        Math.min(
          1,
          x / 50
        )
      ),

      y: Math.max(
        -1,
        Math.min(
          1,
          -y / 50
        )
      ),
    };
  };

  const resetJoy = () => {
    joyRef.current = {
      x: 0,
      y: 0,
    };
  };

  return (
    <div className="fixed inset-0 h-full w-full overflow-hidden bg-black">
      <div
        ref={mountRef}
        className="h-full w-full"
      />

      <div
        className="absolute bottom-8 left-8 flex h-28 w-28 touch-none items-center justify-center rounded-full border border-white/10 bg-black/30 shadow-[0_0_20px_rgba(0,0,0,.45)] backdrop-blur-xl"
        onTouchStart={handleJoy}
        onTouchMove={handleJoy}
        onTouchEnd={resetJoy}
        onTouchCancel={resetJoy}
      >
        <div className="h-12 w-12 rounded-full bg-zinc-300/60 shadow-xl" />
      </div>

      <div className="absolute bottom-8 right-8 flex flex-col gap-4">
        <div className="flex gap-4">
          <button
            id="btn-punch"
            type="button"
            className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-black/30 shadow-xl backdrop-blur-xl transition-all active:scale-90"
          >
            <svg
              width="26"
              height="26"
              fill="white"
              aria-hidden="true"
            >
              <path d="M4 14l6 6 12-12-2-2-10 10-4-4z" />
            </svg>
          </button>

          <button
            id="btn-kick"
            type="button"
            className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-black/30 shadow-xl backdrop-blur-xl transition-all active:scale-90"
          >
            <svg
              width="26"
              height="26"
              fill="white"
              aria-hidden="true"
            >
              <path d="M3 20l8-8-2-2-8 8zM14 4l8 8-2 2-8-8z" />
            </svg>
          </button>
        </div>

        <button
          id="btn-jump"
          type="button"
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-black/30 shadow-xl backdrop-blur-xl transition-all active:scale-90"
        >
          <svg
            width="26"
            height="26"
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
