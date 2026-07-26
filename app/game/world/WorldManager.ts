// app/game/world/WorldManager.ts

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import {
  FOREST_BUSHES,
  FOREST_FLOWERS,
  FOREST_GRASS,
  FOREST_TREES,
  URBAN_BRIDGES,
  URBAN_BUILDINGS,
  URBAN_RIVER,
  URBAN_TUNNEL,
  URBAN_TUNNEL_WALLS,
  URBAN_VEHICLES,
  type ModelDef,
} from "../assets/Models";

export const CHUNK_SIZE = 88;

const HALF_CHUNK = CHUNK_SIZE / 2;
const ROAD_WIDTH = 8.4;
const SIDEWALK_WIDTH = 1.65;
const PLAYER_BASE_Y = 0.06;

type Direction = "x" | "z";

type ChunkKind =
  | "city"
  | "park"
  | "river"
  | "tunnel-x"
  | "tunnel-z";

type RoadPoint = {
  x: number;
  z: number;
  direction: Direction;
};

type Collider = {
  box: THREE.Box3;
  chunk: THREE.Group;
};

type ModelOptions = {
  y?: number;
  collision?: boolean;
  height?: boolean;
  occlusion?: boolean;
  water?: boolean;

  targetWidth?: number;
  targetHeight?: number;
  maxHeight?: number;

  brightness?: number;
  castShadow?: boolean;
};

export const chunks = new Map<string, THREE.Group>();

const loader = new GLTFLoader();

const modelCache = new Map<
  string,
  Promise<THREE.Group>
>();

const colliders: Collider[] = [];
const heightMeshes: THREE.Object3D[] = [];
const occlusionMeshes: THREE.Object3D[] = [];

const waterMaterials =
  new Set<THREE.Material>();

const raycaster =
  new THREE.Raycaster();

const rayOrigin =
  new THREE.Vector3();

const downDirection =
  new THREE.Vector3(0, -1, 0);

const tempBox =
  new THREE.Box3();

const tempSize =
  new THREE.Vector3();

const tempVector =
  new THREE.Vector3();

/* -------------------------------------------------------------------------- */
/*                                  MATERIALS                                 */
/* -------------------------------------------------------------------------- */

const cityGroundMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x667062,
    roughness: 1,
    metalness: 0,
  });

const emptyGroundMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x777c71,
    roughness: 1,
    metalness: 0,
  });

const parkGroundMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x557d45,
    roughness: 1,
    metalness: 0,
  });

const roadMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x505453,
    roughness: 0.92,
    metalness: 0.015,
  });

const bridgeRoadMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x565a59,
    roughness: 0.9,
    metalness: 0.02,
  });

const sidewalkMaterial =
  new THREE.MeshStandardMaterial({
    color: 0xa4a39b,
    roughness: 0.94,
    metalness: 0,
  });

const curbMaterial =
  new THREE.MeshStandardMaterial({
    color: 0xc1beb3,
    roughness: 0.92,
    metalness: 0,
  });

const lineMaterial =
  new THREE.MeshStandardMaterial({
    color: 0xe2d78f,
    roughness: 0.82,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });

const whiteLineMaterial =
  new THREE.MeshStandardMaterial({
    color: 0xe3e3dc,
    roughness: 0.85,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });

const grassMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x6a9b4c,
    roughness: 1,
    metalness: 0,
    side: THREE.DoubleSide,
  });

const bridgeRailMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x868b88,
    roughness: 0.75,
    metalness: 0.15,
  });

/* -------------------------------------------------------------------------- */
/*                                   GEOMETRY                                 */
/* -------------------------------------------------------------------------- */

const groundGeometry =
  new THREE.PlaneGeometry(
    CHUNK_SIZE,
    CHUNK_SIZE
  );

const roadXGeometry =
  new THREE.PlaneGeometry(
    CHUNK_SIZE,
    ROAD_WIDTH
  );

const roadZGeometry =
  new THREE.PlaneGeometry(
    ROAD_WIDTH,
    CHUNK_SIZE
  );

const sidewalkXGeometry =
  new THREE.PlaneGeometry(
    CHUNK_SIZE,
    SIDEWALK_WIDTH
  );

const sidewalkZGeometry =
  new THREE.PlaneGeometry(
    SIDEWALK_WIDTH,
    CHUNK_SIZE
  );

const curbXGeometry =
  new THREE.BoxGeometry(
    CHUNK_SIZE,
    0.14,
    0.16
  );

const curbZGeometry =
  new THREE.BoxGeometry(
    0.16,
    0.14,
    CHUNK_SIZE
  );

const lineXGeometry =
  new THREE.PlaneGeometry(
    4.8,
    0.14
  );

const lineZGeometry =
  new THREE.PlaneGeometry(
    0.14,
    4.8
  );

const edgeXGeometry =
  new THREE.PlaneGeometry(
    CHUNK_SIZE,
    0.1
  );

const edgeZGeometry =
  new THREE.PlaneGeometry(
    0.1,
    CHUNK_SIZE
  );

const grassBladeGeometry =
  new THREE.PlaneGeometry(
    0.06,
    0.26
  );

grassBladeGeometry.translate(
  0,
  0.13,
  0
);

/* -------------------------------------------------------------------------- */
/*                                   RANDOM                                   */
/* -------------------------------------------------------------------------- */

