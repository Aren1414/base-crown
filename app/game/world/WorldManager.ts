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

/*
 * چانک کوچک‌تر شده تا شهر متراکم‌تر باشد.
 * خیابان دیگر در تمام چانک‌ها ساخته نمی‌شود.
 */
export const CHUNK_SIZE = 96;

const HALF_CHUNK = CHUNK_SIZE / 2;

const ROAD_WIDTH = 8;
const SIDEWALK_WIDTH = 1.7;
const ALLEY_WIDTH = 3.1;

const PLAYER_BASE_Y = 0.06;

const BUILDING_ROAD_OFFSET =
  ROAD_WIDTH / 2 +
  SIDEWALK_WIDTH +
  8.5;

type ChunkKind =
  | "city"
  | "park"
  | "river-z"
  | "tunnel-x"
  | "tunnel-z";

type Direction = "x" | "z";

type RoadPoint = {
  x: number;
  z: number;
  direction: Direction;
};

type BuildingSlot = {
  x: number;
  z: number;
  rotation: number;
};

type Collider = {
  box: THREE.Box3;
  chunk: THREE.Group;
};

type PlaceModelOptions = {
  y?: number;
  collision?: boolean;
  height?: boolean;
  occlusion?: boolean;
  water?: boolean;

  /*
   * مدل بعد از بارگذاری به این عرض واقعی می‌رسد.
   * بنابراین تفاوت اندازه فایل‌های GLB مشکل ایجاد نمی‌کند.
   */
  targetFootprint?: number;
  maxHeight?: number;
};

type RoadLayout = {
  hasRoadX: boolean;
  hasRoadZ: boolean;
  mainDirection: Direction;
  points: RoadPoint[];
};

export const chunks =
  new Map<string, THREE.Group>();

const loader =
  new GLTFLoader();

const modelCache =
  new Map<
    string,
    Promise<THREE.Group>
  >();

const colliders: Collider[] = [];

const heightMeshes:
  THREE.Object3D[] = [];

const occlusionMeshes:
  THREE.Object3D[] = [];

const animatedWaterMaterials =
  new Set<THREE.Material>();

const raycaster =
  new THREE.Raycaster();

const rayOrigin =
  new THREE.Vector3();

const rayDirection =
  new THREE.Vector3(
    0,
    -1,
    0
  );

const temporaryVector =
  new THREE.Vector3();

const temporaryBox =
  new THREE.Box3();

const temporarySize =
  new THREE.Vector3();

/* -------------------------------------------------------------------------- */
/*                               TEXTURE HELPERS                              */
/* -------------------------------------------------------------------------- */

function createNoiseTexture(
  baseR: number,
  baseG: number,
  baseB: number,
  variation: number,
  repeat = 10
) {
  const size = 128;

  const data =
    new Uint8Array(
      size * size * 4
    );

  let seed =
    (
      baseR * 73856093 ^
      baseG * 19349663 ^
      baseB * 83492791
    ) >>> 0;

  const random = () => {
    seed += 0x6d2b79f5;

    let value = seed;

    value = Math.imul(
      value ^ (value >>> 15),
      value | 1
    );

    value ^= value +
      Math.imul(
        value ^ (value >>> 7),
        value | 61
      );

    return (
      (
        (
          value ^
          (value >>> 14)
        ) >>> 0
      ) /
      4294967296
    );
  };

  for (
    let index = 0;
    index < data.length;
    index += 4
  ) {
    const noise =
      (
        random() - 0.5
      ) * variation;

    data[index] =
      THREE.MathUtils.clamp(
        baseR + noise,
        0,
        255
      );

    data[index + 1] =
      THREE.MathUtils.clamp(
        baseG + noise,
        0,
        255
      );

    data[index + 2] =
      THREE.MathUtils.clamp(
        baseB + noise,
        0,
        255
      );

    data[index + 3] = 255;
  }

  const texture =
    new THREE.DataTexture(
      data,
      size,
      size,
      THREE.RGBAFormat
    );

  texture.wrapS =
    THREE.RepeatWrapping;

  texture.wrapT =
    THREE.RepeatWrapping;

  texture.repeat.set(
    repeat,
    repeat
  );

  texture.colorSpace =
    THREE.SRGBColorSpace;

  texture.needsUpdate = true;

  return texture;
}

const asphaltTexture =
  createNoiseTexture(
    67,
    69,
    68,
    28,
    13
  );

const alleyTexture =
  createNoiseTexture(
    84,
    82,
    77,
    34,
    12
  );

const sidewalkTexture =
  createNoiseTexture(
    132,
    130,
    122,
    26,
    16
  );

const cityGroundTexture =
  createNoiseTexture(
    87,
    95,
    80,
    34,
    14
  );

const parkGroundTexture =
  createNoiseTexture(
    75,
    112,
    60,
    42,
    18
  );

/* -------------------------------------------------------------------------- */
/*                                  MATERIALS                                 */
/* -------------------------------------------------------------------------- */

const cityGroundMaterial =
  new THREE.MeshStandardMaterial({
    map: cityGroundTexture,
    color: 0xffffff,
    roughness: 1,
    metalness: 0,
  });

const roadMaterial =
  new THREE.MeshStandardMaterial({
    map: asphaltTexture,
    color: 0xffffff,
    roughness: 0.94,
    metalness: 0.015,
  });

const alleyMaterial =
  new THREE.MeshStandardMaterial({
    map: alleyTexture,
    color: 0xffffff,
    roughness: 0.98,
    metalness: 0,
  });

