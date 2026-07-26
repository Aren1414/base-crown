import * as THREE from "three";

import {
  CITY_CHUNK_SIZE,
  generateCity,
} from "./CityGenerator";

export const CHUNK_SIZE = CITY_CHUNK_SIZE;

/*
 * مقدار ۱ یعنی Chunk فعلی به‌همراه ۸ Chunk اطراف.
 * برای موبایل مناسب‌تر است.
 */
export const RENDER_DISTANCE = 1;

/*
 * یک Chunk اضافه بیرون محدوده نگه داشته می‌شود تا هنگام
 * حرکت نزدیک مرز Chunk، ساخت و حذف مداوم اتفاق نیفتد.
 */
const DESTROY_DISTANCE =
  RENDER_DISTANCE + 1;

const GENERATION_BATCH_SIZE = 2;
const PLAYER_COLLISION_HEIGHT = 2.2;
const COLLISION_STEP_HEIGHT = 0.45;
const CAMERA_FADE_OPACITY = 0.15;

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

const chunkWalkableSurfaces = new Map<
  string,
  THREE.Object3D[]
>();

const generatingChunks = new Map<
  string,
  Promise<void>
>();

/*
 * برای جلوگیری از اینکه یک Job قدیمی، Job جدید همان Chunk
 * را از Map حذف کند.
 */
const generationTokens = new Map<
  string,
  symbol
>();

const raycaster =
  new THREE.Raycaster();

const surfaceRaycaster =
  new THREE.Raycaster();

const cameraDirection =
  new THREE.Vector3();

const cameraRayOrigin =
  new THREE.Vector3();

const surfaceRayOrigin =
  new THREE.Vector3();

const downDirection =
  new THREE.Vector3(0, -1, 0);

const fadedMaterials =
  new Set<THREE.Material>();

const nearbyColliderKeys: string[] =
  [];

function getChunkKey(
  chunkX: number,
  chunkZ: number
): string {
  return `${chunkX},${chunkZ}`;
}

function parseChunkKey(
  key: string
): {
  x: number;
  z: number;
} {
  const separatorIndex =
    key.indexOf(",");

  if (separatorIndex < 0) {
    return {
      x: 0,
      z: 0,
    };
  }

  return {
    x: Number(
      key.slice(
        0,
        separatorIndex
      )
    ),

    z: Number(
      key.slice(
        separatorIndex + 1
      )
    ),
  };
}

/*
 * Chunkها از مرکز مختصات خود ساخته می‌شوند.
 * بنابراین مرز Chunk صفر از -CHUNK_SIZE/2 تا
 * +CHUNK_SIZE/2 است.
 */
export function getChunkCoord(
  x: number,
  z: number
): {
  cx: number;
  cz: number;
} {
  const halfChunk =
    CHUNK_SIZE * 0.5;

  return {
    cx: Math.floor(
      (x + halfChunk) /
        CHUNK_SIZE
    ),

    cz: Math.floor(
      (z + halfChunk) /
        CHUNK_SIZE
    ),
  };
}

function markChunkOwned(
  resource:
    | THREE.BufferGeometry
    | THREE.Material
): void {
  resource.userData.chunkOwned =
    true;
}

function createGround(): THREE.Mesh {
  const geometry =
    new THREE.PlaneGeometry(
      CHUNK_SIZE,
      CHUNK_SIZE
    );

  markChunkOwned(geometry);

  const material =
    new THREE.MeshStandardMaterial({
      color: 0x394139,
      roughness: 0.96,
      metalness: 0,
    });

  markChunkOwned(material);

  const ground =
    new THREE.Mesh(
      geometry,
      material
    );

  ground.name =
    "ChunkGround";

  ground.rotation.x =
    -Math.PI / 2;

  ground.position.y =
    -0.08;

  ground.receiveShadow = true;
  ground.castShadow = false;
  ground.frustumCulled = true;

  ground.userData.walkableSurface =
    true;

  ground.userData.surfacePriority =
    -100;

  return ground;
}

