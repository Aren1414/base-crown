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
const SIDEWALK_WIDTH = 1.45;
const ALLEY_WIDTH = 3;

const RIVER_WIDTH = 27;
const RIVER_BANK_WIDTH = 5;

const PLAYER_BASE_Y = 0.055;

type Direction = "x" | "z";

type ChunkKind =
  | "city"
  | "park"
  | "river"
  | "tunnel-x"
  | "tunnel-z";

type SimpleColliderType =
  | "tree"
  | "vehicle"
  | "wall"
  | "rail";

type SimpleCollider = {
  box: THREE.Box3;
  chunk: THREE.Group;
};

type PreciseCollisionMesh = {
  mesh: THREE.Mesh;
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
  preciseCollision?: boolean;
  colliderType?: SimpleColliderType;

  height?: boolean;
  occlusion?: boolean;
  water?: boolean;
  foundation?: boolean;

  targetWidth?: number;
  targetHeight?: number;
  maxHeight?: number;

  brightness?: number;
  castShadow?: boolean;

  rotationX?: number;
  rotationZ?: number;

  sinkIntoGround?: number;
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

const simpleColliders:
  SimpleCollider[] = [];

const preciseCollisionMeshes:
  PreciseCollisionMesh[] = [];

const heightMeshes:
  THREE.Object3D[] = [];

const occlusionMeshes:
  THREE.Object3D[] = [];

const waterMaterials =
  new Set<THREE.Material>();

const waterTextures =
  new Set<THREE.Texture>();

const raycaster =
  new THREE.Raycaster();

const rayOrigin =
  new THREE.Vector3();

const rayDirection =
  new THREE.Vector3();

const downDirection =
  new THREE.Vector3(
    0,
    -1,
    0
  );

const tempBox =
  new THREE.Box3();

const tempSize =
  new THREE.Vector3();

const tempCenter =
  new THREE.Vector3();

const tempVector =
  new THREE.Vector3();

const tempVectorB =
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
    color: 0x252a29,
    roughness: 1,
    metalness: 0,
  });

const roadMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x303433,
    roughness: 1,
    metalness: 0,
  });

const roadPatchMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x232625,
    roughness: 1,
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: -3,
    polygonOffsetUnits: -3,
  });

const roadDustMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x4c4a42,
    roughness: 1,
    metalness: 0,
    transparent: true,
    opacity: 0.42,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });

const crackMaterial =
  new THREE.MeshBasicMaterial({
    color: 0x171918,
    transparent: true,
    opacity: 0.82,
    depthWrite: false,
  });

const potholeMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x191c1b,
    roughness: 1,
    metalness: 0,
    polygonOffset: true,
    polygonOffsetFactor: -5,
    polygonOffsetUnits: -5,
  });

const alleyMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x3c403e,
    roughness: 1,
    metalness: 0,
  });

const sidewalkMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x73736d,
    roughness: 1,
    metalness: 0,
  });

const brokenSidewalkMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x555851,
    roughness: 1,
    metalness: 0,
  });

const curbMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x8a8981,
    roughness: 1,
    metalness: 0,
  });

const centerLineMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x9f9565,
    roughness: 1,
    metalness: 0,
    transparent: true,
    opacity: 0.46,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });

const edgeLineMaterial =
  new THREE.MeshStandardMaterial({
    color: 0xb1b2ab,
    roughness: 1,
    metalness: 0,
    transparent: true,
    opacity: 0.32,
    polygonOffset: true,
    polygonOffsetFactor: -4,
    polygonOffsetUnits: -4,
  });

const grassBladeMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x486f3d,
    roughness: 1,
    metalness: 0,
    side: THREE.DoubleSide,
  });

const bridgeSurfaceMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x353a38,
    roughness: 1,
    metalness: 0,
  });

const bridgeRailMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x626864,
    roughness: 0.85,
    metalness: 0.08,
  });

const tunnelWallMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x3e423f,
    roughness: 1,
    metalness: 0,
  });

const riverBankMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x353b31,
    roughness: 1,
    metalness: 0,
  });

const foundationMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x30332f,
    roughness: 1,
    metalness: 0,
  });

const foundationEdgeMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x252824,
    roughness: 1,
    metalness: 0,
  });

const rubbleMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x4b4a43,
    roughness: 1,
    metalness: 0,
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
    0.12,
    0.14
  );

const curbZGeometry =
  new THREE.BoxGeometry(
    0.14,
    0.12,
    CHUNK_SIZE
  );

const centerLineXGeometry =
  new THREE.PlaneGeometry(
    3.6,
    0.12
  );

const centerLineZGeometry =
  new THREE.PlaneGeometry(
    0.12,
    3.6
  );

const edgeLineXGeometry =
  new THREE.PlaneGeometry(
    CHUNK_SIZE,
    0.08
  );

