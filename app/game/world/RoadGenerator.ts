import * as THREE from "three";

import {
  URBAN_STREETS,
  URBAN_BUILDINGS,
  URBAN_VEHICLES,
  URBAN_BRIDGES,
  URBAN_RIVER,
  URBAN_TUNNEL,
  ModelDef,
} from "../assets/Models";

import { spawnModel } from "./AssetLoader";

export const ROAD_GRID = 6;

const BUILDING_OFFSET = 13;

const CELL_SIZE = 20;

function random<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

type RoadCell = {
  x: number;
  z: number;
};

function gridPosition(
  gx: number,
  gz: number,
  chunkSize: number
) {
  return {
    x:
      gx * CELL_SIZE -
      chunkSize / 2 +
      CELL_SIZE / 2,

    z:
      gz * CELL_SIZE -
      chunkSize / 2 +
      CELL_SIZE / 2,
  };
}

async function place(
  group: THREE.Group,
  model: ModelDef,
  x: number,
  z: number,
  rot = 0
) {
  await spawnModel(
    group,
    model,
    new THREE.Vector3(x, 0, z),
    rot
  );
}

export async function buildRoadNetwork(
  group: THREE.Group,
  chunkSize: number
): Promise<RoadCell[]> {
  const roads: RoadCell[] = [];

  for (let gx = 0; gx < ROAD_GRID; gx++) {
    for (let gz = 0; gz < ROAD_GRID; gz++) {
      const pos = gridPosition(
        gx,
        gz,
        chunkSize
      );

      const horizontal =
        gz === 2 || gz === 3;

      const vertical =
        gx === 2 || gx === 3;

      if (!horizontal && !vertical)
        continue;

      roads.push(pos);

      await place(
        group,
        random(URBAN_STREETS),
        pos.x,
        pos.z,
        vertical && !horizontal
          ? Math.PI / 2
          : 0
      );
    }
  }

  return roads;
}

export async function spawnBuildings(
  group: THREE.Group,
  roads: RoadCell[]
) {
  for (const road of roads) {
    if (Math.random() > 0.85)
      continue;

    const side = Math.floor(
      Math.random() * 4
    );

    let x = road.x;
    let z = road.z;

    switch (side) {
      case 0:
        x += BUILDING_OFFSET;
        break;

      case 1:
        x -= BUILDING_OFFSET;
        break;

      case 2:
        z += BUILDING_OFFSET;
        break;

      default:
        z -= BUILDING_OFFSET;
    }

    await place(
      group,
      random(URBAN_BUILDINGS),
      x,
      z,
      Math.random() * Math.PI * 2
    );
  }
}

export async function spawnVehicles(
  group: THREE.Group,
  roads: RoadCell[]
) {
  for (const road of roads) {
    if (Math.random() > 0.45)
      continue;

    await place(
      group,
      random(URBAN_VEHICLES),
      road.x,
      road.z,
      Math.random() < 0.5
        ? 0
        : Math.PI / 2
    );
  }
}

export async function spawnRiver(
  group: THREE.Group,
  chunkSize: number
) {
  if (Math.random() > 0.25)
    return;

  const z =
    -chunkSize / 2 + 18;

  await place(
    group,
    random(URBAN_RIVER),
    0,
    z
  );

  if (Math.random() < 0.8) {
    await place(
      group,
      random(URBAN_BRIDGES),
      0,
      z,
      Math.PI / 2
    );
  }
}

export async function spawnTunnel(
  group: THREE.Group,
  chunkSize: number
) {
  if (Math.random() > 0.3)
    return;

  await place(
    group,
    random(URBAN_TUNNEL),
    chunkSize / 2 - 18,
    chunkSize / 2 - 18
  );
}

export async function generateRoadChunk(
  group: THREE.Group,
  chunkSize: number
) {
  const roads =
    await buildRoadNetwork(
      group,
      chunkSize
    );

  await spawnBuildings(
    group,
    roads
  );

  await spawnVehicles(
    group,
    roads
  );

  await spawnRiver(
    group,
    chunkSize
  );

  await spawnTunnel(
    group,
    chunkSize
  );
}
