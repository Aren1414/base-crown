import * as THREE from "three";

import {
  URBAN_STREETS,
  URBAN_ALLEYS,
  URBAN_BUILDINGS,
  URBAN_VEHICLES,
  type ModelDef,
} from "../assets/Models";

import {
  spawnModel,
} from "./AssetLoader";

export const CITY_CHUNK_SIZE = 120;

const ROAD_TILE_SIZE = 30;
const ROAD_MODEL_SIZE = 29;

const BUILDING_SIZE = 20;
const VILLA_SIZE = 16;

const VEHICLE_SIZE = 5.5;
const ALLEY_SIZE = 20;

type RandomFunction = () => number;

type BuildingSlot = {
  x: number;
  z: number;
  rotationY: number;
};

function createRandom(
  chunkX: number,
  chunkZ: number
): RandomFunction {
  let seed =
    Math.imul(chunkX + 8192, 374761393) ^
    Math.imul(chunkZ + 4096, 668265263);

  seed >>>= 0;

  return () => {
    seed += 0x6d2b79f5;

    let value = seed;

    value = Math.imul(
      value ^ (value >>> 15),
      value | 1
    );

    value ^= value +
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
    Math.floor(random() * items.length)
  ];
}

function isVilla(
  definition: ModelDef
): boolean {
  return definition.url
    .toLowerCase()
    .includes("villa");
}

function createRoadBase(
  chunk: THREE.Group
): void {
  const material =
    new THREE.MeshStandardMaterial({
      color: 0x242424,
      roughness: 0.96,
      metalness: 0,
    });

  material.userData.chunkOwned = true;

  const horizontalGeometry =
    new THREE.BoxGeometry(
      CITY_CHUNK_SIZE,
      0.12,
      ROAD_TILE_SIZE
    );

  horizontalGeometry.userData.chunkOwned =
    true;

  const horizontalRoad = new THREE.Mesh(
    horizontalGeometry,
    material
  );

  horizontalRoad.position.set(
    0,
    0.06,
    0
  );

  horizontalRoad.receiveShadow = true;
  horizontalRoad.name = "HorizontalRoadBase";

  chunk.add(horizontalRoad);

  const verticalGeometry =
    new THREE.BoxGeometry(
      ROAD_TILE_SIZE,
      0.12,
      CITY_CHUNK_SIZE
    );

  verticalGeometry.userData.chunkOwned =
    true;

  const verticalRoad = new THREE.Mesh(
    verticalGeometry,
    material
  );

  verticalRoad.position.set(
    0,
    0.065,
    0
  );

  verticalRoad.receiveShadow = true;
  verticalRoad.name = "VerticalRoadBase";

  chunk.add(verticalRoad);
}

function createRoadMarkings(
  chunk: THREE.Group
): void {
  const material =
    new THREE.MeshBasicMaterial({
      color: 0xb7a85e,
    });

  material.userData.chunkOwned = true;

  const markingLength = 5;
  const markingWidth = 0.22;
  const spacing = 10;

  for (
    let position = -55;
    position <= 55;
    position += spacing
  ) {
    if (
      Math.abs(position) <
      ROAD_TILE_SIZE / 2
    ) {
      continue;
    }

    const horizontalGeometry =
      new THREE.BoxGeometry(
        markingLength,
        0.025,
        markingWidth
      );

    horizontalGeometry.userData.chunkOwned =
      true;

    const horizontalMark =
      new THREE.Mesh(
        horizontalGeometry,
        material
      );

    horizontalMark.position.set(
      position,
      0.14,
      0
    );

    chunk.add(horizontalMark);

    const verticalGeometry =
      new THREE.BoxGeometry(
        markingWidth,
        0.025,
        markingLength
      );

    verticalGeometry.userData.chunkOwned =
      true;

    const verticalMark = new THREE.Mesh(
      verticalGeometry,
      material
    );

    verticalMark.position.set(
      0,
      0.14,
      position
    );

    chunk.add(verticalMark);
  }
}

async function spawnRoadModels(
  chunk: THREE.Group,
  random: RandomFunction
): Promise<void> {
  const jobs: Promise<
    THREE.Group | null
  >[] = [];

  const positions = [
    -45,
    -15,
    15,
    45,
  ];

  for (const position of positions) {
    /*
     * Horizontal street tiles.
     */
    jobs.push(
      spawnModel(
        pick(URBAN_STREETS, random),
        chunk,
        {
          x: position,
          y: 0.15,
          z: 0,
          rotationY: 0,
          targetSize: ROAD_MODEL_SIZE,
          maxHeight: 6,
          castShadow: false,
          receiveShadow: true,
        }
      )
    );

    /*
     * Vertical street tiles.
     */
    jobs.push(
      spawnModel(
        pick(URBAN_STREETS, random),
        chunk,
        {
          x: 0,
          y: 0.16,
          z: position,
          rotationY: Math.PI / 2,
          targetSize: ROAD_MODEL_SIZE,
          maxHeight: 6,
          castShadow: false,
          receiveShadow: true,
        }
      )
    );
  }

  await Promise.allSettled(jobs);
}

