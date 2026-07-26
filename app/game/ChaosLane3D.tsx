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
  generateChunk,
  getChunkCoord,
  updateChunks,
  resolveWorldCollision,
  findSafeSpawnPosition,
  updateCameraOcclusion,
  updatePlayerWorldHeight,
  updateWorldAnimations,
  destroyAllChunks,
} from "@/app/game/world/WorldManager";

export default function ChaosLane3D() {
  const mountRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const joyRef = useRef({
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
    useRef<(speed: number) => void>(
      () => {}
    );

  const playAnimOnceRef =
    useRef<(file: string) => void>(
      () => {}
    );

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

    let requestedChunkX =
      Number.NaN;

    let requestedChunkZ =
      Number.NaN;

    let chunkUpdateRunning =
      false;

    let loadingGroundDisposed =
      false;

    const scene =
      new THREE.Scene();

    scene.background =
      new THREE.Color(
        0x343937
      );

    scene.fog =
      new THREE.Fog(
        0x343937,
        115,
        275
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
      12,
      17,
      12
    );

    camera.lookAt(
      0,
      1.5,
      0
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
        1.35
      )
    );

    renderer.outputColorSpace =
      THREE.SRGBColorSpace;

    renderer.toneMapping =
      THREE.ACESFilmicToneMapping;

    renderer.toneMappingExposure =
      1.25;

    renderer.shadowMap.enabled =
      true;

    renderer.shadowMap.type =
      THREE.PCFSoftShadowMap;

    mount.appendChild(
      renderer.domElement
    );

    /*
     * نور اصلی محیط:
     * آسمان روشن‌تر است، ولی رنگ زمین همچنان
     * کمی سبز و آلوده باقی می‌ماند.
     */
    const hemisphereLight =
      new THREE.HemisphereLight(
        0xdde8ff,
        0x53604d,
        1.65
      );

    scene.add(
      hemisphereLight
    );

    /*
     * نور جهت‌دار اصلی.
     * محدوده سایه کوچک‌تر شده تا روی موبایل
     * سایه دقیق‌تر و سبک‌تر باشد.
     */
    const directionalLight =
      new THREE.DirectionalLight(
        0xfff0d8,
        2.15
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
      -42;

    directionalLight.shadow.camera.right =
      42;

    directionalLight.shadow.camera.top =
      42;

    directionalLight.shadow.camera.bottom =
      -42;

    directionalLight.shadow.camera.near =
      1;

    directionalLight.shadow.camera.far =
      130;

    directionalLight.shadow.bias =
      -0.00025;

    directionalLight.shadow.normalBias =
      0.025;

    scene.add(
      directionalLight
    );

    scene.add(
      directionalLight.target
    );

    /*
     * مقدار کمی نور عمومی برای جلوگیری از
     * سیاه‌شدن کامل پشت ساختمان‌ها و تونل.
     */
    const ambientLight =
      new THREE.AmbientLight(
        0xffffff,
        0.22
      );

    scene.add(
      ambientLight
    );

    /*
     * زمین موقت هنگام Load اولیه.
     */
    const loadingGround =
      new THREE.Mesh(
        new THREE.PlaneGeometry(
          240,
          240
        ),

        new THREE.MeshStandardMaterial({
          color: 0x414740,
          roughness: 1,
          metalness: 0,
        })
      );

    loadingGround.rotation.x =
      -Math.PI / 2;

    loadingGround.position.y =
      -0.08;

    loadingGround.receiveShadow =
      true;

    scene.add(
      loadingGround
    );

    const disposeLoadingGround =
      () => {
        if (
          loadingGroundDisposed
        ) {
          return;
        }

        loadingGroundDisposed =
          true;

        loadingGround
          .removeFromParent();

        loadingGround.geometry
          .dispose();

        if (
          Array.isArray(
            loadingGround.material
          )
        ) {
          for (
            const material
            of loadingGround.material
          ) {
            material.dispose();
          }
        } else {
          loadingGround.material
            .dispose();
        }
      };

    const clock =
      new THREE.Clock();

    const desiredCameraPosition =
      new THREE.Vector3();

    const cameraTarget =
      new THREE.Vector3();

    const occlusionTarget =
      new THREE.Vector3();

    const buttonHandlers: Array<{
      element: HTMLElement;
      handler: () => void;
    }> = [];

    /*
     * Chunk فقط زمانی Update می‌شود که بازیکن
     * واقعاً وارد Chunk جدید شده باشد.
     */
    const requestWorldUpdate = (
      player: THREE.Object3D
    ) => {
      const { cx, cz } =
        getChunkCoord(
          player.position.x,
          player.position.z
        );

      requestedChunkX = cx;
      requestedChunkZ = cz;

      if (
        cx === currentChunkX &&
        cz === currentChunkZ
      ) {
        return;
      }

      if (chunkUpdateRunning) {
        return;
      }

      chunkUpdateRunning = true;

      void (async () => {
        try {
          while (
            !disposed &&
            (
              requestedChunkX !==
                currentChunkX ||
              requestedChunkZ !==
                currentChunkZ
            )
          ) {
            const targetChunkX =
              requestedChunkX;

            const targetChunkZ =
              requestedChunkZ;

            await updateChunks(
              scene,
              player.position.x,
              player.position.z
            );

            currentChunkX =
              targetChunkX;

            currentChunkZ =
              targetChunkZ;
          }
        } catch (error) {
          console.error(
            "World update failed:",
            error
          );
        } finally {
          chunkUpdateRunning =
            false;
        }
      })();
    };

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

      const elapsedTime =
        clock.elapsedTime;

      mixerRef.current?.update(
        delta
      );

      /*
       * انیمیشن بسیار سبک آب رودخانه.
       * بدون Shader سنگین اجرا می‌شود.
       */
      updateWorldAnimations(
        elapsedTime
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

        /*
         * ابتدا برخورد افقی بررسی می‌شود.
         */
        resolveWorldCollision(
          player,
          previousX,
          previousZ,
          0.55
        );

        /*
         * سپس ارتفاع کاراکتر براساس سطح زیر پایش
         * تنظیم می‌شود:
         *
         * - سطح عادی شهر
         * - رمپ پل
         * - سطح بالای پل
         * - خیابان پایین پل
         */
        updatePlayerWorldHeight(
          player,
          delta
        );

        requestWorldUpdate(
          player
        );

        desiredCameraPosition.set(
          player.position.x + 11,
          player.position.y + 15,
          player.position.z + 11
        );

        const cameraLerp =
          1 -
          Math.exp(
            -7.5 * delta
          );

        camera.position.lerp(
          desiredCameraPosition,
          cameraLerp
        );

        cameraTarget.set(
          player.position.x,
          player.position.y + 1.8,
          player.position.z
        );

        camera.lookAt(
          cameraTarget
        );

        /*
         * Target جدا استفاده می‌شود تا خود موقعیت
         * Player توسط تابع Occlusion تغییر نکند.
         */
        occlusionTarget.copy(
          player.position
        );

        updateCameraOcclusion(
          camera,
          occlusionTarget
        );

        /*
         * نور اصلی همراه بازیکن حرکت می‌کند تا
         * محدوده Shadow همیشه اطراف بازیکن باشد.
         */
        directionalLight.position.set(
          player.position.x + 35,
          player.position.y + 55,
          player.position.z + 25
        );

        directionalLight.target.position.set(
          player.position.x,
          player.position.y,
          player.position.z
        );

        directionalLight.target
          .updateMatrixWorld();
      }

      renderer.render(
        scene,
        camera
      );
    };

    animate();

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
          1.35
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
          /*
           * مدل کاراکتر و Chunk مرکزی هم‌زمان
           * Load می‌شوند.
           */
          const [
            ,
            playerResult,
          ] =
            await Promise.all([
              generateChunk(
                scene,
                0,
                0
              ),

              loadPlayerModel(
                scene
              ),
            ]);

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

          const safeSpawn =
            findSafeSpawnPosition(
              0,
              0,
              0.75
            );

          player.position.copy(
            safeSpawn
          );

          const spawnChunk =
            getChunkCoord(
              player.position.x,
              player.position.z
            );

          currentChunkX =
            spawnChunk.cx;

          currentChunkZ =
            spawnChunk.cz;

          requestedChunkX =
            spawnChunk.cx;

          requestedChunkZ =
            spawnChunk.cz;

          gameLogicRef.current =
            createGameLogic(
              player
            );

          camera.position.set(
            player.position.x + 11,
            player.position.y + 15,
            player.position.z + 11
          );

          camera.lookAt(
            player.position.x,
            player.position.y + 1.8,
            player.position.z
          );

          directionalLight.position.set(
            player.position.x + 35,
            player.position.y + 55,
            player.position.z + 25
          );

          directionalLight.target.position.set(
            player.position.x,
            player.position.y,
            player.position.z
          );

          directionalLight.target
            .updateMatrixWorld();

          disposeLoadingGround();

          player.visible = true;

          const actions = [
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
            of actions
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

          /*
           * Chunkهای اطراف بعد از آماده‌شدن
           * Chunk اصلی، به‌صورت تدریجی ساخته می‌شوند.
           */
          chunkUpdateRunning =
            true;

          void updateChunks(
            scene,
            player.position.x,
            player.position.z
          )
            .catch((error) => {
              console.error(
                "Background chunk loading failed:",
                error
              );
            })
            .finally(() => {
              chunkUpdateRunning =
                false;
            });
        } catch (error) {
          console.error(
            "Game startup failed:",
            error
          );

          disposeLoadingGround();
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

      disposeLoadingGround();

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
