import * as THREE from "three";

import {
  URBAN_BRIDGES,
  URBAN_RIVER,
  URBAN_TUNNEL,
} from "../../assets/Models";

import {
  spawnModel,
  type SpawnedModel,
} from "../AssetLoader";

import {
  BRIDGE_DECK_THICKNESS,
  BRIDGE_HEIGHT,
  BRIDGE_RAMP_LENGTH,
  BRIDGE_WIDTH,
  CITY_CHUNK_SIZE,
  RIVER_DEPTH,
  RIVER_WATER_LEVEL,
  RIVER_WIDTH,
  TUNNEL_HEIGHT,
  TUNNEL_LENGTH,
  TUNNEL_WIDTH,
  type SpecialChunkType,
  collectSpawnedModels,
  positiveModulo,
} from "./CityConfig";

type Axis = "x" | "z";

export type WalkableSurfaceData = {
  type:
    | "bridge-deck"
    | "bridge-ramp"
    | "lower-road"
    | "tunnel-floor";

  axis: Axis;

  centerX: number;
  centerZ: number;

  halfWidth: number;
  halfLength: number;

  startY: number;
  endY: number;
};

type AnimatedWaterData = {
  animatedWater: true;
  speedX: number;
  speedY: number;
  waveSpeed: number;
  waveAmount: number;
  baseY: number;
  phase: number;
};

const BRIDGE_TOTAL_LENGTH =
  CITY_CHUNK_SIZE - 18;

const BRIDGE_DECK_LENGTH =
  BRIDGE_TOTAL_LENGTH -
  BRIDGE_RAMP_LENGTH * 2;

const TUNNEL_WALL_THICKNESS = 2.4;

const TUNNEL_FLOOR_Y = 0.04;

const RIVER_BANK_HEIGHT =
  Math.abs(RIVER_WATER_LEVEL) +
  1.25;

function markChunkOwned(
  object: THREE.Object3D
): void {
  object.userData.chunkOwned = true;

  object.traverse((child) => {
    child.userData.chunkOwned = true;
  });
}

function createMaterial(
  parameters:
    THREE.MeshStandardMaterialParameters
): THREE.MeshStandardMaterial {
  const material =
    new THREE.MeshStandardMaterial(
      parameters
    );

  material.userData.chunkOwned = true;

  return material;
}

function createBoxMesh(
  chunk: THREE.Group,
  sizeX: number,
  sizeY: number,
  sizeZ: number,
  x: number,
  y: number,
  z: number,
  material:
    THREE.MeshStandardMaterial,
  options?: {
    castShadow?: boolean;
    receiveShadow?: boolean;
    cameraOccluder?: boolean;
  }
): THREE.Mesh {
  const geometry =
    new THREE.BoxGeometry(
      sizeX,
      sizeY,
      sizeZ
    );

  geometry.userData.chunkOwned = true;

  const mesh =
    new THREE.Mesh(
      geometry,
      material
    );

  mesh.position.set(x, y, z);

  mesh.castShadow =
    options?.castShadow ?? false;

  mesh.receiveShadow =
    options?.receiveShadow ?? true;

  mesh.userData.chunkOwned = true;

  mesh.userData.cameraOccluder =
    options?.cameraOccluder ?? false;

  chunk.add(mesh);

  return mesh;
}

function createPlaneMesh(
  chunk: THREE.Group,
  width: number,
  length: number,
  x: number,
  y: number,
  z: number,
  rotationY: number,
  material:
    THREE.MeshStandardMaterial
): THREE.Mesh {
  const geometry =
    new THREE.PlaneGeometry(
      width,
      length,
      32,
      8
    );

  geometry.rotateX(
    -Math.PI / 2
  );

  geometry.userData.chunkOwned = true;

  const mesh =
    new THREE.Mesh(
      geometry,
      material
    );

  mesh.position.set(x, y, z);
  mesh.rotation.y = rotationY;

  mesh.castShadow = false;
  mesh.receiveShadow = true;

  mesh.userData.chunkOwned = true;
  mesh.userData.cameraOccluder = false;

  chunk.add(mesh);

  return mesh;
}

