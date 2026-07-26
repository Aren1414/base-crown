import * as THREE from "three";

import {
  URBAN_STREETS,
  URBAN_ALLEYS,
  URBAN_BUILDINGS,
  URBAN_VEHICLES,
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

const ROAD_TILE_SIZE = 30;
const ALLEY_TILE_SIZE = 22;

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

function pick<T>(
  array: T[],
  random: RandomFunction
): T {
  return array[
    Math.floor(random() * array.length)
  ];
}

function randomRange(
  random: RandomFunction,
  min: number,
  max: number
): number {
  return min + random() * (max - min);
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

function getRoadTiles(): Placement[] {
  const tiles: Placement[] = [];

  const segmentPositions = [
    -45,
    -15,
    15,
    45,
  ];

  // دو خیابان افقی
  for (const z of [-30, 30]) {
    for (const x of segmentPositions) {
      tiles.push({
        x,
        z,
        rotationY: 0,
      });
    }
  }

  // دو خیابان عمودی
  for (const x of [-30, 30]) {
    for (const z of segmentPositions) {
      tiles.push({
        x,
        z,
        rotationY: Math.PI / 2,
      });
    }
  }

  return tiles;
}

function getAlleyTiles(): Placement[] {
  return [
    {
      x: 0,
      z: -49,
      rotationY: Math.PI / 2,
    },
    {
      x: 0,
      z: 49,
      rotationY: Math.PI / 2,
    },
    {
      x: -49,
      z: 0,
      rotationY: 0,
    },
    {
      x: 49,
      z: 0,
      rotationY: 0,
    },
  ];
}

function getBuildingSlots(): Placement[] {
  return [
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
}

function getVehicleSlots(): Placement[] {
  return [
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
}

async function spawnRoads(
  chunk: THREE.Group
): Promise<void> {
  const tiles = getRoadTiles();

  /*
   * یک مدل برای مسیرهای افقی و یک مدل برای
   * مسیرهای عمودی انتخاب می‌شود تا خیابان‌ها
   * منظم‌تر و هماهنگ‌تر باشند.
   */
  const horizontalStreet =
    URBAN_STREETS[0];

  const verticalStreet =
    URBAN_STREETS[
      Math.min(
        1,
        URBAN_STREETS.length - 1
      )
    ];

  const jobs = tiles.map((tile) => {
    const horizontal =
      Math.abs(tile.rotationY) < 0.01;

    return spawnModel(
      horizontal
        ? horizontalStreet
        : verticalStreet,
      chunk,
      {
        x: tile.x,
        y: 0.04,
        z: tile.z,

        rotationY: tile.rotationY,

        targetFootprint:
          ROAD_TILE_SIZE,

        verticalMode:
          "center-surface",

        /*
         * مهم:
         * خیابان Collider ندارد.
         * کاراکتر باید بتواند روی آن حرکت کند.
         */
        colliderMode: "none",

        castShadow: false,
        receiveShadow: true,
        cameraOccluder: false,
      }
    );
  });

  await Promise.allSettled(jobs);
}

async function spawnAlleys(
  chunk: THREE.Group
): Promise<void> {
  if (URBAN_ALLEYS.length === 0) {
    return;
  }

  const tiles = getAlleyTiles();

  const jobs = tiles.map(
    (tile, index) =>
      spawnModel(
        URBAN_ALLEYS[
          index %
            URBAN_ALLEYS.length
        ],
        chunk,
        {
          x: tile.x,
          y: 0.045,
          z: tile.z,

          rotationY:
            tile.rotationY,

          targetFootprint:
            ALLEY_TILE_SIZE,

          verticalMode:
            "center-surface",

          /*
           * کوچه هم سطح قابل حرکت است.
           */
          colliderMode: "none",

          castShadow: false,
          receiveShadow: true,
          cameraOccluder: false,
        }
      )
  );

  await Promise.allSettled(jobs);
}

async function spawnBuildings(
  chunk: THREE.Group,
  random: RandomFunction,
  colliders: THREE.Box3[],
  occluders: THREE.Mesh[]
): Promise<void> {
  const jobs = getBuildingSlots()
    .filter(() => random() >= 0.08)
    .map((slot) => {
      const building = pick(
        URBAN_BUILDINGS,
        random
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
            villa ? 15 : 32,

          verticalMode: "ground",

          colliderMode: "mesh",

          colliderPadding:
            villa ? 0.15 : 0.2,

          castShadow: true,
          receiveShadow: true,
          cameraOccluder: true,
        }
      );
    });

  const results =
    await Promise.allSettled(jobs);

  collectSpawnedModels(
    results,
    colliders,
    occluders
  );
}

async function spawnVehicles(
  chunk: THREE.Group,
  random: RandomFunction,
  colliders: THREE.Box3[],
  occluders: THREE.Mesh[]
): Promise<void> {
  const jobs = getVehicleSlots()
    .filter(() => random() <= 0.48)
    .map((slot) => {
      const vehicle = pick(
        URBAN_VEHICLES,
        random
      );

      const motorcycle =
        isMotorcycle(vehicle);

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

          verticalMode: "ground",

          colliderMode: "mesh",
          colliderPadding: 0.1,

          castShadow: true,
          receiveShadow: true,
          cameraOccluder: true,
        }
      );
    });

  const results =
    await Promise.allSettled(jobs);

  collectSpawnedModels(
    results,
    colliders,
    occluders
  );
}

async function spawnVegetation(
  chunk: THREE.Group,
  random: RandomFunction,
  colliders: THREE.Box3[],
  occluders: THREE.Mesh[]
): Promise<void> {
  const areas = [
    {
      x: 0,
      z: 0,
      radius: 10,
    },
    {
      x: -50,
      z: 18,
      radius: 6,
    },
    {
      x: 50,
      z: -18,
      radius: 6,
    },
    {
      x: -18,
      z: 50,
      radius: 6,
    },
    {
      x: 18,
      z: -50,
      radius: 6,
    },
  ];

  const treeJobs: Promise<
    SpawnedModel | null
  >[] = [];

  for (let index = 0; index < 5; index++) {
    const area = pick(
      areas,
      random
    );

    const angle =
      random() * Math.PI * 2;

    const distance =
      random() * area.radius;

    treeJobs.push(
      spawnModel(
        modelFromUrl(
          pick(
            FOREST_TREES,
            random
          )
        ),
        chunk,
        {
          x:
            area.x +
            Math.cos(angle) *
              distance,

          y: 0.06,

          z:
            area.z +
            Math.sin(angle) *
              distance,

          rotationY:
            random() *
            Math.PI *
            2,

          targetFootprint:
            randomRange(
              random,
              4,
              5.5
            ),

          maxHeight:
            randomRange(
              random,
              10,
              15
            ),

          verticalMode: "ground",

          colliderMode: "mesh",
          colliderPadding: 0.25,

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

  for (let index = 0; index < 8; index++) {
    const area = pick(
      areas,
      random
    );

    const angle =
      random() * Math.PI * 2;

    const distance =
      random() * area.radius;

    bushJobs.push(
      spawnModel(
        modelFromUrl(
          pick(
            FOREST_BUSHES,
            random
          )
        ),
        chunk,
        {
          x:
            area.x +
            Math.cos(angle) *
              distance,

          y: 0.05,

          z:
            area.z +
            Math.sin(angle) *
              distance,

          rotationY:
            random() *
            Math.PI *
            2,

          targetFootprint:
            randomRange(
              random,
              1.4,
              2.6
            ),

          maxHeight: 3,

          verticalMode: "ground",

          colliderMode: "mesh",
          colliderPadding: 0.08,

          castShadow: true,
          receiveShadow: true,
          cameraOccluder: false,
        }
      )
    );
  }

  const decorationUrls = [
    ...FOREST_GRASS,
    ...FOREST_FLOWERS,
  ];

  const decorationJobs: Promise<
    SpawnedModel | null
  >[] = [];

  for (
    let index = 0;
    index < 14;
    index++
  ) {
    const area = pick(
      areas,
      random
    );

    const angle =
      random() * Math.PI * 2;

    const distance =
      random() * area.radius;

    decorationJobs.push(
      spawnModel(
        modelFromUrl(
          pick(
            decorationUrls,
            random
          )
        ),
        chunk,
        {
          x:
            area.x +
            Math.cos(angle) *
              distance,

          y: 0.04,

          z:
            area.z +
            Math.sin(angle) *
              distance,

          rotationY:
            random() *
            Math.PI *
            2,

          targetFootprint:
            randomRange(
              random,
              0.6,
              1.4
            ),

          maxHeight: 1.8,

          verticalMode: "ground",

          colliderMode: "none",

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
      decorationJobs
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
  const random = createRandom(
    chunkX,
    chunkZ
  );

  const colliders:
    THREE.Box3[] = [];

  const occluders:
    THREE.Mesh[] = [];

  /*
   * همه گروه‌های مدل هم‌زمان شروع به دانلود و
   * ساخته‌شدن می‌کنند، نه یکی‌یکی.
   */
  await Promise.all([
    spawnRoads(chunk),

    spawnAlleys(chunk),

    spawnBuildings(
      chunk,
      random,
      colliders,
      occluders
    ),

    spawnVehicles(
      chunk,
      random,
      colliders,
      occluders
    ),

    spawnVegetation(
      chunk,
      random,
      colliders,
      occluders
    ),
  ]);

  return {
    colliders,
    occluders,
  };
      }