function collectChunkWalkableSurfaces(
  chunk: THREE.Group
): THREE.Object3D[] {
  const surfaces:
    THREE.Object3D[] = [];

  chunk.traverse((object) => {
    if (
      object.userData
        .walkableSurface === true ||
      object.userData
        .walkableSurfaceData ||
      object.userData
        .walkableSurface
          ?.enabled === true
    ) {
      surfaces.push(object);
    }
  });

  return surfaces;
}

function disposeChunkResources(
  chunk: THREE.Group
): void {
  const geometries =
    new Set<
      THREE.BufferGeometry
    >();

  const materials =
    new Set<THREE.Material>();

  chunk.traverse((object) => {
    if (
      !(object instanceof THREE.Mesh)
    ) {
      return;
    }

    const geometry =
      object.geometry;

    if (
      geometry &&
      geometry.userData
        .chunkOwned === true &&
      !geometries.has(geometry)
    ) {
      geometries.add(geometry);
      geometry.dispose();
    }

    const objectMaterials =
      Array.isArray(
        object.material
      )
        ? object.material
        : [object.material];

    for (
      const material of
      objectMaterials
    ) {
      if (
        !material ||
        material.userData
          .chunkOwned !== true ||
        materials.has(material)
      ) {
        continue;
      }

      materials.add(material);
      material.dispose();
    }
  });
}

function removeChunk(
  key: string,
  chunk: THREE.Group
): void {
  chunk.userData.destroyed =
    true;

  chunk.visible = false;

  chunkColliders.delete(key);
  chunkOccluders.delete(key);
  chunkWalkableSurfaces.delete(
    key
  );

  disposeChunkResources(chunk);

  chunk.removeFromParent();
  chunk.clear();

  chunks.delete(key);
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

  const currentChunk =
    chunks.get(key);

  if (
    currentChunk &&
    currentChunk.userData
      .destroyed !== true
  ) {
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

  const token = Symbol(key);

  generationTokens.set(
    key,
    token
  );

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

    chunk.userData.chunkX =
      chunkX;

    chunk.userData.chunkZ =
      chunkZ;

    chunk.userData.chunkKey =
      key;

    chunk.userData.destroyed =
      false;

    chunk.userData.generating =
      true;

    /*
     * تا پایان ساخت مخفی می‌ماند تا مدل‌ها یکی‌یکی
     * جلوی بازیکن ظاهر نشوند.
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
        chunk.userData
          .destroyed === true ||
        chunks.get(key) !==
          chunk
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

      chunkWalkableSurfaces.set(
        key,
        collectChunkWalkableSurfaces(
          chunk
        )
      );

      chunk.userData.generating =
        false;

      chunk.visible = true;

      chunk.updateMatrixWorld(
        true
      );
    } catch (error) {
      console.error(
        `Failed to generate chunk ${key}:`,
        error
      );

      if (
        chunk.userData
          .destroyed !== true &&
        chunks.get(key) ===
          chunk
      ) {
        /*
         * در صورت خطای بخشی از مدل‌ها، زمین Chunk
         * همچنان قابل نمایش باقی می‌ماند.
         */
        chunkColliders.set(
          key,
          []
        );

        chunkOccluders.set(
          key,
          []
        );

        chunkWalkableSurfaces.set(
          key,
          collectChunkWalkableSurfaces(
            chunk
          )
        );

        chunk.userData.generating =
          false;

        chunk.visible = true;
      }
    } finally {
      if (
        generationTokens.get(
          key
        ) === token
      ) {
        generationTokens.delete(
          key
        );

        generatingChunks.delete(
          key
        );
      }
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
      centerX -
      RENDER_DISTANCE;
    x <=
      centerX +
      RENDER_DISTANCE;
    x++
  ) {
    for (
      let z =
        centerZ -
        RENDER_DISTANCE;
      z <=
        centerZ +
        RENDER_DISTANCE;
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
      const ax =
        a.x - centerX;

      const az =
        a.z - centerZ;

      const bx =
        b.x - centerX;

      const bz =
        b.z - centerZ;

      const distanceA =
        ax * ax + az * az;

      const distanceB =
        bx * bx + bz * bz;

      return (
        distanceA -
        distanceB
      );
    }
  );

  return coordinates;
}

