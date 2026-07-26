import * as THREE from "three";

import { generateRoadChunk } from "./RoadGenerator";
import { generateNatureChunk } from "./NatureGenerator";

export enum ChunkBiome {
  CITY = "city",
  FOREST = "forest",
  MIXED = "mixed",
}

function hash(x: number, z: number) {
  let h = x * 374761393 + z * 668265263;
  h = (h ^ (h >> 13)) * 1274126177;
  return (h ^ (h >> 16)) >>> 0;
}

function randomFromHash(x: number, z: number) {
  return hash(x, z) / 4294967295;
}

export function getChunkBiome(
  cx: number,
  cz: number
): ChunkBiome {
  if (cx === 0 && cz === 0) {
    return ChunkBiome.CITY;
  }

  const r = randomFromHash(cx, cz);

  if (r < 0.45) {
    return ChunkBiome.CITY;
  }

  if (r < 0.75) {
    return ChunkBiome.MIXED;
  }

  return ChunkBiome.FOREST;
}

async function generateCity(
  chunk: THREE.Group,
  chunkSize: number
) {
  await generateRoadChunk(
    chunk,
    chunkSize
  );
}

async function generateForest(
  chunk: THREE.Group,
  chunkSize: number
) {
  await generateNatureChunk(
    chunk,
    chunkSize
  );
}

async function generateMixed(
  chunk: THREE.Group,
  chunkSize: number
) {
  await Promise.all([
    generateRoadChunk(
      chunk,
      chunkSize
    ),
    generateNatureChunk(
      chunk,
      chunkSize
    ),
  ]);
}

export async function generateChunkContent(
  chunk: THREE.Group,
  chunkSize: number,
  cx: number,
  cz: number
) {
  const biome = getChunkBiome(
    cx,
    cz
  );

  switch (biome) {
    case ChunkBiome.CITY:
      await generateCity(
        chunk,
        chunkSize
      );
      break;

    case ChunkBiome.FOREST:
      await generateForest(
        chunk,
        chunkSize
      );
      break;

    case ChunkBiome.MIXED:
      await generateMixed(
        chunk,
        chunkSize
      );
      break;
  }
}