function getBuildingSlots(): BuildingSlot[] {
  return [
    /*
     * North-west block.
     */
    {
      x: -39,
      z: -39,
      rotationY: Math.PI,
    },
    {
      x: -20,
      z: -40,
      rotationY: Math.PI,
    },
    {
      x: -40,
      z: -20,
      rotationY: -Math.PI / 2,
    },

    /*
     * North-east block.
     */
    {
      x: 39,
      z: -39,
      rotationY: Math.PI,
    },
    {
      x: 20,
      z: -40,
      rotationY: Math.PI,
    },
    {
      x: 40,
      z: -20,
      rotationY: Math.PI / 2,
    },

    /*
     * South-west block.
     */
    {
      x: -39,
      z: 39,
      rotationY: 0,
    },
    {
      x: -20,
      z: 40,
      rotationY: 0,
    },
    {
      x: -40,
      z: 20,
      rotationY: -Math.PI / 2,
    },

    /*
     * South-east block.
     */
    {
      x: 39,
      z: 39,
      rotationY: 0,
    },
    {
      x: 20,
      z: 40,
      rotationY: 0,
    },
    {
      x: 40,
      z: 20,
      rotationY: Math.PI / 2,
    },
  ];
}

async function spawnBuildings(
  chunk: THREE.Group,
  random: RandomFunction
): Promise<void> {
  const slots = getBuildingSlots();

  const jobs: Promise<
    THREE.Group | null
  >[] = [];

  for (const slot of slots) {
    /*
     * Keep some empty lots so the city
     * does not look completely packed.
     */
    if (random() < 0.12) {
      continue;
    }

    const definition = pick(
      URBAN_BUILDINGS,
      random
    );

    const targetSize = isVilla(definition)
      ? VILLA_SIZE
      : BUILDING_SIZE;

    jobs.push(
      spawnModel(
        definition,
        chunk,
        {
          x: slot.x,
          y: 0.1,
          z: slot.z,
          rotationY:
            slot.rotationY +
            (random() - 0.5) * 0.06,
          targetSize,
          maxHeight: isVilla(definition)
            ? 15
            : 30,
          castShadow: true,
          receiveShadow: true,
        }
      )
    );
  }

  await Promise.allSettled(jobs);
}

async function spawnAlleys(
  chunk: THREE.Group,
  random: RandomFunction
): Promise<void> {
  if (URBAN_ALLEYS.length === 0) {
    return;
  }

  const alleyPositions = [
    {
      x: -30,
      z: -30,
      rotationY: 0,
    },
    {
      x: 30,
      z: -30,
      rotationY: Math.PI / 2,
    },
    {
      x: -30,
      z: 30,
      rotationY: Math.PI / 2,
    },
    {
      x: 30,
      z: 30,
      rotationY: 0,
    },
  ];

  const jobs: Promise<
    THREE.Group | null
  >[] = [];

  for (const alley of alleyPositions) {
    if (random() > 0.65) {
      continue;
    }

    jobs.push(
      spawnModel(
        pick(URBAN_ALLEYS, random),
        chunk,
        {
          x: alley.x,
          y: 0.12,
          z: alley.z,
          rotationY: alley.rotationY,
          targetSize: ALLEY_SIZE,
          maxHeight: 5,
          castShadow: false,
          receiveShadow: true,
        }
      )
    );
  }

  await Promise.allSettled(jobs);
}

async function spawnVehicles(
  chunk: THREE.Group,
  random: RandomFunction
): Promise<void> {
  const horizontalPositions = [
    -48,
    -24,
    24,
    48,
  ];

  const verticalPositions = [
    -48,
    -24,
    24,
    48,
  ];

  const jobs: Promise<
    THREE.Group | null
  >[] = [];

  for (const x of horizontalPositions) {
    if (random() > 0.42) {
      continue;
    }

    const direction =
      random() < 0.5 ? 0 : Math.PI;

    const laneZ =
      direction === 0 ? -4 : 4;

    jobs.push(
      spawnModel(
        pick(URBAN_VEHICLES, random),
        chunk,
        {
          x,
          y: 0.2,
          z: laneZ,
          rotationY: direction,
          targetSize: VEHICLE_SIZE,
          maxHeight: 3.5,
          castShadow: true,
          receiveShadow: true,
        }
      )
    );
  }

  for (const z of verticalPositions) {
    if (random() > 0.42) {
      continue;
    }

    const direction =
      random() < 0.5
        ? Math.PI / 2
        : -Math.PI / 2;

    const laneX =
      direction > 0 ? 4 : -4;

    jobs.push(
      spawnModel(
        pick(URBAN_VEHICLES, random),
        chunk,
        {
          x: laneX,
          y: 0.2,
          z,
          rotationY: direction,
          targetSize: VEHICLE_SIZE,
          maxHeight: 3.5,
          castShadow: true,
          receiveShadow: true,
        }
      )
    );
  }

  await Promise.allSettled(jobs);
}

export async function generateCity(
  chunk: THREE.Group,
  chunkX: number,
  chunkZ: number
): Promise<void> {
  const random = createRandom(
    chunkX,
    chunkZ
  );

  /*
   * Procedural road underneath guarantees that
   * streets always connect, even if a GLB fails.
   */
  createRoadBase(chunk);
  createRoadMarkings(chunk);

  await Promise.all([
    spawnRoadModels(chunk, random),
    spawnBuildings(chunk, random),
    spawnAlleys(chunk, random),
    spawnVehicles(chunk, random),
  ]);
}