function seededRandom(seed: number) {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;

    let value = state;

    value = Math.imul(
      value ^ (value >>> 15),
      value | 1
    );

    value ^=
      value +
      Math.imul(
        value ^ (value >>> 7),
        value | 61
      );

    return (
      ((value ^ (value >>> 14)) >>> 0) /
      4294967296
    );
  };
}

function chunkSeed(
  cx: number,
  cz: number
) {
  return (
    Math.imul(cx, 73856093) ^
    Math.imul(cz, 19349663)
  ) >>> 0;
}

function randomRange(
  random: () => number,
  min: number,
  max: number
) {
  return min + random() * (max - min);
}

function pick<T>(
  array: readonly T[],
  random: () => number
): T {
  return array[
    Math.floor(random() * array.length)
  ];
}

function modulo(
  value: number,
  divisor: number
) {
  return (
    ((value % divisor) + divisor) %
    divisor
  );
}

/* -------------------------------------------------------------------------- */
/*                              CHUNK INFORMATION                             */
/* -------------------------------------------------------------------------- */

export function getChunkCoord(
  x: number,
  z: number
) {
  return {
    cx: Math.floor(
      (x + HALF_CHUNK) /
        CHUNK_SIZE
    ),

    cz: Math.floor(
      (z + HALF_CHUNK) /
        CHUNK_SIZE
    ),
  };
}

function getChunkKind(
  cx: number,
  cz: number
): ChunkKind {
  if (cx === 0 && cz === 0) {
    return "city";
  }

  /*
   * رودخانه در یک ستون پیوسته قرار می‌گیرد.
   */
  if (modulo(cx, 10) === 5) {
    return "river";
  }

  const value = Math.abs(
    cx * 37 + cz * 61
  );

  /*
   * پارک تقریباً در یکی از هر ۹ بلوک.
   */
  if (value % 9 === 0) {
    return "park";
  }

  /*
   * تونل‌ها کم‌تعداد هستند.
   */
  if (value % 31 === 0) {
    return "tunnel-x";
  }

  if (value % 37 === 0) {
    return "tunnel-z";
  }

  return "city";
}

function getRoadDirection(
  cx: number,
  cz: number,
  kind: ChunkKind
): Direction {
  if (kind === "river") {
    return "x";
  }

  if (kind === "tunnel-x") {
    return "x";
  }

  if (kind === "tunnel-z") {
    return "z";
  }

  /*
   * جهت خیابان‌ها به‌صورت بلوکی تغییر می‌کند.
   */
  return modulo(cx + cz, 3) === 0
    ? "z"
    : "x";
}

/* -------------------------------------------------------------------------- */
/*                               MODEL LOADING                                */
/* -------------------------------------------------------------------------- */

function loadSource(
  url: string
) {
  const cached =
    modelCache.get(url);

  if (cached) {
    return cached;
  }

  const promise =
    new Promise<THREE.Group>(
      (resolve, reject) => {
        loader.load(
          url,
          (gltf) => {
            resolve(gltf.scene);
          },
          undefined,
          reject
        );
      }
    );

  modelCache.set(url, promise);

  return promise;
}

function brightenMaterial(
  material: THREE.Material,
  amount: number
) {
  const cloned =
    material.clone();

  if (
    cloned instanceof
      THREE.MeshStandardMaterial ||
    cloned instanceof
      THREE.MeshPhysicalMaterial ||
    cloned instanceof
      THREE.MeshLambertMaterial ||
    cloned instanceof
      THREE.MeshPhongMaterial ||
    cloned instanceof
      THREE.MeshBasicMaterial
  ) {
    cloned.color.lerp(
      new THREE.Color(0xffffff),
      amount
    );

    if (
      "emissive" in cloned &&
      cloned.emissive instanceof
        THREE.Color
    ) {
      cloned.emissive.copy(
        cloned.color
      );

      if (
        "emissiveIntensity" in cloned
      ) {
        cloned.emissiveIntensity =
          0.035;
      }
    }

    cloned.needsUpdate = true;
  }

  return cloned;
}

function configureClone(
  object: THREE.Object3D,
  brightness: number,
  castShadow: boolean
) {
  object.traverse((child) => {
    if (
      !(child instanceof THREE.Mesh)
    ) {
      return;
    }

    if (
      Array.isArray(child.material)
    ) {
      child.material =
        child.material.map((material) =>
          brightenMaterial(
            material,
            brightness
          )
        );
    } else {
      child.material =
        brightenMaterial(
          child.material,
          brightness
        );
    }

    child.castShadow =
      castShadow;

    child.receiveShadow = true;
    child.frustumCulled = true;
  });
}

function resizeModel(
  object: THREE.Object3D,
  options: ModelOptions
) {
  object.updateWorldMatrix(
    true,
    true
  );

  tempBox.setFromObject(object);
  tempBox.getSize(tempSize);

  if (
    tempBox.isEmpty() ||
    tempSize.x <= 0 ||
    tempSize.y <= 0 ||
    tempSize.z <= 0
  ) {
    return;
  }

  let multiplier = 1;

  if (options.targetWidth) {
    const width =
      Math.max(
        tempSize.x,
        tempSize.z
      );

    multiplier =
      options.targetWidth / width;
  }

  if (options.targetHeight) {
    multiplier =
      options.targetHeight /
      tempSize.y;
  }

  if (
    options.maxHeight &&
    tempSize.y * multiplier >
      options.maxHeight
  ) {
    multiplier =
      options.maxHeight /
      tempSize.y;
  }

  object.scale.multiplyScalar(
    multiplier
  );
}

