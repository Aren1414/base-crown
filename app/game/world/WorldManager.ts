import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import {
  FOREST_BUSHES,
  FOREST_FLOWERS,
  FOREST_GRASS,
  FOREST_TREES,
  URBAN_ALLEYS,
  URBAN_BRIDGES,
  URBAN_BUILDINGS,
  URBAN_RIVER,
  URBAN_STREETS,
  URBAN_TUNNEL,
  URBAN_TUNNEL_WALLS,
  URBAN_VEHICLES,
  type ModelDef,
} from "../assets/Models";

export const CHUNK_SIZE = 88;

const HALF_CHUNK = CHUNK_SIZE / 2;

const ROAD_WIDTH = 8.2;
const ALLEY_WIDTH = 3.2;

const RIVER_WIDTH = 26;
const RIVER_BANK_WIDTH = 5.5;

const BRIDGE_LENGTH = 35;
const BRIDGE_WIDTH = 9;

const TUNNEL_WIDTH = 10.5;
const TUNNEL_LENGTH = 64;

const PLAYER_BASE_Y = 0.055;

type Direction = "x" | "z";

type ChunkKind =
  | "city"
  | "park"
  | "river"
  | "tunnel-x"
  | "tunnel-z";

type ColliderType =
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
  colliderType?: ColliderType;

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

type LinearModelOptions = ModelOptions & {
  direction: Direction;
  targetLength: number;
  targetCrossSize: number;
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

const tempQuaternion =
  new THREE.Quaternion();

let cameraOcclusionDistance = 0;
let cameraOcclusionReady = false;

/* -------------------------------------------------------------------------- */
/*                                  MATERIALS                                 */
/* -------------------------------------------------------------------------- */

const cityGroundMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x252a29,
    roughness: 1,
    metalness: 0,
  });

const parkGroundMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x233526,
    roughness: 1,
    metalness: 0,
  });

const riverGroundMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x171d1d,
    roughness: 1,
    metalness: 0,
  });

const riverBankMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x31382f,
    roughness: 1,
    metalness: 0,
  });

const foundationMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x2a2e2b,
    roughness: 1,
    metalness: 0,
  });

const foundationEdgeMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x202421,
    roughness: 1,
    metalness: 0,
  });

const rubbleMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x464740,
    roughness: 1,
    metalness: 0,
  });

const grassBladeMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x45683b,
    roughness: 1,
    metalness: 0,
    side: THREE.DoubleSide,
  });

/* -------------------------------------------------------------------------- */
/*                                  GEOMETRY                                  */
/* -------------------------------------------------------------------------- */