function isStillInChunk(
  playerX: number,
  playerZ: number,
  chunkX: number,
  chunkZ: number
): boolean {
  const current =
    getChunkCoord(
      playerX,
      playerZ
    );

  return (
    current.cx === chunkX &&
    current.cz === chunkZ
  );
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
   * ابتدا Chunk فعلی ساخته می‌شود.
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

  const nearby =
    getNearbyChunkCoordinates(
      cx,
      cz
    );

  /*
   * ساخت دو Chunk در هر Batch برای جلوگیری از فشار
   * ناگهانی روی حافظه و CPU موبایل.
   */
  for (
    let index = 0;
    index < nearby.length;
    index +=
      GENERATION_BATCH_SIZE
  ) {
    if (
      !isStillInChunk(
        playerX,
        playerZ,
        cx,
        cz
      )
    ) {
      break;
    }

    const batch =
      nearby.slice(
        index,
        index +
          GENERATION_BATCH_SIZE
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
    of Array.from(
      chunks.entries()
    )
  ) {
    const coordinates =
      parseChunkKey(key);

    const far =
      Math.abs(
        coordinates.x - cx
      ) > DESTROY_DISTANCE ||
      Math.abs(
        coordinates.z - cz
      ) > DESTROY_DISTANCE;

    if (!far) {
      continue;
    }

    removeChunk(
      key,
      chunk
    );
  }
}

function circleIntersectsBox(
  x: number,
  z: number,
  radius: number,
  box: THREE.Box3
): boolean {
  const closestX =
    THREE.MathUtils.clamp(
      x,
      box.min.x,
      box.max.x
    );

  const closestZ =
    THREE.MathUtils.clamp(
      z,
      box.min.z,
      box.max.z
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

function verticalRangesOverlap(
  playerY: number,
  playerHeight: number,
  box: THREE.Box3
): boolean {
  const playerMinY =
    playerY +
    COLLISION_STEP_HEIGHT;

  const playerMaxY =
    playerY +
    playerHeight;

  return (
    box.max.y >
      playerMinY &&
    box.min.y <
      playerMaxY
  );
}

function collectNearbyColliderKeys(
  x: number,
  z: number,
  radius: number
): string[] {
  nearbyColliderKeys.length =
    0;

  const minChunk =
    getChunkCoord(
      x - radius,
      z - radius
    );

  const maxChunk =
    getChunkCoord(
      x + radius,
      z + radius
    );

  for (
    let chunkX =
      minChunk.cx;
    chunkX <=
      maxChunk.cx;
    chunkX++
  ) {
    for (
      let chunkZ =
        minChunk.cz;
      chunkZ <=
        maxChunk.cz;
      chunkZ++
    ) {
      nearbyColliderKeys.push(
        getChunkKey(
          chunkX,
          chunkZ
        )
      );
    }
  }

  return nearbyColliderKeys;
}

export function collidesWithWorld(
  x: number,
  z: number,
  radius = 0.55,
  playerY = 0,
  playerHeight =
    PLAYER_COLLISION_HEIGHT
): boolean {
  const keys =
    collectNearbyColliderKeys(
      x,
      z,
      radius
    );

  for (const key of keys) {
    const colliders =
      chunkColliders.get(key);

    if (!colliders) {
      continue;
    }

    for (
      const collider of
      colliders
    ) {
      if (
        !verticalRangesOverlap(
          playerY,
          playerHeight,
          collider
        )
      ) {
        continue;
      }

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

  const playerY =
    player.position.y;

  const previousBlocked =
    collidesWithWorld(
      previousX,
      previousZ,
      radius,
      playerY
    );

  /*
   * اگر موقعیت قبلی داخل Collider باشد، بازیکن باید بتواند
   * از آن خارج شود و نباید دائماً به همان نقطه بازگردد.
   */
  if (previousBlocked) {
    const currentBlocked =
      collidesWithWorld(
        nextX,
        nextZ,
        radius,
        playerY
      );

    if (!currentBlocked) {
      return;
    }
  }

  const blockedX =
    collidesWithWorld(
      nextX,
      previousZ,
      radius,
      playerY
    );

  if (blockedX) {
    player.position.x =
      previousX;
  }

  const blockedZ =
    collidesWithWorld(
      player.position.x,
      nextZ,
      radius,
      playerY
    );

  if (blockedZ) {
    player.position.z =
      previousZ;
  }

  if (
    collidesWithWorld(
      player.position.x,
      player.position.z,
      radius,
      playerY
    )
  ) {
    player.position.x =
      previousX;

    player.position.z =
      previousZ;
  }
}

function getSurfaceObjectsNearPosition(
  x: number,
  z: number
): THREE.Object3D[] {
  const { cx, cz } =
    getChunkCoord(x, z);

  const result:
    THREE.Object3D[] = [];

  for (
    let chunkX = cx - 1;
    chunkX <= cx + 1;
    chunkX++
  ) {
    for (
      let chunkZ = cz - 1;
      chunkZ <= cz + 1;
      chunkZ++
    ) {
      const surfaces =
        chunkWalkableSurfaces.get(
          getChunkKey(
            chunkX,
            chunkZ
          )
        );

      if (!surfaces) {
        continue;
      }

      for (
        const surface of
        surfaces
      ) {
        if (
          surface.parent &&
          surface.visible
        ) {
          result.push(surface);
        }
      }
    }
  }

  return result;
}

/*
 * ارتفاع سطح قابل راه‌رفتن را پیدا می‌کند.
 * روی پل، رمپ و زمین از بالاترین سطح معتبر زیر بازیکن
 * استفاده می‌شود.
 */
export function getWorldSurfaceHeight(
  x: number,
  z: number,
  currentY = 0,
  maxStepUp = 1.25,
  rayHeight = 40
): number {
  const surfaces =
    getSurfaceObjectsNearPosition(
      x,
      z
    );

  if (surfaces.length === 0) {
    return 0;
  }

  surfaceRayOrigin.set(
    x,
    Math.max(
      currentY +
        maxStepUp,
      rayHeight
    ),
    z
  );

  surfaceRaycaster.set(
    surfaceRayOrigin,
    downDirection
  );

  surfaceRaycaster.near = 0;
  surfaceRaycaster.far =
    rayHeight * 2 +
    Math.abs(currentY);

  const intersections =
    surfaceRaycaster.intersectObjects(
      surfaces,
      true
    );

  if (
    intersections.length === 0
  ) {
    return 0;
  }

  const maximumAllowedY =
    currentY + maxStepUp;

  let fallbackHeight:
    number | null = null;

  for (
    const intersection of
    intersections
  ) {
    const surfaceY =
      intersection.point.y;

    if (
      fallbackHeight === null
    ) {
      fallbackHeight =
        surfaceY;
    }

    if (
      surfaceY <=
      maximumAllowedY
    ) {
      return surfaceY;
    }
  }

  return fallbackHeight ?? 0;
}

export function snapObjectToWorldSurface(
  object: THREE.Object3D,
  maxStepUp = 1.25,
  verticalOffset = 0
): number {
  const surfaceHeight =
    getWorldSurfaceHeight(
      object.position.x,
      object.position.z,
      object.position.y,
      maxStepUp
    );

  object.position.y =
    surfaceHeight +
    verticalOffset;

  return surfaceHeight;
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

  const candidates: ReadonlyArray<
    readonly [number, number]
  > = [
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

    [0, 0],
  ];

  for (
    const [
      localX,
      localZ,
    ] of candidates
  ) {
    const x =
      originX + localX;

    const z =
      originZ + localZ;

    const y =
      getWorldSurfaceHeight(
        x,
        z,
        0,
        2
      );

    if (
      !collidesWithWorld(
        x,
        z,
        radius,
        y
      )
    ) {
      return new THREE.Vector3(
        x,
        y,
        z
      );
    }
  }

  const fallbackX =
    originX;

  const fallbackZ =
    originZ - 30;

  return new THREE.Vector3(
    fallbackX,
    getWorldSurfaceHeight(
      fallbackX,
      fallbackZ,
      0,
      2
    ),
    fallbackZ
  );
}

function getAllOccluders(): THREE.Mesh[] {
  const result:
    THREE.Mesh[] = [];

  for (
    const meshes of
    chunkOccluders.values()
  ) {
    for (
      const mesh of meshes
    ) {
      if (
        !mesh.parent ||
        !mesh.visible ||
        mesh.userData
          .cameraOccluder !==
          true
      ) {
        continue;
      }

      result.push(mesh);
    }
  }

  return result;
}

function restoreCameraMaterials(): void {
  for (
    const material of
    fadedMaterials
  ) {
    const opacity =
      material.userData
        .cameraOriginalOpacity;

    const transparent =
      material.userData
        .cameraOriginalTransparent;

    const depthWrite =
      material.userData
        .cameraOriginalDepthWrite;

    const alphaTest =
      material.userData
        .cameraOriginalAlphaTest;

    if (
      typeof opacity ===
      "number"
    ) {
      material.opacity =
        opacity;
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

    if (
      typeof alphaTest ===
      "number"
    ) {
      material.alphaTest =
        alphaTest;
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

    material.userData
      .cameraOriginalAlphaTest =
      material.alphaTest;
  }

  material.transparent = true;
  material.opacity =
    CAMERA_FADE_OPACITY;

  material.depthWrite = false;
  material.alphaTest = 0;

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

  if (
    occluders.length === 0
  ) {
    return;
  }

  cameraRayOrigin.copy(
    target
  );

  cameraRayOrigin.y += 1.3;

  cameraDirection
    .copy(camera.position)
    .sub(cameraRayOrigin);

  const distance =
    cameraDirection.length();

  if (
    distance <= 0.01
  ) {
    return;
  }

  cameraDirection.normalize();

  raycaster.set(
    cameraRayOrigin,
    cameraDirection
  );

  raycaster.near = 0.05;

  /*
   * کمی قبل از دوربین متوقف می‌شود تا Mesh پشت دوربین
   * یا خود دوربین به‌اشتباه محو نشود.
   */
  raycaster.far =
    Math.max(
      distance - 0.1,
      0
    );

  const intersections =
    raycaster.intersectObjects(
      occluders,
      false
    );

  const processedMeshes =
    new Set<THREE.Mesh>();

  for (
    const intersection of
    intersections
  ) {
    const mesh =
      intersection.object;

    if (
      !(mesh instanceof THREE.Mesh) ||
      processedMeshes.has(mesh)
    ) {
      continue;
    }

    processedMeshes.add(mesh);

    const materials =
      Array.isArray(
        mesh.material
      )
        ? mesh.material
        : [mesh.material];

    for (
      const material of
      materials
    ) {
      if (material) {
        fadeMaterial(material);
      }
    }
  }
}

export function destroyAllChunks(): void {
  restoreCameraMaterials();

  for (
    const [key, chunk]
    of Array.from(
      chunks.entries()
    )
  ) {
    removeChunk(
      key,
      chunk
    );
  }

  chunks.clear();
  chunkColliders.clear();
  chunkOccluders.clear();
  chunkWalkableSurfaces.clear();

  /*
   * Promiseهای در حال اجرا لغو نمی‌شوند، اما به دلیل
   * destroyed بودن Parent دیگر مدل‌ها به صحنه اضافه
   * نخواهند شد.
   */
  generatingChunks.clear();
  generationTokens.clear();
    }
