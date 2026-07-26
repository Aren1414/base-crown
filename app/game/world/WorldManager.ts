import * as THREE from "three";

import {
  generateChunkContent,
  type ChunkBiome,
} from "./WorldGenerator";

export const CHUNK_SIZE = 120;

export const RENDER_DISTANCE = 1;

export const chunks = new Map<
  string,
  THREE.Group
>();

const generatingChunks = new Map<
  string,
  Promise<void>
>();

function getChunkKey(
  cx: number,
  cz: number
): string {
  return `${cx},${cz}`;
}

export function getChunkCoord(
  x: number,
  z: number
): {
  cx: number;
  cz: number;
} {
  return {
    cx: Math.floor(x / CHUNK_SIZE),
    cz: Math.floor(z / CHUNK_SIZE),
  };
}

function createGround(
  biome: ChunkBiome
): THREE.Mesh {
  let color = 0x444444;

  if (biome === "forest") {
    color = 0x344536;
  } else if (biome === "mixed") {
    color = 0x3e463d;
  }

  const geometry =
    new THREE.PlaneGeometry(
      CHUNK_SIZE,
      CHUNK_SIZE
    );

  const material =
    new THREE.MeshStandardMaterial({
      color,
      roughness: 1,
      metalness: 0,
    });

  const ground = new THREE.Mesh(
    geometry,
    material
  );

  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;

  ground.name = "ChunkGround";
  ground.userData.ownedResource = true;

  return ground;
}

function disposeChunkGround(
  chunk: THREE.Group
): void {
  const ground = chunk.getObjectByName(
    "ChunkGround"
  );

  if (!(ground instanceof THREE.Mesh)) {
    return;
  }

  ground.geometry.dispose();

  if (Array.isArray(ground.material)) {
    for (const material of ground.material) {
      material.dispose();
    }
  } else {
    ground.material.dispose();
  }
}

export async function generateChunk(
  scene: THREE.Scene,
  cx: number,
  cz: number
): Promise<void> {
  const key = getChunkKey(cx, cz);

  if (chunks.has(key)) {
    return;
  }

  const existingJob =
    generatingChunks.get(key);

  if (existingJob) {
    return existingJob;
  }

  const generationJob = (async () => {
    const chunk = new THREE.Group();

    chunk.name = `Chunk_${key}`;

    chunk.position.set(
      cx * CHUNK_SIZE,
      0,
      cz * CHUNK_SIZE
    );

    chunk.userData.destroyed = false;

    /*
     * The chunk is registered before models load.
     * This prevents duplicate chunk generation.
     */
    chunks.set(key, chunk);
    scene.add(chunk);

    try {
      const {
        getChunkBiome,
      } = await import("./WorldGenerator");

      const biome = getChunkBiome(cx, cz);

      chunk.add(
        createGround(biome)
      );

      await generateChunkContent(
        chunk,
        CHUNK_SIZE,
        cx,
        cz
      );
    } catch (error) {
      console.error(
        `Failed to generate chunk ${key}`,
        error
      );

      chunk.userData.destroyed = true;

      disposeChunkGround(chunk);
      chunk.clear();
      chunk.removeFromParent();

      chunks.delete(key);
    } finally {
      generatingChunks.delete(key);
    }
  })();

  generatingChunks.set(
    key,
    generationJob
  );

  return generationJob;
}

export async function updateChunks(
  scene: THREE.Scene,
  playerX: number,
  playerZ: number
): Promise<void> {
  const { cx, cz } = getChunkCoord(
    playerX,
    playerZ
  );

  const jobs: Promise<void>[] = [];

  for (
    let x = cx - RENDER_DISTANCE;
    x <= cx + RENDER_DISTANCE;
    x++
  ) {
    for (
      let z = cz - RENDER_DISTANCE;
      z <= cz + RENDER_DISTANCE;
      z++
    ) {
      jobs.push(
        generateChunk(scene, x, z)
      );
    }
  }

  await Promise.allSettled(jobs);

  destroyFarChunks(
    playerX,
    playerZ
  );
}

export function destroyFarChunks(
  playerX: number,
  playerZ: number
): void {
  const { cx, cz } = getChunkCoord(
    playerX,
    playerZ
  );

  for (const [key, chunk] of chunks) {
    const [chunkX, chunkZ] = key
      .split(",")
      .map(Number);

    const isFar =
      Math.abs(chunkX - cx) >
        RENDER_DISTANCE ||
      Math.abs(chunkZ - cz) >
        RENDER_DISTANCE;

    if (!isFar) {
      continue;
    }

    chunk.userData.destroyed = true;

    disposeChunkGround(chunk);

    chunk.clear();
    chunk.removeFromParent();

    chunks.delete(key);
  }
}

export function destroyAllChunks(): void {
  for (const [, chunk] of chunks) {
    chunk.userData.destroyed = true;

    disposeChunkGround(chunk);

    chunk.clear();
    chunk.removeFromParent();
  }

  chunks.clear();
  generatingChunks.clear();
}
