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
const ROAD_WIDTH = 8.2;
const SIDEWALK_WIDTH = 1.55;
const ALLEY_WIDTH = 3.4;
const PLAYER_BASE_Y = 0.055;

type Direction = "x" | "z";

type ChunkKind =
  | "city"
  | "park"
  | "river"
  | "tunnel-x"
  | "tunnel-z";

type ColliderType =
  | "building"
  | "tree"
  | "vehicle"
  | "wall"
  | "rail";

type Collider = {
  box: THREE.Box3;
  chunk: THREE.Group;
};

type RoadPoint = {
  x: number;
  z: number;
  direction: Direction;
};

type ModelOptions = {
  y?: number;

  collision?: boolean;
  colliderType?: ColliderType;

  height?: boolean;
  occlusion?: boolean;
  water?: boolean;

  targetWidth?: number;
  targetHeight?: number;
  maxHeight?: number;

  brightness?: number;
  castShadow?: boolean;
};

export const chunks =
  new Map<string, THREE.Group>();

const loader = new GLTFLoader();

const modelCache =
  new Map<string, Promise<THREE.Group>>();

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

const tempCenter =
  new THREE.Vector3();

const tempVector =
  new THREE.Vector3();

let cameraOcclusionDistance = 0;
let cameraOcclusionReady = false;

/* -------------------------------------------------------------------------- */
/*                                  MATERIALS                                 */
/* -------------------------------------------------------------------------- */

const cityGroundMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x292e2d,
    roughness: 1,
    metalness: 0,
  });

const parkGroundMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x263b29,
    roughness: 1,
    metalness: 0,
  });

const riverGroundMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x252b2a,
    roughness: 1,
    metalness: 0,
  });

const roadMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x3b3f3f,
    roughness: 0.94,
    metalness: 0.01,
  });

const alleyMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x484b49,
    roughness: 0.98,
    metalness: 0,
  });

const sidewalkMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x92928c,
    roughness: 0.95,
    metalness: 0,
  });

const curbMaterial =
  new THREE.MeshStandardMaterial({
    color: 0xb5b3aa,
    roughness: 0.92,
    metalness: 0,
  });

const centerLineMaterial =
  new THREE.MeshStandardMaterial({
    color: 0xd8cc82,
    roughness: 0.85,
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });

const edgeLineMaterial =
  new THREE.MeshStandardMaterial({
    color: 0xd8dad6,
    roughness: 0.88,
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });

const grassBladeMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x547f43,
    roughness: 1,
    metalness: 0,
    side: THREE.DoubleSide,
  });

const bridgeSurfaceMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x414645,
    roughness: 0.91,
    metalness: 0.015,
  });

const bridgeRailMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x858b89,
    roughness: 0.75,
    metalness: 0.12,
  });

/* -------------------------------------------------------------------------- */
/*                                  GEOMETRY                                  */
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
    0.13,
    0.15
  );

const curbZGeometry =
  new THREE.BoxGeometry(
    0.15,
    0.13,
    CHUNK_SIZE
  );

const centerLineXGeometry =
  new THREE.PlaneGeometry(
    4.6,
    0.13
  );

const centerLineZGeometry =
  new THREE.PlaneGeometry(
    0.13,
    4.6
  );

const edgeLineXGeometry =
  new THREE.PlaneGeometry(
    CHUNK_SIZE,
    0.09
  );

const edgeLineZGeometry =
  new THREE.PlaneGeometry(
    0.09,
    CHUNK_SIZE
  );

const grassBladeGeometry =
  new THREE.PlaneGeometry(
    0.055,
    0.24
  );