function alignToGround(
  object: THREE.Object3D,
  targetY: number
) {
  object.updateWorldMatrix(
    true,
    true
  );

  tempBox.setFromObject(object);

  if (
    Number.isFinite(
      tempBox.min.y
    )
  ) {
    object.position.y +=
      targetY -
      tempBox.min.y;
  }
}

function registerCollider(
  object: THREE.Object3D,
  chunk: THREE.Group,
  shrink = 0.28
) {
  object.updateWorldMatrix(
    true,
    true
  );

  const box =
    new THREE.Box3().setFromObject(
      object
    );

  if (box.isEmpty()) {
    return;
  }

  box.getSize(tempSize);

  const shrinkX =
    Math.min(
      shrink,
      tempSize.x * 0.04
    );

  const shrinkZ =
    Math.min(
      shrink,
      tempSize.z * 0.04
    );

  box.min.x += shrinkX;
  box.max.x -= shrinkX;

  box.min.z += shrinkZ;
  box.max.z -= shrinkZ;

  colliders.push({
    box,
    chunk,
  });
}

function registerMeshes(
  object: THREE.Object3D,
  chunk: THREE.Group,
  options: ModelOptions
) {
  if (options.collision) {
    registerCollider(
      object,
      chunk
    );
  }

  object.traverse((child) => {
    if (
      !(child instanceof THREE.Mesh)
    ) {
      return;
    }

    if (options.height) {
      heightMeshes.push(child);
    }

    if (options.occlusion) {
      occlusionMeshes.push(child);
    }

    if (options.water) {
      const materials =
        Array.isArray(
          child.material
        )
          ? child.material
          : [child.material];

      for (const material of materials) {
        waterMaterials.add(
          material
        );
      }
    }
  });
}

function placeModel(
  definition: ModelDef,
  chunk: THREE.Group,
  x: number,
  z: number,
  rotationY = 0,
  options: ModelOptions = {}
) {
  void loadSource(definition.url)
    .then((source) => {
      if (
        chunk.userData.destroyed ||
        !chunk.parent
      ) {
        return;
      }

      const object =
        source.clone(true);

      object.scale.setScalar(
        definition.scale
      );

      object.position.set(
        x,
        options.y ?? 0,
        z
      );

      object.rotation.y =
        rotationY;

      configureClone(
        object,
        options.brightness ?? 0.2,
        options.castShadow ?? true
      );

      resizeModel(
        object,
        options
      );

      alignToGround(
        object,
        options.y ?? 0
      );

      chunk.add(object);

      object.updateWorldMatrix(
        true,
        true
      );

      registerMeshes(
        object,
        chunk,
        options
      );
    })
    .catch((error) => {
      console.error(
        `Model load failed: ${definition.url}`,
        error
      );
    });
}

/* -------------------------------------------------------------------------- */
/*                               BASIC SURFACES                               */
/* -------------------------------------------------------------------------- */

function createSurface(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  x: number,
  z: number,
  y: number
) {
  const mesh =
    new THREE.Mesh(
      geometry,
      material
    );

  mesh.rotation.x =
    -Math.PI / 2;

  mesh.position.set(x, y, z);
  mesh.receiveShadow = true;

  return mesh;
}

function addGround(
  chunk: THREE.Group,
  material:
    THREE.MeshStandardMaterial
) {
  const ground =
    createSurface(
      groundGeometry,
      material,
      0,
      0,
      0
    );

  chunk.add(ground);
  heightMeshes.push(ground);
}

/* -------------------------------------------------------------------------- */
/*                                    ROAD                                    */
/* -------------------------------------------------------------------------- */

function addRoadLines(
  chunk: THREE.Group,
  direction: Direction
) {
  const count = 8;

  const lines =
    new THREE.InstancedMesh(
      direction === "x"
        ? lineXGeometry
        : lineZGeometry,
      lineMaterial,
      count
    );

  const matrix =
    new THREE.Matrix4();

  const position =
    new THREE.Vector3();

  const quaternion =
    new THREE.Quaternion().setFromEuler(
      new THREE.Euler(
        -Math.PI / 2,
        0,
        0
      )
    );

  const scale =
    new THREE.Vector3(1, 1, 1);

  for (
    let index = 0;
    index < count;
    index++
  ) {
    const offset =
      -35 + index * 10;

    position.set(
      direction === "x"
        ? offset
        : 0,
      0.052,
      direction === "x"
        ? 0
        : offset
    );

    matrix.compose(
      position,
      quaternion,
      scale
    );

    lines.setMatrixAt(
      index,
      matrix
    );
  }

  lines.instanceMatrix.needsUpdate =
    true;

  chunk.add(lines);
}

function addRoadEdgeLines(
  chunk: THREE.Group,
  direction: Direction
) {
  const edgeOffset =
    ROAD_WIDTH / 2 - 0.32;

  for (const side of [-1, 1]) {
    const edge =
      createSurface(
        direction === "x"
          ? edgeXGeometry
          : edgeZGeometry,
        whiteLineMaterial,
        direction === "x"
          ? 0
          : edgeOffset * side,
        direction === "x"
          ? edgeOffset * side
          : 0,
        0.051
      );

    chunk.add(edge);
  }
}