function addColliderFromMesh(
  mesh: THREE.Object3D,
  colliders: THREE.Box3[],
  padding = 0
): THREE.Box3 {
  mesh.updateWorldMatrix(
    true,
    true
  );

  const box =
    new THREE.Box3().setFromObject(
      mesh
    );

  if (padding !== 0) {
    box.expandByScalar(padding);
  }

  colliders.push(box);

  return box;
}

function addBoxCollider(
  chunk: THREE.Group,
  colliders: THREE.Box3[],
  sizeX: number,
  sizeY: number,
  sizeZ: number,
  x: number,
  y: number,
  z: number,
  padding = 0
): THREE.Box3 {
  chunk.updateWorldMatrix(
    true,
    false
  );

  const localCenter =
    new THREE.Vector3(
      x,
      y,
      z
    );

  const worldCenter =
    localCenter.applyMatrix4(
      chunk.matrixWorld
    );

  const halfSize =
    new THREE.Vector3(
      sizeX / 2 + padding,
      sizeY / 2 + padding,
      sizeZ / 2 + padding
    );

  const box =
    new THREE.Box3(
      worldCenter
        .clone()
        .sub(halfSize),
      worldCenter
        .clone()
        .add(halfSize)
    );

  colliders.push(box);

  return box;
}

function registerWalkableSurface(
  object: THREE.Object3D,
  data: WalkableSurfaceData
): void {
  object.userData.walkableSurface =
    data;
}

function registerLowerPassage(
  object: THREE.Object3D,
  axis: Axis,
  centerX: number,
  centerZ: number,
  halfWidth: number,
  halfLength: number
): void {
  object.userData.lowerPassage = {
    axis,
    centerX,
    centerZ,
    halfWidth,
    halfLength,
    minimumY: -1,
    maximumY:
      BRIDGE_HEIGHT -
      BRIDGE_DECK_THICKNESS,
  };
}

function getBridgeAxis(
  specialType: SpecialChunkType
): Axis {
  /*
   * river-horizontal یعنی رودخانه در امتداد X است؛
   * بنابراین پل باید در امتداد Z از روی آن عبور کند.
   */
  return specialType ===
    "bridge-horizontal"
    ? "z"
    : "x";
}

function getRiverAxis(
  specialType: SpecialChunkType
): Axis {
  return (
    specialType ===
      "river-horizontal" ||
    specialType ===
      "bridge-horizontal"
  )
    ? "x"
    : "z";
}

