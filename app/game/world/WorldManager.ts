import * as THREE from "three";

import {
  CITY_CHUNK_SIZE,
  generateCity,
} from "./CityGenerator";

export const CHUNK_SIZE = CITY_CHUNK_SIZE;
export const RENDER_DISTANCE = 1;

export const chunks = new Map<string, THREE.Group>();

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
    cx: Math.floor(x / CHUNK_SIZE),
    cz: Math.floor(z / CHUNK_SIZE),
  };
}

function createGround(): THREE.Mesh {
  const geometry = new THREE.PlaneGeometry(
    CHUNK_SIZE,
    CHUNK_SIZE
  );

  geometry.userData.chunkOwned = true;

  const material =
    new THREE.MeshStandardMaterial({
      color: 0x202321,
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

    const geometry = object.geometry;

    if (
      geometry?.userData.chunkOwned &&
      !geometries.has(geometry)
    ) {
      geometries.add(geometry);
      geometry.dispose();
    }

    const objectMaterials = Array.isArray(
      object.material
    )
      ? object.material
      : [object.material];

    for (const material of objectMaterials) {
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
  const key = getChunkKey(
    chunkX,
    chunkZ
  );

  if (chunks.has(key)) {
    const activeJob =
      generatingChunks.get(key);

    if (activeJob) {
      await activeJob;
    }

    return;
  }

  const existingJob =
    generatingChunks.get(key);

  if (existingJob) {
    await existingJob;
    return;
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

    chunk.add(createGround());

    try {
      const result = await generateCity(
        chunk,
        chunkX,
        chunkZ
      );

      if (chunk.userData.destroyed) {
        return;
      }

      chunkColliders.set(
        key,
        result.colliders
      );
    } catch (error) {
      console.error(
        `Failed to generate chunk ${key}:`,
        error
      );
    } finally {
      generatingChunks.delete(key);
    }
  })();

  generatingChunks.set(key, job);

  await job;
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

    const far =
      Math.abs(chunkX - cx) >
        RENDER_DISTANCE ||
      Math.abs(chunkZ - cz) >
        RENDER_DISTANCE;

    if (!far) {
      continue;
    }

    chunk.userData.destroyed = true;

    chunkColliders.delete(key);

    disposeChunkResources(chunk);

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
  const closestX = Math.max(
    box.min.x,
    Math.min(x, box.max.x)
  );

  const closestZ = Math.max(
    box.min.z,
    Math.min(z, box.max.z)
  );

  const deltaX = x - closestX;
  const deltaZ = z - closestZ;

  return (
    deltaX * deltaX +
      deltaZ * deltaZ <
    radius * radius
  );
}

export function collidesWithWorld(
  x: number,
  z: number,
  radius = 0.7
): boolean {
  for (const colliders of chunkColliders.values()) {
    for (const collider of colliders) {
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
  radius = 0.7
): void {
  const nextX = player.position.x;
  const nextZ = player.position.z;

  if (
    collidesWithWorld(
      nextX,
      previousZ,
      radius
    )
  ) {
    player.position.x = previousX;
  }

  if (
    collidesWithWorld(
      player.position.x,
      nextZ,
      radius
    )
  ) {
    player.position.z = previousZ;
  }

  if (
    collidesWithWorld(
      player.position.x,
      player.position.z,
      radius
    )
  ) {
    player.position.x = previousX;
    player.position.z = previousZ;
  }
}

/*
 * این تابع فقط نقاطی را بررسی می‌کند که روی
 * خیابان‌های اصلی شهر قرار دارند.
 */
export function findSafeSpawnPosition(
  chunkX = 0,
  chunkZ = 0,
  playerRadius = 0.9
): THREE.Vector3 {
  const originX =
    chunkX * CHUNK_SIZE;

  const originZ =
    chunkZ * CHUNK_SIZE;

  /*
   * خیابان‌های شهر در x = -30 و x = 30
   * و همچنین z = -30 و z = 30 قرار دارند.
   *
   * این نقاط وسط خیابان‌ها هستند و از محل
   * ساختمان‌ها فاصله دارند.
   */
  const streetCandidates = [
    { x: 0, z: -30 },
    { x: 0, z: 30 },
    { x: -30, z: 0 },
    { x: 30, z: 0 },

    { x: -15, z: -30 },
    { x: 15, z: -30 },
    { x: -15, z: 30 },
    { x: 15, z: 30 },

    { x: -30, z: -15 },
    { x: -30, z: 15 },
    { x: 30, z: -15 },
    { x: 30, z: 15 },

    { x: -45, z: -30 },
    { x: 45, z: -30 },
    { x: -45, z: 30 },
    { x: 45, z: 30 },

    { x: -30, z: -45 },
    { x: -30, z: 45 },
    { x: 30, z: -45 },
    { x: 30, z: 45 },
  ];

  for (const candidate of streetCandidates) {
    const worldX =
      originX + candidate.x;

    const worldZ =
      originZ + candidate.z;

    if (
      !collidesWithWorld(
        worldX,
        worldZ,
        playerRadius
      )
    ) {
      return new THREE.Vector3(
        worldX,
        0,
        worldZ
      );
    }
  }

  /*
   * اگر خودرو یا مدل دیگری تمام نقاط اولیه را
   * اشغال کرده باشد، در طول خیابان‌ها جست‌وجو می‌کند.
   */
  const roadLines = [-30, 30];

  for (const roadZ of roadLines) {
    for (
      let localX = -50;
      localX <= 50;
      localX += 5
    ) {
      const worldX =
        originX + localX;

      const worldZ =
        originZ + roadZ;

      if (
        !collidesWithWorld(
          worldX,
          worldZ,
          playerRadius
        )
      ) {
        return new THREE.Vector3(
          worldX,
          0,
          worldZ
        );
      }
    }
  }

  for (const roadX of roadLines) {
    for (
      let localZ = -50;
      localZ <= 50;
      localZ += 5
    ) {
      const worldX =
        originX + roadX;

      const worldZ =
        originZ + localZ;

      if (
        !collidesWithWorld(
          worldX,
          worldZ,
          playerRadius
        )
      ) {
        return new THREE.Vector3(
          worldX,
          0,
          worldZ
        );
      }
    }
  }

  /*
   * موقعیت اضطراری؛ وسط یکی از خیابان‌ها.
   */
  return new THREE.Vector3(
    originX,
    0,
    originZ - 30
  );
}

export function destroyAllChunks(): void {
  for (const [, chunk] of chunks) {
    chunk.userData.destroyed = true;

    disposeChunkResources(chunk);

    chunk.clear();
    chunk.removeFromParent();
  }

  chunks.clear();
  chunkColliders.clear();
  generatingChunks.clear();
  }
