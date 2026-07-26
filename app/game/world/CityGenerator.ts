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
} from "./AssetLoader";

export const CITY_CHUNK_SIZE = 120;

const ROAD_TILE_SIZE = 30;
const ALLEY_TILE_SIZE = 22;

const BUILDING_SIZE = 21;
const VILLA_SIZE = 16;

const CAR_SIZE = 5.5;
const MOTORCYCLE_SIZE = 3.2;

type RandomFunction = () => number;

export type CityGenerationResult = {
  colliders: THREE.Box3[];
  occluders: THREE.Mesh[];
};

type Placement = {
  x: number;
  z: number;
  rotationY: number;
};

function createRandom(
  chunkX: number,
  chunkZ: number
): RandomFunction {
  let seed =
    Math.imul(
      chunkX + 10000,
      374761393
    ) ^
    Math.imul(
      chunkZ + 20000,
      668265263
    );

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
    Math.floor(
      random() * array.length
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
  url: string,
  scale: number
): ModelDef {
  return {
    url,
    scale,
  };
}

function collectResult(
  result:
    | Awaited<
        ReturnType<
          typeof spawnModel
        >
      >
    | null,
  colliders: THREE.Box3[],
  occluders: THREE.Mesh[]
): void {
  if (!result) {
    return;
  }

  colliders.push(
    ...result.colliders
  );

  occluders.push(
    ...result.occluders
  );
}

function getRoadTiles(): Placement[] {
  const result: Placement[] = [];

  const segmentPositions = [
    -45,
    -15,
    15,
    45,
  ];

  /*
   * دو خیابان افقی متصل
   */
  for (const z of [-30, 30]) {
    for (const x of segmentPositions) {
      result.push({
        x,
        z,
        rotationY: 0,
      });
    }
  }

  /*
   * دو خیابان عمودی متصل
   */
  for (const x of [-30, 30]) {
    for (const z of segmentPositions) {
      result.push({
        x,
        z,
        rotationY:
          Math.PI / 2,
      });
    }
  }

  return result;
}

function getAlleyTiles(): Placement[] {
  return [
    {
      x: 0,
      z: -48,
      rotationY:
        Math.PI / 2,
    },
    {
      x: 0,
      z: 48,
      rotationY:
        Math.PI / 2,
    },
    {
      x: -48,
      z: 0,
      rotationY: 0,
    },
    {
      x: 48,
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
      rotationY:
        -Math.PI / 2,
    },
    {
      x: 49,
      z: 0,
      rotationY:
        Math.PI / 2,
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
      rotationY:
        Math.PI / 2,
    },
    {
      x: -26,
      z: 5,
      rotationY:
        -Math.PI / 2,
    },
    {
      x: 26,
      z: 44,
      rotationY:
        Math.PI / 2,
    },
    {
      x: 34,
      z: -5,
      rotationY:
        -Math.PI / 2,
    },
  ];
}

async function spawnRoads(
  chunk: THREE.Group,
  colliders: THREE.Box3[]
): Promise<void> {
  const tiles = getRoadTiles();

  for (
    let index = 0;
    index < tiles.length;
    index++
  ) {
    const tile = tiles[index];

    const street =
      URBAN_STREETS[
        index %
          URBAN_STREETS.length
      ];

    const result =
      await spawnModel(
        street,
        chunk,
        {
          x: tile.x,
          y: 0.04,
          z: tile.z,

          rotationY:
            tile.rotationY,

          targetFootprint:
            ROAD_TILE_SIZE,

          verticalMode:
            "center-surface",

          colliderMode: "mesh",
          colliderPadding: 0.08,

          castShadow: false,
          receiveShadow: true,
          cameraOccluder: false,
        }
      );

    if (result) {
      colliders.push(
        ...result.colliders
      );
    }
  }
}

async function spawnAlleys(
  chunk: THREE.Group,
  colliders: THREE.Box3[]
): Promise<void> {
  if (URBAN_ALLEYS.length === 0) {
    return;
  }

  const tiles = getAlleyTiles();

  for (
    let index = 0;
    index < tiles.length;
    index++
  ) {
    const tile = tiles[index];

    const alley =
      URBAN_ALLEYS[
        index %
          URBAN_ALLEYS.length
      ];

    const result =
      await spawnModel(
        alley,
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

          colliderMode: "mesh",
          colliderPadding: 0.05,

          castShadow: false,
          receiveShadow: true,
          cameraOccluder: false,
        }
      );

    if (result) {
      colliders.push(
        ...result.colliders
      );
    }
  }
}