const sidewalkMaterial =
  new THREE.MeshStandardMaterial({
    map: sidewalkTexture,
    color: 0xffffff,
    roughness: 0.94,
    metalness: 0,
  });

const roadMarkingMaterial =
  new THREE.MeshStandardMaterial({
    color: 0xd6c98a,
    roughness: 0.82,
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });

const roadEdgeMaterial =
  new THREE.MeshStandardMaterial({
    color: 0xd1d0c8,
    roughness: 0.9,
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });

const parkGroundMaterial =
  new THREE.MeshStandardMaterial({
    map: parkGroundTexture,
    color: 0xffffff,
    roughness: 1,
    metalness: 0,
  });

const grassBladeMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x6d984e,
    roughness: 1,
    metalness: 0,
    side: THREE.DoubleSide,
  });

const curbMaterial =
  new THREE.MeshStandardMaterial({
    color: 0xaaa79d,
    roughness: 0.94,
    metalness: 0,
  });

/* -------------------------------------------------------------------------- */
/*                                  GEOMETRY                                  */
/* -------------------------------------------------------------------------- */

const cityGroundGeometry =
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
    0.16
  );

const curbZGeometry =
  new THREE.BoxGeometry(
    0.16,
    0.13,
    CHUNK_SIZE
  );

const markingXGeometry =
  new THREE.PlaneGeometry(
    4.3,
    0.13
  );

const markingZGeometry =
  new THREE.PlaneGeometry(
    0.13,
    4.3
  );

const roadEdgeXGeometry =
  new THREE.PlaneGeometry(
    CHUNK_SIZE,
    0.09
  );

const roadEdgeZGeometry =
  new THREE.PlaneGeometry(
    0.09,
    CHUNK_SIZE
  );

const grassBladeGeometry =
  new THREE.PlaneGeometry(
    0.055,
    0.3
  );

grassBladeGeometry.translate(
  0,
  0.15,
  0
);

/* -------------------------------------------------------------------------- */
/*                                  RANDOM                                    */
/* -------------------------------------------------------------------------- */

function seededRandom(
  seed: number
) {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;

    let value = state;

    value = Math.imul(
      value ^ (value >>> 15),
      value | 1
    );

    value ^= value +
      Math.imul(
        value ^ (value >>> 7),
        value | 61
      );

    return (
      (
        (
          value ^
          (value >>> 14)
        ) >>> 0
      ) /
      4294967296
    );
  };
}

function chunkSeed(
  cx: number,
  cz: number
) {
  return (
    Math.imul(
      cx,
      73856093
    ) ^
    Math.imul(
      cz,
      19349663
    )
  ) >>> 0;
}

function pick<T>(
  array: readonly T[],
  random: () => number
): T {
  return array[
    Math.floor(
      random() *
      array.length
    )
  ];
}

function randomRange(
  random: () => number,
  min: number,
  max: number
) {
  return (
    min +
    random() *
    (max - min)
  );
}

function positiveModulo(
  value: number,
  divisor: number
) {
  return (
    (
      value %
      divisor
    ) +
    divisor
  ) % divisor;
}

/* -------------------------------------------------------------------------- */
/*                              CHUNK CLASSIFICATION                          */
/* -------------------------------------------------------------------------- */

export function getChunkCoord(
  x: number,
  z: number
) {
  return {
    cx: Math.floor(
      (
        x +
        HALF_CHUNK
      ) /
      CHUNK_SIZE
    ),

    cz: Math.floor(
      (
        z +
        HALF_CHUNK
      ) /
      CHUNK_SIZE
    ),
  };
}

/*
 * رودخانه به‌صورت یک مسیر پیوسته در چند چانک ادامه دارد.
 * این حالت از رودخانه‌های تصادفی و تکه‌تکه طبیعی‌تر است.
 */
function isRiverColumn(
  cx: number
) {
  return (
    positiveModulo(
      cx,
      11
    ) === 5
  );
}

function hasHorizontalRoad(
  cz: number
) {
  return (
    positiveModulo(
      cz,
      3
    ) === 0
  );
}

function hasVerticalRoad(
  cx: number
) {
  return (
    positiveModulo(
      cx,
      4
    ) === 0
  );
}

function getChunkKind(
  cx: number,
  cz: number
): ChunkKind {
  if (
    isRiverColumn(cx)
  ) {
    return "river-z";
  }

  const value =
    Math.abs(
      Math.imul(
        cx,
        17
      ) +
      Math.imul(
        cz,
        31
      )
    );

  const roadX =
    hasHorizontalRoad(cz);

  const roadZ =
    hasVerticalRoad(cx);

  /*
   * تونل فقط روی مسیر خیابان قرار می‌گیرد
   * و بسیار کمتر از قبل ظاهر می‌شود.
   */
  if (
    roadX &&
    value > 0 &&
    value % 29 === 0
  ) {
    return "tunnel-x";
  }

  if (
    roadZ &&
    value > 0 &&
    value % 31 === 0
  ) {
    return "tunnel-z";
  }

  /*
   * پارک فقط در بلوک‌هایی ساخته می‌شود
   * که چهارراه اصلی ندارند.
   */
  if (
    !roadX &&
    !roadZ &&
    value > 0 &&
    value % 9 === 0
  ) {
    return "park";
  }

  return "city";
}

