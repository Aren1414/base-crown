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
  clearWorld,
  generateChunk,
  getChunkCoord,
  updateWorldChunks,
} from "@/app/game/world/WorldManager";

type JoystickValue = {
  x: number;
  y: number;
};

type ActionAnimation =
  | "Combo Punch.glb"
  | "Mma Kick.glb"
  | "Jumping.glb";

const CAMERA_OFFSET =
  new THREE.Vector3(
    11,
    15,
    11
  );

const CAMERA_LOOK_HEIGHT = 1.8;

export default function ChaosLane3D() {
  const mountRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const joystickRef =
    useRef<JoystickValue>({
      x: 0,
      y: 0,
    });

  const joystickKnobRef =
    useRef<HTMLDivElement | null>(
      null
    );

  const activePointerRef =
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

    const scene =
      new THREE.Scene();

    scene.background =
      new THREE.Color(
        0x343937
      );

    scene.fog =
      new THREE.Fog(
        0x343937,
        105,
        270
      );

    const camera =
      new THREE.PerspectiveCamera(
        58,
        window.innerWidth /
          window.innerHeight,
        0.1,
        350
      );

    camera.position.copy(
      CAMERA_OFFSET
    );

    camera.lookAt(
      0,
      CAMERA_LOOK_HEIGHT,
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
      1.15;

    renderer.shadowMap.enabled =
      true;

    renderer.shadowMap.type =
      THREE.PCFSoftShadowMap;

    renderer.domElement.style.display =
      "block";

    renderer.domElement.style.width =
      "100%";

    renderer.domElement.style.height =
      "100%";

    renderer.domElement.style.touchAction =
      "none";

    mount.appendChild(
      renderer.domElement
    );

    const hemisphereLight =
      new THREE.HemisphereLight(
        0xdde8ff,
        0x53604d,
        1.6
      );

    scene.add(
      hemisphereLight
    );

    const ambientLight =
      new THREE.AmbientLight(
        0xffffff,
        0.2
      );

    scene.add(
      ambientLight
    );

    const directionalLight =
      new THREE.DirectionalLight(
        0xfff0d8,
        2
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
      -45;

    directionalLight.shadow.camera.right =
      45;

    directionalLight.shadow.camera.top =
      45;

    directionalLight.shadow.camera.bottom =
      -45;

    directionalLight.shadow.camera.near =
      1;

    directionalLight.shadow.camera.far =
      135;

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
     * زمین موقت فقط تا زمان آماده‌شدن
     * کاراکتر و اولین چانک نمایش داده می‌شود.
     */
    const loadingGroundGeometry =
      new THREE.PlaneGeometry(
        240,
        240
      );

    const loadingGroundMaterial =
      new THREE.MeshStandardMaterial({
        color: 0x414740,
        roughness: 1,
        metalness: 0,
      });

    const loadingGround =
      new THREE.Mesh(
        loadingGroundGeometry,
        loadingGroundMaterial
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

    let loadingGroundDisposed =
      false;

    const disposeLoadingGround =
      (): void => {
        if (
          loadingGroundDisposed
        ) {
          return;
        }

        loadingGroundDisposed =
          true;

        loadingGround
          .removeFromParent();

        loadingGroundGeometry.dispose();
        loadingGroundMaterial.dispose();
      };

    const clock =
      new THREE.Clock();

    const desiredCameraPosition =
      new THREE.Vector3();

    const cameraTarget =
      new THREE.Vector3();

    const previousPlayerPosition =
      new THREE.Vector3();

    const updateVisibleChunks = (
      player: THREE.Object3D
    ): void => {
      const { cx, cz } =
        getChunkCoord(
          player.position.x,
          player.position.z
        );

      if (
        cx === currentChunkX &&
        cz === currentChunkZ
      ) {
        return;
      }

      currentChunkX = cx;
      currentChunkZ = cz;

      updateWorldChunks(
        scene,
        player.position.x,
        player.position.z,
        1
      );
    };

    const keepPlayerInsideLoadedWorld = (
      player: THREE.Object3D
    ): void => {
      const maximumDistance = 170;

      const distanceFromOrigin =
        Math.max(
          Math.abs(player.position.x),
          Math.abs(player.position.z)
        );

      if (
        !Number.isFinite(
          distanceFromOrigin
        )
      ) {
        player.position.set(
          0,
          0.08,
          0
        );

        return;
      }

      /*
       * این محدودیت فقط از دورشدن غیرعادی
       * بازیکن در صورت خطای ورودی جلوگیری می‌کند.
       * جهان همچنان با حرکت طبیعی بازیکن گسترش می‌یابد.
       */
      if (
        Math.abs(
          player.position.y
        ) > maximumDistance
      ) {
        player.position.y = 0.08;
      }
    };

    const updateCamera = (
      player: THREE.Object3D,
      delta: number
    ): void => {
      desiredCameraPosition.set(
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
          -7.5 * delta
        );

      camera.position.lerp(
        desiredCameraPosition,
        cameraLerp
      );

      cameraTarget.set(
        player.position.x,
        player.position.y +
          CAMERA_LOOK_HEIGHT,
        player.position.z
      );

      camera.lookAt(
        cameraTarget
      );
    };

    const updateMainLight = (
      player: THREE.Object3D
    ): void => {
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
    };

    const animate = (): void => {
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
        joystickRef.current;

      const movementSpeed =
        Math.min(
          1,
          Math.hypot(
            joystick.x,
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
        previousPlayerPosition.copy(
          player.position
        );

        gameLogic.update(
          delta,
          joystick
        );

        /*
         * چون خیابان‌ها و زمین فعلاً هم‌سطح‌اند،
         * ارتفاع پایه بازیکن ثابت نگه داشته می‌شود.
         * خود مدل هنگام بارگذاری روی سطح تنظیم شده است.
         */
        if (
          !Number.isFinite(
            player.position.x
          ) ||
          !Number.isFinite(
            player.position.z
          )
        ) {
          player.position.copy(
            previousPlayerPosition
          );
        }

        keepPlayerInsideLoadedWorld(
          player
        );

        updateVisibleChunks(
          player
        );

        updateCamera(
          player,
          delta
        );

        updateMainLight(
          player
        );
      }

      renderer.render(
        scene,
        camera
      );
    };

    const handleResize =
      (): void => {
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
      async (): Promise<void> => {
        try {
          /*
           * اولین چانک فوراً ساخته می‌شود.
           * مدل‌های داخل چانک توسط کش WorldManager
           * در پس‌زمینه بارگیری می‌شوند.
           */
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

            playerResult.mixer
              ?.stopAllAction();

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

          player.position.set(
            0,
            0.08,
            0
          );

          player.visible = true;

          gameLogicRef.current =
            createGameLogic(
              player
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

          /*
           * چانک مرکزی به‌همراه هشت چانک اطراف.
           */
          updateWorldChunks(
            scene,
            player.position.x,
            player.position.z,
            1
          );

          camera.position.set(
            player.position.x +
              CAMERA_OFFSET.x,
            player.position.y +
              CAMERA_OFFSET.y,
            player.position.z +
              CAMERA_OFFSET.z
          );

          camera.lookAt(
            player.position.x,
            player.position.y +
              CAMERA_LOOK_HEIGHT,
            player.position.z
          );

          updateMainLight(
            player
          );

          disposeLoadingGround();
        } catch (error) {
          console.error(
            "Game startup failed:",
            error
          );

          disposeLoadingGround();
        }
      };

    void startGame();

    animate();

    return () => {
      disposed = true;

      cancelAnimationFrame(
        animationFrameId
      );

      window.removeEventListener(
        "resize",
        handleResize
      );

      mixerRef.current
        ?.stopAllAction();

      clearWorld();

      playerRef.current
        ?.removeFromParent();

      playerRef.current = null;
      mixerRef.current = null;
      gameLogicRef.current = null;

      setMoveBySpeedRef.current =
        () => {};

      playAnimOnceRef.current =
        () => {};

      joystickRef.current = {
        x: 0,
        y: 0,
      };

      activePointerRef.current =
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

  const updateJoystick = (
    element: HTMLDivElement,
    clientX: number,
    clientY: number
  ): void => {
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

    const maximumRadius =
      Math.min(
        rect.width,
        rect.height
      ) * 0.34;

    const distance =
      Math.hypot(
        rawX,
        rawY
      );

    const scale =
      distance > maximumRadius
        ? maximumRadius /
          distance
        : 1;

    const knobX =
      rawX * scale;

    const knobY =
      rawY * scale;

    joystickRef.current = {
      x:
        maximumRadius > 0
          ? knobX /
            maximumRadius
          : 0,

      y:
        maximumRadius > 0
          ? -knobY /
            maximumRadius
          : 0,
    };

    if (
      joystickKnobRef.current
    ) {
      joystickKnobRef.current
        .style.transform =
        `translate3d(${knobX}px, ${knobY}px, 0)`;
    }
  };

  const resetJoystick =
    (): void => {
      joystickRef.current = {
        x: 0,
        y: 0,
      };

      activePointerRef.current =
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

  const handleJoystickPointerDown = (
    event:
      React.PointerEvent<HTMLDivElement>
  ): void => {
    event.preventDefault();

    activePointerRef.current =
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

  const handleJoystickPointerMove = (
    event:
      React.PointerEvent<HTMLDivElement>
  ): void => {
    if (
      activePointerRef.current !==
      event.pointerId
    ) {
      return;
    }

    event.preventDefault();

    updateJoystick(
      event.currentTarget,
      event.clientX,
      event.clientY
    );
  };

  const handleJoystickPointerEnd = (
    event:
      React.PointerEvent<HTMLDivElement>
  ): void => {
    if (
      activePointerRef.current !==
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
    file: ActionAnimation
  ): void => {
    playAnimOnceRef.current(
      file
    );
  };

  return (
    <div className="fixed inset-0 h-full w-full overflow-hidden bg-black select-none">
      <div
        ref={mountRef}
        className="h-full w-full"
      />

      <div
        className="absolute bottom-8 left-8 flex h-28 w-28 touch-none items-center justify-center rounded-full border border-white/10 bg-black/30 shadow-[0_0_20px_rgba(0,0,0,.45)] backdrop-blur-xl"
        onPointerDown={
          handleJoystickPointerDown
        }
        onPointerMove={
          handleJoystickPointerMove
        }
        onPointerUp={
          handleJoystickPointerEnd
        }
        onPointerCancel={
          handleJoystickPointerEnd
        }
        onContextMenu={(
          event
        ) => {
          event.preventDefault();
        }}
      >
        <div
          ref={joystickKnobRef}
          className="pointer-events-none h-12 w-12 rounded-full border border-white/20 bg-zinc-300/60 shadow-xl transition-transform duration-75"
        />
      </div>

      <div className="absolute bottom-8 right-8 flex touch-none flex-col gap-4">
        <div className="flex gap-4">
          <button
            type="button"
            aria-label="Punch"
            className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-black/30 shadow-xl backdrop-blur-xl transition-transform active:scale-90"
            onPointerDown={(
              event
            ) => {
              event.preventDefault();

              playAction(
                "Combo Punch.glb"
              );
            }}
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
            className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-black/30 shadow-xl backdrop-blur-xl transition-transform active:scale-90"
            onPointerDown={(
              event
            ) => {
              event.preventDefault();

              playAction(
                "Mma Kick.glb"
              );
            }}
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
          className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-black/30 shadow-xl backdrop-blur-xl transition-transform active:scale-90"
          onPointerDown={(
            event
          ) => {
            event.preventDefault();

            playAction(
              "Jumping.glb"
            );
          }}
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
