import * as THREE from "three";

import {
  URBAN_STREETS,
  URBAN_BUILDINGS,
  URBAN_VEHICLES,
  type ModelDef,
} from "../assets/Models";

import {
  spawnModel,
} from "./AssetLoader";

export const CITY_CHUNK_SIZE = 120;

const ROAD_TILE_SIZE = 30;
const ROAD_SURFACE_Y = 0.08;

const BUILDING_FOOTPRINT = 21;
const VILLA_FOOTPRINT = 16;

const VEHICLE_FOOTPRINT = 5.5;

type RandomFunction = () => number;

export type CityGenerationResult = {
  colliders: THREE.Box3[];
};

type BuildingSlot = {
  x: number;
  z: number;
  rotationY: number;
};

type RoadTile = {
  x: number;
  z: number;
  rotationY: number;
};

type VehicleSlot = {
  x: number;
  z: number;
  rotationY: number;
};

function createSeededRandom(
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
  items: T[],
  random: RandomFunction
): T {
  return items[
    Math.floor(
      random() * items.length
    )
  ];
}

function isVilla(
  definition: ModelDef
): boolean {
  return definition.url
    .toLowerCase()
    .includes("villa");
}

function getRoadTiles(): RoadTile[] {
  const tiles: RoadTile[] = [];

  const tilePositions = [
    -45,
    -15,
    15,
    45,
  ];

  const roadLines = [
    -30,
    30,
  ];

  for (const roadZ of roadLines) {
    for (const x of tilePositions) {
      tiles.push({
        x,
        z: roadZ,
        rotationY: 0,
      });
    }
  }

  for (const roadX of roadLines) {
    for (const z of tilePositions) {
      tiles.push({
        x: roadX,
        z,
        rotationY: Math.PI / 2,
      });
    }
  }

  return tiles;
}

function getBuildingSlots(): BuildingSlot[] {
  return [
    {
      x: -48,
      z: -48,
      rotationY: Math.PI,
    },
    {
      x: 0,
      z: -48,
      rotationY: Math.PI,
    },
    {
      x: 48,
      z: -48,
      rotationY: Math.PI,
    },

    {
      x: -48,
      z: 0,
      rotationY: -Math.PI / 2,
    },
    {
      x: 0,
      z: 0,
      rotationY: 0,
    },
    {
      x: 48,
      z: 0,
      rotationY: Math.PI / 2,
    },

    {
      x: -48,
      z: 48,
      rotationY: 0,
    },
    {
      x: 0,
      z: 48,
      rotationY: 0,
    },
    {
      x: 48,
      z: 48,
      rotationY: 0,
    },
  ];
}

function getVehicleSlots(): VehicleSlot[] {
  return [
    {
      x: -45,
      z: -34,
      rotationY: 0,
    },
    {
      x: 5,
      z: -26,
      rotationY: Math.PI,
    },
    {
      x: 45,
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
      z: -45,
      rotationY: Math.PI / 2,
    },
    {
      x: -26,
      z: 5,
      rotationY: -Math.PI / 2,
    },
    {
      x: 26,
      z: 45,
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
  chunk: THREE.Group,
  random: RandomFunction
): Promise<void> {
  const roadTiles =
    getRoadTiles();

  const jobs: Promise<unknown>[] = [];

  for (
    let index = 0;
    index < roadTiles.length;
    index++
  ) {
    const tile =
      roadTiles[index];

    /*
     * Models are selected deterministically.
     * This avoids a completely random road layout.
     */
    const street =
      URBAN_STREETS[
        index %
          URBAN_STREETS.length
      ];

    jobs.push(
      spawnModel(
        street,
        chunk,
        {
          x: tile.x,
          y: ROAD_SURFACE_Y,
          z: tile.z,

          rotationY:
            tile.rotationY,

          targetFootprint:
            ROAD_TILE_SIZE,

          maxHeight: 30,

          /*
           * The top of the street model is placed
           * at ground level. Its thick lower section
           * remains below the playable surface.
           */
          verticalMode: "surface",

          castShadow: false,
          receiveShadow: true,

          collider: false,
        }
      )
    );
  }

  await Promise.allSettled(jobs);

  void random;
}

async function spawnBuildings(
  chunk: THREE.Group,
  random: RandomFunction,
  colliders: THREE.Box3[]
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

    const spawned =
      await spawnModel(
        building,
        chunk,
        {
          x: slot.x,
          y: 0.1,
          z: slot.z,

          rotationY:
            slot.rotationY,

          targetFootprint:
            villa
              ? VILLA_FOOTPRINT
              : BUILDING_FOOTPRINT,

          maxHeight:
            villa ? 14 : 32,

          verticalMode: "ground",

          castShadow: true,
          receiveShadow: true,

          collider: true,
          colliderPadding:
            villa ? 0.8 : 1.2,
        }
      );

    if (spawned?.collider) {
      colliders.push(
        spawned.collider
      );
    }
  }
}

async function spawnVehicles(
  chunk: THREE.Group,
  random: RandomFunction,
  colliders: THREE.Box3[]
): Promise<void> {
  const slots =
    getVehicleSlots();

  for (const slot of slots) {
    if (random() > 0.42) {
      continue;
    }

    const vehicle =
      pick(
        URBAN_VEHICLES,
        random
      );

    const spawned =
      await spawnModel(
        vehicle,
        chunk,
        {
          x: slot.x,
          y: 0.12,
          z: slot.z,

          rotationY:
            slot.rotationY,

          targetFootprint:
            VEHICLE_FOOTPRINT,

          maxHeight: 3.5,

          verticalMode: "ground",

          castShadow: true,
          receiveShadow: true,

          collider: true,
          colliderPadding: 0.35,
        }
      );

    if (spawned?.collider) {
      colliders.push(
        spawned.collider
      );
    }
  }
}

export async function generateCity(
  chunk: THREE.Group,
  chunkX: number,
  chunkZ: number
): Promise<CityGenerationResult> {
  const random =
    createSeededRandom(
      chunkX,
      chunkZ
    );

  const colliders:
    THREE.Box3[] = [];

  await spawnRoads(
    chunk,
    random
  );

  await Promise.all([
    spawnBuildings(
      chunk,
      random,
      colliders
    ),

    spawnVehicles(
      chunk,
      random,
      colliders
    ),
  ]);

  return {
    colliders,
  };
    }