function createRiverGeometry(
  chunk: THREE.Group,
  specialType: SpecialChunkType,
  colliders: THREE.Box3[]
): THREE.Mesh {
  const riverAxis =
    getRiverAxis(specialType);

  const horizontal =
    riverAxis === "x";

  const riverBedMaterial =
    createMaterial({
      color: 0x47443c,
      roughness: 1,
      metalness: 0,
    });

  const waterMaterial =
    createMaterial({
      color: 0x287c8f,
      roughness: 0.28,
      metalness: 0.05,
      transparent: true,
      opacity: 0.78,
      depthWrite: false,
      side: THREE.DoubleSide,
    });

  const riverLength =
    CITY_CHUNK_SIZE + 2;

  createBoxMesh(
    chunk,
    horizontal
      ? riverLength
      : RIVER_WIDTH,
    0.8,
    horizontal
      ? RIVER_WIDTH
      : riverLength,
    0,
    -RIVER_DEPTH,
    0,
    riverBedMaterial,
    {
      castShadow: false,
      receiveShadow: true,
    }
  );

  const water =
    createPlaneMesh(
      chunk,
      horizontal
        ? riverLength
        : RIVER_WIDTH,
      horizontal
        ? RIVER_WIDTH
        : riverLength,
      0,
      RIVER_WATER_LEVEL,
      0,
      0,
      waterMaterial
    );

  const waterData:
    AnimatedWaterData = {
      animatedWater: true,
      speedX:
        horizontal ? 0.018 : 0.004,
      speedY:
        horizontal ? 0.004 : 0.018,
      waveSpeed: 1.15,
      waveAmount: 0.045,
      baseY: RIVER_WATER_LEVEL,
      phase:
        positiveModulo(
          chunk.position.x +
            chunk.position.z,
          100
        ) / 10,
    };

  Object.assign(
    water.userData,
    waterData
  );

  const bankOffset =
    RIVER_WIDTH / 2 +
    1.6;

  const bankWidth = 3.2;

  if (horizontal) {
    addBoxCollider(
      chunk,
      colliders,
      riverLength,
      RIVER_BANK_HEIGHT,
      bankWidth,
      0,
      -RIVER_BANK_HEIGHT / 2,
      bankOffset,
      0.05
    );

    addBoxCollider(
      chunk,
      colliders,
      riverLength,
      RIVER_BANK_HEIGHT,
      bankWidth,
      0,
      -RIVER_BANK_HEIGHT / 2,
      -bankOffset,
      0.05
    );
  } else {
    addBoxCollider(
      chunk,
      colliders,
      bankWidth,
      RIVER_BANK_HEIGHT,
      riverLength,
      bankOffset,
      -RIVER_BANK_HEIGHT / 2,
      0,
      0.05
    );

    addBoxCollider(
      chunk,
      colliders,
      bankWidth,
      RIVER_BANK_HEIGHT,
      riverLength,
      -bankOffset,
      -RIVER_BANK_HEIGHT / 2,
      0,
      0.05
    );
  }

  return water;
}

async function spawnRiverModel(
  chunk: THREE.Group,
  specialType: SpecialChunkType
): Promise<SpawnedModel | null> {
  if (
    URBAN_RIVER.length === 0
  ) {
    return null;
  }

  const riverAxis =
    getRiverAxis(specialType);

  const river =
    URBAN_RIVER[0];

  return spawnModel(
    river,
    chunk,
    {
      x: 0,
      y:
        RIVER_WATER_LEVEL -
        0.12,
      z: 0,

      rotationY:
        riverAxis === "x"
          ? Math.PI / 2
          : 0,

      targetFootprint:
        CITY_CHUNK_SIZE + 2,

      maxHeight:
        Math.max(
          1,
          RIVER_DEPTH
        ),

      verticalMode:
        "center-surface",

      colliderMode: "none",

      castShadow: false,
      receiveShadow: true,
      cameraOccluder: false,
    }
  );
}

function createRamp(
  chunk: THREE.Group,
  axis: Axis,
  direction: -1 | 1,
  material:
    THREE.MeshStandardMaterial
): THREE.Mesh {
  const rampLength =
    BRIDGE_RAMP_LENGTH;

  const geometry =
    new THREE.BoxGeometry(
      axis === "x"
        ? rampLength
        : BRIDGE_WIDTH,
      BRIDGE_DECK_THICKNESS,
      axis === "x"
        ? BRIDGE_WIDTH
        : rampLength
    );

  geometry.userData.chunkOwned = true;

  const mesh =
    new THREE.Mesh(
      geometry,
      material
    );

  const distance =
    BRIDGE_DECK_LENGTH / 2 +
    rampLength / 2;

  if (axis === "x") {
    mesh.position.x =
      direction * distance;

    mesh.rotation.z =
      direction *
      Math.atan2(
        BRIDGE_HEIGHT,
        rampLength
      );
  } else {
    mesh.position.z =
      direction * distance;

    mesh.rotation.x =
      -direction *
      Math.atan2(
        BRIDGE_HEIGHT,
        rampLength
      );
  }

  mesh.position.y =
    BRIDGE_HEIGHT / 2;

  mesh.castShadow = false;
  mesh.receiveShadow = true;

  mesh.userData.chunkOwned = true;
  mesh.userData.cameraOccluder = false;

  registerWalkableSurface(
    mesh,
    {
      type: "bridge-ramp",
      axis,
      centerX: mesh.position.x,
      centerZ: mesh.position.z,
      halfWidth:
        BRIDGE_WIDTH / 2,
      halfLength:
        rampLength / 2,
      startY:
        direction < 0
          ? 0
          : BRIDGE_HEIGHT,
      endY:
        direction < 0
          ? BRIDGE_HEIGHT
          : 0,
    }
  );

  chunk.add(mesh);

  return mesh;
}