function addRoad(
  chunk: THREE.Group,
  direction: Direction
) {
  const road =
    createSurface(
      direction === "x"
        ? roadXGeometry
        : roadZGeometry,
      roadMaterial,
      0,
      0,
      0.025
    );

  chunk.add(road);
  heightMeshes.push(road);

  const sidewalkOffset =
    ROAD_WIDTH / 2 +
    SIDEWALK_WIDTH / 2;

  const curbOffset =
    ROAD_WIDTH / 2 + 0.08;

  for (const side of [-1, 1]) {
    const sidewalk =
      createSurface(
        direction === "x"
          ? sidewalkXGeometry
          : sidewalkZGeometry,
        sidewalkMaterial,
        direction === "x"
          ? 0
          : sidewalkOffset * side,
        direction === "x"
          ? sidewalkOffset * side
          : 0,
        0.045
      );

    chunk.add(sidewalk);
    heightMeshes.push(sidewalk);

    const curb =
      new THREE.Mesh(
        direction === "x"
          ? curbXGeometry
          : curbZGeometry,
        curbMaterial
      );

    curb.position.set(
      direction === "x"
        ? 0
        : curbOffset * side,
      0.075,
      direction === "x"
        ? curbOffset * side
        : 0
    );

    curb.receiveShadow = true;

    chunk.add(curb);
  }

  addRoadLines(
    chunk,
    direction
  );

  addRoadEdgeLines(
    chunk,
    direction
  );
}

function getRoadPoints(
  direction: Direction
): RoadPoint[] {
  const result: RoadPoint[] = [];

  for (
    let offset = -34;
    offset <= 34;
    offset += 14
  ) {
    result.push({
      x:
        direction === "x"
          ? offset
          : 0,

      z:
        direction === "x"
          ? 0
          : offset,

      direction,
    });
  }

  return result;
}

/* -------------------------------------------------------------------------- */
/*                                  BUILDINGS                                 */
/* -------------------------------------------------------------------------- */

function getBuildingSlots(
  direction: Direction
) {
  const alongRoad =
    [-34, -17, 0, 17, 34];

  const sideOffset = 18.2;

  const slots: Array<{
    x: number;
    z: number;
    rotation: number;
  }> = [];

  for (const value of alongRoad) {
    if (direction === "x") {
      slots.push({
        x: value,
        z: -sideOffset,
        rotation: 0,
      });

      slots.push({
        x: value,
        z: sideOffset,
        rotation: Math.PI,
      });
    } else {
      slots.push({
        x: -sideOffset,
        z: value,
        rotation: Math.PI / 2,
      });

      slots.push({
        x: sideOffset,
        z: value,
        rotation: -Math.PI / 2,
      });
    }
  }

  return slots;
}

function getBuildingWidth(
  definition: ModelDef,
  random: () => number
) {
  const isVilla =
    definition.url
      .toLowerCase()
      .includes("villa");

  return isVilla
    ? randomRange(
        random,
        14.5,
        17.5
      )
    : randomRange(
        random,
        18,
        23
      );
}

