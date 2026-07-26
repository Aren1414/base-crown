import * as THREE from "three";

import {
  FOREST_TREES,
  FOREST_BUSHES,
  FOREST_GRASS,
  FOREST_FLOWERS,
} from "../assets/Models";

import { spawnSimple } from "./AssetLoader";

function random<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

async function scatterObjects(
  group: THREE.Group,
  urls: string[],
  count: number,
  chunkSize: number,
  scaleMin: number,
  scaleMax: number
) {
  const jobs: Promise<any>[] = [];

  for (let i = 0; i < count; i++) {
    const x = rand(-chunkSize / 2, chunkSize / 2);
    const z = rand(-chunkSize / 2, chunkSize / 2);

    const scale = rand(scaleMin, scaleMax);

    jobs.push(
      spawnSimple(
        group,
        random(urls),
        scale,
        x,
        z,
        Math.random() * Math.PI * 2
      )
    );
  }

  await Promise.all(jobs);
}

export async function spawnTrees(
  group: THREE.Group,
  chunkSize: number
) {
  await scatterObjects(
    group,
    FOREST_TREES,
    18,
    chunkSize,
    2.6,
    3.8
  );
}

export async function spawnBushes(
  group: THREE.Group,
  chunkSize: number
) {
  await scatterObjects(
    group,
    FOREST_BUSHES,
    20,
    chunkSize,
    1.2,
    2.2
  );
}

export async function spawnGrass(
  group: THREE.Group,
  chunkSize: number
) {
  await scatterObjects(
    group,
    FOREST_GRASS,
    40,
    chunkSize,
    0.8,
    1.6
  );
}

export async function spawnFlowers(
  group: THREE.Group,
  chunkSize: number
) {
  await scatterObjects(
    group,
    FOREST_FLOWERS,
    22,
    chunkSize,
    0.8,
    1.3
  );
}

export async function generateNatureChunk(
  group: THREE.Group,
  chunkSize: number
) {
  await Promise.all([
    spawnTrees(group, chunkSize),
    spawnBushes(group, chunkSize),
    spawnGrass(group, chunkSize),
    spawnFlowers(group, chunkSize),
  ]);
}