function createBridgeGeometry(
  chunk: THREE.Group,
  specialType: SpecialChunkType,
  colliders: THREE.Box3[],
  occluders: THREE.Mesh[]
): void {
  const axis =
    getBridgeAxis(
      specialType
    );

  const deckMaterial =
    createMaterial({
      color: 0x3f4144,
      roughness: 0.88,
      metalness: 0.03,
    });

  const railMaterial =
    createMaterial({
      color: 0x55595d,
      roughness: 0.68,
      metalness: 0.18,
    });

  const lowerRoadMaterial =
    createMaterial({
      color: 0x292b2d,
      roughness: 0.95,
      metalness: 0,
    });

  const deck =
    createBoxMesh(
      chunk,
      axis === "x"
        ? BRIDGE_DECK_LENGTH
        : BRIDGE_WIDTH,
      BRIDGE_DECK_THICKNESS,
      axis === "x"
        ? BRIDGE_WIDTH
        : BRIDGE_DECK_LENGTH,
      0,
      BRIDGE_HEIGHT,
      0,
      deckMaterial,
      {
        castShadow: false,
        receiveShadow: true,
        cameraOccluder: false,
      }
    );

  registerWalkableSurface(
    deck,
    {
      type: "bridge-deck",
      axis,
      centerX: 0,
      centerZ: 0,
      halfWidth:
        BRIDGE_WIDTH / 2,
      halfLength:
        BRIDGE_DECK_LENGTH /
        2,
      startY:
        BRIDGE_HEIGHT +
        BRIDGE_DECK_THICKNESS /
          2,
      endY:
        BRIDGE_HEIGHT +
        BRIDGE_DECK_THICKNESS /
          2,
    }
  );

  const negativeRamp =
    createRamp(
      chunk,
      axis,
      -1,
      deckMaterial
    );

  const positiveRamp =
    createRamp(
      chunk,
      axis,
      1,
      deckMaterial
    );

  const lowerRoadAxis: Axis =
    axis === "x" ? "z" : "x";

  const lowerRoad =
    createBoxMesh(
      chunk,
      lowerRoadAxis === "x"
        ? CITY_CHUNK_SIZE
        : BRIDGE_WIDTH - 2,
      0.24,
      lowerRoadAxis === "x"
        ? BRIDGE_WIDTH - 2
        : CITY_CHUNK_SIZE,
      0,
      0.02,
      0,
      lowerRoadMaterial,
      {
        castShadow: false,
        receiveShadow: true,
        cameraOccluder: false,
      }
    );

  registerWalkableSurface(
    lowerRoad,
    {
      type: "lower-road",
      axis: lowerRoadAxis,
      centerX: 0,
      centerZ: 0,
      halfWidth:
        (BRIDGE_WIDTH - 2) /
        2,
      halfLength:
        CITY_CHUNK_SIZE / 2,
      startY: 0.14,
      endY: 0.14,
    }
  );

  registerLowerPassage(
    lowerRoad,
    lowerRoadAxis,
    0,
    0,
    (BRIDGE_WIDTH - 2) / 2,
    CITY_CHUNK_SIZE / 2
  );

  const railHeight = 1.15;
  const railThickness = 0.3;

  if (axis === "x") {
    for (
      const side of [-1, 1] as const
    ) {
      const rail =
        createBoxMesh(
          chunk,
          BRIDGE_DECK_LENGTH,
          railHeight,
          railThickness,
          0,
          BRIDGE_HEIGHT +
            railHeight / 2,
          side *
            (BRIDGE_WIDTH / 2 -
              railThickness / 2),
          railMaterial,
          {
            castShadow: false,
            receiveShadow: true,
            cameraOccluder: true,
          }
        );

      addColliderFromMesh(
        rail,
        colliders,
        0.03
      );

      occluders.push(rail);
    }
  } else {
    for (
      const side of [-1, 1] as const
    ) {
      const rail =
        createBoxMesh(
          chunk,
          railThickness,
          railHeight,
          BRIDGE_DECK_LENGTH,
          side *
            (BRIDGE_WIDTH / 2 -
              railThickness / 2),
          BRIDGE_HEIGHT +
            railHeight / 2,
          0,
          railMaterial,
          {
            castShadow: false,
            receiveShadow: true,
            cameraOccluder: true,
          }
        );

      addColliderFromMesh(
        rail,
        colliders,
        0.03
      );

      occluders.push(rail);
    }
  }

  markChunkOwned(deck);
  markChunkOwned(
    negativeRamp
  );
  markChunkOwned(
    positiveRamp
  );
  markChunkOwned(lowerRoad);
}