function spawnBuildings(
  chunk: THREE.Group,
  random: () => number,
  direction: Direction
) {
  const slots =
    getBuildingSlots(direction);

  for (const slot of slots) {
    /*
     * تراکم زیاد؛ فقط حدود ۴٪ جایگاه‌ها خالی می‌مانند.
     */
    if (random() < 0.04) {
      continue;
    }

    const definition =
      pick(
        URBAN_BUILDINGS,
        random
      );

    placeModel(
      definition,
      chunk,
      slot.x +
        randomRange(
          random,
          -0.55,
          0.55
        ),
      slot.z +
        randomRange(
          random,
          -0.55,
          0.55
        ),
      slot.rotation +
        randomRange(
          random,
          -0.018,
          0.018
        ),
      {
        collision: true,
        occlusion: true,

        targetWidth:
          getBuildingWidth(
            definition,
            random
          ),

        maxHeight: 35,
        brightness: 0.28,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                                   VEHICLES                                 */
/* -------------------------------------------------------------------------- */

function spawnVehicles(
  chunk: THREE.Group,
  random: () => number,
  points: RoadPoint[]
) {
  const available =
    [...points].sort(
      () => random() - 0.5
    );

  const count =
    Math.min(
      available.length,
      3 +
        Math.floor(
          random() * 2
        )
    );

  for (
    let index = 0;
    index < count;
    index++
  ) {
    const point =
      available[index];

    const lane =
      random() < 0.5
        ? -1.85
        : 1.85;

    const x =
      point.direction === "x"
        ? point.x
        : point.x + lane;

    const z =
      point.direction === "x"
        ? point.z + lane
        : point.z;

    const rotation =
      point.direction === "x"
        ? random() < 0.5
          ? Math.PI / 2
          : -Math.PI / 2
        : random() < 0.5
          ? 0
          : Math.PI;

    placeModel(
      pick(
        URBAN_VEHICLES,
        random
      ),
      chunk,
      x,
      z,
      rotation,
      {
        collision: true,
        targetWidth:
          randomRange(
            random,
            3.8,
            5.1
          ),
        maxHeight: 3,
        brightness: 0.3,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                                    PARK                                    */
/* -------------------------------------------------------------------------- */

function addFineGrass(
  chunk: THREE.Group,
  random: () => number
) {
  const count = 1350;

  const grass =
    new THREE.InstancedMesh(
      grassBladeGeometry,
      grassMaterial,
      count
    );

  const matrix =
    new THREE.Matrix4();

  const position =
    new THREE.Vector3();

  const quaternion =
    new THREE.Quaternion();

  const rotation =
    new THREE.Euler();

  const scale =
    new THREE.Vector3();

  for (
    let index = 0;
    index < count;
    index++
  ) {
    position.set(
      randomRange(
        random,
        -41,
        41
      ),
      0.035,
      randomRange(
        random,
        -41,
        41
      )
    );

    rotation.set(
      0,
      random() *
        Math.PI *
        2,
      randomRange(
        random,
        -0.08,
        0.08
      )
    );

    quaternion.setFromEuler(
      rotation
    );

    scale.set(
      randomRange(
        random,
        0.7,
        1.15
      ),
      randomRange(
        random,
        0.55,
        1.15
      ),
      1
    );

    matrix.compose(
      position,
      quaternion,
      scale
    );

    grass.setMatrixAt(
      index,
      matrix
    );
  }

  grass.instanceMatrix.needsUpdate =
    true;

  grass.castShadow = false;
  grass.receiveShadow = false;

  chunk.add(grass);
}

function spawnParkVegetation(
  chunk: THREE.Group,
  random: () => number
) {
  /*
   * درخت‌های بیشتر ولی کوتاه‌تر.
   */
  for (
    let index = 0;
    index < 24;
    index++
  ) {
    const angle =
      (index / 24) *
        Math.PI *
        2 +
      randomRange(
        random,
        -0.16,
        0.16
      );

    const radius =
      randomRange(
        random,
        17,
        38
      );

    placeModel(
      pick(
        FOREST_TREES,
        random
      ),
      chunk,
      Math.cos(angle) *
        radius,
      Math.sin(angle) *
        radius,
      random() *
        Math.PI *
        2,
      {
        collision: true,
        targetHeight:
          randomRange(
            random,
            5.5,
            8
          ),
        brightness: 0.08,
      }
    );
  }

  /*
   * بوته‌های پرتراکم.
   */
  for (
    let index = 0;
    index < 34;
    index++
  ) {
    placeModel(
      pick(
        FOREST_BUSHES,
        random
      ),
      chunk,
      randomRange(
        random,
        -38,
        38
      ),
      randomRange(
        random,
        -38,
        38
      ),
      random() *
        Math.PI *
        2,
      {
        targetWidth:
          randomRange(
            random,
            1.1,
            2.5
          ),
        brightness: 0.05,
        castShadow: false,
      }
    );
  }

  /*
   * گل و دسته‌های چمن مدل‌شده.
   */
  for (
    let index = 0;
    index < 45;
    index++
  ) {
    const definition =
      random() < 0.6
        ? pick(
            FOREST_FLOWERS,
            random
          )
        : pick(
            FOREST_GRASS,
            random
          );

    placeModel(
      definition,
      chunk,
      randomRange(
        random,
        -39,
        39
      ),
      randomRange(
        random,
        -39,
        39
      ),
      random() *
        Math.PI *
        2,
      {
        targetWidth:
          randomRange(
            random,
            0.45,
            1.15
          ),
        brightness: 0.02,
        castShadow: false,
      }
    );
  }
}

function buildPark(
  chunk: THREE.Group,
  random: () => number
) {
  addGround(
    chunk,
    parkGroundMaterial
  );

  addFineGrass(
    chunk,
    random
  );

  spawnParkVegetation(
    chunk,
    random
  );
}

/* -------------------------------------------------------------------------- */
/*                            CITY PLANTS AND TREES                           */
/* -------------------------------------------------------------------------- */

function spawnCityVegetation(
  chunk: THREE.Group,
  random: () => number,
  direction: Direction
) {
  const positions =
    [-38, -25, -11, 11, 25, 38];

  for (const value of positions) {
    if (random() < 0.28) {
      continue;
    }

    const side =
      random() < 0.5
        ? -1
        : 1;

    const treeOffset = 11;

    const x =
      direction === "x"
        ? value
        : treeOffset * side;

    const z =
      direction === "x"
        ? treeOffset * side
        : value;

    placeModel(
      pick(
        FOREST_TREES,
        random
      ),
      chunk,
      x,
      z,
      random() *
        Math.PI *
        2,
      {
        collision: true,
        targetHeight:
          randomRange(
            random,
            4.8,
            7
          ),
        brightness: 0.06,
      }
    );
  }

  for (
    let index = 0;
    index < 18;
    index++
  ) {
    const side =
      random() < 0.5
        ? -1
        : 1;

    const along =
      randomRange(
        random,
        -40,
        40
      );

    const across =
      randomRange(
        random,
        10.5,
        13
      ) * side;

    const definition =
      random() < 0.55
        ? pick(
            FOREST_BUSHES,
            random
          )
        : pick(
            FOREST_FLOWERS,
            random
          );

    placeModel(
      definition,
      chunk,
      direction === "x"
        ? along
        : across,
      direction === "x"
        ? across
        : along,
      random() *
        Math.PI *
        2,
      {
        targetWidth:
          randomRange(
            random,
            0.7,
            1.7
          ),
        brightness: 0.04,
        castShadow: false,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                               REAL BRIDGE                                  */
/* -------------------------------------------------------------------------- */

function addBridgeSegment(
  chunk: THREE.Group,
  length: number,
  width: number,
  x: number,
  y: number,
  z: number,
  rotationZ: number
) {
  const geometry =
    new THREE.BoxGeometry(
      length,
      0.34,
      width
    );

  const mesh =
    new THREE.Mesh(
      geometry,
      bridgeRoadMaterial
    );

  mesh.position.set(x, y, z);
  mesh.rotation.z = rotationZ;

  mesh.receiveShadow = true;
  mesh.castShadow = false;

  mesh.userData.temporaryGeometry =
    true;

  chunk.add(mesh);
  heightMeshes.push(mesh);

  return mesh;
}

function addBridgeRails(
  chunk: THREE.Group,
  x: number,
  y: number,
  length: number
) {
  for (const side of [-1, 1]) {
    const geometry =
      new THREE.BoxGeometry(
        length,
        0.75,
        0.14
      );

    const rail =
      new THREE.Mesh(
        geometry,
        bridgeRailMaterial
      );

    rail.position.set(
      x,
      y + 0.52,
      side *
        (ROAD_WIDTH / 2 + 0.12)
    );

    rail.userData.temporaryGeometry =
      true;

    rail.castShadow = true;
    rail.receiveShadow = true;

    chunk.add(rail);

    registerCollider(
      rail,
      chunk,
      0
    );
  }
}

function buildFunctionalBridge(
  chunk: THREE.Group,
  random: () => number
) {
  const bridgeHeight = 3.7;
  const flatLength = 22;
  const rampLength = 25;

  const rampRise =
    bridgeHeight - 0.18;

  const rampAngle =
    Math.atan2(
      rampRise,
      rampLength
    );

  const realRampLength =
    Math.sqrt(
      rampLength * rampLength +
      rampRise * rampRise
    );

  /*
   * سطح صاف مرکزی پل.
   */
  addBridgeSegment(
    chunk,
    flatLength,
    ROAD_WIDTH,
    0,
    bridgeHeight,
    0,
    0
  );

  /*
   * رمپ سمت چپ.
   */
  addBridgeSegment(
    chunk,
    realRampLength,
    ROAD_WIDTH,
    -(flatLength / 2 +
      rampLength / 2),
    bridgeHeight / 2,
    0,
    rampAngle
  );

  /*
   * رمپ سمت راست.
   */
  addBridgeSegment(
    chunk,
    realRampLength,
    ROAD_WIDTH,
    flatLength / 2 +
      rampLength / 2,
    bridgeHeight / 2,
    0,
    -rampAngle
  );

  addBridgeRails(
    chunk,
    0,
    bridgeHeight,
    flatLength
  );

  /*
   * مدل تزئینی پل فقط ظاهر پل را می‌سازد.
   * سطح آن وارد heightMeshes نمی‌شود.
   */
  placeModel(
    pick(
      URBAN_BRIDGES,
      random
    ),
    chunk,
    0,
    -0.3,
    0,
    {
      targetWidth:
        randomRange(
          random,
          21,
          27
        ),
      maxHeight: 11,
      brightness: 0.3,
      occlusion: true,
      castShadow: true,
    }
  );

  /*
   * خط‌کشی روی سطح بالایی.
   */
  for (
    let x = -8;
    x <= 8;
    x += 8
  ) {
    const mark =
      createSurface(
        lineXGeometry,
        lineMaterial,
        x,
        0,
        bridgeHeight + 0.18
      );

    chunk.add(mark);
  }
}

function buildRiverChunk(
  chunk: THREE.Group,
  random: () => number
) {
  addGround(
    chunk,
    emptyGroundMaterial
  );

  placeModel(
    pick(
      URBAN_RIVER,
      random
    ),
    chunk,
    0,
    0,
    Math.PI / 2,
    {
      y: -0.45,
      water: true,
      targetWidth:
        CHUNK_SIZE + 7,
      brightness: 0.16,
      castShadow: false,
    }
  );

  buildFunctionalBridge(
    chunk,
    random
  );

  /*
   * ساحل رودخانه.
   */
  for (
    let index = 0;
    index < 18;
    index++
  ) {
    const side =
      random() < 0.5
        ? -1
        : 1;

    const definition =
      random() < 0.55
        ? pick(
            FOREST_BUSHES,
            random
          )
        : pick(
            FOREST_GRASS,
            random
          );

    placeModel(
      definition,
      chunk,
      randomRange(
        random,
        -40,
        40
      ),
      side *
        randomRange(
          random,
          15,
          30
        ),
      random() *
        Math.PI *
        2,
      {
        targetWidth:
          randomRange(
            random,
            0.8,
            2
          ),
        brightness: 0.04,
        castShadow: false,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                                  TUNNEL                                    */
/* -------------------------------------------------------------------------- */

function spawnTunnel(
  chunk: THREE.Group,
  random: () => number,
  direction: Direction
) {
  const rotation =
    direction === "x"
      ? Math.PI / 2
      : 0;

  /*
   * خود تونل عمداً در heightMeshes ثبت نمی‌شود.
   * بنابراین Raycaster سقف آن را زمین تلقی نمی‌کند.
   */
  placeModel(
    pick(
      URBAN_TUNNEL,
      random
    ),
    chunk,
    0,
    0,
    rotation,
    {
      collision: false,
      height: false,
      occlusion: true,
      targetWidth: 17,
      maxHeight: 11,
      brightness: 0.3,
    }
  );

  /*
   * دیواره‌ها در امتداد طول تونل تکرار می‌شوند.
   */
  const alongPositions =
    [-26, -13, 0, 13, 26];

  const sideOffset = 6.4;

  for (
    let index = 0;
    index < alongPositions.length;
    index++
  ) {
    const along =
      alongPositions[index];

    for (const side of [-1, 1]) {
      const definition =
        URBAN_TUNNEL_WALLS[
          (index +
            (side === 1 ? 1 : 0)) %
            URBAN_TUNNEL_WALLS.length
        ];

      const x =
        direction === "x"
          ? along
          : sideOffset * side;

      const z =
        direction === "x"
          ? sideOffset * side
          : along;

      placeModel(
        definition,
        chunk,
        x,
        z,
        rotation,
        {
          collision: true,
          occlusion: true,
          targetWidth:
            randomRange(
              random,
              8,
              10
            ),
          maxHeight: 10,
          brightness: 0.3,
        }
      );
    }
  }
}

/* -------------------------------------------------------------------------- */
/*                                BUILD CHUNK                                 */
/* -------------------------------------------------------------------------- */

function buildCityChunk(
  chunk: THREE.Group,
  random: () => number,
  direction: Direction,
  tunnel: boolean
) {
  addGround(
    chunk,
    cityGroundMaterial
  );

  addRoad(
    chunk,
    direction
  );

  spawnBuildings(
    chunk,
    random,
    direction
  );

  spawnVehicles(
    chunk,
    random,
    getRoadPoints(direction)
  );

  spawnCityVegetation(
    chunk,
    random,
    direction
  );

  if (tunnel) {
    spawnTunnel(
      chunk,
      random,
      direction
    );
  }
}

function buildChunk(
  chunk: THREE.Group,
  cx: number,
  cz: number
) {
  const random =
    seededRandom(
      chunkSeed(cx, cz)
    );

  const kind =
    getChunkKind(cx, cz);

  const direction =
    getRoadDirection(
      cx,
      cz,
      kind
    );

  chunk.userData.kind = kind;

  if (kind === "park") {
    buildPark(
      chunk,
      random
    );

    return;
  }

  if (kind === "river") {
    buildRiverChunk(
      chunk,
      random
    );

    return;
  }

  buildCityChunk(
    chunk,
    random,
    direction,
    kind === "tunnel-x" ||
      kind === "tunnel-z"
  );
}

/* -------------------------------------------------------------------------- */
/*                              CHUNK MANAGEMENT                              */
/* -------------------------------------------------------------------------- */

export function generateChunk(
  scene: THREE.Scene,
  cx: number,
  cz: number
) {
  const key = `${cx},${cz}`;

  const existing =
    chunks.get(key);

  if (existing) {
    return existing;
  }

  const chunk =
    new THREE.Group();

  chunk.name =
    `Chunk_${key}`;

  chunk.position.set(
    cx * CHUNK_SIZE,
    0,
    cz * CHUNK_SIZE
  );

  chunk.userData.destroyed =
    false;

  scene.add(chunk);
  chunks.set(key, chunk);

  buildChunk(
    chunk,
    cx,
    cz
  );

  return chunk;
}

export async function updateChunks(
  scene: THREE.Scene,
  playerX: number,
  playerZ: number,
  renderDistance = 1
) {
  const { cx, cz } =
    getChunkCoord(
      playerX,
      playerZ
    );

  for (
    let x =
      cx - renderDistance;
    x <=
      cx + renderDistance;
    x++
  ) {
    for (
      let z =
        cz - renderDistance;
      z <=
        cz + renderDistance;
      z++
    ) {
      generateChunk(
        scene,
        x,
        z
      );
    }
  }

  destroyFarChunks(
    cx,
    cz,
    renderDistance
  );
}

function destroyFarChunks(
  centerX: number,
  centerZ: number,
  renderDistance: number
) {
  for (
    const [key, chunk]
    of chunks
  ) {
    const [cx, cz] =
      key
        .split(",")
        .map(Number);

    if (
      Math.abs(cx - centerX) <=
        renderDistance &&
      Math.abs(cz - centerZ) <=
        renderDistance
    ) {
      continue;
    }

    removeChunk(
      key,
      chunk
    );
  }
}

function removeChunk(
  key: string,
  chunk: THREE.Group
) {
  chunk.userData.destroyed =
    true;

  for (
    let index =
      colliders.length - 1;
    index >= 0;
    index--
  ) {
    if (
      colliders[index].chunk ===
      chunk
    ) {
      colliders.splice(
        index,
        1
      );
    }
  }

  const chunkObjects =
    new Set<THREE.Object3D>();

  chunk.traverse((object) => {
    chunkObjects.add(object);

    if (
      object instanceof THREE.Mesh &&
      object.userData
        .temporaryGeometry
    ) {
      object.geometry.dispose();
    }
  });

  for (
    let index =
      heightMeshes.length - 1;
    index >= 0;
    index--
  ) {
    if (
      chunkObjects.has(
        heightMeshes[index]
      )
    ) {
      heightMeshes.splice(
        index,
        1
      );
    }
  }

  for (
    let index =
      occlusionMeshes.length - 1;
    index >= 0;
    index--
  ) {
    if (
      chunkObjects.has(
        occlusionMeshes[index]
      )
    ) {
      occlusionMeshes.splice(
        index,
        1
      );
    }
  }

  chunk.removeFromParent();
  chunks.delete(key);
}

/* -------------------------------------------------------------------------- */
/*                                 COLLISION                                  */
/* -------------------------------------------------------------------------- */

export function resolveWorldCollision(
  player: THREE.Object3D,
  previousX: number,
  previousZ: number,
  radius = 0.55
) {
  const playerBox =
    new THREE.Box3(
      new THREE.Vector3(
        player.position.x -
          radius,
        player.position.y,
        player.position.z -
          radius
      ),
      new THREE.Vector3(
        player.position.x +
          radius,
        player.position.y + 2.5,
        player.position.z +
          radius
      )
    );

  for (const item of colliders) {
    if (
      !playerBox.intersectsBox(
        item.box
      )
    ) {
      continue;
    }

    const xBox =
      playerBox.clone();

    xBox.min.z =
      previousZ - radius;

    xBox.max.z =
      previousZ + radius;

    if (
      !xBox.intersectsBox(
        item.box
      )
    ) {
      player.position.z =
        previousZ;

      return;
    }

    const zBox =
      playerBox.clone();

    zBox.min.x =
      previousX - radius;

    zBox.max.x =
      previousX + radius;

    if (
      !zBox.intersectsBox(
        item.box
      )
    ) {
      player.position.x =
        previousX;

      return;
    }

    player.position.x =
      previousX;

    player.position.z =
      previousZ;

    return;
  }
}

/* -------------------------------------------------------------------------- */
/*                                   SPAWN                                    */
/* -------------------------------------------------------------------------- */

export function findSafeSpawnPosition(
  x = 0,
  z = 0,
  radius = 0.75
) {
  const candidates = [
    [x, z],
    [x + 5, z],
    [x - 5, z],
    [x, z + 5],
    [x, z - 5],
    [x + 8, z + 8],
    [x - 8, z + 8],
    [x + 8, z - 8],
    [x - 8, z - 8],
  ];

  for (const candidate of candidates) {
    const box =
      new THREE.Box3(
        new THREE.Vector3(
          candidate[0] - radius,
          0,
          candidate[1] - radius
        ),
        new THREE.Vector3(
          candidate[0] + radius,
          3,
          candidate[1] + radius
        )
      );

    const blocked =
      colliders.some((item) =>
        box.intersectsBox(item.box)
      );

    if (!blocked) {
      return new THREE.Vector3(
        candidate[0],
        PLAYER_BASE_Y,
        candidate[1]
      );
    }
  }

  return new THREE.Vector3(
    x,
    PLAYER_BASE_Y,
    z
  );
}

/* -------------------------------------------------------------------------- */
/*                              PLAYER HEIGHT                                 */
/* -------------------------------------------------------------------------- */

export function updatePlayerWorldHeight(
  player: THREE.Object3D,
  delta: number
) {
  rayOrigin.set(
    player.position.x,
    player.position.y + 12,
    player.position.z
  );

  raycaster.set(
    rayOrigin,
    downDirection
  );

  raycaster.far = 28;

  const hits =
    raycaster.intersectObjects(
      heightMeshes,
      false
    );

  let targetY =
    PLAYER_BASE_Y;

  /*
   * نزدیک‌ترین سطح معتبر زیر بازیکن انتخاب می‌شود.
   * سقف تونل در این فهرست وجود ندارد.
   */
  for (const hit of hits) {
    if (
      hit.point.y <=
      player.position.y + 2.1
    ) {
      targetY =
        hit.point.y +
        PLAYER_BASE_Y;

      break;
    }
  }

  const lerp =
    1 -
    Math.exp(
      -13 * delta
    );

  player.position.y =
    THREE.MathUtils.lerp(
      player.position.y,
      targetY,
      lerp
    );
}

/* -------------------------------------------------------------------------- */
/*                             CAMERA OCCLUSION                               */
/* -------------------------------------------------------------------------- */

export function updateCameraOcclusion(
  camera: THREE.PerspectiveCamera,
  target: THREE.Vector3
) {
  tempVector
    .copy(camera.position)
    .sub(target);

  const distance =
    tempVector.length();

  if (distance <= 0.1) {
    return;
  }

  tempVector.normalize();

  raycaster.set(
    target,
    tempVector
  );

  raycaster.far = distance;

  const hits =
    raycaster.intersectObjects(
      occlusionMeshes,
      false
    );

  if (hits.length === 0) {
    return;
  }

  const safeDistance =
    Math.max(
      3.2,
      hits[0].distance - 0.65
    );

  camera.position.copy(target);

  camera.position.addScaledVector(
    tempVector,
    safeDistance
  );
}

/* -------------------------------------------------------------------------- */
/*                              WORLD ANIMATION                               */
/* -------------------------------------------------------------------------- */

export function updateWorldAnimations(
  elapsedTime: number
) {
  const opacity =
    0.9 +
    Math.sin(
      elapsedTime * 0.75
    ) *
      0.035;

  for (const material of waterMaterials) {
    if (
      "opacity" in material &&
      typeof material.opacity ===
        "number"
    ) {
      material.transparent = true;
      material.opacity = opacity;
    }
  }
}

/* -------------------------------------------------------------------------- */
/*                                   CLEANUP                                  */
/* -------------------------------------------------------------------------- */

export function destroyAllChunks() {
  for (
    const [key, chunk]
    of [...chunks]
  ) {
    removeChunk(
      key,
      chunk
    );
  }

  chunks.clear();

  colliders.length = 0;
  heightMeshes.length = 0;
  occlusionMeshes.length = 0;

  waterMaterials.clear();
}
