import * as THREE from "three";

import {
  URBAN_BUILDINGS,
  URBAN_VEHICLES,
  URBAN_TUNNEL,
  URBAN_BRIDGES,
  URBAN_RIVER,
  FOREST_TREES,
  FOREST_BUSHES,
  FOREST_GRASS,
  FOREST_FLOWERS,
  type ModelDef,
} from "../assets/Models";

import {
  spawnModel,
  type SpawnedModel,
} from "./AssetLoader";

export const CITY_CHUNK_SIZE = 120;

const MAIN_ROAD_WIDTH = 18;
const ALLEY_WIDTH = 7;

const BUILDING_SIZE = 21;
const VILLA_SIZE = 16;

const CAR_SIZE = 5.5;
const MOTORCYCLE_SIZE = 3.2;

type RandomFunction = () => number;

type Placement = {
  x: number;
  z: number;
  rotationY: number;
};

type SpecialChunkType =
  | "normal"
  | "river-horizontal"
  | "river-vertical"
  | "tunnel-north"
  | "tunnel-east";

export type CityGenerationResult = {
  colliders: THREE.Box3[];
  occluders: THREE.Mesh[];
};

function createRandom(
  chunkX: number,
  chunkZ: number
): RandomFunction {
  let seed =
    Math.imul(chunkX + 10000, 374761393) ^
    Math.imul(chunkZ + 20000, 668265263);

  seed >>>= 0;

  return () => {
    seed += 0x6d2b79f5;

    let value = seed;

    value = Math.imul(
      value ^ (value >>> 15),
      value | 1
    );

    value ^=
      value +
      Math.imul(
        value ^ (value >>> 7),
        value | 61
      );

    return (
      ((value ^ (value >>> 14)) >>> 0) /
      4294967296
    );
  };
}

function positiveModulo(
  value: number,
  divisor: number
): number {
  return (
    ((value % divisor) + divisor) %
    divisor
  );
}

function getChunkAssetOffset(
  chunkX: number,
  chunkZ: number,
  assetCount: number
): number {
  if (assetCount <= 0) {
    return 0;
  }

  /*
   * باعث می‌شود با حرکت میان Chunkها تمام مدل‌های
   * موجود در Models.ts به‌صورت چرخشی استفاده شوند.
   */
  const value =
    chunkX * 11 +
    chunkZ * 17 +
    chunkX * chunkZ * 3;

  return positiveModulo(
    value,
    assetCount
  );
}

function getCycledItem<T>(
  items: T[],
  chunkX: number,
  chunkZ: number,
  slotIndex: number
): T {
  const offset =
    getChunkAssetOffset(
      chunkX,
      chunkZ,
      items.length
    );

  return items[
    positiveModulo(
      offset + slotIndex,
      items.length
    )
  ];
}

function pick<T>(
  items: T[],
  random: RandomFunction
): T {
  return items[
    Math.floor(
      random() * items.length
    )
  ];
}

function randomRange(
  random: RandomFunction,
  min: number,
  max: number
): number {
  return (
    min +
    random() * (max - min)
  );
}

function isVilla(
  definition: ModelDef
): boolean {
  return definition.url
    .toLowerCase()
    .includes("villa");
}

function isMotorcycle(
  definition: ModelDef
): boolean {
  return definition.url
    .toLowerCase()
    .includes("motorcycle");
}

function modelFromUrl(
  url: string
): ModelDef {
  return {
    url,
    scale: 1,
  };
}

function markChunkOwned(
  geometry: THREE.BufferGeometry,
  material: THREE.Material
): void {
  geometry.userData.chunkOwned =
    true;

  material.userData.chunkOwned =
    true;
}

function collectSpawnedModels(
  results: PromiseSettledResult<
    SpawnedModel | null
  >[],
  colliders: THREE.Box3[],
  occluders: THREE.Mesh[]
): void {
  for (const result of results) {
    if (
      result.status !== "fulfilled" ||
      !result.value
    ) {
      continue;
    }

    colliders.push(
      ...result.value.colliders
    );

    occluders.push(
      ...result.value.occluders
    );
  }
}