async function spawnBridgeModel(
  chunk: THREE.Group,
  chunkX: number,
  chunkZ: number,
  specialType: SpecialChunkType
): Promise<SpawnedModel | null> {
  if (
    URBAN_BRIDGES.length === 0
  ) {
    return null;
  }

  const bridgeIndex =
    positiveModulo(
      chunkX * 5 +
        chunkZ * 7,
      URBAN_BRIDGES.length
    );

  const axis =
    getBridgeAxis(
      specialType
    );

  return spawnModel(
    URBAN_BRIDGES[
      bridgeIndex
    ],
    chunk,
    {
      x: 0,
      y: BRIDGE_HEIGHT,
      z: 0,

      rotationY:
        axis === "x"
          ? Math.PI / 2
          : 0,

      targetFootprint:
        Math.max(
          BRIDGE_WIDTH,
          BRIDGE_DECK_LENGTH
        ),

      maxHeight: 10,

      verticalMode: "ground",

      /*
       * Collider پل به‌صورت دستی ساخته می‌شود تا
       * فضای عبور زیر پل بسته نشود.
       */
      colliderMode: "none",

      castShadow: false,
      receiveShadow: true,
      cameraOccluder: false,
    }
  );
}

export async function spawnRiverAndBridges(
  chunk: THREE.Group,
  chunkX: number,
  chunkZ: number,
  specialType: SpecialChunkType,
  colliders: THREE.Box3[],
  occluders: THREE.Mesh[]
): Promise<void> {
  const riverChunk =
    specialType ===
      "river-horizontal" ||
    specialType ===
      "river-vertical" ||
    specialType ===
      "bridge-horizontal" ||
    specialType ===
      "bridge-vertical";

  if (!riverChunk) {
    return;
  }

  createRiverGeometry(
    chunk,
    specialType,
    colliders
  );

  const jobs: Promise<
    SpawnedModel | null
  >[] = [
    spawnRiverModel(
      chunk,
      specialType
    ),
  ];

  const bridgeChunk =
    specialType ===
      "bridge-horizontal" ||
    specialType ===
      "bridge-vertical";

  if (bridgeChunk) {
    createBridgeGeometry(
      chunk,
      specialType,
      colliders,
      occluders
    );

    jobs.push(
      spawnBridgeModel(
        chunk,
        chunkX,
        chunkZ,
        specialType
      )
    );
  }

  const results =
    await Promise.allSettled(
      jobs
    );

  collectSpawnedModels(
    results,
    colliders,
    occluders
  );
}

function getTunnelAxis(
  specialType: SpecialChunkType
): Axis {
  return specialType ===
    "tunnel-east"
    ? "x"
    : "z";
}

function getTunnelCenter(
  specialType: SpecialChunkType
): {
  x: number;
  z: number;
} {
  const halfChunk =
    CITY_CHUNK_SIZE / 2;

  const halfTunnel =
    TUNNEL_LENGTH / 2;

  if (
    specialType ===
    "tunnel-east"
  ) {
    return {
      x:
        halfChunk -
        halfTunnel,
      z: 0,
    };
  }

  return {
    x: 0,
    z:
      -halfChunk +
      halfTunnel,
  };
}