const groundGeometry =
  new THREE.PlaneGeometry(
    CHUNK_SIZE,
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
 * اولین رودخانه در چانک x=1 قرار دارد؛
 * بنابراین از ابتدای بازی قابل مشاهده است.
 *
 * رودخانه در تمام چانک‌های محور Z ادامه پیدا می‌کند.
 */
function isRiverColumn(
  cx: number
) {
  return (
    modulo(
      cx - 1,
      12
    ) === 0
  );
}

function isBridgeCrossing(
  cz: number
) {
  return (
    modulo(
      cz,
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
    return "river";
  }

  /*
   * تونل نزدیک شروع بازی قرار می‌گیرد.
   */
  if (
    cx === -1 &&
    cz === 0
  ) {
    return "tunnel-x";
  }

  const value =
    Math.abs(
      cx * 37 +
        cz * 61
    );

  if (
    value > 0 &&
    value % 23 === 0
  ) {
    return "park";
  }

  if (
    value > 0 &&
    value % 29 === 0
  ) {
    return "tunnel-x";
  }

  if (
    value > 0 &&
    value % 41 === 0
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

  if (
    cx === 0 &&
    cz === 0
  ) {
    return "x";
  }

  return (
    modulo(
      cx + cz,
      4
    ) < 2
      ? "x"
      : "z"
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
          0.67,
          result.roughness
        );

      result.metalness =
        Math.min(
          0.12,
          result.metalness
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
          0.18,
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
/*                           LINEAR MODEL PLACEMENT                           */
/* -------------------------------------------------------------------------- */

function placeLinearModel(
  definition: ModelDef,
  chunk: THREE.Group,
  x: number,
  z: number,
  options: LinearModelOptions
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
        0,
        options.rotationZ ??
          0
      );

      configureClone(
        object,
        options.brightness ??
          0.06,
        options.castShadow ??
          false
      );

      object.updateWorldMatrix(
        true,
        true
      );

      tempBox.setFromObject(
        object
      );

      tempBox.getSize(
        tempSize
      );

      /*
       * محور بلند مدل به جهت مسیر چرخانده می‌شود.
       */
      const localLongAxis =
        tempSize.x >=
        tempSize.z
          ? "x"
          : "z";

      if (
        localLongAxis !==
        options.direction
      ) {
        object.rotation.y =
          Math.PI / 2;
      }

      object.updateWorldMatrix(
        true,
        true
      );

      tempBox.setFromObject(
        object
      );

      tempBox.getSize(
        tempSize
      );

      const currentLength =
        options.direction === "x"
          ? tempSize.x
          : tempSize.z;

      const currentCrossSize =
        options.direction === "x"
          ? tempSize.z
          : tempSize.x;

      const lengthScale =
        options.targetLength /
        Math.max(
          currentLength,
          0.001
        );

      const crossScale =
        options.targetCrossSize /
        Math.max(
          currentCrossSize,
          0.001
        );

      if (
        options.direction === "x"
      ) {
        object.scale.x *=
          lengthScale;

        object.scale.z *=
          crossScale;
      } else {
        object.scale.z *=
          lengthScale;

        object.scale.x *=
          crossScale;
      }

      alignToGround(
        object,
        options.y ?? 0,
        options.sinkIntoGround ??
          0.025
      );

      chunk.add(
        object
      );

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
        `Linear model failed: ${definition.url}`,
        error
      );
    });
}

/* -------------------------------------------------------------------------- */
/*                                 FOUNDATION                                 */
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
    Math.min(
      tempSize.x + 0.45,
      17
    );

  const depth =
    Math.min(
      tempSize.z + 0.45,
      17
    );

  const edgeGeometry =
    new THREE.BoxGeometry(
      width + 0.45,
      0.055,
      depth + 0.45
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

  const foundationGeometry =
    new THREE.BoxGeometry(
      width,
      0.11,
      depth
    );

  const foundation =
    new THREE.Mesh(
      foundationGeometry,
      foundationMaterial
    );

  foundation.position.set(
    tempCenter.x,
    0.008,
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

  const random =
    seededRandom(
      Math.floor(
        (
          tempCenter.x +
          1000
        ) *
          37 +
        (
          tempCenter.z +
          1000
        ) *
          71
      )
    );

  const rubbleCount =
    3 +
    Math.floor(
      random() * 4
    );

  for (
    let index = 0;
    index < rubbleCount;
    index++
  ) {
    const geometry =
      new THREE.BoxGeometry(
        randomRange(
          random,
          0.25,
          0.65
        ),
        randomRange(
          random,
          0.1,
          0.26
        ),
        randomRange(
          random,
          0.25,
          0.65
        )
      );

    const rubble =
      new THREE.Mesh(
        geometry,
        rubbleMaterial
      );

    const horizontal =
      random() < 0.5;

    const side =
      random() < 0.5
        ? -1
        : 1;

    rubble.position.set(
      tempCenter.x +
        (
          horizontal
            ? side *
              (
                width / 2 +
                0.2
              )
            : randomRange(
                random,
                -width / 2,
                width / 2
              )
        ),
      0.08,
      tempCenter.z +
        (
          horizontal
            ? randomRange(
                random,
                -depth / 2,
                depth / 2
              )
            : side *
              (
                depth / 2 +
                0.2
              )
        )
    );

    rubble.rotation.set(
      randomRange(
        random,
        -0.15,
        0.15
      ),
      random() *
        Math.PI,
      randomRange(
        random,
        -0.15,
        0.15
      )
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
  type: ColliderType
) {
  switch (type) {
    case "tree":
      return {
        x: 0.15,
        z: 0.15,
        y: 0.76,
        minimum: 0.38,
      };

    case "vehicle":
      return {
        x: 0.8,
        z: 0.8,
        y: 0.82,
        minimum: 0.6,
      };

    case "wall":
      return {
        x: 0.94,
        z: 0.94,
        y: 0.95,
        minimum: 0.5,
      };

    case "rail":
      return {
        x: 0.98,
        z: 0.98,
        y: 0.98,
        minimum: 0.22,
      };
  }
}

function registerSimpleCollider(
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

  if (
    type === "tree"
  ) {
    width =
      Math.min(
        width,
        1.15
      );

    depth =
      Math.min(
        depth,
        1.15
      );
  }

  const height =
    Math.max(
      0.8,
      tempSize.y *
        factors.y
    );

  simpleColliders.push({
    chunk,

    box:
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
        ),
  });
}

function registerStaticCollider(
  chunk: THREE.Group,
  centerX: number,
  centerY: number,
  centerZ: number,
  width: number,
  height: number,
  depth: number
) {
  simpleColliders.push({
    chunk,

    box:
      new THREE.Box3()
        .setFromCenterAndSize(
          new THREE.Vector3(
            centerX +
              chunk.position.x,
            centerY,
            centerZ +
              chunk.position.z
          ),
          new THREE.Vector3(
            width,
            height,
            depth
          )
        ),
  });
}

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

      if (
        tempSize.x < 0.16 &&
        tempSize.y < 0.16 &&
        tempSize.z < 0.16
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

/* -------------------------------------------------------------------------- */
/*                                  SURFACES                                  */
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
      -0.045
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
/*                              STREET AND ALLEY                              */
/* -------------------------------------------------------------------------- */

function addStreetTiles(
  chunk: THREE.Group,
  random: () => number,
  direction: Direction,
  start = -HALF_CHUNK,
  end = HALF_CHUNK,
  crossOffset = 0
) {
  if (
    URBAN_STREETS.length === 0
  ) {
    return;
  }

  const tileLength = 11;
  const totalLength =
    end - start;

  const count =
    Math.ceil(
      totalLength /
        tileLength
    );

  const exactLength =
    totalLength / count;

  for (
    let index = 0;
    index < count;
    index++
  ) {
    const along =
      start +
      exactLength *
        (
          index + 0.5
        );

    const definition =
      URBAN_STREETS[
        modulo(
          index +
            Math.floor(
              random() *
                URBAN_STREETS.length
            ),
          URBAN_STREETS.length
        )
      ];

    placeLinearModel(
      definition,
      chunk,
      direction === "x"
        ? along
        : crossOffset,
      direction === "x"
        ? crossOffset
        : along,
      {
        direction,
        targetLength:
          exactLength +
          0.08,
        targetCrossSize:
          ROAD_WIDTH +
          2.9,

        y: 0.015,

        height: true,
        brightness: 0.035,
        castShadow: false,
        sinkIntoGround: 0.025,
      }
    );
  }
}

function addAlleyTiles(
  chunk: THREE.Group,
  random: () => number,
  direction: Direction,
  side: -1 | 1
) {
  if (
    URBAN_ALLEYS.length === 0
  ) {
    return;
  }

  const length = 20;

  const start =
    side === -1
      ? -HALF_CHUNK
      : HALF_CHUNK -
        length;

  const count = 3;

  const exactLength =
    length / count;

  for (
    let index = 0;
    index < count;
    index++
  ) {
    const along =
      start +
      exactLength *
        (
          index + 0.5
        );

    const definition =
      URBAN_ALLEYS[
        modulo(
          index +
            Math.floor(
              random() *
                URBAN_ALLEYS.length
            ),
          URBAN_ALLEYS.length
        )
      ];

    placeLinearModel(
      definition,
      chunk,
      direction === "x"
        ? along
        : 0,
      direction === "x"
        ? 0
        : along,
      {
        direction,
        targetLength:
          exactLength +
          0.06,
        targetCrossSize:
          ALLEY_WIDTH,

        y: 0.012,

        height: true,
        brightness: 0.025,
        castShadow: false,
        sinkIntoGround: 0.018,
      }
    );
  }
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
  const alongPositions =
    [
      -36,
      -24,
      -12,
      0,
      12,
      24,
      36,
    ];

  const slots: Array<{
    x: number;
    z: number;
    rotation: number;
    outer: boolean;
  }> = [];

  const rowOffsets =
    [
      13.2,
      28.2,
    ];

  for (
    const rowOffset
    of rowOffsets
  ) {
    for (
      const value
      of alongPositions
    ) {
      /*
       * ردیف بیرونی کمی خلوت‌تر است تا مدل‌ها روی هم نیفتند.
       */
      if (
        rowOffset > 20 &&
        Math.abs(
          value
        ) < 5
      ) {
        continue;
      }

      if (
        direction === "x"
      ) {
        slots.push({
          x: value,
          z: -rowOffset,
          rotation: 0,
          outer:
            rowOffset > 20,
        });

        slots.push({
          x: value,
          z: rowOffset,
          rotation:
            Math.PI,
          outer:
            rowOffset > 20,
        });
      } else {
        slots.push({
          x: -rowOffset,
          z: value,
          rotation:
            Math.PI / 2,
          outer:
            rowOffset > 20,
        });

        slots.push({
          x: rowOffset,
          z: value,
          rotation:
            -Math.PI / 2,
          outer:
            rowOffset > 20,
        });
      }
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
    if (
      slot.outer &&
      random() < 0.18
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
          -0.12,
          0.12
        ),
      slot.z +
        randomRange(
          random,
          -0.12,
          0.12
        ),
      slot.rotation +
        randomRange(
          random,
          -0.006,
          0.006
        ),
      {
        preciseCollision:
          true,

        foundation:
          true,

        sinkIntoGround:
          randomRange(
            random,
            0.1,
            0.17
          ),

        occlusion:
          !slot.outer &&
          random() < 0.32,

        targetWidth:
          slot.outer
            ? randomRange(
                random,
                10,
                11.3
              )
            : villa
              ? randomRange(
                  random,
                  10.8,
                  12
                )
              : randomRange(
                  random,
                  11.2,
                  12.3
                ),

        maxHeight:
          villa
            ? randomRange(
                random,
                8,
                10.5
              )
            : randomRange(
                random,
                12,
                17
              ),

        brightness: 0.22,
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
      4 +
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
        ? -1.85
        : 1.85;

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

    const rotation =
      point.direction === "x"
        ? random() < 0.5
          ? Math.PI / 2
          : -Math.PI / 2
        : random() < 0.5
          ? 0
          : Math.PI;

    placeModel(
      definition,
      chunk,
      x,
      z,
      rotation +
        (
          motorcycle
            ? randomRange(
                random,
                -0.5,
                0.5
              )
            : randomRange(
                random,
                -0.08,
                0.08
              )
        ),
      {
        collision: true,
        colliderType:
          "vehicle",

        targetWidth:
          motorcycle
            ? randomRange(
                random,
                2.5,
                3.15
              )
            : randomRange(
                random,
                5,
                6.2
              ),

        maxHeight:
          motorcycle
            ? 2.3
            : 3.4,

        rotationZ:
          motorcycle
            ? (
                random() < 0.5
                  ? -1
                  : 1
              ) *
              randomRange(
                random,
                1.2,
                1.46
              )
            : 0,

        sinkIntoGround:
          motorcycle
            ? 0.06
            : 0.025,

        brightness: 0.22,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                                  VEGETATION                                */
/* -------------------------------------------------------------------------- */

function addFineGrass(
  chunk: THREE.Group,
  random: () => number
) {
  const count = 950;

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
      0.02,
      randomRange(
        random,
        -41,
        41
      )
    );

    tempQuaternion
      .setFromAxisAngle(
        new THREE.Vector3(
          0,
          1,
          0
        ),
        random() *
          Math.PI *
          2
      );

    scale.set(
      randomRange(
        random,
        0.7,
        1.1
      ),
      randomRange(
        random,
        0.5,
        1
      ),
      1
    );

    matrix.compose(
      position,
      tempQuaternion,
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

function spawnCityVegetation(
  chunk: THREE.Group,
  random: () => number,
  direction: Direction
) {
  const positions =
    [
      -38,
      -26,
      -14,
      14,
      26,
      38,
    ];

  for (
    const value
    of positions
  ) {
    if (
      random() < 0.2
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
        8.7,
        10
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
            4.1,
            5.9
          ),

        brightness: 0.03,
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
        8.1,
        10
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
            0.55,
            1.3
          ),

        brightness: 0.01,
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

  for (
    let index = 0;
    index < 28;
    index++
  ) {
    placeModel(
      pick(
        FOREST_TREES,
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
        collision: true,
        colliderType:
          "tree",

        targetHeight:
          randomRange(
            random,
            4.8,
            7
          ),

        brightness: 0.03,
      }
    );
  }

  for (
    let index = 0;
    index < 48;
    index++
  ) {
    const source =
      random() < 0.55
        ? FOREST_BUSHES
        : random() < 0.5
          ? FOREST_FLOWERS
          : FOREST_GRASS;

    placeModel(
      pick(
        source,
        random
      ),
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
            0.45,
            1.7
          ),

        brightness: 0.01,
        castShadow: false,
      }
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                                   RIVER                                    */
/* -------------------------------------------------------------------------- */

function createWaterTexture() {
  const width = 128;
  const height = 128;

  const data =
    new Uint8Array(
      width *
        height *
        4
    );

  const random =
    seededRandom(
      874126
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
          y * 0.31 +
            x * 0.09
        ) *
          22 +
        Math.sin(
          y * 0.13 -
            x * 0.23
        ) *
          13;

      const noise =
        random() *
        16;

      data[index] =
        Math.max(
          12,
          28 +
            wave +
            noise
        );

      data[index + 1] =
        Math.max(
          30,
          78 +
            wave +
            noise
        );

      data[index + 2] =
        Math.max(
          38,
          92 +
            wave +
            noise
        );

      data[index + 3] =
        228;
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
    9
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
      color: 0x3d747d,
      roughness: 0.3,
      metalness: 0,
      transparent: true,
      opacity: 0.88,
      transmission: 0.04,
      clearcoat: 0.32,
      clearcoatRoughness: 0.24,
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
    -0.25;

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
  const geometry =
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
        geometry,
        riverBankMaterial
      );

    bank.position.set(
      side *
        (
          RIVER_WIDTH / 2 +
          RIVER_BANK_WIDTH / 2
        ),
      -0.04,
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
      index < 14;
      index++
    ) {
      const source =
        random() < 0.6
          ? FOREST_BUSHES
          : FOREST_GRASS;

      placeModel(
        pick(
          source,
          random
        ),
        chunk,
        side *
          randomRange(
            random,
            RIVER_WIDTH /
              2 +
              0.7,
            RIVER_WIDTH /
              2 +
              RIVER_BANK_WIDTH -
              0.35
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
              0.6,
              1.5
            ),

          brightness: 0.01,
          castShadow: false,
        }
      );
    }
  }
}

/* -------------------------------------------------------------------------- */
/*                                   BRIDGE                                   */
/* -------------------------------------------------------------------------- */

function buildBridge(
  chunk: THREE.Group,
  random: () => number
) {
  if (
    URBAN_BRIDGES.length === 0
  ) {
    return;
  }

  const definition =
    pick(
      URBAN_BRIDGES,
      random
    );

  /*
   * خود مدل پل سطح قابل حرکت است.
   */
  placeLinearModel(
    definition,
    chunk,
    0,
    0,
    {
      direction: "x",

      targetLength:
        BRIDGE_LENGTH,

      targetCrossSize:
        BRIDGE_WIDTH,

      y: 0.03,

      height: true,
      occlusion: true,

      brightness: 0.17,
      castShadow: true,
      sinkIntoGround: 0.025,
    }
  );

  const approachLength =
    (
      CHUNK_SIZE -
      BRIDGE_LENGTH
    ) /
      2;

  addStreetTiles(
    chunk,
    random,
    "x",
    -HALF_CHUNK,
    -BRIDGE_LENGTH / 2 +
      0.25
  );

  addStreetTiles(
    chunk,
    random,
    "x",
    BRIDGE_LENGTH / 2 -
      0.25,
    HALF_CHUNK
  );

  /*
   * Colliderهای باریک کناره پل.
   */
  registerStaticCollider(
    chunk,
    0,
    1.15,
    BRIDGE_WIDTH / 2,
    BRIDGE_LENGTH,
    2.3,
    0.35
  );

  registerStaticCollider(
    chunk,
    0,
    1.15,
    -BRIDGE_WIDTH / 2,
    BRIDGE_LENGTH,
    2.3,
    0.35
  );

  void approachLength;
}

function buildRiverChunk(
  chunk: THREE.Group,
  random: () => number,
  cz: number
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
   * مدل رودخانه در امتداد محور Z قرار می‌گیرد.
   */
  if (
    URBAN_RIVER.length >
    0
  ) {
    placeLinearModel(
      pick(
        URBAN_RIVER,
        random
      ),
      chunk,
      0,
      0,
      {
        direction: "z",
        targetLength:
          CHUNK_SIZE + 0.5,
        targetCrossSize:
          RIVER_WIDTH +
          RIVER_BANK_WIDTH *
            2,

        y: -0.3,

        water: false,
        height: false,
        brightness: 0.035,
        castShadow: false,
        sinkIntoGround: 0,
      }
    );
  }

  if (
    isBridgeCrossing(cz)
  ) {
    buildBridge(
      chunk,
      random
    );
  }
}

/* -------------------------------------------------------------------------- */
/*                                   TUNNEL                                   */
/* -------------------------------------------------------------------------- */

function buildTunnel(
  chunk: THREE.Group,
  random: () => number,
  direction: Direction
) {
  /*
   * خیابان کف تونل کاملاً متصل ساخته می‌شود.
   */
  addStreetTiles(
    chunk,
    random,
    direction,
    -HALF_CHUNK,
    HALF_CHUNK
  );

  const entranceOffset =
    TUNNEL_LENGTH / 2;

  const entranceRotation =
    direction === "x"
      ? Math.PI / 2
      : 0;

  if (
    URBAN_TUNNEL.length >
    0
  ) {
    const entranceA =
      URBAN_TUNNEL[0];

    const entranceB =
      URBAN_TUNNEL[
        URBAN_TUNNEL.length >
        1
          ? 1
          : 0
      ];

    placeLinearModel(
      entranceA,
      chunk,
      direction === "x"
        ? -entranceOffset
        : 0,
      direction === "x"
        ? 0
        : -entranceOffset,
      {
        direction,
        targetLength: 7,
        targetCrossSize:
          TUNNEL_WIDTH,

        y: 0.025,

        rotationX: 0,
        rotationZ: 0,

        preciseCollision:
          true,

        occlusion: true,

        brightness: 0.16,
        castShadow: true,
        sinkIntoGround: 0.08,
      }
    );

    placeLinearModel(
      entranceB,
      chunk,
      direction === "x"
        ? entranceOffset
        : 0,
      direction === "x"
        ? 0
        : entranceOffset,
      {
        direction,
        targetLength: 7,
        targetCrossSize:
          TUNNEL_WIDTH,

        y: 0.025,

        preciseCollision:
          true,

        occlusion: true,

        brightness: 0.16,
        castShadow: true,
        sinkIntoGround: 0.08,
      }
    );

    void entranceRotation;
  }

  if (
    URBAN_TUNNEL_WALLS.length >
    0
  ) {
    const sectionLength = 9;

    const sectionCount =
      Math.ceil(
        (
          TUNNEL_LENGTH -
          12
        ) /
          sectionLength
      );

    const exactLength =
      (
        TUNNEL_LENGTH -
        12
      ) /
        sectionCount;

    for (
      let index = 0;
      index < sectionCount;
      index++
    ) {
      const along =
        -TUNNEL_LENGTH /
          2 +
        6 +
        exactLength *
          (
            index + 0.5
          );

      const definition =
        URBAN_TUNNEL_WALLS[
          modulo(
            index,
            URBAN_TUNNEL_WALLS.length
          )
        ];

      placeLinearModel(
        definition,
        chunk,
        direction === "x"
          ? along
          : 0,
        direction === "x"
          ? 0
          : along,
        {
          direction,

          targetLength:
            exactLength +
            0.08,

          targetCrossSize:
            TUNNEL_WIDTH,

          y: 0.015,

          preciseCollision:
            true,

          occlusion:
            index % 2 === 0,

          brightness: 0.13,
          castShadow: true,
          sinkIntoGround: 0.065,
        }
      );
    }
  }

  /*
   * Colliderهای دیواره تونل به شکل پیوسته.
   */
  const wallOffset =
    TUNNEL_WIDTH / 2;

  if (
    direction === "x"
  ) {
    registerStaticCollider(
      chunk,
      0,
      3.4,
      wallOffset,
      TUNNEL_LENGTH,
      6.8,
      0.45
    );

    registerStaticCollider(
      chunk,
      0,
      3.4,
      -wallOffset,
      TUNNEL_LENGTH,
      6.8,
      0.45
    );
  } else {
    registerStaticCollider(
      chunk,
      wallOffset,
      3.4,
      0,
      0.45,
      6.8,
      TUNNEL_LENGTH
    );

    registerStaticCollider(
      chunk,
      -wallOffset,
      3.4,
      0,
      0.45,
      6.8,
      TUNNEL_LENGTH
    );
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

  if (
    tunnel
  ) {
    buildTunnel(
      chunk,
      random,
      direction
    );

    return;
  }

  addStreetTiles(
    chunk,
    random,
    direction
  );

  /*
   * کوچه فقط وقتی ساخته می‌شود که واقعاً
   * بین ساختمان‌ها مسیر ایجاد کند.
   */
  if (
    random() < 0.22
  ) {
    addAlleyTiles(
      chunk,
      random,
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
      random,
      cz
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

function getNearbyCollisionMeshes(
  x: number,
  z: number,
  range: number
) {
  return preciseCollisionMeshes
    .filter(
      (entry) => {
        entry.mesh
          .getWorldPosition(
            tempVector
          );

        return (
          Math.abs(
            tempVector.x - x
          ) < range &&
          Math.abs(
            tempVector.z - z
          ) < range
        );
      }
    )
    .map(
      (entry) =>
        entry.mesh
    );
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

  const meshes =
    getNearbyCollisionMeshes(
      toX,
      toZ,
      20
    );

  if (
    meshes.length === 0
  ) {
    return false;
  }

  if (
    distance >
    0.0001
  ) {
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

    const heights =
      [
        0.3,
        0.9,
        1.5,
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
          0.1;

        if (
          raycaster.intersectObjects(
            meshes,
            false
          ).length > 0
        ) {
          return true;
        }
      }
    }
  }

  /*
   * هشت پرتو کوتاه اطراف محل مقصد؛
   * جلوی عبور آرام از دیوار را می‌گیرد.
   */
  const probeDirections = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [0.707, 0.707],
    [-0.707, 0.707],
    [0.707, -0.707],
    [-0.707, -0.707],
  ];

  for (
    const [
      probeX,
      probeZ,
    ]
    of probeDirections
  ) {
    rayOrigin.set(
      toX,
      player.position.y +
        0.85,
      toZ
    );

    rayDirection.set(
      probeX,
      0,
      probeZ
    );

    raycaster.set(
      rayOrigin,
      rayDirection
    );

    raycaster.near = 0;

    raycaster.far =
      radius + 0.08;

    if (
      raycaster.intersectObjects(
        meshes,
        false
      ).length > 0
    ) {
      return true;
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
    [x, z + 3],
    [x, z - 3],
    [x + 7, z],
    [x - 7, z],
  ];

  const testPlayer =
    new THREE.Object3D();

  testPlayer.position.set(
    x,
    PLAYER_BASE_Y,
    z
  );

  for (
    const [
      candidateX,
      candidateZ,
    ]
    of candidates
  ) {
    if (
      !intersectsSimpleCollider(
        testPlayer,
        candidateX,
        candidateZ,
        radius
      )
    ) {
      return new THREE.Vector3(
        candidateX,
        PLAYER_BASE_Y,
        candidateZ
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
      12,
    player.position.z
  );

  raycaster.set(
    rayOrigin,
    downDirection
  );

  raycaster.near = 0;
  raycaster.far = 28;

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
        2
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
      -14 *
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
    desiredDistance <= 0.1
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
        4.3,
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
  for (
    const texture
    of waterTextures
  ) {
    texture.offset.y =
      -elapsedTime *
      0.075;

    texture.offset.x =
      Math.sin(
        elapsedTime *
          0.4
      ) *
      0.025;
  }

  const opacity =
    0.86 +
    Math.sin(
      elapsedTime *
        0.85
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