/* -------------------------------------------------------------------------- */
/*                                MODEL LOADER                                */
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
      (
        resolve,
        reject
      ) => {
        loader.load(
          url,
          (gltf) => {
            configureSourceModel(
              gltf.scene
            );

            resolve(
              gltf.scene
            );
          },
          undefined,
          reject
        );
      }
    );

  modelCache.set(
    url,
    promise
  );

  return promise;
}

function configureSourceModel(
  object: THREE.Object3D
) {
  object.traverse(
    (child) => {
      if (
        !(
          child instanceof
          THREE.Mesh
        )
      ) {
        return;
      }

      child.castShadow = true;
      child.receiveShadow = true;
      child.frustumCulled = true;
    }
  );
}

function normalizeModelFootprint(
  object: THREE.Object3D,
  targetFootprint: number,
  maxHeight?: number
) {
  object.updateWorldMatrix(
    true,
    true
  );

  temporaryBox.setFromObject(
    object
  );

  if (
    temporaryBox.isEmpty()
  ) {
    return;
  }

  temporaryBox.getSize(
    temporarySize
  );

  const currentFootprint =
    Math.max(
      temporarySize.x,
      temporarySize.z
    );

  if (
    currentFootprint <=
    0.001
  ) {
    return;
  }

  let multiplier =
    targetFootprint /
    currentFootprint;

  if (
    maxHeight &&
    temporarySize.y *
      multiplier >
      maxHeight
  ) {
    multiplier =
      maxHeight /
      temporarySize.y;
  }

  object.scale.multiplyScalar(
    multiplier
  );
}

function alignModelToGround(
  object: THREE.Object3D,
  targetY: number
) {
  object.updateWorldMatrix(
    true,
    true
  );

  temporaryBox.setFromObject(
    object
  );

  if (
    Number.isFinite(
      temporaryBox.min.y
    )
  ) {
    object.position.y +=
      targetY -
      temporaryBox.min.y;
  }
}

function registerCollider(
  object: THREE.Object3D,
  chunk: THREE.Group,
  shrink = 0.35
) {
  object.updateWorldMatrix(
    true,
    true
  );

  const box =
    new THREE.Box3()
      .setFromObject(
        object
      );

  if (
    box.isEmpty()
  ) {
    return;
  }

  box.getSize(
    temporarySize
  );

  const horizontalShrink =
    Math.min(
      shrink,
      temporarySize.x * 0.05,
      temporarySize.z * 0.05
    );

  box.min.x +=
    horizontalShrink;

  box.max.x -=
    horizontalShrink;

  box.min.z +=
    horizontalShrink;

  box.max.z -=
    horizontalShrink;

  colliders.push({
    box,
    chunk,
  });
}

function registerModelMeshes(
  object: THREE.Object3D,
  options: PlaceModelOptions,
  chunk: THREE.Group
) {
  if (
    options.collision
  ) {
    registerCollider(
      object,
      chunk
    );
  }

  object.traverse(
    (child) => {
      if (
        !(
          child instanceof
          THREE.Mesh
        )
      ) {
        return;
      }

      if (
        options.height
      ) {
        heightMeshes.push(
          child
        );
      }

      if (
        options.occlusion
      ) {
        occlusionMeshes.push(
          child
        );
      }

      if (
        options.water
      ) {
        const materials =
          Array.isArray(
            child.material
          )
            ? child.material
            : [child.material];

        for (
          const material
          of materials
        ) {
          animatedWaterMaterials.add(
            material
          );
        }
      }
    }
  );
}

function placeModel(
  definition: ModelDef,
  chunk: THREE.Group,
  x: number,
  z: number,
  rotationY = 0,
  options: PlaceModelOptions = {}
) {
  void loadSource(
    definition.url
  )
    .then(
      (source) => {
        if (
          chunk.userData
            .destroyed ||
          !chunk.parent
        ) {
          return;
        }

        const object =
          source.clone(true);

        object.scale.setScalar(
          definition.scale
        );

        object.rotation.y =
          rotationY;

        object.position.set(
          x,
          options.y ?? 0,
          z
        );

        if (
          options.targetFootprint
        ) {
          normalizeModelFootprint(
            object,
            options.targetFootprint,
            options.maxHeight
          );
        }

        alignModelToGround(
          object,
          options.y ?? 0
        );

        chunk.add(
          object
        );

        object.updateWorldMatrix(
          true,
          true
        );

        registerModelMeshes(
          object,
          options,
          chunk
        );
      }
    )
    .catch(
      (error) => {
        console.error(
          `Model load failed: ${definition.url}`,
          error
        );
      }
    );
}

/* -------------------------------------------------------------------------- */
/*                              SURFACE HELPERS                               */
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

function addCityGround(
  chunk: THREE.Group
) {
  const ground =
    createSurface(
      cityGroundGeometry,
      cityGroundMaterial,
      0,
      0,
      0
    );

  ground.name =
    "CityGround";

  chunk.add(
    ground
  );

  heightMeshes.push(
    ground
  );
}

/* -------------------------------------------------------------------------- */
/*                                    ROAD                                    */
/* -------------------------------------------------------------------------- */