function getSpecialChunkType(
  chunkX: number,
  chunkZ: number
): SpecialChunkType {
  /*
   * Chunk مرکزی همیشه شهر معمولی است تا محل شروع
   * بازیکن روی رودخانه یا داخل تونل قرار نگیرد.
   */
  if (
    chunkX === 0 &&
    chunkZ === 0
  ) {
    return "normal";
  }

  const typeIndex =
    positiveModulo(
      chunkX * 7 +
        chunkZ * 13,
      12
    );

  if (typeIndex === 0) {
    return "river-horizontal";
  }

  if (typeIndex === 3) {
    return "river-vertical";
  }

  if (typeIndex === 6) {
    return "tunnel-north";
  }

  if (typeIndex === 9) {
    return "tunnel-east";
  }

  return "normal";
}

function createSurface(
  width: number,
  depth: number,
  color: number,
  x: number,
  z: number,
  y: number,
  roughness = 1
): THREE.Mesh {
  const geometry =
    new THREE.PlaneGeometry(
      width,
      depth
    );

  const material =
    new THREE.MeshStandardMaterial({
      color,
      roughness,
      metalness: 0,

      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    });

  markChunkOwned(
    geometry,
    material
  );

  const mesh =
    new THREE.Mesh(
      geometry,
      material
    );

  mesh.rotation.x =
    -Math.PI / 2;

  mesh.position.set(
    x,
    y,
    z
  );

  mesh.receiveShadow = true;

  return mesh;
}

function createGround(
  chunk: THREE.Group
): void {
  const ground =
    createSurface(
      CITY_CHUNK_SIZE,
      CITY_CHUNK_SIZE,
      0x34382f,
      0,
      0,
      0.01
    );

  ground.name =
    "ProceduralCityGround";

  chunk.add(ground);
}

function createNormalRoads(
  chunk: THREE.Group
): void {
  const roadColor = 0x242724;

  for (const z of [-30, 30]) {
    const road =
      createSurface(
        CITY_CHUNK_SIZE,
        MAIN_ROAD_WIDTH,
        roadColor,
        0,
        z,
        0.035,
        0.98
      );

    road.name =
      "ProceduralMainRoad";

    chunk.add(road);
  }

  for (const x of [-30, 30]) {
    const road =
      createSurface(
        MAIN_ROAD_WIDTH,
        CITY_CHUNK_SIZE,
        roadColor,
        x,
        0,
        0.04,
        0.98
      );

    road.name =
      "ProceduralMainRoad";

    chunk.add(road);
  }
}

function createRiverRoads(
  chunk: THREE.Group,
  specialType: SpecialChunkType
): void {
  const roadColor = 0x242724;

  if (
    specialType ===
    "river-horizontal"
  ) {
    /*
     * رودخانه از شرق به غرب عبور می‌کند.
     * خیابان‌های عمودی از روی پل رد می‌شوند.
     */
    for (const x of [-30, 30]) {
      chunk.add(
        createSurface(
          MAIN_ROAD_WIDTH,
          CITY_CHUNK_SIZE,
          roadColor,
          x,
          0,
          0.04,
          0.98
        )
      );
    }

    for (const z of [-38, 38]) {
      chunk.add(
        createSurface(
          CITY_CHUNK_SIZE,
          MAIN_ROAD_WIDTH,
          roadColor,
          0,
          z,
          0.035,
          0.98
        )
      );
    }

    return;
  }

  /*
   * رودخانه از شمال به جنوب عبور می‌کند.
   * خیابان‌های افقی از روی پل رد می‌شوند.
   */
  for (const z of [-30, 30]) {
    chunk.add(
      createSurface(
        CITY_CHUNK_SIZE,
        MAIN_ROAD_WIDTH,
        roadColor,
        0,
        z,
        0.035,
        0.98
      )
    );
  }

  for (const x of [-38, 38]) {
    chunk.add(
      createSurface(
        MAIN_ROAD_WIDTH,
        CITY_CHUNK_SIZE,
        roadColor,
        x,
        0,
        0.04,
        0.98
      )
    );
  }
}

function createTunnelRoads(
  chunk: THREE.Group,
  specialType: SpecialChunkType
): void {
  createNormalRoads(chunk);

  const roadColor = 0x222421;

  if (
    specialType ===
    "tunnel-north"
  ) {
    chunk.add(
      createSurface(
        MAIN_ROAD_WIDTH,
        62,
        roadColor,
        0,
        -29,
        0.055,
        0.98
      )
    );
  } else {
    chunk.add(
      createSurface(
        62,
        MAIN_ROAD_WIDTH,
        roadColor,
        29,
        0,
        0.055,
        0.98
      )
    );
  }
}