function createTunnelColliders(
  chunk: THREE.Group,
  specialType: SpecialChunkType,
  colliders: THREE.Box3[]
): void {
  const axis =
    getTunnelAxis(
      specialType
    );

  const center =
    getTunnelCenter(
      specialType
    );

  const sideOffset =
    TUNNEL_WIDTH / 2 +
    TUNNEL_WALL_THICKNESS /
      2;

  if (axis === "x") {
    addBoxCollider(
      chunk,
      colliders,
      TUNNEL_LENGTH,
      TUNNEL_HEIGHT,
      TUNNEL_WALL_THICKNESS,
      center.x,
      TUNNEL_HEIGHT / 2,
      center.z +
        sideOffset,
      0.04
    );

    addBoxCollider(
      chunk,
      colliders,
      TUNNEL_LENGTH,
      TUNNEL_HEIGHT,
      TUNNEL_WALL_THICKNESS,
      center.x,
      TUNNEL_HEIGHT / 2,
      center.z -
        sideOffset,
      0.04
    );
  } else {
    addBoxCollider(
      chunk,
      colliders,
      TUNNEL_WALL_THICKNESS,
      TUNNEL_HEIGHT,
      TUNNEL_LENGTH,
      center.x +
        sideOffset,
      TUNNEL_HEIGHT / 2,
      center.z,
      0.04
    );

    addBoxCollider(
      chunk,
      colliders,
      TUNNEL_WALL_THICKNESS,
      TUNNEL_HEIGHT,
      TUNNEL_LENGTH,
      center.x -
        sideOffset,
      TUNNEL_HEIGHT / 2,
      center.z,
      0.04
    );
  }
}

function createTunnelFloor(
  chunk: THREE.Group,
  specialType: SpecialChunkType
): THREE.Mesh {
  const axis =
    getTunnelAxis(
      specialType
    );

  const center =
    getTunnelCenter(
      specialType
    );

  const floorMaterial =
    createMaterial({
      color: 0x303235,
      roughness: 0.96,
      metalness: 0,
    });

  const floor =
    createBoxMesh(
      chunk,
      axis === "x"
        ? TUNNEL_LENGTH
        : TUNNEL_WIDTH,
      0.18,
      axis === "x"
        ? TUNNEL_WIDTH
        : TUNNEL_LENGTH,
      center.x,
      TUNNEL_FLOOR_Y,
      center.z,
      floorMaterial,
      {
        castShadow: false,
        receiveShadow: true,
        cameraOccluder: false,
      }
    );

  registerWalkableSurface(
    floor,
    {
      type: "tunnel-floor",
      axis,
      centerX: center.x,
      centerZ: center.z,
      halfWidth:
        TUNNEL_WIDTH / 2,
      halfLength:
        TUNNEL_LENGTH / 2,
      startY:
        TUNNEL_FLOOR_Y +
        0.09,
      endY:
        TUNNEL_FLOOR_Y +
        0.09,
    }
  );

  floor.userData.insideTunnel =
    true;

  return floor;
}

async function spawnTunnelModels(
  chunk: THREE.Group,
  specialType: SpecialChunkType
): Promise<
  PromiseSettledResult<
    SpawnedModel | null
  >[]
