import * as THREE from "three";

import {
  URBAN_STREETS,
  URBAN_ALLEYS,
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

import { spawnModel } from "./AssetLoader";

export type ChunkBiome =
  | "urban"
  | "forest"
  | "mixed";

type RoadCell = {
  x: number;
  z: number;
  rotation: number;
};

type RandomFunction = () => number;

function createSeededRandom(
  cx: number,
  cz: number
): RandomFunction {
  let seed =
    Math.imul(cx + 100000, 374761393) ^
    Math.imul(cz + 100000, 668265263);

  seed = seed >>> 0;

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

function randomRange(
  random: RandomFunction,
  min: number,
  max: number
): number {
  return min + random() * (max - min);
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

async function buildRoadGrid(
  chunk: THREE.Group,
  chunkSize: number,
  random: RandomFunction
): Promise<RoadCell[]> {
  const gridSize = 4;
  const cellSize = chunkSize / gridSize;

  const roadCells: RoadCell[] = [];
  const jobs: Promise<THREE.Object3D | null>[] =
    [];

  for (
    let gridX = 0;
    gridX < gridSize;
    gridX++
  ) {
    for (
      let gridZ = 0;
      gridZ < gridSize;
      gridZ++
    ) {
      const x =
        gridX * cellSize -
        chunkSize / 2 +
        cellSize / 2;

      const z =
        gridZ * cellSize -
        chunkSize / 2 +
        cellSize / 2;

      const isMainRow =
        gridZ === 1 || gridZ === 2;

      const isMainColumn =
        gridX === 1 || gridX === 2;

      if (!isMainRow && !isMainColumn) {
        continue;
      }

      const rotation =
        isMainRow && !isMainColumn
          ? 0
          : Math.PI / 2;

      const useAlley =
        random() < 0.18 &&
        URBAN_ALLEYS.length > 0;

      const definition = useAlley
        ? pick(URBAN_ALLEYS, random)
        : pick(URBAN_STREETS, random);

      roadCells.push({
        x,
        z,
        rotation,
      });

      jobs.push(
        spawnModel(
          definition,
          chunk,
          x,
          z,
          rotation
        )
      );
    }
  }

  await Promise.allSettled(jobs);

  return roadCells;
}

async function spawnBuildings(
  chunk: THREE.Group,
  roadCells: RoadCell[],
  random: RandomFunction
): Promise<void> {
  const offset = 22;

  const jobs: Promise<
    THREE.Object3D | null
  >[] = [];

  for (const cell of roadCells) {
    if (random() >= 0.72) {
      continue;
    }

    const building = pick(
      URBAN_BUILDINGS,
      random
    );

    const side = Math.floor(
      random() * 4
    );

    let x = cell.x;
    let z = cell.z;
    let rotation = 0;

    if (side === 0) {
      x += offset;
      rotation = -Math.PI / 2;
    } else if (side === 1) {
      x -= offset;
      rotation = Math.PI / 2;
    } else if (side === 2) {
      z += offset;
      rotation = Math.PI;
    } else {
      z -= offset;
      rotation = 0;
    }

    rotation += randomRange(
      random,
      -0.08,
      0.08
    );

    jobs.push(
      spawnModel(
        building,
        chunk,
        x,
        z,
        rotation
      )
    );
  }

  await Promise.allSettled(jobs);
}

async function spawnVehicles(
  chunk: THREE.Group,
  roadCells: RoadCell[],
  random: RandomFunction
): Promise<void> {
  const jobs: Promise<
    THREE.Object3D | null
  >[] = [];

  for (const cell of roadCells) {
    if (random() >= 0.35) {
      continue;
    }

    const vehicle = pick(
      URBAN_VEHICLES,
      random
    );

    const laneOffset =
      random() < 0.5 ? -2.2 : 2.2;

    const isHorizontal =
      Math.abs(cell.rotation) < 0.01;

    const x = isHorizontal
      ? cell.x
      : cell.x + laneOffset;

    const z = isHorizontal
      ? cell.z + laneOffset
      : cell.z;

    let rotation = cell.rotation;

    if (random() < 0.5) {
      rotation += Math.PI;
    }

    jobs.push(
      spawnModel(
        vehicle,
        chunk,
        x,
        z,
        rotation,
        0.1
      )
    );
  }

  await Promise.allSettled(jobs);
}

async function spawnTunnel(
  chunk: THREE.Group,
  chunkSize: number,
  random: RandomFunction
): Promise<void> {
  if (random() >= 0.22) {
    return;
  }

  const tunnel = pick(
    URBAN_TUNNEL,
    random
  );

  await spawnModel(
    tunnel,
    chunk,
    chunkSize / 2 - 26,
    chunkSize / 2 - 26,
    random() < 0.5
      ? 0
      : Math.PI / 2
  );
}

async function spawnRiverAndBridge(
  chunk: THREE.Group,
  chunkSize: number,
  random: RandomFunction
): Promise<void> {
  if (random() >= 0.2) {
    return;
  }

  const riverZ =
    -chunkSize / 2 + 18;

  const river = pick(
    URBAN_RIVER,
    random
  );

  await spawnModel(
    river,
    chunk,
    0,
    riverZ,
    0,
    0.02
  );

  if (random() < 0.75) {
    const bridge = pick(
      URBAN_BRIDGES,
      random
    );

    await spawnModel(
      bridge,
      chunk,
      0,
      riverZ,
      Math.PI / 2,
      0.05
    );
  }
}

async function scatterModels(
  chunk: THREE.Group,
  urls: string[],
  count: number,
  chunkSize: number,
  scaleMin: number,
  scaleMax: number,
  random: RandomFunction
): Promise<void> {
  const jobs: Promise<
    THREE.Object3D | null
  >[] = [];

  const padding = 5;

  for (let index = 0; index < count; index++) {
    const x = randomRange(
      random,
      -chunkSize / 2 + padding,
      chunkSize / 2 - padding
    );

    const z = randomRange(
      random,
      -chunkSize / 2 + padding,
      chunkSize / 2 - padding
    );

    const scale = randomRange(
      random,
      scaleMin,
      scaleMax
    );

    jobs.push(
      spawnModel(
        modelFromUrl(
          pick(urls, random),
          scale
        ),
        chunk,
        x,
        z,
        random() * Math.PI * 2
      )
    );
  }

  await Promise.allSettled(jobs);
}

async function spawnUrban(
  chunk: THREE.Group,
  chunkSize: number,
  random: RandomFunction
): Promise<void> {
  const roads = await buildRoadGrid(
    chunk,
    chunkSize,
    random
  );

  await Promise.all([
    spawnBuildings(
      chunk,
      roads,
      random
    ),

    spawnVehicles(
      chunk,
      roads,
      random
    ),

    spawnTunnel(
      chunk,
      chunkSize,
      random
    ),

    spawnRiverAndBridge(
      chunk,
      chunkSize,
      random
    ),
  ]);
}

async function spawnForest(
  chunk: THREE.Group,
  chunkSize: number,
  random: RandomFunction,
  density = 1
): Promise<void> {
  await Promise.all([
    scatterModels(
      chunk,
      FOREST_TREES,
      Math.round(10 * density),
      chunkSize,
      2.7,
      3.4,
      random
    ),

    scatterModels(
      chunk,
      FOREST_BUSHES,
      Math.round(8 * density),
      chunkSize,
      1.6,
      2.2,
      random
    ),

    scatterModels(
      chunk,
      FOREST_GRASS,
      Math.round(12 * density),
      chunkSize,
      1.1,
      1.6,
      random
    ),

    scatterModels(
      chunk,
      FOREST_FLOWERS,
      Math.round(8 * density),
      chunkSize,
      0.9,
      1.3,
      random
    ),
  ]);
}

export function getChunkBiome(
  cx: number,
  cz: number
): ChunkBiome {
  if (cx === 0 && cz === 0) {
    return "urban";
  }

  const random = createSeededRandom(
    cx,
    cz
  );

  const value = random();

  if (value < 0.6) {
    return "urban";
  }

  if (value < 0.85) {
    return "mixed";
  }

  return "forest";
}

export async function generateChunkContent(
  chunk: THREE.Group,
  chunkSize: number,
  cx: number,
  cz: number
): Promise<void> {
  const biome = getChunkBiome(cx, cz);

  chunk.userData.biome = biome;

  const random = createSeededRandom(
    cx,
    cz
  );

  if (biome === "urban") {
    await spawnUrban(
      chunk,
      chunkSize,
      random
    );

    return;
  }

  if (biome === "forest") {
    await spawnForest(
      chunk,
      chunkSize,
      random,
      1
    );

    return;
  }

  await Promise.all([
    spawnUrban(
      chunk,
      chunkSize,
      random
    ),

    spawnForest(
      chunk,
      chunkSize,
      random,
      0.35
    ),
  ]);
    }