async function spawnBuildings(
  chunk: THREE.Group,
  random: RandomFunction,
  colliders: THREE.Box3[],
  occluders: THREE.Mesh[]
): Promise<void> {
  const slots =
    getBuildingSlots();

  for (const slot of slots) {
    if (random() < 0.08) {
      continue;
    }

    const building =
      pick(
        URBAN_BUILDINGS,
        random
      );

    const villa =
      isVilla(building);

    const result =
      await spawnModel(
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

    collectResult(
      result,
      colliders,
      occluders
    );
  }
}

async function spawnVehicles(
  chunk: THREE.Group,
  random: RandomFunction,
  colliders: THREE.Box3[],
  occluders: THREE.Mesh[]
): Promise<void> {
  const slots =
    getVehicleSlots();

  for (const slot of slots) {
    if (random() > 0.48) {
      continue;
    }

    const vehicle =
      pick(
        URBAN_VEHICLES,
        random
      );

    const motorcycle =
      isMotorcycle(vehicle);

    const result =
      await spawnModel(
        vehicle,
        chunk,
        {
          x: slot.x,
          y: motorcycle
            ? 0.15
            : 0.1,
          z: slot.z,

          rotationY:
            slot.rotationY,

          /*
           * موتور به پهلو روی زمین قرار می‌گیرد.
           */
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

    collectResult(
      result,
      colliders,
      occluders
    );
  }
}

async function spawnVegetation(
  chunk: THREE.Group,
  random: RandomFunction,
  colliders: THREE.Box3[],
  occluders: THREE.Mesh[]
): Promise<void> {
  const vegetationAreas = [
    {
      centerX: 0,
      centerZ: 0,
      radius: 11,
    },
    {
      centerX: -50,
      centerZ: 18,
      radius: 7,
    },
    {
      centerX: 50,
      centerZ: -18,
      radius: 7,
    },
    {
      centerX: -18,
      centerZ: 50,
      radius: 7,
    },
    {
      centerX: 18,
      centerZ: -50,
      radius: 7,
    },
  ];

  /*
   * درخت‌ها
   */
  for (let index = 0; index < 7; index++) {
    const area =
      pick(
        vegetationAreas,
        random
      );

    const angle =
      random() *
      Math.PI *
      2;

    const distance =
      random() *
      area.radius;

    const result =
      await spawnModel(
        modelFromUrl(
          pick(
            FOREST_TREES,
            random
          ),
          1
        ),
        chunk,
        {
          x:
            area.centerX +
            Math.cos(angle) *
              distance,

          y: 0.06,

          z:
            area.centerZ +
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
              6
            ),

          maxHeight:
            randomRange(
              random,
              10,
              16
            ),

          verticalMode: "ground",

          colliderMode: "mesh",
          colliderPadding: 0.2,

          castShadow: true,
          receiveShadow: true,
          cameraOccluder: true,
        }
      );

    collectResult(
      result,
      colliders,
      occluders
    );
  }

  /*
   * بوته‌ها
   */
  for (let index = 0; index < 12; index++) {
    const area =
      pick(
        vegetationAreas,
        random
      );

    const angle =
      random() *
      Math.PI *
      2;

    const distance =
      random() *
      area.radius;

    const result =
      await spawnModel(
        modelFromUrl(
          pick(
            FOREST_BUSHES,
            random
          ),
          1
        ),
        chunk,
        {
          x:
            area.centerX +
            Math.cos(angle) *
              distance,

          y: 0.05,

          z:
            area.centerZ +
            Math.sin(angle) *
              distance,

          rotationY:
            random() *
            Math.PI *
            2,

          targetFootprint:
            randomRange(
              random,
              1.5,
              3
            ),

          maxHeight: 3,

          verticalMode: "ground",

          colliderMode: "mesh",
          colliderPadding: 0.08,

          castShadow: true,
          receiveShadow: true,
          cameraOccluder: false,
        }
      );

    collectResult(
      result,
      colliders,
      occluders
    );
  }

  /*
   * چمن‌ها و گل‌ها Collision ندارند.
   */
  const decorations = [
    ...FOREST_GRASS,
    ...FOREST_FLOWERS,
  ];

  for (let index = 0; index < 22; index++) {
    const area =
      pick(
        vegetationAreas,
        random
      );

    const angle =
      random() *
      Math.PI *
      2;

    const distance =
      random() *
      area.radius;

    await spawnModel(
      modelFromUrl(
        pick(
          decorations,
          random
        ),
        1
      ),
      chunk,
      {
        x:
          area.centerX +
          Math.cos(angle) *
            distance,

        y: 0.04,

        z:
          area.centerZ +
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
            1.5
          ),

        maxHeight: 1.8,

        verticalMode: "ground",

        colliderMode: "none",

        castShadow: false,
        receiveShadow: true,
        cameraOccluder: false,
      }
    );
  }
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

  const colliders:
    THREE.Box3[] = [];

  const occluders:
    THREE.Mesh[] = [];

  await spawnRoads(
    chunk,
    colliders
  );

  await spawnAlleys(
    chunk,
    colliders
  );

  await spawnBuildings(
    chunk,
    random,
    colliders,
    occluders
  );

  await spawnVehicles(
    chunk,
    random,
    colliders,
    occluders
  );

  await spawnVegetation(
    chunk,
    random,
    colliders,
    occluders
  );

  return {
    colliders,
    occluders,
  };
      }
