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

    for (const material of objectMaterials) {
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

    /*
     * Chunk تا زمانی که تمام مدل‌هایش آماده نشده‌اند
     * مخفی می‌ماند؛ در نتیجه آبجکت‌ها یکی‌یکی جلوی
     * بازیکن ظاهر نمی‌شوند.
     */
    chunk.visible = false;

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

      /*
       * کل شهر این Chunk یک‌جا نمایش داده می‌شود.
       */
      chunk.visible = true;
    } catch (error) {
      console.error(
        `Failed to generate chunk ${key}:`,
        error
      );

      chunk.visible = true;
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

function getNearbyChunkCoordinates(
  centerX: number,
  centerZ: number
): Array<{
  x: number;
  z: number;
}> {
  const coordinates: Array<{
    x: number;
    z: number;
  }> = [];

  for (
    let x =
      centerX - RENDER_DISTANCE;
    x <=
      centerX + RENDER_DISTANCE;
    x++
  ) {
    for (
      let z =
        centerZ - RENDER_DISTANCE;
      z <=
        centerZ + RENDER_DISTANCE;
      z++
    ) {
      if (
        x === centerX &&
        z === centerZ
      ) {
        continue;
      }

      coordinates.push({
        x,
        z,
      });
    }
  }

  coordinates.sort(
    (a, b) => {
      const distanceA =
        Math.abs(a.x - centerX) +
        Math.abs(a.z - centerZ);

      const distanceB =
        Math.abs(b.x - centerX) +
        Math.abs(b.z - centerZ);

      return distanceA - distanceB;
    }
  );

  return coordinates;
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

  /*
   * ابتدا Chunk فعلی کامل می‌شود.
   */
  await generateChunk(
    scene,
    cx,
    cz
  );

  destroyFarChunks(
    playerX,
    playerZ
  );

  /*
   * Chunkهای اطراف دو‌تا‌دو‌تا ساخته می‌شوند تا
   * مرورگر موبایل با تعداد زیادی درخواست هم‌زمان
   * قفل نشود.
   */
  const nearby =
    getNearbyChunkCoordinates(
      cx,
      cz
    );

  for (
    let index = 0;
    index < nearby.length;
    index += 2
  ) {
    if (
      getChunkCoord(
        playerX,
        playerZ
      ).cx !== cx ||
      getChunkCoord(
        playerX,
        playerZ
      ).cz !== cz
    ) {
      break;
    }

    const batch =
      nearby.slice(
        index,
        index + 2
      );

    await Promise.allSettled(
      batch.map(
        ({ x, z }) =>
          generateChunk(
            scene,
            x,
            z
          )
      )
    );
  }
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
  radius = 0.55
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
  radius = 0.55
): void {
  const nextX =
    player.position.x;

  const nextZ =
    player.position.z;

  /*
   * اگر خود موقعیت قبلی داخل Collider است،
   * Collision را موقتاً اعمال نمی‌کنیم تا کاراکتر
   * بتواند از محل گیرکرده خارج شود.
   */
  const previousBlocked =
    collidesWithWorld(
      previousX,
      previousZ,
      radius
    );

  if (previousBlocked) {
    return;
  }

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
    player.position.x =
      previousX;

    player.position.z =
      previousZ;
  }
}

export function findSafeSpawnPosition(
  chunkX = 0,
  chunkZ = 0,
  radius = 0.75
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
  for (const material of fadedMaterials) {
    const opacity =
      material.userData
        .cameraOriginalOpacity;

    const transparent =
      material.userData
        .cameraOriginalTransparent;

    const depthWrite =
      material.userData
        .cameraOriginalDepthWrite;

    if (
      typeof opacity === "number"
    ) {
      material.opacity = opacity;
    }

    if (
      typeof transparent ===
      "boolean"
    ) {
      material.transparent =
        transparent;
    }

    if (
      typeof depthWrite ===
      "boolean"
    ) {
      material.depthWrite =
        depthWrite;
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
  material.opacity = 0.15;
  material.depthWrite = false;
  material.needsUpdate = true;

  fadedMaterials.add(material);
}

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

  for (const intersection of intersections) {
    const mesh =
      intersection.object;

    if (!(mesh instanceof THREE.Mesh)) {
      continue;
    }

    const materials =
      Array.isArray(mesh.material)
        ? mesh.material
        : [mesh.material];

    for (const material of materials) {
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
