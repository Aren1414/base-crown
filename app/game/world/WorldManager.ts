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

const chunkOccluders = new Map<
  string,
  THREE.Mesh[]
>();

const generatingChunks = new Map<
  string,
  Promise<void>
>();

const raycaster =
  new THREE.Raycaster();

const cameraDirection =
  new THREE.Vector3();

const cameraRayOrigin =
  new THREE.Vector3();

const fadedMaterials =
  new Set<THREE.Material>();

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
      color: 0x252825,
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

  ground.name =
    "ChunkGround";

  ground.rotation.x =
    -Math.PI / 2;

  ground.position.y = -0.06;

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

    if (
      object.geometry
        ?.userData
        .chunkOwned &&
      !geometries.has(
        object.geometry
      )
    ) {
      geometries.add(
        object.geometry
      );

      object.geometry.dispose();
    }

    const objectMaterials =
      Array.isArray(
        object.material
      )
        ? object.material
        : [object.material];

    for (
      const material
      of objectMaterials
    ) {
      if (
        material
          ?.userData
          .chunkOwned &&
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

    chunk.add(createGround());

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

      chunkOccluders.set(
        key,
        result.occluders
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

  generatingChunks.set(
    key,
    job
  );

  await job;
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

    chunkColliders.delete(key);
    chunkOccluders.delete(key);

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
  radius = 0.7
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
  radius = 0.7
): void {
  const nextX =
    player.position.x;

  const nextZ =
    player.position.z;

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

  if (
    collidesWithWorld(
      player.position.x,
      player.position.z,
      radius
    )
  ) {
    player.position.set(
      previousX,
      player.position.y,
      previousZ
    );
  }
}

export function findSafeSpawnPosition(
  chunkX = 0,
  chunkZ = 0,
  radius = 0.9
): THREE.Vector3 {
  const originX =
    chunkX * CHUNK_SIZE;

  const originZ =
    chunkZ * CHUNK_SIZE;

  const candidates = [
    [0, -30],
    [0, 30],
    [-30, 0],
    [30, 0],

    [-15, -30],
    [15, -30],
    [-15, 30],
    [15, 30],

    [-30, -15],
    [-30, 15],
    [30, -15],
    [30, 15],
  ];

  for (
    const [localX, localZ]
    of candidates
  ) {
    const x =
      originX + localX;

    const z =
      originZ + localZ;

    if (
      !collidesWithWorld(
        x,
        z,
        radius
      )
    ) {
      return new THREE.Vector3(
        x,
        0,
        z
      );
    }
  }

  for (
    const roadZ
    of [-30, 30]
  ) {
    for (
      let localX = -50;
      localX <= 50;
      localX += 4
    ) {
      const x =
        originX + localX;

      const z =
        originZ + roadZ;

      if (
        !collidesWithWorld(
          x,
          z,
          radius
        )
      ) {
        return new THREE.Vector3(
          x,
          0,
          z
        );
      }
    }
  }

  return new THREE.Vector3(
    originX,
    0,
    originZ - 30
  );
}

function getAllOccluders(): THREE.Mesh[] {
  const result: THREE.Mesh[] = [];

  for (
    const meshes
    of chunkOccluders.values()
  ) {
    for (const mesh of meshes) {
      if (
        mesh.parent &&
        mesh.visible
      ) {
        result.push(mesh);
      }
    }
  }

  return result;
}

function restoreCameraMaterials(): void {
  for (
    const material
    of fadedMaterials
  ) {
    const originalOpacity =
      material.userData
        .cameraOriginalOpacity;

    const originalTransparent =
      material.userData
        .cameraOriginalTransparent;

    const originalDepthWrite =
      material.userData
        .cameraOriginalDepthWrite;

    if (
      typeof originalOpacity ===
      "number"
    ) {
      material.opacity =
        originalOpacity;
    }

    if (
      typeof originalTransparent ===
      "boolean"
    ) {
      material.transparent =
        originalTransparent;
    }

    if (
      typeof originalDepthWrite ===
      "boolean"
    ) {
      material.depthWrite =
        originalDepthWrite;
    }

    material.needsUpdate = true;
  }

  fadedMaterials.clear();
}

function fadeMaterial(
  material: THREE.Material
): void {
  if (
    material.userData
      .cameraOriginalOpacity ===
    undefined
  ) {
    material.userData
      .cameraOriginalOpacity =
      material.opacity;

    material.userData
      .cameraOriginalTransparent =
      material.transparent;

    material.userData
      .cameraOriginalDepthWrite =
      material.depthWrite;
  }

  material.transparent = true;
  material.opacity = 0.16;
  material.depthWrite = false;
  material.needsUpdate = true;

  fadedMaterials.add(material);
}

/*
 * هر ساختمانی که بین دوربین و کاراکتر قرار بگیرد
 * موقتاً شفاف می‌شود تا کاراکتر همیشه دیده شود.
 */
export function updateCameraOcclusion(
  camera: THREE.Camera,
  target: THREE.Vector3
): void {
  restoreCameraMaterials();

  const occluders =
    getAllOccluders();

  if (occluders.length === 0) {
    return;
  }

  cameraRayOrigin.copy(target);
  cameraRayOrigin.y += 1.3;

  cameraDirection
    .copy(camera.position)
    .sub(cameraRayOrigin);

  const distance =
    cameraDirection.length();

  if (distance <= 0.01) {
    return;
  }

  cameraDirection.normalize();

  raycaster.set(
    cameraRayOrigin,
    cameraDirection
  );

  raycaster.near = 0.1;
  raycaster.far = distance;

  const intersections =
    raycaster.intersectObjects(
      occluders,
      false
    );

  for (
    const intersection
    of intersections
  ) {
    const mesh =
      intersection.object;

    if (!(mesh instanceof THREE.Mesh)) {
      continue;
    }

    const materials =
      Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];

    for (
      const material
      of materials
    ) {
      fadeMaterial(material);
    }
  }
}

export function destroyAllChunks(): void {
  restoreCameraMaterials();

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
  chunkOccluders.clear();
  generatingChunks.clear();
}