grassBladeGeometry.translate(
  0,
  0.12,
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
  values: readonly T[],
  random: () => number
): T {
  return values[
    Math.floor(random() * values.length)
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

function shuffle<T>(
  values: T[],
  random: () => number
) {
  for (
    let index = values.length - 1;
    index > 0;
    index--
  ) {
    const target =
      Math.floor(
        random() * (index + 1)
      );

    [
      values[index],
      values[target],
    ] = [
      values[target],
      values[index],
    ];
  }

  return values;
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

  if (modulo(cx, 11) === 5) {
    return "river";
  }

  const value =
    Math.abs(
      cx * 37 + cz * 61
    );

  if (
    value > 0 &&
    value % 11 === 0
  ) {
    return "park";
  }

  if (
    value > 0 &&
    value % 31 === 0
  ) {
    return "tunnel-x";
  }

  if (
    value > 0 &&
    value % 37 === 0
  ) {
    return "tunnel-z";
  }

  return "city";
}

function getRoadDirection(
  cx: number,
  cz: number,
  kind: ChunkKind
): Direction {
  if (
    kind === "river" ||
    kind === "tunnel-x"
  ) {
    return "x";
  }

  if (kind === "tunnel-z") {
    return "z";
  }

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
  const result =
    material.clone();

  if (
    result instanceof
      THREE.MeshStandardMaterial ||
    result instanceof
      THREE.MeshPhysicalMaterial ||
    result instanceof
      THREE.MeshLambertMaterial ||
    result instanceof
      THREE.MeshPhongMaterial ||
    result instanceof
      THREE.MeshBasicMaterial
  ) {
    result.color.lerp(
      new THREE.Color(0xffffff),
      amount
    );

    if (
      result instanceof
        THREE.MeshStandardMaterial ||
      result instanceof
        THREE.MeshPhysicalMaterial
    ) {
      result.roughness =
        Math.max(
          result.roughness,
          0.58
        );

      result.metalness =
        Math.min(
          result.metalness,
          0.18
        );
    }

    result.needsUpdate = true;
  }

  return result;
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

    if (Array.isArray(child.material)) {
      child.material =
        child.material.map(
          (material) =>
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

  if (tempBox.isEmpty()) {
    return;
  }

  tempBox.getSize(tempSize);

  if (
    tempSize.x <= 0.001 ||
    tempSize.y <= 0.001 ||
    tempSize.z <= 0.001
  ) {
    return;
  }

  let multiplier = 1;

  if (options.targetWidth) {
    multiplier =
      options.targetWidth /
      Math.max(
        tempSize.x,
        tempSize.z
      );
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
      targetY - tempBox.min.y;
  }
}

/* -------------------------------------------------------------------------- */
/*                                  COLLISION                                 */
/* -------------------------------------------------------------------------- */

function getColliderFactors(
  type: ColliderType
) {
  switch (type) {
    case "tree":
      return {
        x: 0.18,
        z: 0.18,
        y: 0.72,
        minimum: 0.42,
      };

    case "vehicle":
      return {
        x: 0.72,
        z: 0.72,
        y: 0.72,
        minimum: 0.55,
      };

    case "wall":
      return {
        x: 0.72,
        z: 0.72,
        y: 0.88,
        minimum: 0.48,
      };

    case "rail":
      return {
        x: 0.95,
        z: 0.95,
        y: 0.95,
        minimum: 0.25,
      };

    default:
      return {
        x: 0.68,
        z: 0.68,
        y: 0.88,
        minimum: 0.6,
      };
  }
}

function registerCollider(
  object: THREE.Object3D,
  chunk: THREE.Group,
  type: ColliderType
) {
  object.updateWorldMatrix(
    true,
    true
  );

  const bounds =
    new THREE.Box3().setFromObject(
      object
    );

  if (bounds.isEmpty()) {
    return;
  }

  bounds.getSize(tempSize);
  bounds.getCenter(tempCenter);

  const factors =
    getColliderFactors(type);

  let width =
    Math.max(
      factors.minimum,
      tempSize.x * factors.x
    );

  let depth =
    Math.max(
      factors.minimum,
      tempSize.z * factors.z
    );

  const height =
    Math.max(
      0.8,
      tempSize.y * factors.y
    );

  /*
   * برخی ساختمان‌های خرابه دارای قطعات تزئینی بسیار پهن هستند.
   * Collider آن‌ها نباید بیشتر از بدنه اصلی ساختمان باشد.
   */
  if (type === "building") {
    width =
      Math.min(width, 13.5);

    depth =
      Math.min(depth, 13.5);
  }

  if (type === "tree") {
    width =
      Math.min(width, 1.35);

    depth =
      Math.min(depth, 1.35);
  }

  const box =
    new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(
        tempCenter.x,
        bounds.min.y +
          height / 2,
        tempCenter.z
      ),
      new THREE.Vector3(
        width,
        height,
        depth
      )
    );

  colliders.push({
    box,
    chunk,
  });
}

function registerModel(
  object: THREE.Object3D,
  chunk: THREE.Group,
  options: ModelOptions
) {
  if (options.collision) {
    registerCollider(
      object,
      chunk,
      options.colliderType ??
        "building"
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

      registerModel(
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

  mesh.position.set(
    x,
    y,
    z
  );

  mesh.receiveShadow = true;

  return mesh;
}

function addGround(
  chunk: THREE.Group,
  material: THREE.Material
) {
  const ground =
    createSurface(
      groundGeometry,
      material,
      0,
      0,
      0
    );

  ground.name = "Ground";

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
  const offsets =
    [-35, -25, -15, -5, 5, 15, 25, 35];

  const lines =
    new THREE.InstancedMesh(
      direction === "x"
        ? centerLineXGeometry
        : centerLineZGeometry,
      centerLineMaterial,
      offsets.length
    );

  const matrix =
    new THREE.Matrix4();

  const position =
    new THREE.Vector3();

  const quaternion =
    new THREE.Quaternion()
      .setFromEuler(
        new THREE.Euler(
          -Math.PI / 2,
          0,
          0
        )
      );

  const scale =
    new THREE.Vector3(1, 1, 1);

  offsets.forEach(
    (offset, index) => {
      position.set(
        direction === "x"
          ? offset
          : 0,
        0.053,
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
  );

  lines.instanceMatrix.needsUpdate =
    true;

  lines.castShadow = false;
  lines.receiveShadow = false;

  chunk.add(lines);
}

function addRoadEdges(
  chunk: THREE.Group,
  direction: Direction
) {
  const offset =
    ROAD_WIDTH / 2 - 0.31;

  for (const side of [-1, 1]) {
    const line =
      createSurface(
        direction === "x"
          ? edgeLineXGeometry
          : edgeLineZGeometry,
        edgeLineMaterial,
        direction === "x"
          ? 0
          : offset * side,
        direction === "x"
          ? offset * side
          : 0,
        0.052
      );

    chunk.add(line);
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
    ROAD_WIDTH / 2 + 0.075;

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
      0.07,
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

  addRoadEdges(
    chunk,
    direction
  );
}

function addShortAlley(
  chunk: THREE.Group,
  direction: Direction,
  side: -1 | 1
) {
  const length = 24;

  const geometry =
    direction === "x"
      ? new THREE.PlaneGeometry(
          length,
          ALLEY_WIDTH
        )
      : new THREE.PlaneGeometry(
          ALLEY_WIDTH,
          length
        );

  const center =
    side *
    (
      HALF_CHUNK -
      length / 2
    );

  const alley =
    createSurface(
      geometry,
      alleyMaterial,
      direction === "x"
        ? center
        : 0,
      direction === "x"
        ? 0
        : center,
      0.027
    );

  alley.userData.temporaryGeometry =
    true;

  chunk.add(alley);
  heightMeshes.push(alley);
}

function getRoadPoints(
  direction: Direction
): RoadPoint[] {
  const result: RoadPoint[] = [];

  for (
    let offset = -35;
    offset <= 35;
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

function isVilla(
  definition: ModelDef
) {
  return definition.url
    .toLowerCase()
    .includes("villa");
}

function getBuildingSlots(
  direction: Direction
) {
  const along =
    [-35, -17.5, 0, 17.5, 35];

  const sideOffset = 17.6;

  const slots: Array<{
    x: number;
    z: number;
    rotation: number;
  }> = [];

  for (const value of along) {
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

function spawnBuildings(
  chunk: THREE.Group,
  random: () => number,
  direction: Direction
) {
  const slots =
    getBuildingSlots(direction);

  for (const slot of slots) {
    if (random() < 0.025) {
      continue;
    }

    const definition =
      pick(
        URBAN_BUILDINGS,
        random
      );

    const villa =
      isVilla(definition);

    placeModel(
      definition,
      chunk,
      slot.x +
        randomRange(
          random,
          -0.35,
          0.35
        ),
      slot.z +
        randomRange(
          random,
          -0.35,
          0.35
        ),
      slot.rotation +
        randomRange(
          random,
          -0.012,
          0.012
        ),
      {
        collision: true,
        colliderType: "building",

        /*
         * فقط برخی ساختمان‌ها وارد سیستم انسداد دوربین می‌شوند.
         * این کار تیک دوربین را بسیار کمتر می‌کند.
         */
        occlusion:
          random() < 0.38,

        targetWidth:
          villa
            ? randomRange(
                random,
                14.5,
                17
              )
            : randomRange(
                random,
                18,
                21.5
              ),

        /*
         * ساختمان‌ها عریض باقی می‌مانند،
         * اما ارتفاعشان برای دوربین ایزومتریک محدود می‌شود.
         */
        maxHeight:
          villa
            ? randomRange(
                random,
                9,
                12
              )
            : randomRange(
                random,
                15,
                20
              ),

        brightness: 0.3,
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
    shuffle(
      [...points],
      random
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
        colliderType: "vehicle",

        targetWidth:
          randomRange(
            random,
            3.8,
            5
          ),

        maxHeight: 3,
        brightness: 0.32,
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
  /*
   * تمام چمن‌ها یک InstancedMesh هستند،
   * بنابراین با وجود تراکم بالا سبک باقی می‌مانند.
   */
  const count = 1150;

  const grass =
    new THREE.InstancedMesh(
      grassBladeGeometry,
      grassBladeMaterial,
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
      0.034,
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
        -0.06,
        0.06
      )
    );

    quaternion.setFromEuler(
      rotation
    );

    scale.set(
      randomRange(
        random,
        0.75,
        1.1
      ),
      randomRange(
        random,
        0.55,
        1.05
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
  grass.frustumCulled = true;

  chunk.add(grass);
}

function spawnParkTrees(
  chunk: THREE.Group,
  random: () => number
) {
  for (
    let index = 0;
    index < 26;
    index++
  ) {
    const angle =
      (
        index /
        26
      ) *
        Math.PI *
        2 +
      randomRange(
        random,
        -0.2,
        0.2
      );

    const radius =
      index < 16
        ? randomRange(
            random,
            26,
            39
          )
        : randomRange(
            random,
            10,
            27
          );

    placeModel(
      pick(
        FOREST_TREES,
        random
      ),
      chunk,
      Math.cos(angle) * radius,
      Math.sin(angle) * radius,
      random() * Math.PI * 2,
      {
        collision: true,
        colliderType: "tree",

        /*
         * تنه و شاخ‌وبرگ کامل دیده می‌شوند،
         * ولی ارتفاع برای نمای ایزومتریک کوتاه شده است.
         */
        targetHeight:
          randomRange(
            random,
            5.2,
            7.6
          ),

        brightness: 0.06,
      }
    );
  }
}

function spawnParkDetails(
  chunk: THREE.Group,
  random: () => number
) {
  for (
    let index = 0;
    index < 38;
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
        -39,
        39
      ),
      randomRange(
        random,
        -39,
        39
      ),
      random() * Math.PI * 2,
      {
        targetWidth:
          randomRange(
            random,
            1.1,
            2.4
          ),

        brightness: 0.04,
        castShadow: false,
      }
    );
  }

  for (
    let index = 0;
    index < 55;
    index++
  ) {
    const definition =
      random() < 0.62
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
        -40,
        40
      ),
      randomRange(
        random,
        -40,
        40
      ),
      random() * Math.PI * 2,
      {
        targetWidth:
          randomRange(
            random,
            0.4,
            1.05
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

  spawnParkTrees(
    chunk,
    random
  );

  spawnParkDetails(
    chunk,
    random
  );
}

/* -------------------------------------------------------------------------- */
/*                              CITY VEGETATION                               */
/* -------------------------------------------------------------------------- */

function spawnCityVegetation(
  chunk: THREE.Group,
  random: () => number,
  direction: Direction
) {
  const positions =
    [-37, -25, -13, 13, 25, 37];

  for (const value of positions) {
    if (random() < 0.2) {
      continue;
    }

    const side =
      random() < 0.5
        ? -1
        : 1;

    const sideOffset =
      randomRange(
        random,
        10.7,
        12
      ) * side;

    placeModel(
      pick(
        FOREST_TREES,
        random
      ),
      chunk,
      direction === "x"
        ? value
        : sideOffset,
      direction === "x"
        ? sideOffset
        : value,
      random() * Math.PI * 2,
      {
        collision: true,
        colliderType: "tree",

        targetHeight:
          randomRange(
            random,
            4.7,
            6.7
          ),

        brightness: 0.06,
      }
    );
  }

  for (
    let index = 0;
    index < 20;
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
        10,
        13
      ) * side;

    const definition =
      random() < 0.58
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
      random() * Math.PI * 2,
      {
        targetWidth:
          randomRange(
            random,
            0.65,
            1.6
          ),

        brightness: 0.03,
        castShadow: false,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                                   BRIDGE                                   */
/* -------------------------------------------------------------------------- */

function createBridgeSection(
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
      0.32,
      width
    );

  const section =
    new THREE.Mesh(
      geometry,
      bridgeSurfaceMaterial
    );

  section.position.set(
    x,
    y,
    z
  );

  section.rotation.z =
    rotationZ;

  section.receiveShadow = true;
  section.castShadow = false;

  section.userData.temporaryGeometry =
    true;

  chunk.add(section);
  heightMeshes.push(section);

  return section;
}

function createBridgeRail(
  chunk: THREE.Group,
  x: number,
  y: number,
  z: number,
  length: number,
  rotationZ: number
) {
  const geometry =
    new THREE.BoxGeometry(
      length,
      0.65,
      0.14
    );

  const rail =
    new THREE.Mesh(
      geometry,
      bridgeRailMaterial
    );

  rail.position.set(
    x,
    y,
    z
  );

  rail.rotation.z =
    rotationZ;

  rail.castShadow = true;
  rail.receiveShadow = true;

  rail.userData.temporaryGeometry =
    true;

  chunk.add(rail);

  registerCollider(
    rail,
    chunk,
    "rail"
  );
}

function buildFunctionalBridge(
  chunk: THREE.Group,
  random: () => number
) {
  const bridgeHeight = 3.25;
  const flatLength = 20;
  const rampHorizontalLength = 27;

  const rampAngle =
    Math.atan2(
      bridgeHeight,
      rampHorizontalLength
    );

  const rampLength =
    Math.sqrt(
      rampHorizontalLength *
        rampHorizontalLength +
      bridgeHeight *
        bridgeHeight
    );

  const leftX =
    -(
      flatLength / 2 +
      rampHorizontalLength / 2
    );

  const rightX =
    flatLength / 2 +
    rampHorizontalLength / 2;

  createBridgeSection(
    chunk,
    flatLength,
    ROAD_WIDTH,
    0,
    bridgeHeight,
    0,
    0
  );

  createBridgeSection(
    chunk,
    rampLength,
    ROAD_WIDTH,
    leftX,
    bridgeHeight / 2,
    0,
    rampAngle
  );

  createBridgeSection(
    chunk,
    rampLength,
    ROAD_WIDTH,
    rightX,
    bridgeHeight / 2,
    0,
    -rampAngle
  );

  const railOffset =
    ROAD_WIDTH / 2 + 0.12;

  for (const side of [-1, 1]) {
    createBridgeRail(
      chunk,
      0,
      bridgeHeight + 0.47,
      railOffset * side,
      flatLength,
      0
    );

    createBridgeRail(
      chunk,
      leftX,
      bridgeHeight / 2 + 0.47,
      railOffset * side,
      rampLength,
      rampAngle
    );

    createBridgeRail(
      chunk,
      rightX,
      bridgeHeight / 2 + 0.47,
      railOffset * side,
      rampLength,
      -rampAngle
    );
  }

  /*
   * مدل GLB فقط ظاهر تزئینی پل است.
   * سطح قابل حرکت پل با BoxGeometry ساخته شده است.
   */
  placeModel(
    pick(
      URBAN_BRIDGES,
      random
    ),
    chunk,
    0,
    -0.25,
    0,
    {
      targetWidth:
        randomRange(
          random,
          21,
          26
        ),

      maxHeight: 9,
      brightness: 0.31,
      occlusion: true,
    }
  );
}

function buildRiverChunk(
  chunk: THREE.Group,
  random: () => number
) {
  addGround(
    chunk,
    riverGroundMaterial
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
      y: -0.4,
      water: true,

      targetWidth:
        CHUNK_SIZE + 6,

      brightness: 0.14,
      castShadow: false,
    }
  );

  buildFunctionalBridge(
    chunk,
    random
  );

  for (
    let index = 0;
    index < 24;
    index++
  ) {
    const side =
      random() < 0.5
        ? -1
        : 1;

    const definition =
      random() < 0.6
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
        -41,
        41
      ),
      side *
        randomRange(
          random,
          16,
          33
        ),
      random() * Math.PI * 2,
      {
        targetWidth:
          randomRange(
            random,
            0.75,
            1.8
          ),

        brightness: 0.03,
        castShadow: false,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                                   TUNNEL                                   */
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
   * خود تونل height ندارد؛
   * بنابراین سقف آن به‌عنوان زمین شناسایی نمی‌شود.
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
      maxHeight: 10,

      brightness: 0.31,
    }
  );

  /*
   * دیواره‌ها در طول تونل تکرار می‌شوند.
   */
  const alongPositions =
    [-34, -22, -10, 2, 14, 26, 38];

  const sideOffset = 6.1;

  for (
    let index = 0;
    index <
      alongPositions.length;
    index++
  ) {
    const along =
      alongPositions[index];

    for (const side of [-1, 1]) {
      const definition =
        URBAN_TUNNEL_WALLS[
          (
            index +
            (side === 1 ? 1 : 0)
          ) %
            URBAN_TUNNEL_WALLS.length
        ];

      placeModel(
        definition,
        chunk,
        direction === "x"
          ? along
          : sideOffset * side,
        direction === "x"
          ? sideOffset * side
          : along,
        rotation,
        {
          collision: true,
          colliderType: "wall",

          occlusion:
            index % 2 === 0,

          targetWidth:
            randomRange(
              random,
              7.5,
              9.5
            ),

          maxHeight: 9.5,
          brightness: 0.31,
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

  /*
   * کوچه کوتاه و کم‌تعداد.
   */
  if (
    !tunnel &&
    random() < 0.16
  ) {
    addShortAlley(
      chunk,
      direction === "x"
        ? "z"
        : "x",
      random() < 0.5
        ? -1
        : 1
    );
  }

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
    getChunkKind(
      cx,
      cz
    );

  const direction =
    getRoadDirection(
      cx,
      cz,
      kind
    );

  chunk.userData.kind =
    kind;

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
  const key =
    `${cx},${cz}`;

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
      Math.abs(
        cx - centerX
      ) <= renderDistance &&
      Math.abs(
        cz - centerZ
      ) <= renderDistance
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

  const objects =
    new Set<THREE.Object3D>();

  chunk.traverse((object) => {
    objects.add(object);

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
      objects.has(
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
      objects.has(
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
/*                              PLAYER COLLISION                              */
/* -------------------------------------------------------------------------- */

function playerCollides(
  player: THREE.Object3D,
  x: number,
  z: number,
  radius: number
) {
  const box =
    new THREE.Box3(
      new THREE.Vector3(
        x - radius,
        player.position.y + 0.08,
        z - radius
      ),
      new THREE.Vector3(
        x + radius,
        player.position.y + 2.1,
        z + radius
      )
    );

  for (const collider of colliders) {
    if (
      box.intersectsBox(
        collider.box
      )
    ) {
      return true;
    }
  }

  return false;
}

export function resolveWorldCollision(
  player: THREE.Object3D,
  previousX: number,
  previousZ: number,
  radius = 0.38
) {
  const targetX =
    player.position.x;

  const targetZ =
    player.position.z;

  if (
    !playerCollides(
      player,
      targetX,
      targetZ,
      radius
    )
  ) {
    return;
  }

  /*
   * حرکت روی محور X آزاد است:
   * بازیکن در امتداد دیوار سر می‌خورد.
   */
  if (
    !playerCollides(
      player,
      targetX,
      previousZ,
      radius
    )
  ) {
    player.position.z =
      previousZ;

    return;
  }

  /*
   * حرکت روی محور Z آزاد است.
   */
  if (
    !playerCollides(
      player,
      previousX,
      targetZ,
      radius
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
}

/* -------------------------------------------------------------------------- */
/*                                   SPAWN                                    */
/* -------------------------------------------------------------------------- */

export function findSafeSpawnPosition(
  x = 0,
  z = 0,
  radius = 0.55
) {
  const candidates = [
    [x, z],
    [x + 4, z],
    [x - 4, z],
    [x, z + 4],
    [x, z - 4],
    [x + 7, z + 7],
    [x - 7, z + 7],
    [x + 7, z - 7],
    [x - 7, z - 7],
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
          2.5,
          candidate[1] + radius
        )
      );

    const blocked =
      colliders.some(
        (collider) =>
          box.intersectsBox(
            collider.box
          )
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
    player.position.y + 11,
    player.position.z
  );

  raycaster.set(
    rayOrigin,
    downDirection
  );

  raycaster.far = 26;

  const hits =
    raycaster.intersectObjects(
      heightMeshes,
      false
    );

  let targetY =
    PLAYER_BASE_Y;

  for (const hit of hits) {
    /*
     * از پرش ناگهانی روی سقف یا سطحی بسیار بالاتر جلوگیری می‌کند.
     */
    if (
      hit.point.y <=
      player.position.y + 1.65
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
  target: THREE.Vector3,
  delta = 1 / 60
) {
  tempVector
    .copy(camera.position)
    .sub(target);

  const desiredDistance =
    tempVector.length();

  if (
    desiredDistance <= 0.1
  ) {
    return;
  }

  tempVector.normalize();

  raycaster.set(
    target,
    tempVector
  );

  raycaster.far =
    desiredDistance;

  const hits =
    raycaster.intersectObjects(
      occlusionMeshes,
      false
    );

  let targetDistance =
    desiredDistance;

  if (hits.length > 0) {
    targetDistance =
      Math.max(
        4.2,
        hits[0].distance - 0.45
      );
  }

  if (!cameraOcclusionReady) {
    cameraOcclusionDistance =
      targetDistance;

    cameraOcclusionReady = true;
  }

  /*
   * نزدیک‌شدن دوربین سریع‌تر و عقب‌رفتن آن نرم‌تر انجام می‌شود.
   */
  const speed =
    targetDistance <
    cameraOcclusionDistance
      ? 12
      : 4;

  const lerp =
    1 -
    Math.exp(
      -speed * delta
    );

  cameraOcclusionDistance =
    THREE.MathUtils.lerp(
      cameraOcclusionDistance,
      targetDistance,
      lerp
    );

  camera.position
    .copy(target)
    .addScaledVector(
      tempVector,
      cameraOcclusionDistance
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
      0.03;

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

  cameraOcclusionDistance = 0;
  cameraOcclusionReady = false;
  }
