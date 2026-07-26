import * as THREE from "three";

import {
  CITY_CHUNK_SIZE,
  generateCity,
} from "./CityGenerator";

export const CHUNK_SIZE =
  CITY_CHUNK_SIZE;

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
  chunkX: number,
  chunkZ: number
): string {
  return `${chunkX},${chunkZ}`;
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

function createChunkGround(): THREE.Mesh {
  const geometry =
    new THREE.PlaneGeometry(
      CHUNK_SIZE,
      CHUNK_SIZE
    );

  geometry.userData.chunkOwned = true;

  const material =
    new THREE.MeshStandardMaterial({
      color: 0x303332,
      roughness: 1,
      metalness: 0,
    });

  material.userData.chunkOwned = true;

  const ground = new THREE.Mesh(
    geometry,
    material
  );

  ground.name = "ChunkGround";

  ground.rotation.x = -Math.PI / 2;
  ground.position.y = 0;

  ground.receiveShadow = true;

  return ground;
}

function disposeChunkResources(
  chunk: THREE.Group
): void {
  const disposedGeometries =
    new Set<THREE.BufferGeometry>();

  const disposedMaterials =
    new Set<THREE.Material>();

  chunk.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) {
      return;
    }

    const geometry = object.geometry;

    /*
     * Only procedural resources owned by the chunk
     * are disposed. Cached GLTF resources are shared.
     */
    if (
      geometry?.userData.chunkOwned &&
      !disposedGeometries.has(geometry)
    ) {
      disposedGeometries.add(geometry);
      geometry.dispose();
    }

    const materials = Array.isArray(
      object.material
    )
      ? object.material
      : [object.material];

    for (const material of materials) {
      if (
        material?.userData.chunkOwned &&
        !disposedMaterials.has(material)
      ) {
        disposedMaterials.add(material);
        material.dispose();
      }
    }
  });
}

export async function generateChunk(
  scene: THREE.Scene,
  chunkX: number,
  chunkZ: number
): Promise<void> {
  const key = getChunkKey(
    chunkX,
    chunkZ
  );

  if (chunks.has(key)) {
    return;
  }

  const existingJob =
    generatingChunks.get(key);

  if (existingJob) {
    return existingJob;
  }

  const job = (async () => {
    const chunk = new THREE.Group();

    chunk.name = `CityChunk_${key}`;

    chunk.position.set(
      chunkX * CHUNK_SIZE,
      0,
      chunkZ * CHUNK_SIZE
    );

    chunk.userData.destroyed = false;

    chunks.set(key, chunk);
    scene.add(chunk);

    chunk.add(createChunkGround());

    try {
      await generateCity(
        chunk,
        chunkX,
        chunkZ
      );
    } catch (error) {
      console.error(
        `Failed to generate city chunk ${key}`,
        error
      );
    } finally {
      generatingChunks.delete(key);
    }
  })();

  generatingChunks.set(key, job);

  return job;
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

    disposeChunkResources(chunk);

    chunk.clear();
    chunk.removeFromParent();

    chunks.delete(key);
  }
}

export function destroyAllChunks(): void {
  for (const [, chunk] of chunks) {
    chunk.userData.destroyed = true;

    disposeChunkResources(chunk);

    chunk.clear();
    chunk.removeFromParent();
  }

  chunks.clear();
  generatingChunks.clear();
        }