function createRoads(
  chunk: THREE.Group,
  specialType: SpecialChunkType
): void {
  if (
    specialType ===
      "river-horizontal" ||
    specialType ===
      "river-vertical"
  ) {
    createRiverRoads(
      chunk,
      specialType
    );

    return;
  }

  if (
    specialType ===
      "tunnel-north" ||
    specialType ===
      "tunnel-east"
  ) {
    createTunnelRoads(
      chunk,
      specialType
    );

    return;
  }

  createNormalRoads(chunk);
}

function createAlleys(
  chunk: THREE.Group,
  specialType: SpecialChunkType
): void {
  const alleyColor = 0x2d302a;

  const horizontalAlleys = [
    {
      x: 0,
      z: -49,
      width: CITY_CHUNK_SIZE,
      depth: ALLEY_WIDTH,
    },
    {
      x: 0,
      z: 49,
      width: CITY_CHUNK_SIZE,
      depth: ALLEY_WIDTH,
    },
    {
      x: 0,
      z: 0,
      width: CITY_CHUNK_SIZE,
      depth: ALLEY_WIDTH,
    },
  ];

  const verticalAlleys = [
    {
      x: -49,
      z: 0,
      width: ALLEY_WIDTH,
      depth: CITY_CHUNK_SIZE,
    },
    {
      x: 49,
      z: 0,
      width: ALLEY_WIDTH,
      depth: CITY_CHUNK_SIZE,
    },
    {
      x: 0,
      z: 0,
      width: ALLEY_WIDTH,
      depth: CITY_CHUNK_SIZE,
    },
  ];

  for (
    const alley
    of horizontalAlleys
  ) {
    if (
      specialType ===
        "river-horizontal" &&
      Math.abs(alley.z) < 10
    ) {
      continue;
    }

    chunk.add(
      createSurface(
        alley.width,
        alley.depth,
        alleyColor,
        alley.x,
        alley.z,
        0.05,
        1
      )
    );
  }

  for (
    const alley
    of verticalAlleys
  ) {
    if (
      specialType ===
        "river-vertical" &&
      Math.abs(alley.x) < 10
    ) {
      continue;
    }

    chunk.add(
      createSurface(
        alley.width,
        alley.depth,
        alleyColor,
        alley.x,
        alley.z,
        0.055,
        1
      )
    );
  }
}

function createRoadMarkings(
  chunk: THREE.Group,
  random: RandomFunction,
  specialType: SpecialChunkType
): void {
  const geometry =
    new THREE.PlaneGeometry(
      4.5,
      0.22
    );

  const material =
    new THREE.MeshBasicMaterial({
      color: 0x8e875b,
      transparent: true,
      opacity: 0.4,
      depthWrite: false,

      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });

  markChunkOwned(
    geometry,
    material
  );

  const horizontalRoads =
    specialType ===
    "river-horizontal"
      ? [-38, 38]
      : [-30, 30];

  const verticalRoads =
    specialType ===
    "river-vertical"
      ? [-38, 38]
      : [-30, 30];

  for (
    const roadZ
    of horizontalRoads
  ) {
    for (
      let x = -54;
      x <= 54;
      x += 10
    ) {
      if (random() < 0.27) {
        continue;
      }

      const mark =
        new THREE.Mesh(
          geometry,
          material
        );

      mark.rotation.x =
        -Math.PI / 2;

      mark.rotation.z =
        randomRange(
          random,
          -0.035,
          0.035
        );

      mark.position.set(
        x,
        0.072,
        roadZ
      );

      chunk.add(mark);
    }
  }

  for (
    const roadX
    of verticalRoads
  ) {
    for (
      let z = -54;
      z <= 54;
      z += 10
    ) {
      if (random() < 0.27) {
        continue;
      }

      const mark =
        new THREE.Mesh(
          geometry,
          material
        );

      mark.rotation.x =
        -Math.PI / 2;

      mark.rotation.z =
        Math.PI / 2 +
        randomRange(
          random,
          -0.035,
          0.035
        );

      mark.position.set(
        roadX,
        0.073,
        z
      );

      chunk.add(mark);
    }
  }
}