function addRoadMarkings(
  chunk: THREE.Group,
  direction: Direction
) {
  const offsets: number[] =
    [];

  for (
    let offset =
      -HALF_CHUNK + 5;
    offset <
      HALF_CHUNK - 4;
    offset += 10
  ) {
    offsets.push(
      offset
    );
  }

  const geometry =
    direction === "x"
      ? markingXGeometry
      : markingZGeometry;

  const markings =
    new THREE.InstancedMesh(
      geometry,
      roadMarkingMaterial,
      offsets.length
    );

  const matrix =
    new THREE.Matrix4();

  const position =
    new THREE.Vector3();

  const quaternion =
    new THREE.Quaternion();

  const rotation =
    new THREE.Euler(
      -Math.PI / 2,
      0,
      0
    );

  quaternion.setFromEuler(
    rotation
  );

  const scale =
    new THREE.Vector3(
      1,
      1,
      1
    );

  offsets.forEach(
    (
      offset,
      index
    ) => {
      position.set(
        direction === "x"
          ? offset
          : 0,
        0.055,
        direction === "x"
          ? 0
          : offset
      );

      matrix.compose(
        position,
        quaternion,
        scale
      );

      markings.setMatrixAt(
        index,
        matrix
      );
    }
  );

  markings.instanceMatrix
    .needsUpdate = true;

  markings.frustumCulled =
    true;

  chunk.add(
    markings
  );
}

function addRoadEdges(
  chunk: THREE.Group,
  direction: Direction
) {
  const edgeOffset =
    ROAD_WIDTH / 2 -
    0.34;

  for (
    const side
    of [-1, 1]
  ) {
    const edge =
      createSurface(
        direction === "x"
          ? roadEdgeXGeometry
          : roadEdgeZGeometry,
        roadEdgeMaterial,
        direction === "x"
          ? 0
          : edgeOffset *
            side,
        direction === "x"
          ? edgeOffset *
            side
          : 0,
        0.052
      );

    chunk.add(
      edge
    );
  }
}

function addSidewalk(
  chunk: THREE.Group,
  direction: Direction,
  side: -1 | 1
) {
  const sidewalkOffset =
    ROAD_WIDTH / 2 +
    SIDEWALK_WIDTH / 2;

  const sidewalk =
    createSurface(
      direction === "x"
        ? sidewalkXGeometry
        : sidewalkZGeometry,
      sidewalkMaterial,
      direction === "x"
        ? 0
        : sidewalkOffset *
          side,
      direction === "x"
        ? sidewalkOffset *
          side
        : 0,
      0.045
    );

  chunk.add(
    sidewalk
  );

  heightMeshes.push(
    sidewalk
  );

  const curbOffset =
    ROAD_WIDTH / 2 +
    0.08;

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
      : curbOffset *
        side,
    0.075,
    direction === "x"
      ? curbOffset *
        side
      : 0
  );

  curb.castShadow = false;
  curb.receiveShadow = true;

  chunk.add(
    curb
  );
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

  chunk.add(
    road
  );

  heightMeshes.push(
    road
  );

  addSidewalk(
    chunk,
    direction,
    -1
  );

  addSidewalk(
    chunk,
    direction,
    1
  );

  addRoadMarkings(
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
  const length = 25;

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
      0.026
    );

  alley.userData
    .temporaryGeometry = true;

  chunk.add(
    alley
  );

  heightMeshes.push(
    alley
  );
}

function buildRoadLayout(
  chunk: THREE.Group,
  cx: number,
  cz: number,
  kind: ChunkKind,
  random: () => number
): RoadLayout {
  let roadX =
    hasHorizontalRoad(cz);

  let roadZ =
    hasVerticalRoad(cx);

  /*
   * روی رودخانه فقط خیابانی ساخته می‌شود
   * که پل بتواند آن را قطع کند.
   */
  if (
    kind === "river-z"
  ) {
    roadZ = false;
  }

  /*
   * پارک داخل یک بلوک کامل قرار می‌گیرد
   * و خیابان از وسط آن عبور نمی‌کند.
   */
  if (
    kind === "park"
  ) {
    roadX = false;
    roadZ = false;
  }

  /*
   * در چهارراه، هر دو خیابان ساخته می‌شوند.
   * چهارراه فقط هر 12 چانک یک‌بار رخ می‌دهد.
   */
  if (
    roadX
  ) {
    addRoad(
      chunk,
      "x"
    );
  }

  if (
    roadZ
  ) {
    addRoad(
      chunk,
      "z"
    );
  }

  const points:
    RoadPoint[] = [];

  if (
    roadX
  ) {
    for (
      let offset = -38;
      offset <= 38;
      offset += 15
    ) {
      points.push({
        x: offset,
        z:
          random() < 0.5
            ? -2
            : 2,
        direction: "x",
      });
    }
  }

  if (
    roadZ
  ) {
    for (
      let offset = -38;
      offset <= 38;
      offset += 15
    ) {
      points.push({
        x:
          random() < 0.5
            ? -2
            : 2,
        z: offset,
        direction: "z",
      });
    }
  }

  /*
   * کوچه فقط در بلوک بدون خیابان،
   * آن هم با احتمال کم و طول کوتاه ساخته می‌شود.
   */
  if (
    kind === "city" &&
    !roadX &&
    !roadZ &&
    random() < 0.18
  ) {
    const direction:
      Direction =
      random() < 0.5
        ? "x"
        : "z";

    addShortAlley(
      chunk,
      direction,
      random() < 0.5
        ? -1
        : 1
    );
  }

  const mainDirection:
    Direction =
    roadX
      ? "x"
      : roadZ
        ? "z"
        : random() < 0.5
          ? "x"
          : "z";

  return {
    hasRoadX: roadX,
    hasRoadZ: roadZ,
    mainDirection,
    points,
  };
}

/* -------------------------------------------------------------------------- */
/*                                  BUILDINGS                                 */
/* -------------------------------------------------------------------------- */