const edgeLineZGeometry =
  new THREE.PlaneGeometry(
    0.08,
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

const roadPatchGeometry =
  new THREE.CircleGeometry(
    1,
    9
  );

const potholeGeometry =
  new THREE.CircleGeometry(
    1,
    12
  );

const crackGeometry =
  new THREE.PlaneGeometry(
    1,
    0.045
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
      value ^
        (value >>> 15),
      value | 1
    );

    value ^=
      value +
      Math.imul(
        value ^
          (value >>> 7),
        value | 61
      );

    return (
      (
        value ^
        (value >>> 14)
      ) >>>
      0
    ) /
      4294967296;
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

function pick<T>(
  values: readonly T[],
  random: () => number
): T {
  return values[
    Math.floor(
      random() *
        values.length
    )
  ];
}

function modulo(
  value: number,
  divisor: number
) {
  return (
    (
      value %
        divisor
    ) +
    divisor
  ) %
    divisor;
}

function shuffle<T>(
  values: T[],
  random: () => number
) {
  for (
    let index =
      values.length - 1;
    index > 0;
    index--
  ) {
    const target =
      Math.floor(
        random() *
          (index + 1)
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
 * رودخانه یک ستون جهانی و پیوسته است.
 * با تغییر cz هیچ‌وقت قطع نمی‌شود.
 *
 * هر 24 چانک یک رودخانه دیگر ایجاد می‌شود
 * تا جهان نامحدود باقی بماند.
 */
function isRiverColumn(
  cx: number
) {
  return (
    modulo(
      cx - 4,
      24
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
    return "river";
  }

  if (
    cx === 0 &&
    cz === 0
  ) {
    return "city";
  }

  const value =
    Math.abs(
      cx * 37 +
        cz * 61
    );

  if (
    value > 0 &&
    value % 19 === 0
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

  if (
    kind === "tunnel-z"
  ) {
    return "z";
  }

  return (
    modulo(
      cx + cz,
      3
    ) === 0
      ? "z"
      : "x"
  );
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
      (
        resolve,
        reject
      ) => {
        loader.load(
          url,
          (gltf) => {
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
      new THREE.Color(
        0xffffff
      ),
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
          0.62
        );

      result.metalness =
        Math.min(
          result.metalness,
          0.14
        );
    }

    result.needsUpdate =
      true;
  }

  return result;
}

function configureClone(
  object: THREE.Object3D,
  brightness: number,
  castShadow: boolean
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

      if (
        Array.isArray(
          child.material
        )
      ) {
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

      child.receiveShadow =
        true;

      child.frustumCulled =
        true;
    }
  );
}

function resizeModel(
  object: THREE.Object3D,
  options: ModelOptions
) {
  object.updateWorldMatrix(
    true,
    true
  );

  tempBox.setFromObject(
    object
  );

  if (
    tempBox.isEmpty()
  ) {
    return;
  }

  tempBox.getSize(
    tempSize
  );

  if (
    tempSize.x <= 0.001 ||
    tempSize.y <= 0.001 ||
    tempSize.z <= 0.001
  ) {
    return;
  }

  let multiplier = 1;

  if (
    options.targetWidth
  ) {
    multiplier =
      options.targetWidth /
      Math.max(
        tempSize.x,
        tempSize.z
      );
  }

  if (
    options.targetHeight
  ) {
    multiplier =
      options.targetHeight /
      tempSize.y;
  }

  if (
    options.maxHeight &&
    tempSize.y *
      multiplier >
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
  targetY: number,
  sinkIntoGround = 0
) {
  object.updateWorldMatrix(
    true,
    true
  );

  tempBox.setFromObject(
    object
  );

  if (
    Number.isFinite(
      tempBox.min.y
    )
  ) {
    object.position.y +=
      targetY -
      tempBox.min.y -
      sinkIntoGround;
  }
}

/* -------------------------------------------------------------------------- */
/*                            BUILDING FOUNDATION                             */
/* -------------------------------------------------------------------------- */

function createBuildingFoundation(
  object: THREE.Object3D,
  chunk: THREE.Group
) {
  object.updateWorldMatrix(
    true,
    true
  );

  const bounds =
    new THREE.Box3().setFromObject(
      object
    );

  if (
    bounds.isEmpty()
  ) {
    return;
  }

  bounds.getSize(
    tempSize
  );

  bounds.getCenter(
    tempCenter
  );

  const width =
    Math.max(
      2,
      Math.min(
        tempSize.x + 0.9,
        23
      )
    );

  const depth =
    Math.max(
      2,
      Math.min(
        tempSize.z + 0.9,
        23
      )
    );

  /*
   * لایه اصلی زیر ساختمان باعث می‌شود
   * ساختمان دیگر شناور دیده نشود.
   */
  const foundationGeometry =
    new THREE.BoxGeometry(
      width,
      0.16,
      depth
    );

  const foundation =
    new THREE.Mesh(
      foundationGeometry,
      foundationMaterial
    );

  foundation.position.set(
    tempCenter.x,
    0.015,
    tempCenter.z
  );

  foundation.rotation.y =
    object.rotation.y;

  foundation.receiveShadow =
    true;

  foundation.userData
    .temporaryGeometry = true;

  chunk.add(
    foundation
  );

  heightMeshes.push(
    foundation
  );

  /*
   * حاشیه تیره و نامنظم برای ترکیب کف ساختمان
   * با زمین اطراف.
   */
  const edgeGeometry =
    new THREE.BoxGeometry(
      width + 0.65,
      0.055,
      depth + 0.65
    );

  const edge =
    new THREE.Mesh(
      edgeGeometry,
      foundationEdgeMaterial
    );

  edge.position.set(
    tempCenter.x,
    -0.01,
    tempCenter.z
  );

  edge.rotation.y =
    object.rotation.y;

  edge.receiveShadow =
    true;

  edge.userData
    .temporaryGeometry = true;

  chunk.add(edge);

  /*
   * چند قطعه آوار کوچک اطراف پایه ساختمان.
   */
  const rubbleCount =
    Math.max(
      3,
      Math.min(
        8,
        Math.floor(
          (
            width +
            depth
          ) /
            5
        )
      )
    );

  for (
    let index = 0;
    index < rubbleCount;
    index++
  ) {
    const rubbleGeometry =
      new THREE.BoxGeometry(
        0.25 +
          Math.random() *
            0.65,
        0.12 +
          Math.random() *
            0.22,
        0.25 +
          Math.random() *
            0.65
      );

    const rubble =
      new THREE.Mesh(
        rubbleGeometry,
        rubbleMaterial
      );

    const horizontalSide =
      Math.random() < 0.5;

    const side =
      Math.random() < 0.5
        ? -1
        : 1;

    rubble.position.set(
      tempCenter.x +
        (
          horizontalSide
            ? side *
              (
                width / 2 +
                0.25
              )
            : (
                Math.random() -
                0.5
              ) *
              width
        ),
      0.08,
      tempCenter.z +
        (
          horizontalSide
            ? (
                Math.random() -
                0.5
              ) *
              depth
            : side *
              (
                depth / 2 +
                0.25
              )
        )
    );

    rubble.rotation.set(
      Math.random() * 0.2,
      Math.random() *
        Math.PI,
      Math.random() * 0.2
    );

    rubble.castShadow =
      true;

    rubble.receiveShadow =
      true;

    rubble.userData
      .temporaryGeometry = true;

    chunk.add(rubble);
  }
}

/* -------------------------------------------------------------------------- */
/*                                  COLLISION                                 */
/* -------------------------------------------------------------------------- */

function getColliderFactors(
  type: SimpleColliderType
) {
  switch (type) {
    case "tree":
      return {
        x: 0.16,
        z: 0.16,
        y: 0.75,
        minimum: 0.38,
      };

    case "vehicle":
      return {
        x: 0.82,
        z: 0.82,
        y: 0.8,
        minimum: 0.65,
      };

    case "wall":
      return {
        x: 0.9,
        z: 0.9,
        y: 0.92,
        minimum: 0.5,
      };

    case "rail":
      return {
        x: 0.98,
        z: 0.98,
        y: 0.98,
        minimum: 0.25,
      };
  }
}

function registerSimpleCollider(
  object: THREE.Object3D,
  chunk: THREE.Group,
  type: SimpleColliderType
) {
  object.updateWorldMatrix(
    true,
    true
  );

  const bounds =
    new THREE.Box3().setFromObject(
      object
    );

  if (
    bounds.isEmpty()
  ) {
    return;
  }

  bounds.getSize(
    tempSize
  );

  bounds.getCenter(
    tempCenter
  );

  const factors =
    getColliderFactors(
      type
    );

  let width =
    Math.max(
      factors.minimum,
      tempSize.x *
        factors.x
    );

  let depth =
    Math.max(
      factors.minimum,
      tempSize.z *
        factors.z
    );

  const height =
    Math.max(
      0.8,
      tempSize.y *
        factors.y
    );

  if (
    type === "tree"
  ) {
    width =
      Math.min(
        width,
        1.2
      );

    depth =
      Math.min(
        depth,
        1.2
      );
  }

  const box =
    new THREE.Box3()
      .setFromCenterAndSize(
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

  simpleColliders.push({
    box,
    chunk,
  });
}

/*
 * برخورد ساختمان بر اساس Mesh واقعی انجام می‌شود.
 * بنابراین فضای خالی، در ورودی، شکاف یا بخش خراب‌شده
 * قابل عبور باقی می‌ماند.
 */
function registerPreciseCollision(
  object: THREE.Object3D,
  chunk: THREE.Group
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

      child.geometry
        .computeBoundingBox();

      const geometryBounds =
        child.geometry
          .boundingBox;

      if (
        !geometryBounds
      ) {
        return;
      }

      geometryBounds.getSize(
        tempSize
      );

      /*
       * جزئیات خیلی ریز مثل سیم، برگ و تکه‌های تزئینی
       * وارد برخورد دقیق نمی‌شوند.
       */
      if (
        tempSize.x < 0.18 &&
        tempSize.y < 0.18 &&
        tempSize.z < 0.18
      ) {
        return;
      }

      preciseCollisionMeshes.push({
        mesh: child,
        chunk,
      });
    }
  );
}

function registerModel(
  object: THREE.Object3D,
  chunk: THREE.Group,
  options: ModelOptions
) {
  if (
    options.preciseCollision
  ) {
    registerPreciseCollision(
      object,
      chunk
    );
  } else if (
    options.collision
  ) {
    registerSimpleCollider(
      object,
      chunk,
      options.colliderType ??
        "vehicle"
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
            : [
                child.material,
              ];

        for (
          const material
          of materials
        ) {
          waterMaterials.add(
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
  options: ModelOptions = {}
) {
  void loadSource(
    definition.url
  )
    .then((source) => {
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

      object.position.set(
        x,
        options.y ?? 0,
        z
      );

      object.rotation.set(
        options.rotationX ??
          0,
        rotationY,
        options.rotationZ ??
          0
      );

      configureClone(
        object,
        options.brightness ??
          0.2,
        options.castShadow ??
          true
      );

      resizeModel(
        object,
        options
      );

      alignToGround(
        object,
        options.y ?? 0,
        options.sinkIntoGround ??
          0
      );

      chunk.add(
        object
      );

      object.updateWorldMatrix(
        true,
        true
      );

      if (
        options.foundation
      ) {
        createBuildingFoundation(
          object,
          chunk
        );
      }

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

  mesh.receiveShadow =
    true;

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

  ground.name =
    "Ground";

  chunk.add(
    ground
  );

  heightMeshes.push(
    ground
  );
}

/* -------------------------------------------------------------------------- */
/*                              DAMAGED ASPHALT                               */
/* -------------------------------------------------------------------------- */

function addRoadDamage(
  chunk: THREE.Group,
  random: () => number,
  direction: Direction
) {
  const patchCount = 20;

  for (
    let index = 0;
    index < patchCount;
    index++
  ) {
    const along =
      randomRange(
        random,
        -41,
        41
      );

    const across =
      randomRange(
        random,
        -ROAD_WIDTH / 2 +
          0.45,
        ROAD_WIDTH / 2 -
          0.45
      );

    const patch =
      createSurface(
        roadPatchGeometry,
        random() < 0.72
          ? roadPatchMaterial
          : roadDustMaterial,
        direction === "x"
          ? along
          : across,
        direction === "x"
          ? across
          : along,
        0.047
      );

    patch.scale.set(
      randomRange(
        random,
        0.3,
        1.8
      ),
      randomRange(
        random,
        0.3,
        1.25
      ),
      1
    );

    patch.rotation.z =
      random() *
      Math.PI;

    chunk.add(patch);
  }

  const potholeCount =
    3 +
    Math.floor(
      random() * 4
    );

  for (
    let index = 0;
    index < potholeCount;
    index++
  ) {
    const along =
      randomRange(
        random,
        -39,
        39
      );

    const across =
      randomRange(
        random,
        -ROAD_WIDTH / 2 +
          0.7,
        ROAD_WIDTH / 2 -
          0.7
      );

    const pothole =
      createSurface(
        potholeGeometry,
        potholeMaterial,
        direction === "x"
          ? along
          : across,
        direction === "x"
          ? across
          : along,
        0.052
      );

    pothole.scale.set(
      randomRange(
        random,
        0.35,
        0.85
      ),
      randomRange(
        random,
        0.18,
        0.55
      ),
      1
    );

    pothole.rotation.z =
      random() *
      Math.PI;

    chunk.add(pothole);
  }

  const crackCount = 30;

  for (
    let index = 0;
    index < crackCount;
    index++
  ) {
    const along =
      randomRange(
        random,
        -41,
        41
      );

    const across =
      randomRange(
        random,
        -ROAD_WIDTH / 2 +
          0.35,
        ROAD_WIDTH / 2 -
          0.35
      );

    const crack =
      createSurface(
        crackGeometry,
        crackMaterial,
        direction === "x"
          ? along
          : across,
        direction === "x"
          ? across
          : along,
        0.056
      );

    crack.scale.set(
      randomRange(
        random,
        0.3,
        1.4
      ),
      1,
      1
    );

    crack.rotation.z =
      random() *
      Math.PI;

    chunk.add(crack);
  }
}

/* -------------------------------------------------------------------------- */
/*                                    ROAD                                    */
/* -------------------------------------------------------------------------- */

function addRoadLines(
  chunk: THREE.Group,
  random: () => number,
  direction: Direction
) {
  const offsets =
    [
      -38,
      -31,
      -24,
      -17,
      -10,
      -3,
      4,
      11,
      18,
      25,
      32,
      39,
    ];

  const visibleOffsets =
    offsets.filter(
      () =>
        random() > 0.32
    );

  const lines =
    new THREE.InstancedMesh(
      direction === "x"
        ? centerLineXGeometry
        : centerLineZGeometry,
      centerLineMaterial,
      visibleOffsets.length
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
    new THREE.Vector3();

  visibleOffsets.forEach(
    (
      offset,
      index
    ) => {
      position.set(
        direction === "x"
          ? offset
          : 0,
        0.054,
        direction === "x"
          ? randomRange(
              random,
              -0.08,
              0.08
            )
          : offset
      );

      scale.set(
        randomRange(
          random,
          0.55,
          1
        ),
        randomRange(
          random,
          0.7,
          1
        ),
        1
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

  lines.instanceMatrix
    .needsUpdate = true;

  lines.castShadow =
    false;

  lines.receiveShadow =
    false;

  chunk.add(lines);
}

function addRoadEdges(
  chunk: THREE.Group,
  random: () => number,
  direction: Direction
) {
  const offset =
    ROAD_WIDTH / 2 -
    0.29;

  for (
    const side of [
      -1,
      1,
    ]
  ) {
    if (
      random() < 0.3
    ) {
      continue;
    }

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
        0.053
      );

    chunk.add(line);
  }
}

function addRoad(
  chunk: THREE.Group,
  random: () => number,
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

  heightMeshes.push(
    road
  );

  const sidewalkOffset =
    ROAD_WIDTH / 2 +
    SIDEWALK_WIDTH / 2;

  const curbOffset =
    ROAD_WIDTH / 2 +
    0.07;

  for (
    const side of [
      -1,
      1,
    ]
  ) {
    const sidewalk =
      createSurface(
        direction === "x"
          ? sidewalkXGeometry
          : sidewalkZGeometry,
        random() < 0.28
          ? brokenSidewalkMaterial
          : sidewalkMaterial,
        direction === "x"
          ? 0
          : sidewalkOffset *
            side,
        direction === "x"
          ? sidewalkOffset *
            side
          : 0,
        0.043
      );

    chunk.add(
      sidewalk
    );

    heightMeshes.push(
      sidewalk
    );

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
      0.065,
      direction === "x"
        ? curbOffset * side
        : 0
    );

    curb.receiveShadow =
      true;

    chunk.add(curb);
  }

  addRoadLines(
    chunk,
    random,
    direction
  );

  addRoadEdges(
    chunk,
    random,
    direction
  );

  addRoadDamage(
    chunk,
    random,
    direction
  );
}

function addShortAlley(
  chunk: THREE.Group,
  direction: Direction,
  side: -1 | 1
) {
  const length = 17;

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
      0.028
    );

  alley.userData
    .temporaryGeometry = true;

  chunk.add(alley);

  heightMeshes.push(
    alley
  );
}

function getRoadPoints(
  direction: Direction
): RoadPoint[] {
  const result:
    RoadPoint[] = [];

  for (
    let offset = -38;
    offset <= 38;
    offset += 11
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
  const url =
    definition.url
      .toLowerCase();

  return (
    url.includes(
      "villa"
    ) ||
    url.includes(
      "house"
    )
  );
}

function getBuildingSlots(
  direction: Direction
) {
  /*
   * شش ساختمان در هر سمت خیابان.
   * تقریباً تمام فضای چانک پر می‌شود.
   */
  const along =
    [
      -36.5,
      -22,
      -7.4,
      7.4,
      22,
      36.5,
    ];

  const sideOffset =
    14.4;

  const slots: Array<{
    x: number;
    z: number;
    rotation: number;
  }> = [];

  for (
    const value
    of along
  ) {
    if (
      direction === "x"
    ) {
      slots.push({
        x: value,
        z:
          -sideOffset,
        rotation: 0,
      });

      slots.push({
        x: value,
        z:
          sideOffset,
        rotation:
          Math.PI,
      });
    } else {
      slots.push({
        x:
          -sideOffset,
        z: value,
        rotation:
          Math.PI / 2,
      });

      slots.push({
        x:
          sideOffset,
        z: value,
        rotation:
          -Math.PI / 2,
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
    getBuildingSlots(
      direction
    );

  for (
    const slot
    of slots
  ) {
    /*
     * فقط درصد بسیار کمی خالی می‌ماند.
     */
    if (
      random() < 0.015
    ) {
      continue;
    }

    const definition =
      pick(
        URBAN_BUILDINGS,
        random
      );

    const villa =
      isVilla(
        definition
      );

    placeModel(
      definition,
      chunk,
      slot.x +
        randomRange(
          random,
          -0.18,
          0.18
        ),
      slot.z +
        randomRange(
          random,
          -0.18,
          0.18
        ),
      slot.rotation +
        randomRange(
          random,
          -0.008,
          0.008
        ),
      {
        preciseCollision:
          true,

        foundation:
          true,

        /*
         * مدل کمی داخل زمین فرو می‌رود
         * تا شناور دیده نشود.
         */
        sinkIntoGround:
          randomRange(
            random,
            0.06,
            0.13
          ),

        occlusion:
          random() < 0.38,

        targetWidth:
          villa
            ? randomRange(
                random,
                13.2,
                15.2
              )
            : randomRange(
                random,
                14.4,
                16.2
              ),

        maxHeight:
          villa
            ? randomRange(
                random,
                8.5,
                11.5
              )
            : randomRange(
                random,
                14,
                19
              ),

        brightness: 0.27,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                                   VEHICLES                                 */
/* -------------------------------------------------------------------------- */

function isMotorcycle(
  definition: ModelDef
) {
  const url =
    definition.url
      .toLowerCase();

  return (
    url.includes(
      "motor"
    ) ||
    url.includes(
      "bike"
    ) ||
    url.includes(
      "cycle"
    ) ||
    url.includes(
      "scooter"
    )
  );
}

function spawnVehicles(
  chunk: THREE.Group,
  random: () => number,
  points: RoadPoint[]
) {
  const available =
    shuffle(
      [
        ...points,
      ],
      random
    );

  const count =
    Math.min(
      available.length,
      5 +
        Math.floor(
          random() * 3
        )
    );

  for (
    let index = 0;
    index < count;
    index++
  ) {
    const point =
      available[index];

    const definition =
      pick(
        URBAN_VEHICLES,
        random
      );

    const motorcycle =
      isMotorcycle(
        definition
      );

    const lane =
      random() < 0.5
        ? -1.9
        : 1.9;

    const x =
      point.direction === "x"
        ? point.x
        : point.x +
          lane;

    const z =
      point.direction === "x"
        ? point.z +
          lane
        : point.z;

    let rotation =
      point.direction === "x"
        ? random() < 0.5
          ? Math.PI / 2
          : -Math.PI / 2
        : random() < 0.5
          ? 0
          : Math.PI;

    if (
      motorcycle
    ) {
      rotation +=
        randomRange(
          random,
          -0.45,
          0.45
        );
    }

    placeModel(
      definition,
      chunk,
      x,
      z,
      rotation,
      {
        collision: true,
        colliderType:
          "vehicle",

        /*
         * ماشین‌ها بزرگ‌تر شده‌اند.
         */
        targetWidth:
          motorcycle
            ? randomRange(
                random,
                2.3,
                3
              )
            : randomRange(
                random,
                4.8,
                6.1
              ),

        maxHeight:
          motorcycle
            ? 2.2
            : 3.3,

        /*
         * موتور روی پهلو قرار می‌گیرد.
         */
        rotationZ:
          motorcycle
            ? (
                random() < 0.5
                  ? 1
                  : -1
              ) *
              randomRange(
                random,
                1.15,
                1.42
              )
            : 0,

        brightness: 0.29,
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
  const count = 1250;

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

  grass.instanceMatrix
    .needsUpdate = true;

  grass.castShadow =
    false;

  grass.receiveShadow =
    false;

  chunk.add(grass);
}

function spawnParkTrees(
  chunk: THREE.Group,
  random: () => number
) {
  for (
    let index = 0;
    index < 30;
    index++
  ) {
    const angle =
      (
        index /
        30
      ) *
        Math.PI *
        2 +
      randomRange(
        random,
        -0.2,
        0.2
      );

    const radius =
      index < 18
        ? randomRange(
            random,
            25,
            39
          )
        : randomRange(
            random,
            8,
            26
          );

    placeModel(
      pick(
        FOREST_TREES,
        random
      ),
      chunk,
      Math.cos(
        angle
      ) *
        radius,
      Math.sin(
        angle
      ) *
        radius,
      random() *
        Math.PI *
        2,
      {
        collision: true,
        colliderType:
          "tree",

        targetHeight:
          randomRange(
            random,
            5,
            7.2
          ),

        brightness: 0.05,
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
    index < 45;
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
      random() *
        Math.PI *
        2,
      {
        targetWidth:
          randomRange(
            random,
            1,
            2.4
          ),

        brightness: 0.03,
        castShadow: false,
      }
    );
  }

  for (
    let index = 0;
    index < 65;
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
      random() *
        Math.PI *
        2,
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
    [
      -38,
      -27,
      -16,
      16,
      27,
      38,
    ];

  for (
    const value
    of positions
  ) {
    if (
      random() < 0.14
    ) {
      continue;
    }

    const side =
      random() < 0.5
        ? -1
        : 1;

    const sideOffset =
      randomRange(
        random,
        10.2,
        11.3
      ) *
      side;

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
      random() *
        Math.PI *
        2,
      {
        collision: true,
        colliderType:
          "tree",

        targetHeight:
          randomRange(
            random,
            4.5,
            6.4
          ),

        brightness: 0.05,
      }
    );
  }

  for (
    let index = 0;
    index < 24;
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
        9.6,
        11.7
      ) *
      side;

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
      random() *
        Math.PI *
        2,
      {
        targetWidth:
          randomRange(
            random,
            0.6,
            1.5
          ),

        brightness: 0.02,
        castShadow: false,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                                  RIVER                                     */
/* -------------------------------------------------------------------------- */

function createWaterTexture() {
  const width = 64;
  const height = 64;

  const data =
    new Uint8Array(
      width *
        height *
        4
    );

  for (
    let y = 0;
    y < height;
    y++
  ) {
    for (
      let x = 0;
      x < width;
      x++
    ) {
      const index =
        (
          y *
            width +
          x
        ) *
        4;

      const wave =
        Math.sin(
          y * 0.55 +
            x * 0.14
        ) *
          18 +
        Math.sin(
          y * 0.19 -
            x * 0.31
        ) *
          12;

      const noise =
        Math.random() *
        18;

      data[index] =
        32 +
        wave +
        noise;

      data[index + 1] =
        86 +
        wave +
        noise;

      data[index + 2] =
        100 +
        wave +
        noise;

      data[index + 3] =
        220;
    }
  }

  const texture =
    new THREE.DataTexture(
      data,
      width,
      height,
      THREE.RGBAFormat
    );

  texture.wrapS =
    THREE.RepeatWrapping;

  texture.wrapT =
    THREE.RepeatWrapping;

  texture.repeat.set(
    2,
    8
  );

  texture.colorSpace =
    THREE.SRGBColorSpace;

  texture.needsUpdate =
    true;

  waterTextures.add(
    texture
  );

  return texture;
}

function createRiverWater(
  chunk: THREE.Group
) {
  const texture =
    createWaterTexture();

  const material =
    new THREE.MeshPhysicalMaterial({
      map: texture,
      color: 0x477c86,
      roughness: 0.28,
      metalness: 0.02,
      transparent: true,
      opacity: 0.86,
      transmission: 0.08,
      clearcoat: 0.35,
      clearcoatRoughness: 0.25,
      side: THREE.DoubleSide,
    });

  const geometry =
    new THREE.PlaneGeometry(
      RIVER_WIDTH,
      CHUNK_SIZE + 1
    );

  const water =
    new THREE.Mesh(
      geometry,
      material
    );

  water.rotation.x =
    -Math.PI / 2;

  water.position.y =
    -0.22;

  water.receiveShadow =
    true;

  water.userData
    .temporaryGeometry = true;

  chunk.add(water);

  waterMaterials.add(
    material
  );
}

function createRiverBanks(
  chunk: THREE.Group,
  random: () => number
) {
  const bankGeometry =
    new THREE.BoxGeometry(
      RIVER_BANK_WIDTH,
      0.38,
      CHUNK_SIZE
    );

  for (
    const side of [
      -1,
      1,
    ]
  ) {
    const bank =
      new THREE.Mesh(
        bankGeometry,
        riverBankMaterial
      );

    bank.position.set(
      side *
        (
          RIVER_WIDTH / 2 +
          RIVER_BANK_WIDTH / 2
        ),
      -0.03,
      0
    );

    bank.receiveShadow =
      true;

    bank.userData
      .temporaryGeometry = true;

    chunk.add(bank);

    heightMeshes.push(
      bank
    );

    for (
      let index = 0;
      index < 18;
      index++
    ) {
      const definition =
        random() < 0.56
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
        side *
          randomRange(
            random,
            RIVER_WIDTH /
              2 +
              0.8,
            RIVER_WIDTH /
              2 +
              RIVER_BANK_WIDTH -
              0.4
          ),
        randomRange(
          random,
          -42,
          42
        ),
        random() *
          Math.PI *
          2,
        {
          targetWidth:
            randomRange(
              random,
              0.65,
              1.8
            ),

          brightness: 0.02,
          castShadow: false,
        }
      );
    }
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
      0.38,
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

  section.receiveShadow =
    true;

  section.userData
    .temporaryGeometry = true;

  chunk.add(section);

  heightMeshes.push(
    section
  );
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
      0.72,
      0.18
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

  rail.castShadow =
    true;

  rail.receiveShadow =
    true;

  rail.userData
    .temporaryGeometry = true;

  chunk.add(rail);

  registerSimpleCollider(
    rail,
    chunk,
    "rail"
  );
}

function buildFunctionalBridge(
  chunk: THREE.Group,
  random: () => number
) {
  const bridgeHeight =
    2.7;

  const flatLength =
    RIVER_WIDTH + 5;

  const rampHorizontal =
    (
      CHUNK_SIZE -
      flatLength
    ) /
      2;

  const rampAngle =
    Math.atan2(
      bridgeHeight,
      rampHorizontal
    );

  const rampLength =
    Math.sqrt(
      rampHorizontal *
        rampHorizontal +
      bridgeHeight *
        bridgeHeight
    );

  const leftX =
    -(
      flatLength / 2 +
      rampHorizontal / 2
    );

  const rightX =
    flatLength / 2 +
    rampHorizontal / 2;

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
    ROAD_WIDTH / 2 +
    0.13;

  for (
    const side of [
      -1,
      1,
    ]
  ) {
    createBridgeRail(
      chunk,
      0,
      bridgeHeight +
        0.52,
      railOffset *
        side,
      flatLength,
      0
    );

    createBridgeRail(
      chunk,
      leftX,
      bridgeHeight / 2 +
        0.52,
      railOffset *
        side,
      rampLength,
      rampAngle
    );

    createBridgeRail(
      chunk,
      rightX,
      bridgeHeight / 2 +
        0.52,
      railOffset *
        side,
      rampLength,
      -rampAngle
    );
  }

  /*
   * مدل GLB به صورت تزئینی روی پل قرار می‌گیرد.
   * سطح واقعی و قابل حرکت پل از Geometry ساخته شده است.
   */
  if (
    URBAN_BRIDGES.length >
    0
  ) {
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
        y: bridgeHeight -
          0.32,

        targetWidth:
          flatLength,

        maxHeight: 7,
        brightness: 0.27,
        occlusion: true,
        castShadow: true,
        sinkIntoGround: 0.08,
      }
    );
  }
}

function buildRiverChunk(
  chunk: THREE.Group,
  random: () => number
) {
  addGround(
    chunk,
    riverGroundMaterial
  );

  createRiverWater(
    chunk
  );

  createRiverBanks(
    chunk,
    random
  );

  /*
   * مدل رودخانه فقط برای جزئیات ساحل استفاده می‌شود.
   * آب اصلی Procedural و متحرک است.
   */
  if (
    URBAN_RIVER.length >
    0
  ) {
    placeModel(
      pick(
        URBAN_RIVER,
        random
      ),
      chunk,
      0,
      0,
      0,
      {
        y: -0.32,
        water: true,
        targetWidth:
          CHUNK_SIZE,
        maxHeight: 3,
        brightness: 0.1,
        castShadow: false,
      }
    );
  }

  buildFunctionalBridge(
    chunk,
    random
  );
}

/* -------------------------------------------------------------------------- */
/*                                   TUNNEL                                   */
/* -------------------------------------------------------------------------- */

function createTunnelStructure(
  chunk: THREE.Group,
  direction: Direction
) {
  const tunnelWidth =
    ROAD_WIDTH + 3.2;

  const tunnelHeight =
    7.2;

  const wallThickness =
    0.65;

  const tunnelLength =
    CHUNK_SIZE;

  const wallGeometry =
    direction === "x"
      ? new THREE.BoxGeometry(
          tunnelLength,
          tunnelHeight,
          wallThickness
        )
      : new THREE.BoxGeometry(
          wallThickness,
          tunnelHeight,
          tunnelLength
        );

  const sideOffset =
    tunnelWidth / 2;

  for (
    const side of [
      -1,
      1,
    ]
  ) {
    const wall =
      new THREE.Mesh(
        wallGeometry,
        tunnelWallMaterial
      );

    wall.position.set(
      direction === "x"
        ? 0
        : sideOffset *
          side,
      tunnelHeight / 2,
      direction === "x"
        ? sideOffset *
          side
        : 0
    );

    wall.castShadow =
      true;

    wall.receiveShadow =
      true;

    wall.userData
      .temporaryGeometry = true;

    chunk.add(wall);

    registerSimpleCollider(
      wall,
      chunk,
      "wall"
    );
  }

  /*
   * سقف فقط ظاهر تونل است و وارد heightMeshes نمی‌شود.
   * بنابراین بازیکن نمی‌تواند روی سقف راه برود.
   */
  const roofGeometry =
    direction === "x"
      ? new THREE.BoxGeometry(
          tunnelLength,
          0.55,
          tunnelWidth +
            wallThickness
        )
      : new THREE.BoxGeometry(
          tunnelWidth +
            wallThickness,
          0.55,
          tunnelLength
        );

  const roof =
    new THREE.Mesh(
      roofGeometry,
      tunnelWallMaterial
    );

  roof.position.y =
    tunnelHeight;

  roof.castShadow =
    true;

  roof.receiveShadow =
    true;

  roof.userData
    .temporaryGeometry = true;

  chunk.add(roof);

  occlusionMeshes.push(
    roof
  );
}

function spawnTunnel(
  chunk: THREE.Group,
  random: () => number,
  direction: Direction
) {
  createTunnelStructure(
    chunk,
    direction
  );

  const rotation =
    direction === "x"
      ? Math.PI / 2
      : 0;

  if (
    URBAN_TUNNEL.length >
    0
  ) {
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

        targetWidth:
          CHUNK_SIZE,

        maxHeight: 8.3,
        brightness: 0.27,
        sinkIntoGround: 0.08,
      }
    );
  }

  /*
   * مدل‌های دیواره دقیقاً کنار دیواره اصلی قرار می‌گیرند.
   */
  const alongPositions =
    [
      -37,
      -25,
      -13,
      -1,
      11,
      23,
      35,
    ];

  const sideOffset =
    (
      ROAD_WIDTH +
      3.2
    ) /
      2 -
    0.18;

  for (
    let index = 0;
    index <
      alongPositions.length;
    index++
  ) {
    const along =
      alongPositions[index];

    for (
      const side of [
        -1,
        1,
      ]
    ) {
      const definition =
        URBAN_TUNNEL_WALLS[
          (
            index +
            (
              side === 1
                ? 1
                : 0
            )
          ) %
            URBAN_TUNNEL_WALLS.length
        ];

      placeModel(
        definition,
        chunk,
        direction === "x"
          ? along
          : sideOffset *
            side,
        direction === "x"
          ? sideOffset *
            side
          : along,
        rotation,
        {
          collision: false,

          occlusion:
            index % 3 === 0,

          targetWidth:
            randomRange(
              random,
              8,
              10
            ),

          maxHeight: 7.4,
          brightness: 0.25,
          sinkIntoGround: 0.08,
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
    random,
    direction
  );

  /*
   * تعداد کوچه‌ها کم است تا فضای خالی زیاد نشود.
   */
  if (
    !tunnel &&
    random() < 0.09
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
    getRoadPoints(
      direction
    )
  );

  spawnCityVegetation(
    chunk,
    random,
    direction
  );

  if (
    tunnel
  ) {
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

  const direction =
    getRoadDirection(
      cx,
      cz,
      kind
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

  if (
    kind === "river"
  ) {
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
    kind ===
      "tunnel-x" ||
      kind ===
        "tunnel-z"
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
    cx *
      CHUNK_SIZE,
    0,
    cz *
      CHUNK_SIZE
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
  } =
    getChunkCoord(
      playerX,
      playerZ
    );

  for (
    let x =
      cx -
      renderDistance;
    x <=
      cx +
      renderDistance;
    x++
  ) {
    for (
      let z =
        cz -
        renderDistance;
      z <=
        cz +
        renderDistance;
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
      simpleColliders.length -
      1;
    index >= 0;
    index--
  ) {
    if (
      simpleColliders[index]
        .chunk === chunk
    ) {
      simpleColliders.splice(
        index,
        1
      );
    }
  }

  for (
    let index =
      preciseCollisionMeshes.length -
      1;
    index >= 0;
    index--
  ) {
    if (
      preciseCollisionMeshes[
        index
      ].chunk === chunk
    ) {
      preciseCollisionMeshes.splice(
        index,
        1
      );
    }
  }

  const objects =
    new Set<
      THREE.Object3D
    >();

  chunk.traverse(
    (object) => {
      objects.add(
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
      heightMeshes.length -
      1;
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
      occlusionMeshes.length -
      1;
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

  chunks.delete(
    key
  );
}

/* -------------------------------------------------------------------------- */
/*                              PLAYER COLLISION                              */
/* -------------------------------------------------------------------------- */

function intersectsSimpleCollider(
  player: THREE.Object3D,
  x: number,
  z: number,
  radius: number
) {
  const box =
    new THREE.Box3(
      new THREE.Vector3(
        x - radius,
        player.position.y +
          0.08,
        z - radius
      ),
      new THREE.Vector3(
        x + radius,
        player.position.y +
          2.05,
        z + radius
      )
    );

  for (
    const collider
    of simpleColliders
  ) {
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

function preciseMovementBlocked(
  player: THREE.Object3D,
  fromX: number,
  fromZ: number,
  toX: number,
  toZ: number,
  radius: number
) {
  const dx =
    toX -
    fromX;

  const dz =
    toZ -
    fromZ;

  const distance =
    Math.hypot(
      dx,
      dz
    );

  if (
    distance <
    0.0001
  ) {
    return false;
  }

  rayDirection.set(
    dx / distance,
    0,
    dz / distance
  );

  tempVectorB.set(
    -rayDirection.z,
    0,
    rayDirection.x
  );

  const meshes =
    preciseCollisionMeshes.map(
      (entry) =>
        entry.mesh
    );

  /*
   * سه ارتفاع و سه نقطه عرضی بررسی می‌شود.
   * این برخورد دقیق دیوار را تشخیص می‌دهد،
   * اما از شکاف واقعی ساختمان عبور می‌کند.
   */
  const heights =
    [
      0.32,
      0.95,
      1.62,
    ];

  const sideOffsets =
    [
      -radius,
      0,
      radius,
    ];

  for (
    const height
    of heights
  ) {
    for (
      const side
      of sideOffsets
    ) {
      rayOrigin.set(
        fromX +
          tempVectorB.x *
            side,
        player.position.y +
          height,
        fromZ +
          tempVectorB.z *
            side
      );

      raycaster.set(
        rayOrigin,
        rayDirection
      );

      raycaster.near = 0;

      raycaster.far =
        distance +
        radius +
        0.08;

      const hits =
        raycaster.intersectObjects(
          meshes,
          false
        );

      if (
        hits.length > 0
      ) {
        return true;
      }
    }
  }

  return false;
}

function movementBlocked(
  player: THREE.Object3D,
  fromX: number,
  fromZ: number,
  toX: number,
  toZ: number,
  radius: number
) {
  if (
    intersectsSimpleCollider(
      player,
      toX,
      toZ,
      radius
    )
  ) {
    return true;
  }

  return preciseMovementBlocked(
    player,
    fromX,
    fromZ,
    toX,
    toZ,
    radius
  );
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
    !movementBlocked(
      player,
      previousX,
      previousZ,
      targetX,
      targetZ,
      radius
    )
  ) {
    return;
  }

  /*
   * ابتدا حرکت فقط روی محور X بررسی می‌شود.
   * این باعث سر خوردن کنار دیوار می‌شود.
   */
  if (
    !movementBlocked(
      player,
      previousX,
      previousZ,
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
   * سپس حرکت فقط روی محور Z بررسی می‌شود.
   */
  if (
    !movementBlocked(
      player,
      previousX,
      previousZ,
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
  radius = 0.5
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

  const testPlayer =
    new THREE.Object3D();

  testPlayer.position.set(
    x,
    PLAYER_BASE_Y,
    z
  );

  for (
    const candidate
    of candidates
  ) {
    if (
      !intersectsSimpleCollider(
        testPlayer,
        candidate[0],
        candidate[1],
        radius
      )
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
    player.position.y +
      11,
    player.position.z
  );

  raycaster.set(
    rayOrigin,
    downDirection
  );

  raycaster.near = 0;
  raycaster.far = 26;

  const hits =
    raycaster.intersectObjects(
      heightMeshes,
      false
    );

  let targetY =
    PLAYER_BASE_Y;

  for (
    const hit
    of hits
  ) {
    if (
      hit.point.y <=
      player.position.y +
        1.7
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
      -13 *
        delta
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
    .copy(
      camera.position
    )
    .sub(
      target
    );

  const desiredDistance =
    tempVector.length();

  if (
    desiredDistance <=
    0.1
  ) {
    return;
  }

  tempVector.normalize();

  raycaster.set(
    target,
    tempVector
  );

  raycaster.near = 0;
  raycaster.far =
    desiredDistance;

  const hits =
    raycaster.intersectObjects(
      occlusionMeshes,
      false
    );

  let targetDistance =
    desiredDistance;

  if (
    hits.length > 0
  ) {
    targetDistance =
      Math.max(
        4.4,
        hits[0].distance -
          0.48
      );
  }

  if (
    !cameraOcclusionReady
  ) {
    cameraOcclusionDistance =
      targetDistance;

    cameraOcclusionReady =
      true;
  }

  const speed =
    targetDistance <
    cameraOcclusionDistance
      ? 10
      : 3.5;

  const lerp =
    1 -
    Math.exp(
      -speed *
        delta
    );

  cameraOcclusionDistance =
    THREE.MathUtils.lerp(
      cameraOcclusionDistance,
      targetDistance,
      lerp
    );

  camera.position
    .copy(
      target
    )
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
  /*
   * حرکت UV باعث می‌شود آب واقعاً در امتداد رودخانه روان دیده شود.
   */
  for (
    const texture
    of waterTextures
  ) {
    texture.offset.y =
      -elapsedTime *
      0.055;

    texture.offset.x =
      Math.sin(
        elapsedTime *
          0.35
      ) *
      0.025;
  }

  const opacity =
    0.84 +
    Math.sin(
      elapsedTime *
        0.8
    ) *
      0.025;

  for (
    const material
    of waterMaterials
  ) {
    if (
      "opacity" in
        material &&
      typeof material.opacity ===
        "number"
    ) {
      material.transparent =
        true;

      material.opacity =
        opacity;
    }
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

  simpleColliders.length =
    0;

  preciseCollisionMeshes.length =
    0;

  heightMeshes.length =
    0;

  occlusionMeshes.length =
    0;

  waterMaterials.clear();

  for (
    const texture
    of waterTextures
  ) {
    texture.dispose();
  }

  waterTextures.clear();

  cameraOcclusionDistance =
    0;

  cameraOcclusionReady =
    false;
}