function createCracks(
  chunk: THREE.Group,
  random: RandomFunction
): void {
  const crackMaterial =
    new THREE.LineBasicMaterial({
      color: 0x111310,
      transparent: true,
      opacity: 0.72,
      depthTest: true,
    });

  crackMaterial.userData.chunkOwned =
    true;

  for (
    let index = 0;
    index < 32;
    index++
  ) {
    const horizontalRoad =
      random() < 0.5;

    const baseX =
      horizontalRoad
        ? randomRange(
            random,
            -57,
            57
          )
        : pick(
              [-30, 30],
              random
            ) +
          randomRange(
            random,
            -7,
            7
          );

    const baseZ =
      horizontalRoad
        ? pick(
              [-30, 30],
              random
            ) +
          randomRange(
            random,
            -7,
            7
          )
        : randomRange(
            random,
            -57,
            57
          );

    const points:
      THREE.Vector3[] = [];

    const segmentCount =
      3 +
      Math.floor(
        random() * 4
      );

    let x = baseX;
    let z = baseZ;

    points.push(
      new THREE.Vector3(
        x,
        0.081,
        z
      )
    );

    for (
      let segment = 0;
      segment < segmentCount;
      segment++
    ) {
      x += randomRange(
        random,
        -1.8,
        1.8
      );

      z += randomRange(
        random,
        -1.8,
        1.8
      );

      points.push(
        new THREE.Vector3(
          x,
          0.081,
          z
        )
      );
    }

    const geometry =
      new THREE.BufferGeometry()
        .setFromPoints(points);

    geometry.userData.chunkOwned =
      true;

    const crack =
      new THREE.Line(
        geometry,
        crackMaterial
      );

    chunk.add(crack);
  }
}

function createDirtPatches(
  chunk: THREE.Group,
  random: RandomFunction
): void {
  const materials = [
    new THREE.MeshBasicMaterial({
      color: 0x4a4937,
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
    }),

    new THREE.MeshBasicMaterial({
      color: 0x405039,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
    }),

    new THREE.MeshBasicMaterial({
      color: 0x5b5038,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    }),
  ];

  for (
    const material
    of materials
  ) {
    material.userData.chunkOwned =
      true;
  }

  for (
    let index = 0;
    index < 24;
    index++
  ) {
    const geometry =
      new THREE.PlaneGeometry(
        randomRange(
          random,
          2,
          7
        ),
        randomRange(
          random,
          1.5,
          5
        )
      );

    geometry.userData.chunkOwned =
      true;

    const patch =
      new THREE.Mesh(
        geometry,
        pick(
          materials,
          random
        )
      );

    patch.rotation.x =
      -Math.PI / 2;

    patch.rotation.z =
      random() *
      Math.PI *
      2;

    patch.position.set(
      randomRange(
        random,
        -58,
        58
      ),
      0.075,
      randomRange(
        random,
        -58,
        58
      )
    );

    chunk.add(patch);
  }
}

function getBuildingSlots(
  specialType: SpecialChunkType
): Placement[] {
  const defaultSlots: Placement[] = [
    {
      x: -49,
      z: -49,
      rotationY: Math.PI,
    },
    {
      x: 0,
      z: -49,
      rotationY: Math.PI,
    },
    {
      x: 49,
      z: -49,
      rotationY: Math.PI,
    },

    {
      x: -49,
      z: 0,
      rotationY: -Math.PI / 2,
    },
    {
      x: 49,
      z: 0,
      rotationY: Math.PI / 2,
    },

    {
      x: -49,
      z: 49,
      rotationY: 0,
    },
    {
      x: 0,
      z: 49,
      rotationY: 0,
    },
    {
      x: 49,
      z: 49,
      rotationY: 0,
    },
  ];

  if (
    specialType ===
    "river-horizontal"
  ) {
    return defaultSlots.filter(
      (slot) =>
        Math.abs(slot.z) >= 40
    );
  }

  if (
    specialType ===
    "river-vertical"
  ) {
    return defaultSlots.filter(
      (slot) =>
        Math.abs(slot.x) >= 40
    );
  }

  if (
    specialType ===
    "tunnel-north"
  ) {
    return defaultSlots.filter(
      (slot) =>
        !(
          slot.z < -40 &&
          Math.abs(slot.x) < 15
        )
    );
  }

  if (
    specialType ===
    "tunnel-east"
  ) {
    return defaultSlots.filter(
      (slot) =>
        !(
          slot.x > 40 &&
          Math.abs(slot.z) < 15
        )
    );
  }

  return defaultSlots;
}