function createRoadBuildingSlots(
  layout: RoadLayout
): BuildingSlot[] {
  const slots:
    BuildingSlot[] = [];

  const positions =
    [-36, -18, 0, 18, 36];

  if (
    layout.hasRoadX &&
    !layout.hasRoadZ
  ) {
    for (
      const x
      of positions
    ) {
      slots.push({
        x,
        z:
          -BUILDING_ROAD_OFFSET,
        rotation: 0,
      });

      slots.push({
        x,
        z:
          BUILDING_ROAD_OFFSET,
        rotation: Math.PI,
      });
    }

    return slots;
  }

  if (
    layout.hasRoadZ &&
    !layout.hasRoadX
  ) {
    for (
      const z
      of positions
    ) {
      slots.push({
        x:
          -BUILDING_ROAD_OFFSET,
        z,
        rotation:
          Math.PI / 2,
      });

      slots.push({
        x:
          BUILDING_ROAD_OFFSET,
        z,
        rotation:
          -Math.PI / 2,
      });
    }

    return slots;
  }

  if (
    layout.hasRoadX &&
    layout.hasRoadZ
  ) {
    const corner = 25;

    return [
      {
        x: -corner,
        z: -corner,
        rotation:
          Math.PI / 4,
      },
      {
        x: corner,
        z: -corner,
        rotation:
          -Math.PI / 4,
      },
      {
        x: -corner,
        z: corner,
        rotation:
          Math.PI -
          Math.PI / 4,
      },
      {
        x: corner,
        z: corner,
        rotation:
          Math.PI +
          Math.PI / 4,
      },
    ];
  }

  /*
   * بلوک بدون خیابان:
   * ساختمان‌ها کل محوطه را پر می‌کنند
   * و فقط یک حیاط کوچک مرکزی باقی می‌ماند.
   */
  const grid =
    [-30, -10, 10, 30];

  for (
    const x
    of grid
  ) {
    for (
      const z
      of grid
    ) {
      if (
        Math.abs(x) < 15 &&
        Math.abs(z) < 15
      ) {
        continue;
      }

      slots.push({
        x,
        z,
        rotation:
          Math.atan2(
            -x,
            -z
          ),
      });
    }
  }

  return slots;
}

function getBuildingTargetSize(
  definition: ModelDef,
  random: () => number
) {
  const isVilla =
    definition.url
      .toLowerCase()
      .includes(
        "villa"
      );

  if (
    isVilla
  ) {
    return randomRange(
      random,
      12.5,
      15.5
    );
  }

  return randomRange(
    random,
    15.5,
    20
  );
}