> {
  if (
    URBAN_TUNNEL.length === 0
  ) {
    return [];
  }

  const axis =
    getTunnelAxis(
      specialType
    );

  const center =
    getTunnelCenter(
      specialType
    );

  const rotationY =
    axis === "x"
      ? Math.PI / 2
      : 0;

  const mainTunnel =
    URBAN_TUNNEL[0];

  const segmentCount = 4;

  const segmentSpacing =
    TUNNEL_LENGTH /
    segmentCount;

  const jobs: Promise<
    SpawnedModel | null
  >[] = [];

  for (
    let index = 0;
    index < segmentCount;
    index += 1
  ) {
    const along =
      -TUNNEL_LENGTH / 2 +
      segmentSpacing / 2 +
      index *
        segmentSpacing;

    jobs.push(
      spawnModel(
        mainTunnel,
        chunk,
        {
          x:
            center.x +
            (axis === "x"
              ? along
              : 0),

          y: 0.05,

          z:
            center.z +
            (axis === "z"
              ? along
              : 0),

          rotationY,

          targetFootprint:
            segmentSpacing +
            0.5,

          maxHeight:
            TUNNEL_HEIGHT +
            4,

          verticalMode:
            "ground",

          /*
           * Collider دقیق تونل به‌صورت دستی
           * ایجاد شده و مدل فقط نقش ظاهری دارد.
           */
          colliderMode: "none",

          castShadow:
            index === 0 ||
            index ===
              segmentCount - 1,

          receiveShadow: true,

          cameraOccluder:
            index === 0 ||
            index ===
              segmentCount - 1,
        }
      )
    );
  }

  const wallParts =
    URBAN_TUNNEL.slice(1);

  if (
    wallParts.length > 0
  ) {
    const wallSegmentCount = 5;

    const wallSpacing =
      TUNNEL_LENGTH /
      wallSegmentCount;

    for (
      let index = 0;
      index <
      wallSegmentCount;
      index += 1
    ) {
      const part =
        wallParts[
          positiveModulo(
            index,
            wallParts.length
          )
        ];

      const along =
        -TUNNEL_LENGTH / 2 +
        wallSpacing / 2 +
        index *
          wallSpacing;

      for (
        const side of [-1, 1] as const
      ) {
        const sideOffset =
          TUNNEL_WIDTH / 2 +
          0.75;

        jobs.push(
          spawnModel(
            part,
            chunk,
            {
              x:
                center.x +
                (axis === "x"
                  ? along
                  : side *
                    sideOffset),

              y: 0.05,

              z:
                center.z +
                (axis === "z"
                  ? along
                  : side *
                    sideOffset),

              rotationY,

              targetFootprint:
                wallSpacing +
                0.25,

              maxHeight:
                TUNNEL_HEIGHT +
                3,

              verticalMode:
                "ground",

              colliderMode:
                "none",

              castShadow: false,
              receiveShadow: true,
              cameraOccluder: true,
            }
          )
        );
      }
    }
  }

  return Promise.allSettled(
    jobs
  );
}

export async function spawnTunnel(
  chunk: THREE.Group,
  specialType: SpecialChunkType,
  colliders: THREE.Box3[],
  occluders: THREE.Mesh[]
): Promise<void> {
  if (
    specialType !==
      "tunnel-north" &&
    specialType !==
      "tunnel-east"
  ) {
    return;
  }

  createTunnelFloor(
    chunk,
    specialType
  );

  createTunnelColliders(
    chunk,
    specialType,
    colliders
  );

  const results =
    await spawnTunnelModels(
      chunk,
      specialType
    );

  collectSpawnedModels(
    results,
    colliders,
    occluders
  );
}

export function updateSpecialZoneWater(
  root: THREE.Object3D,
  elapsedTime: number
): void {
  root.traverse((object) => {
    if (
      !(object instanceof THREE.Mesh)
    ) {
      return;
    }

    const data =
      object.userData as Partial<
        AnimatedWaterData
      >;

    if (
      data.animatedWater !== true
    ) {
      return;
    }

    const material =
      object.material;

    if (
      material instanceof
        THREE.MeshStandardMaterial &&
      material.map
    ) {
      material.map.offset.x =
        elapsedTime *
        (data.speedX ?? 0.01);

      material.map.offset.y =
        elapsedTime *
        (data.speedY ?? 0.004);

      material.map.needsUpdate =
        true;
    }

    const baseY =
      data.baseY ??
      RIVER_WATER_LEVEL;

    const waveSpeed =
      data.waveSpeed ?? 1;

    const waveAmount =
      data.waveAmount ?? 0.03;

    const phase =
      data.phase ?? 0;

    object.position.y =
      baseY +
      Math.sin(
        elapsedTime *
          waveSpeed +
          phase
      ) *
        waveAmount;
  });
}