function getVehicleSlots(
  specialType: SpecialChunkType
): Placement[] {
  const defaultSlots: Placement[] = [
    {
      x: -44,
      z: -34,
      rotationY: 0,
    },
    {
      x: 5,
      z: -26,
      rotationY: Math.PI,
    },
    {
      x: 44,
      z: 26,
      rotationY: 0,
    },
    {
      x: -5,
      z: 34,
      rotationY: Math.PI,
    },

    {
      x: -34,
      z: -44,
      rotationY: Math.PI / 2,
    },
    {
      x: -26,
      z: 5,
      rotationY: -Math.PI / 2,
    },
    {
      x: 26,
      z: 44,
      rotationY: Math.PI / 2,
    },
    {
      x: 34,
      z: -5,
      rotationY: -Math.PI / 2,
    },
  ];

  if (
    specialType ===
    "river-horizontal"
  ) {
    return defaultSlots.filter(
      (slot) =>
        Math.abs(slot.z) > 20
    );
  }

  if (
    specialType ===
    "river-vertical"
  ) {
    return defaultSlots.filter(
      (slot) =>
        Math.abs(slot.x) > 20
    );
  }

  return defaultSlots;
}

async function spawnBuildings(
  chunk: THREE.Group,
  chunkX: number,
  chunkZ: number,
  specialType: SpecialChunkType,
  colliders: THREE.Box3[],
  occluders: THREE.Mesh[]
): Promise<void> {
  const slots =
    getBuildingSlots(
      specialType
    );

  const jobs =
    slots.map(
      (
        slot,
        slotIndex
      ) => {
        const building =
          getCycledItem(
            URBAN_BUILDINGS,
            chunkX,
            chunkZ,
            slotIndex
          );

        const villa =
          isVilla(building);

        return spawnModel(
          building,
          chunk,
          {
            x: slot.x,
            y: 0.08,
            z: slot.z,

            rotationY:
              slot.rotationY,

            targetFootprint:
              villa
                ? VILLA_SIZE
                : BUILDING_SIZE,

            maxHeight:
              villa
                ? 15
                : 32,

            verticalMode:
              "ground",

            colliderMode:
              "mesh",

            colliderPadding:
              villa
                ? 0.15
                : 0.2,

            castShadow: true,
            receiveShadow: true,
            cameraOccluder: true,
          }
        );
      }
    );

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

async function spawnVehicles(
  chunk: THREE.Group,
  chunkX: number,
  chunkZ: number,
  specialType: SpecialChunkType,
  colliders: THREE.Box3[],
  occluders: THREE.Mesh[]
): Promise<void> {
  const slots =
    getVehicleSlots(
      specialType
    );

  const jobs =
    slots.map(
      (
        slot,
        slotIndex
      ) => {
        const vehicle =
          getCycledItem(
            URBAN_VEHICLES,
            chunkX,
            chunkZ,
            slotIndex
          );

        const motorcycle =
          isMotorcycle(
            vehicle
          );

        return spawnModel(
          vehicle,
          chunk,
          {
            x: slot.x,

            y: motorcycle
              ? 0.12
              : 0.08,

            z: slot.z,

            rotationY:
              slot.rotationY,

            rotationZ:
              motorcycle
                ? Math.PI / 2
                : 0,

            targetFootprint:
              motorcycle
                ? MOTORCYCLE_SIZE
                : CAR_SIZE,

            maxHeight:
              motorcycle
                ? 2
                : 3.5,

            verticalMode:
              "ground",

            colliderMode:
              "mesh",

            colliderPadding:
              0.1,

            castShadow: true,
            receiveShadow: true,
            cameraOccluder: true,
          }
        );
      }
    );

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

async function spawnRiverAndBridges(
  chunk: THREE.Group,
  chunkX: number,
  chunkZ: number,
  specialType: SpecialChunkType,
  colliders: THREE.Box3[],
  occluders: THREE.Mesh[]
): Promise<void> {
  if (
    specialType !==
      "river-horizontal" &&
    specialType !==
      "river-vertical"
  ) {
    return;
  }

  const river =
    URBAN_RIVER[0];

  const riverRotation =
    specialType ===
    "river-horizontal"
      ? Math.PI / 2
      : 0;

  const bridgeRotation =
    specialType ===
    "river-horizontal"
      ? 0
      : Math.PI / 2;

  const bridgeIndex =
    positiveModulo(
      Math.abs(
        chunkX * 5 +
          chunkZ * 7
      ),
      URBAN_BRIDGES.length
    );

  const bridge =
    URBAN_BRIDGES[
      bridgeIndex
    ];

  const riverJob =
    spawnModel(
      river,
      chunk,
      {
        x: 0,
        y: 0.025,
        z: 0,

        rotationY:
          riverRotation,

        targetFootprint:
          CITY_CHUNK_SIZE,

        maxHeight: 5,

        verticalMode:
          "center-surface",

        colliderMode:
          "none",

        castShadow: false,
        receiveShadow: true,
        cameraOccluder: false,
      }
    );

  const bridgePositions =
    specialType ===
    "river-horizontal"
      ? [
          {
            x: -30,
            z: 0,
          },
          {
            x: 30,
            z: 0,
          },
        ]
      : [
          {
            x: 0,
            z: -30,
          },
          {
            x: 0,
            z: 30,
          },
        ];

  const bridgeJobs =
    bridgePositions.map(
      (
        position,
        index
      ) =>
        spawnModel(
          URBAN_BRIDGES[
            positiveModulo(
              bridgeIndex +
                index,
              URBAN_BRIDGES.length
            )
          ] ?? bridge,
          chunk,
          {
            x: position.x,
            y: 0.09,
            z: position.z,

            rotationY:
              bridgeRotation,

            targetFootprint:
              19,

            maxHeight: 8,

            verticalMode:
              "ground",

            /*
             * سطح عبور پل نباید با یک Box بزرگ
             * کاملاً مسدود شود.
             */
            colliderMode:
              "mesh",

            colliderPadding:
              0.05,

            castShadow: true,
            receiveShadow: true,
            cameraOccluder: true,
          }
        )
    );

  const [
    riverResult,
    bridgeResults,
  ] = await Promise.all([
    Promise.allSettled([
      riverJob,
    ]),

    Promise.allSettled(
      bridgeJobs
    ),
  ]);

  collectSpawnedModels(
    riverResult,
    colliders,
    occluders
  );

  collectSpawnedModels(
    bridgeResults,
    colliders,
    occluders
  );
}

async function spawnTunnel(
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

  const horizontal =
    specialType ===
    "tunnel-east";

  const rotationY =
    horizontal
      ? Math.PI / 2
      : 0;

  const tunnelX =
    horizontal
      ? 48
      : 0;

  const tunnelZ =
    horizontal
      ? 0
      : -48;

  const jobs =
    URBAN_TUNNEL.map(
      (
        tunnelPart,
        index
      ) => {
        /*
         * تمام Tunnel.glb و چهار دیواره‌ی تونل
         * در همان Chunk استفاده می‌شوند.
         */
        const isMainTunnel =
          index === 0;

        let offsetX = 0;
        let offsetZ = 0;

        if (!isMainTunnel) {
          const wallOffset =
            (index - 2.5) * 7;

          if (horizontal) {
            offsetX =
              wallOffset;
          } else {
            offsetZ =
              wallOffset;
          }
        }

        return spawnModel(
          tunnelPart,
          chunk,
          {
            x:
              tunnelX +
              offsetX,

            y: 0.08,

            z:
              tunnelZ +
              offsetZ,

            rotationY,

            targetFootprint:
              isMainTunnel
                ? 26
                : 15,

            maxHeight:
              isMainTunnel
                ? 15
                : 12,

            verticalMode:
              "ground",

            colliderMode:
              "mesh",

            colliderPadding:
              0.08,

            castShadow: true,
            receiveShadow: true,
            cameraOccluder: true,
          }
        );
      }
    );

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

function isInsideRiverArea(
  x: number,
  z: number,
  specialType: SpecialChunkType
): boolean {
  if (
    specialType ===
    "river-horizontal"
  ) {
    return Math.abs(z) < 13;
  }

  if (
    specialType ===
    "river-vertical"
  ) {
    return Math.abs(x) < 13;
  }

  return false;
}

function isInsideTunnelArea(
  x: number,
  z: number,
  specialType: SpecialChunkType
): boolean {
  if (
    specialType ===
    "tunnel-north"
  ) {
    return (
      z < -35 &&
      Math.abs(x) < 20
    );
  }

  if (
    specialType ===
    "tunnel-east"
  ) {
    return (
      x > 35 &&
      Math.abs(z) < 20
    );
  }

  return false;
}

function createVegetationPosition(
  random: RandomFunction,
  specialType: SpecialChunkType
): {
  x: number;
  z: number;
} {
  for (
    let attempt = 0;
    attempt < 20;
    attempt++
  ) {
    const edge =
      Math.floor(
        random() * 4
      );

    let x =
      randomRange(
        random,
        -57,
        57
      );

    let z =
      randomRange(
        random,
        -57,
        57
      );

    if (edge === 0) {
      x =
        pick(
          [
            -55,
            -42,
            42,
            55,
          ],
          random
        );
    } else if (edge === 1) {
      z =
        pick(
          [
            -55,
            -42,
            42,
            55,
          ],
          random
        );
    } else if (edge === 2) {
      x =
        pick(
          [
            -20,
            20,
            -40,
            40,
          ],
          random
        );
    } else {
      z =
        pick(
          [
            -20,
            20,
            -40,
            40,
          ],
          random
        );
    }

    if (
      isInsideRiverArea(
        x,
        z,
        specialType
      )
    ) {
      continue;
    }

    if (
      isInsideTunnelArea(
        x,
        z,
        specialType
      )
    ) {
      continue;
    }

    return {
      x,
      z,
    };
  }

  return {
    x: 52,
    z: 52,
  };
}

async function spawnVegetation(
  chunk: THREE.Group,
  chunkX: number,
  chunkZ: number,
  random: RandomFunction,
  specialType: SpecialChunkType,
  colliders: THREE.Box3[],
  occluders: THREE.Mesh[]
): Promise<void> {
  const treeJobs: Promise<
    SpawnedModel | null
  >[] = [];

  /*
   * در هر Chunk هشت درخت ایجاد می‌شود و انتخاب آن‌ها
   * چرخشی است؛ بنابراین تمام ۲۰ مدل درخت در شهر
   * استفاده خواهند شد.
   */
  for (
    let index = 0;
    index < 8;
    index++
  ) {
    const position =
      createVegetationPosition(
        random,
        specialType
      );

    const treeUrl =
      getCycledItem(
        FOREST_TREES,
        chunkX,
        chunkZ,
        index
      );

    treeJobs.push(
      spawnModel(
        modelFromUrl(
          treeUrl
        ),
        chunk,
        {
          x: position.x,
          y: 0.07,
          z: position.z,

          rotationY:
            random() *
            Math.PI *
            2,

          targetFootprint:
            randomRange(
              random,
              3.8,
              5.4
            ),

          maxHeight:
            randomRange(
              random,
              9,
              15
            ),

          verticalMode:
            "ground",

          colliderMode:
            "mesh",

          colliderPadding:
            0.2,

          castShadow: true,
          receiveShadow: true,
          cameraOccluder: true,
        }
      )
    );
  }

  const bushJobs: Promise<
    SpawnedModel | null
  >[] = [];

  /*
   * شش مدل بوته وجود دارد و هر شش مدل در هر Chunk
   * یک‌بار استفاده می‌شوند.
   */
  for (
    let index = 0;
    index <
    FOREST_BUSHES.length;
    index++
  ) {
    const position =
      createVegetationPosition(
        random,
        specialType
      );

    const bushUrl =
      getCycledItem(
        FOREST_BUSHES,
        chunkX,
        chunkZ,
        index
      );

    bushJobs.push(
      spawnModel(
        modelFromUrl(
          bushUrl
        ),
        chunk,
        {
          x: position.x,
          y: 0.065,
          z: position.z,

          rotationY:
            random() *
            Math.PI *
            2,

          targetFootprint:
            randomRange(
              random,
              1.3,
              2.5
            ),

          maxHeight: 3,

          verticalMode:
            "ground",

          colliderMode:
            "mesh",

          colliderPadding:
            0.06,

          castShadow: true,
          receiveShadow: true,
          cameraOccluder: false,
        }
      )
    );
  }

  const grassJobs: Promise<
    SpawnedModel | null
  >[] = [];

  /*
   * هر سه مدل Grass در هر Chunk استفاده می‌شوند.
   */
  for (
    let index = 0;
    index <
    FOREST_GRASS.length;
    index++
  ) {
    const position =
      createVegetationPosition(
        random,
        specialType
      );

    grassJobs.push(
      spawnModel(
        modelFromUrl(
          getCycledItem(
            FOREST_GRASS,
            chunkX,
            chunkZ,
            index
          )
        ),
        chunk,
        {
          x: position.x,
          y: 0.075,
          z: position.z,

          rotationY:
            random() *
            Math.PI *
            2,

          targetFootprint:
            randomRange(
              random,
              0.7,
              1.4
            ),

          maxHeight: 1.7,

          verticalMode:
            "ground",

          colliderMode:
            "none",

          castShadow: false,
          receiveShadow: true,
          cameraOccluder: false,
        }
      )
    );
  }

  const flowerJobs: Promise<
    SpawnedModel | null
  >[] = [];

  /*
   * هر هفت مدل گل در هر Chunk استفاده می‌شوند.
   */
  for (
    let index = 0;
    index <
    FOREST_FLOWERS.length;
    index++
  ) {
    const position =
      createVegetationPosition(
        random,
        specialType
      );

    flowerJobs.push(
      spawnModel(
        modelFromUrl(
          getCycledItem(
            FOREST_FLOWERS,
            chunkX,
            chunkZ,
            index
          )
        ),
        chunk,
        {
          x: position.x,
          y: 0.075,
          z: position.z,

          rotationY:
            random() *
            Math.PI *
            2,

          targetFootprint:
            randomRange(
              random,
              0.45,
              1
            ),

          maxHeight: 1.3,

          verticalMode:
            "ground",

          colliderMode:
            "none",

          castShadow: false,
          receiveShadow: true,
          cameraOccluder: false,
        }
      )
    );
  }

  const [
    treeResults,
    bushResults,
  ] = await Promise.all([
    Promise.allSettled(
      treeJobs
    ),

    Promise.allSettled(
      bushJobs
    ),

    Promise.allSettled(
      grassJobs
    ),

    Promise.allSettled(
      flowerJobs
    ),
  ]);

  collectSpawnedModels(
    treeResults,
    colliders,
    occluders
  );

  collectSpawnedModels(
    bushResults,
    colliders,
    occluders
  );
}

export async function generateCity(
  chunk: THREE.Group,
  chunkX: number,
  chunkZ: number
): Promise<CityGenerationResult> {
  const random =
    createRandom(
      chunkX,
      chunkZ
    );

  const specialType =
    getSpecialChunkType(
      chunkX,
      chunkZ
    );

  const colliders:
    THREE.Box3[] = [];

  const occluders:
    THREE.Mesh[] = [];

  /*
   * زمین، خیابان، کوچه، ترک و لکه‌ها با کد ساخته
   * می‌شوند. مدل‌های URBAN_STREETS و URBAN_ALLEYS
   * عمداً استفاده نمی‌شوند.
   */
  createGround(chunk);

  createRoads(
    chunk,
    specialType
  );

  createAlleys(
    chunk,
    specialType
  );

  createRoadMarkings(
    chunk,
    random,
    specialType
  );

  createCracks(
    chunk,
    random
  );

  createDirtPatches(
    chunk,
    random
  );

  /*
   * تمام گروه‌ها هم‌زمان Load می‌شوند تا زمان
   * ساخته‌شدن Chunk کمتر شود.
   */
  await Promise.all([
    spawnBuildings(
      chunk,
      chunkX,
      chunkZ,
      specialType,
      colliders,
      occluders
    ),

    spawnVehicles(
      chunk,
      chunkX,
      chunkZ,
      specialType,
      colliders,
      occluders
    ),

    spawnRiverAndBridges(
      chunk,
      chunkX,
      chunkZ,
      specialType,
      colliders,
      occluders
    ),

    spawnTunnel(
      chunk,
      specialType,
      colliders,
      occluders
    ),

    spawnVegetation(
      chunk,
      chunkX,
      chunkZ,
      random,
      specialType,
      colliders,
      occluders
    ),
  ]);

  return {
    colliders,
    occluders,
  };
      }