function spawnBuildings(
  chunk: THREE.Group,
  random: () => number,
  kind: ChunkKind,
  layout: RoadLayout
) {
  if (
    kind === "park" ||
    kind === "river-z"
  ) {
    return;
  }

  const slots =
    createRoadBuildingSlots(
      layout
    );

  for (
    const slot
    of slots
  ) {
    /*
     * تقریباً تمام جایگاه‌ها پر می‌شوند.
     * فقط تعداد کمی فضای خالی برای تنوع باقی می‌ماند.
     */
    if (
      random() < 0.08
    ) {
      continue;
    }

    const definition =
      pick(
        URBAN_BUILDINGS,
        random
      );

    const targetSize =
      getBuildingTargetSize(
        definition,
        random
      );

    placeModel(
      definition,
      chunk,
      slot.x +
        randomRange(
          random,
          -0.9,
          0.9
        ),
      slot.z +
        randomRange(
          random,
          -0.9,
          0.9
        ),
      slot.rotation +
        randomRange(
          random,
          -0.025,
          0.025
        ),
      {
        collision: true,
        occlusion: true,
        targetFootprint:
          targetSize,
        maxHeight: 36,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                                   VEHICLES                                 */
/* -------------------------------------------------------------------------- */

function shuffleArray<T>(
  array: T[],
  random: () => number
) {
  for (
    let index =
      array.length - 1;
    index > 0;
    index--
  ) {
    const target =
      Math.floor(
        random() *
        (index + 1)
      );

    [
      array[index],
      array[target],
    ] = [
      array[target],
      array[index],
    ];
  }

  return array;
}

function spawnVehicles(
  chunk: THREE.Group,
  random: () => number,
  roadPoints: RoadPoint[]
) {
  if (
    roadPoints.length === 0
  ) {
    return;
  }

  const availablePoints =
    shuffleArray(
      [...roadPoints],
      random
    );

  /*
   * تعداد خودرو محدود است تا خیابان کاملاً
   * با ماشین مسدود نشود.
   */
  const count =
    Math.min(
      availablePoints.length,
      2 +
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
      availablePoints[index];

    const lane =
      random() < 0.5
        ? -1.9
        : 1.9;

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
        targetFootprint:
          randomRange(
            random,
            3.7,
            5
          ),
        maxHeight: 3.4,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                                    PARK                                    */
/* -------------------------------------------------------------------------- */

function createParkGround(
  chunk: THREE.Group,
  random: () => number
) {
  const geometry =
    new THREE.PlaneGeometry(
      CHUNK_SIZE - 8,
      CHUNK_SIZE - 8,
      14,
      14
    );

  const positions =
    geometry.attributes
      .position;

  for (
    let index = 0;
    index <
      positions.count;
    index++
  ) {
    const x =
      positions.getX(
        index
      );

    const y =
      positions.getY(
        index
      );

    const edgeDistance =
      Math.min(
        HALF_CHUNK -
          Math.abs(x),
        HALF_CHUNK -
          Math.abs(y)
      );

    const strength =
      THREE.MathUtils.clamp(
        edgeDistance / 9,
        0,
        1
      );

    positions.setZ(
      index,
      randomRange(
        random,
        -0.08,
        0.16
      ) *
        strength
    );
  }

  positions.needsUpdate =
    true;

  geometry.computeVertexNormals();

  const parkGround =
    new THREE.Mesh(
      geometry,
      parkGroundMaterial
    );

  parkGround.rotation.x =
    -Math.PI / 2;

  parkGround.position.y =
    0.025;

  parkGround.receiveShadow =
    true;

  parkGround.userData
    .temporaryGeometry = true;

  chunk.add(
    parkGround
  );

  heightMeshes.push(
    parkGround
  );
}

function addFineGrass(
  chunk: THREE.Group,
  random: () => number,
  count = 850
) {
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

  const scale =
    new THREE.Vector3();

  const rotation =
    new THREE.Euler();

  for (
    let index = 0;
    index < count;
    index++
  ) {
    position.set(
      randomRange(
        random,
        -42,
        42
      ),
      randomRange(
        random,
        0.04,
        0.11
      ),
      randomRange(
        random,
        -42,
        42
      )
    );

    rotation.set(
      0,
      random() *
        Math.PI *
        2,
      randomRange(
        random,
        -0.12,
        0.12
      )
    );

    quaternion.setFromEuler(
      rotation
    );

    const height =
      randomRange(
        random,
        0.55,
        1.35
      );

    scale.set(
      randomRange(
        random,
        0.7,
        1.15
      ),
      height,
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

  grass.instanceMatrix
    .needsUpdate = true;

  grass.castShadow = false;
  grass.receiveShadow = false;
  grass.frustumCulled = true;

  chunk.add(
    grass
  );
}

function spawnParkModels(
  chunk: THREE.Group,
  random: () => number
) {
  const treePositions = [
    [-34, -34],
    [-17, -32],
    [2, -35],
    [22, -31],
    [36, -18],
    [34, 3],
    [32, 25],
    [15, 34],
    [-7, 33],
    [-28, 30],
    [-35, 10],
    [-32, -11],
  ];

  for (
    const position
    of treePositions
  ) {
    if (
      random() < 0.12
    ) {
      continue;
    }

    placeModel(
      pick(
        FOREST_TREES,
        random
      ),
      chunk,
      position[0] +
        randomRange(
          random,
          -2,
          2
        ),
      position[1] +
        randomRange(
          random,
          -2,
          2
        ),
      random() *
        Math.PI *
        2,
      {
        collision: true,
        targetFootprint:
          randomRange(
            random,
            3.8,
            5.6
          ),
        maxHeight: 12,
      }
    );
  }

  for (
    let index = 0;
    index < 18;
    index++
  ) {
    const angle =
      random() *
      Math.PI *
      2;

    const radius =
      randomRange(
        random,
        8,
        38
      );

    placeModel(
      pick(
        FOREST_BUSHES,
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
        targetFootprint:
          randomRange(
            random,
            1.2,
            2.5
          ),
      }
    );
  }

  for (
    let index = 0;
    index < 22;
    index++
  ) {
    const definition =
      random() < 0.55
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
        targetFootprint:
          randomRange(
            random,
            0.45,
            1.2
          ),
      }
    );
  }
}

function buildPark(
  chunk: THREE.Group,
  random: () => number
) {
  createParkGround(
    chunk,
    random
  );

  addFineGrass(
    chunk,
    random
  );

  spawnParkModels(
    chunk,
    random
  );
}

/* -------------------------------------------------------------------------- */
/*                              CITY VEGETATION                               */
/* -------------------------------------------------------------------------- */

function isNearRoad(
  x: number,
  z: number,
  layout: RoadLayout,
  margin = 7
) {
  if (
    layout.hasRoadX &&
    Math.abs(z) <
      ROAD_WIDTH / 2 +
      SIDEWALK_WIDTH +
      margin
  ) {
    return true;
  }

  if (
    layout.hasRoadZ &&
    Math.abs(x) <
      ROAD_WIDTH / 2 +
      SIDEWALK_WIDTH +
      margin
  ) {
    return true;
  }

  return false;
}

function spawnCityVegetation(
  chunk: THREE.Group,
  random: () => number,
  layout: RoadLayout
) {
  const count =
    layout.hasRoadX ||
    layout.hasRoadZ
      ? 11
      : 16;

  let created = 0;
  let attempts = 0;

  while (
    created < count &&
    attempts <
      count * 6
  ) {
    attempts++;

    const x =
      randomRange(
        random,
        -42,
        42
      );

    const z =
      randomRange(
        random,
        -42,
        42
      );

    if (
      isNearRoad(
        x,
        z,
        layout,
        2.5
      )
    ) {
      continue;
    }

    const value =
      random();

    let definition:
      ModelDef;

    let targetFootprint:
      number;

    let collision =
      false;

    if (
      value < 0.28
    ) {
      definition =
        pick(
          FOREST_TREES,
          random
        );

      targetFootprint =
        randomRange(
          random,
          2.7,
          4.2
        );

      collision = true;
    } else if (
      value < 0.64
    ) {
      definition =
        pick(
          FOREST_BUSHES,
          random
        );

      targetFootprint =
        randomRange(
          random,
          1,
          2
        );
    } else if (
      value < 0.82
    ) {
      definition =
        pick(
          FOREST_GRASS,
          random
        );

      targetFootprint =
        randomRange(
          random,
          0.5,
          1
        );
    } else {
      definition =
        pick(
          FOREST_FLOWERS,
          random
        );

      targetFootprint =
        randomRange(
          random,
          0.45,
          0.9
        );
    }

    placeModel(
      definition,
      chunk,
      x,
      z,
      random() *
        Math.PI *
        2,
      {
        collision,
        targetFootprint,
        maxHeight:
          collision
            ? 9
            : undefined,
      }
    );

    created++;
  }
}

/* -------------------------------------------------------------------------- */
/*                               RIVER + BRIDGE                               */
/* -------------------------------------------------------------------------- */

function spawnRiverAndBridge(
  chunk: THREE.Group,
  random: () => number,
  cx: number,
  cz: number
) {
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
      y: -0.38,
      water: true,
      targetFootprint:
        CHUNK_SIZE + 8,
    }
  );

  /*
   * پل فقط جایی ساخته می‌شود که خیابان افقی
   * رودخانه عمودی را قطع می‌کند.
   */
  if (
    !hasHorizontalRoad(cz)
  ) {
    return;
  }

  placeModel(
    pick(
      URBAN_BRIDGES,
      random
    ),
    chunk,
    0,
    0,
    0,
    {
      height: true,
      occlusion: true,
      targetFootprint:
        randomRange(
          random,
          20,
          28
        ),
      maxHeight: 12,
    }
  );

  /*
   * خودروهای روی پل.
   */
  const bridgeVehicles:
    RoadPoint[] = [
      {
        x: -18,
        z: -1.8,
        direction: "x",
      },
      {
        x: 18,
        z: 1.8,
        direction: "x",
      },
    ];

  spawnVehicles(
    chunk,
    random,
    bridgeVehicles
  );
}

/* -------------------------------------------------------------------------- */
/*                                   TUNNEL                                   */
/* -------------------------------------------------------------------------- */

function spawnTunnel(
  chunk: THREE.Group,
  random: () => number,
  kind: ChunkKind
) {
  if (
    kind !== "tunnel-x" &&
    kind !== "tunnel-z"
  ) {
    return;
  }

  const alongX =
    kind === "tunnel-x";

  const tunnelX =
    alongX
      ? 29
      : 0;

  const tunnelZ =
    alongX
      ? 0
      : 29;

  const rotation =
    alongX
      ? Math.PI / 2
      : 0;

  placeModel(
    pick(
      URBAN_TUNNEL,
      random
    ),
    chunk,
    tunnelX,
    tunnelZ,
    rotation,
    {
      height: true,
      occlusion: true,
      targetFootprint:
        randomRange(
          random,
          14,
          18
        ),
      maxHeight: 12,
    }
  );

  const offsets =
    [-8.5, 8.5];

  offsets.forEach(
    (
      offset,
      index
    ) => {
      placeModel(
        URBAN_TUNNEL_WALLS[
          index %
          URBAN_TUNNEL_WALLS.length
        ],
        chunk,
        alongX
          ? tunnelX
          : tunnelX +
            offset,
        alongX
          ? tunnelZ +
            offset
          : tunnelZ,
        rotation,
        {
          collision: true,
          occlusion: true,
          targetFootprint:
            randomRange(
              random,
              8,
              11
            ),
          maxHeight: 11,
        }
      );
    }
  );
}

/* -------------------------------------------------------------------------- */
/*                                BUILD CHUNK                                 */
/* -------------------------------------------------------------------------- */

function buildChunk(
  chunk: THREE.Group,
  cx: number,
  cz: number
) {
  const random =
    seededRandom(
      chunkSeed(
        cx,
        cz
      )
    );

  const kind =
    getChunkKind(
      cx,
      cz
    );

  chunk.userData.kind =
    kind;

  if (
    kind === "park"
  ) {
    buildPark(
      chunk,
      random
    );

    return;
  }

  addCityGround(
    chunk
  );

  if (
    kind === "river-z"
  ) {
    spawnRiverAndBridge(
      chunk,
      random,
      cx,
      cz
    );

    /*
     * در دو سمت رودخانه چند درخت و بوته وجود دارد.
     */
    const riverLayout:
      RoadLayout = {
      hasRoadX:
        hasHorizontalRoad(cz),
      hasRoadZ: false,
      mainDirection: "x",
      points: [],
    };

    spawnCityVegetation(
      chunk,
      random,
      riverLayout
    );

    return;
  }

  const layout =
    buildRoadLayout(
      chunk,
      cx,
      cz,
      kind,
      random
    );

  spawnBuildings(
    chunk,
    random,
    kind,
    layout
  );

  spawnVehicles(
    chunk,
    random,
    layout.points
  );

  spawnTunnel(
    chunk,
    random,
    kind
  );

  spawnCityVegetation(
    chunk,
    random,
    layout
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

  if (
    existing
  ) {
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

  chunk.userData
    .destroyed = false;

  scene.add(
    chunk
  );

  chunks.set(
    key,
    chunk
  );

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
  const {
    cx,
    cz,
  } = getChunkCoord(
    playerX,
    playerZ
  );

  /*
   * ابتدا چانک مرکزی ساخته می‌شود.
   */
  generateChunk(
    scene,
    cx,
    cz
  );

  /*
   * سپس چانک‌های اطراف براساس فاصله ساخته می‌شوند.
   */
  for (
    let distance = 1;
    distance <=
      renderDistance;
    distance++
  ) {
    for (
      let x =
        cx - distance;
      x <=
        cx + distance;
      x++
    ) {
      for (
        let z =
          cz - distance;
        z <=
          cz + distance;
        z++
      ) {
        if (
          Math.max(
            Math.abs(
              x - cx
            ),
            Math.abs(
              z - cz
            )
          ) !== distance
        ) {
          continue;
        }

        generateChunk(
          scene,
          x,
          z
        );
      }
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
    const [
      key,
      chunk,
    ]
    of chunks
  ) {
    const [
      cx,
      cz,
    ] =
      key
        .split(",")
        .map(Number);

    if (
      Math.abs(
        cx -
        centerX
      ) <=
        renderDistance &&
      Math.abs(
        cz -
        centerZ
      ) <=
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
  chunk.userData
    .destroyed = true;

  for (
    let index =
      colliders.length - 1;
    index >= 0;
    index--
  ) {
    if (
      colliders[index]
        .chunk === chunk
    ) {
      colliders.splice(
        index,
        1
      );
    }
  }

  const chunkObjects =
    new Set<
      THREE.Object3D
    >();

  chunk.traverse(
    (object) => {
      chunkObjects.add(
        object
      );

      if (
        object instanceof
          THREE.Mesh &&
        object.userData
          .temporaryGeometry
      ) {
        object.geometry.dispose();
      }
    }
  );

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

  chunks.delete(
    key
  );
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
  const playerY =
    player.position.y;

  const playerBox =
    new THREE.Box3(
      new THREE.Vector3(
        player.position.x -
          radius,
        playerY,
        player.position.z -
          radius
      ),
      new THREE.Vector3(
        player.position.x +
          radius,
        playerY + 2.5,
        player.position.z +
          radius
      )
    );

  for (
    const item
    of colliders
  ) {
    if (
      !playerBox
        .intersectsBox(
          item.box
        )
    ) {
      continue;
    }

    /*
     * ابتدا حرکت X را جداگانه آزمایش می‌کنیم.
     * این کار باعث می‌شود بازیکن کنار دیوار بلغزد
     * و کاملاً متوقف نشود.
     */
    const xOnlyBox =
      playerBox.clone();

    xOnlyBox.min.z =
      previousZ -
      radius;

    xOnlyBox.max.z =
      previousZ +
      radius;

    if (
      !xOnlyBox.intersectsBox(
        item.box
      )
    ) {
      player.position.z =
        previousZ;

      return;
    }

    const zOnlyBox =
      playerBox.clone();

    zOnlyBox.min.x =
      previousX -
      radius;

    zOnlyBox.max.x =
      previousX +
      radius;

    if (
      !zOnlyBox.intersectsBox(
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

  for (
    const candidate
    of candidates
  ) {
    const candidateBox =
      new THREE.Box3(
        new THREE.Vector3(
          candidate[0] -
            radius,
          0,
          candidate[1] -
            radius
        ),
        new THREE.Vector3(
          candidate[0] +
            radius,
          3,
          candidate[1] +
            radius
        )
      );

    const blocked =
      colliders.some(
        (item) =>
          candidateBox
            .intersectsBox(
              item.box
            )
      );

    if (
      !blocked
    ) {
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
    player.position.y + 14,
    player.position.z
  );

  raycaster.set(
    rayOrigin,
    rayDirection
  );

  raycaster.far = 32;

  const intersections =
    raycaster.intersectObjects(
      heightMeshes,
      false
    );

  let targetY =
    PLAYER_BASE_Y;

  if (
    intersections.length >
    0
  ) {
    targetY =
      intersections[0]
        .point.y +
      PLAYER_BASE_Y;
  }

  const heightLerp =
    1 -
    Math.exp(
      -12 * delta
    );

  player.position.y =
    THREE.MathUtils.lerp(
      player.position.y,
      targetY,
      heightLerp
    );
}

/* -------------------------------------------------------------------------- */
/*                             CAMERA OCCLUSION                               */
/* -------------------------------------------------------------------------- */

export function updateCameraOcclusion(
  camera:
    THREE.PerspectiveCamera,
  target: THREE.Vector3
) {
  temporaryVector
    .copy(
      camera.position
    )
    .sub(
      target
    );

  const distance =
    temporaryVector.length();

  if (
    distance <= 0.1
  ) {
    return;
  }

  temporaryVector.normalize();

  raycaster.set(
    target,
    temporaryVector
  );

  raycaster.far =
    distance;

  const intersections =
    raycaster.intersectObjects(
      occlusionMeshes,
      false
    );

  if (
    intersections.length ===
    0
  ) {
    return;
  }

  const safeDistance =
    Math.max(
      3.2,
      intersections[0]
        .distance -
        0.7
    );

  camera.position.copy(
    target
  );

  camera.position
    .addScaledVector(
      temporaryVector,
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
    0.88 +
    Math.sin(
      elapsedTime *
        0.85
    ) *
      0.045;

  for (
    const material
    of animatedWaterMaterials
  ) {
    if (
      !(
        "opacity" in
        material
      ) ||
      typeof material.opacity !==
        "number"
    ) {
      continue;
    }

    material.transparent =
      true;

    material.opacity =
      opacity;
  }
}

/* -------------------------------------------------------------------------- */
/*                                   CLEANUP                                  */
/* -------------------------------------------------------------------------- */

export function destroyAllChunks() {
  for (
    const [
      key,
      chunk,
    ]
    of [
      ...chunks,
    ]
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

  animatedWaterMaterials.clear();
    }
