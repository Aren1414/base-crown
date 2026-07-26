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

const chunkColliders = new Map<
  string,
  THREE.Box3[]
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
    cx: Math.floor(
      x / CHUNK_SIZE
    ),

    cz: Math.floor(
      z / CHUNK_SIZE
    ),
  };
}

function createGround(): THREE.Mesh {
  const geometry =
    new THREE.PlaneGeometry(
      CHUNK_SIZE,
      CHUNK_SIZE
    );

  geometry.userData.chunkOwned =
    true;

  const material =
    new THREE.MeshStandardMaterial({
      color: 0x202321,
      roughness: 1,
      metalness: 0,
    });

  material.userData.chunkOwned =
    true;

  const ground =
    new THREE.Mesh(
      geometry,
      material
    );

  ground.name = "ChunkGround";

  ground.rotation.x =
    -Math.PI / 2;

  ground.position.y = -0.04;

  ground.receiveShadow = true;

  return ground;
}

function disposeChunkResources(
  chunk: THREE.Group
): void {
  const geometries =
    new Set<THREE.BufferGeometry>();

  const materials =
    new Set<THREE.Material>();

  chunk.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) {
      return;
    }

    const geometry =
      object.geometry;

    if (
      geometry?.userData.chunkOwned &&
      !geometries.has(geometry)
    ) {
      geometries.add(geometry);
      geometry.dispose();
    }

    const objectMaterials =
      Array.isArray(object.material)
        ? object.material
        : [object.material];

    for (
      const material
      of objectMaterials
    ) {
      if (
        material?.userData.chunkOwned &&
        !materials.has(material)
      ) {
        materials.add(material);
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
  const key =
    getChunkKey(
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
    const chunk =
      new THREE.Group();

    chunk.name =
      `CityChunk_${key}`;

    chunk.position.set(
      chunkX * CHUNK_SIZE,
      0,
      chunkZ * CHUNK_SIZE
    );

    chunk.userData.destroyed =
      false;

    chunks.set(key, chunk);

    scene.add(chunk);

    chunk.add(
      createGround()
    );

    try {
      const result =
        await generateCity(
          chunk,
          chunkX,
          chunkZ
        );

      if (
        chunk.userData.destroyed
      ) {
        return;
      }

      chunkColliders.set(
        key,
        result.colliders
      );
    } catch (error) {
      console.error(
        `Failed to generate chunk ${key}`,
        error
      );
    } finally {
      generatingChunks.delete(key);
    }
  })();

  generatingChunks.set(
    key,
    job
  );

  return job;
}

export async function updateChunks(
  scene: THREE.Scene,
  playerX: number,
  playerZ: number
): Promise<void> {
  const { cx, cz } =
    getChunkCoord(
      playerX,
      playerZ
    );

  const jobs:
    Promise<void>[] = [];

  for (
    let x =
      cx - RENDER_DISTANCE;
    x <=
      cx + RENDER_DISTANCE;
    x++
  ) {
    for (
      let z =
        cz - RENDER_DISTANCE;
      z <=
        cz + RENDER_DISTANCE;
      z++
    ) {
      jobs.push(
        generateChunk(
          scene,
          x,
          z
        )
      );
    }
  }

  await Promise.allSettled(
    jobs
  );

  destroyFarChunks(
    playerX,
    playerZ
  );
}

export function destroyFarChunks(
  playerX: number,
  playerZ: number
): void {
  const { cx, cz } =
    getChunkCoord(
      playerX,
      playerZ
    );

  for (
    const [key, chunk]
    of chunks
  ) {
    const [
      chunkX,
      chunkZ,
    ] = key
      .split(",")
      .map(Number);

    const far =
      Math.abs(
        chunkX - cx
      ) > RENDER_DISTANCE ||
      Math.abs(
        chunkZ - cz
      ) > RENDER_DISTANCE;

    if (!far) {
      continue;
    }

    chunk.userData.destroyed =
      true;

    chunkColliders.delete(
      key
    );

    disposeChunkResources(
      chunk
    );

    chunk.clear();
    chunk.removeFromParent();

    chunks.delete(key);
  }
}

function circleIntersectsBox(
  x: number,
  z: number,
  radius: number,
  box: THREE.Box3
): boolean {
  const closestX =
    Math.max(
      box.min.x,
      Math.min(
        x,
        box.max.x
      )
    );

  const closestZ =
    Math.max(
      box.min.z,
      Math.min(
        z,
        box.max.z
      )
    );

  const deltaX =
    x - closestX;

  const deltaZ =
    z - closestZ;

  return (
    deltaX * deltaX +
      deltaZ * deltaZ <
    radius * radius
  );
}

export function collidesWithWorld(
  x: number,
  z: number,
  radius = 0.65
): boolean {
  for (
    const colliders
    of chunkColliders.values()
  ) {
    for (
      const collider
      of colliders
    ) {
      if (
        circleIntersectsBox(
          x,
          z,
          radius,
          collider
        )
      ) {
        return true;
      }
    }
  }

  return false;
}

export function resolveWorldCollision(
  player: THREE.Object3D,
  previousX: number,
  previousZ: number,
  radius = 0.65
): void {
  const nextX =
    player.position.x;

  const nextZ =
    player.position.z;

  /*
   * First test horizontal movement.
   */
  if (
    collidesWithWorld(
      nextX,
      previousZ,
      radius
    )
  ) {
    player.position.x =
      previousX;
  }

  /*
   * Then test vertical movement.
   * This allows the player to slide along walls.
   */
  if (
    collidesWithWorld(
      player.position.x,
      nextZ,
      radius
    )
  ) {
    player.position.z =
      previousZ;
  }

  /*
   * Final safety check.
   */
  if (
    collidesWithWorld(
      player.position.x,
      player.position.z,
      radius
    )
  ) {
    player.position.x =
      previousX;

    player.position.z =
      previousZ;
  }
}

export function destroyAllChunks(): void {
  for (
    const [, chunk]
    of chunks
  ) {
    chunk.userData.destroyed =
      true;

    disposeChunkResources(
      chunk
    );

    chunk.clear();
    chunk.removeFromParent();
  }

  chunks.clear();
  chunkColliders.clear();
  generatingChunks.clear();
                 }
