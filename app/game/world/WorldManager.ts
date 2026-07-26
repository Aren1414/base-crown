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

export const CHUNK_SIZE = 140;

const ROAD_WIDTH = 11;
const SIDEWALK_WIDTH = 2.4;
const ALLEY_WIDTH = 4.5;
const PLAYER_BASE_Y = 0.05;

type ChunkKind =
  | "city"
  | "park"
  | "river-x"
  | "river-z"
  | "tunnel-x"
  | "tunnel-z";

type Direction = "x" | "z";

type RoadPoint = {
  x: number;
  z: number;
  direction: Direction;
};

type Collider = {
  box: THREE.Box3;
  chunk: THREE.Group;
};

export const chunks =
  new Map<string, THREE.Group>();

const loader = new GLTFLoader();

const modelCache =
  new Map<string, Promise<THREE.Group>>();

const colliders: Collider[] = [];
const heightMeshes: THREE.Object3D[] = [];
const occlusionMeshes: THREE.Object3D[] = [];
const animatedWaterMaterials =
  new Set<THREE.Material>();

const raycaster =
  new THREE.Raycaster();

const rayOrigin =
  new THREE.Vector3();

const rayDirection =
  new THREE.Vector3(0, -1, 0);

const groundGeometry =
  new THREE.PlaneGeometry(
    CHUNK_SIZE,
    CHUNK_SIZE
  );

const mainRoadXGeometry =
  new THREE.PlaneGeometry(
    CHUNK_SIZE,
    ROAD_WIDTH
  );

const mainRoadZGeometry =
  new THREE.PlaneGeometry(
    ROAD_WIDTH,
    CHUNK_SIZE
  );

const alleyXGeometry =
  new THREE.PlaneGeometry(
    CHUNK_SIZE,
    ALLEY_WIDTH
  );

const alleyZGeometry =
  new THREE.PlaneGeometry(
    ALLEY_WIDTH,
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

const groundMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x53604e,
    roughness: 1,
    metalness: 0,
  });

const roadMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x292c2c,
    roughness: 0.95,
    metalness: 0,
  });

const alleyMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x3b3d39,
    roughness: 1,
    metalness: 0,
  });

const sidewalkMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x74766f,
    roughness: 1,
    metalness: 0,
  });

const markingMaterial =
  new THREE.MeshBasicMaterial({
    color: 0xb8ad78,
    transparent: true,
    opacity: 0.55,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });

function seededRandom(seed: number) {
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

function pick<T>(
  array: readonly T[],
  random: () => number
): T {
  return array[
    Math.floor(
      random() * array.length
    )
  ];
}

function randomRange(
  random: () => number,
  min: number,
  max: number
) {
  return min +
    random() * (max - min);
}

function createSurface(
  geometry: THREE.PlaneGeometry,
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

export function getChunkCoord(
  x: number,
  z: number
) {
  return {
    cx: Math.floor(
      (x + CHUNK_SIZE / 2) /
        CHUNK_SIZE
    ),
    cz: Math.floor(
      (z + CHUNK_SIZE / 2) /
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

  const value =
    Math.abs(
      cx * 17 + cz * 31
    );

  if (value % 13 === 0) {
    return cx % 2 === 0
      ? "river-x"
      : "river-z";
  }

  if (value % 11 === 0) {
    return cz % 2 === 0
      ? "tunnel-x"
      : "tunnel-z";
  }

  if (value % 7 === 0) {
    return "park";
  }

  return "city";
}

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

  modelCache.set(
    url,
    promise
  );

  return promise;
}

function configureModel(
  object: THREE.Object3D
) {
  object.traverse((child) => {
    if (
      !(child instanceof THREE.Mesh)
    ) {
      return;
    }

    child.castShadow = true;
    child.receiveShadow = true;
    child.frustumCulled = true;
  });
}

function registerCollider(
  object: THREE.Object3D,
  chunk: THREE.Group,
  shrink = 0.5
) {
  object.updateMatrixWorld(true);

  const box =
    new THREE.Box3().setFromObject(
      object
    );

  if (box.isEmpty()) {
    return;
  }

  const size =
    new THREE.Vector3();

  box.getSize(size);

  box.expandByScalar(
    -Math.min(
      shrink,
      size.x * 0.08,
      size.z * 0.08
    )
  );

  colliders.push({
    box,
    chunk,
  });
}

function registerModelMeshes(
  object: THREE.Object3D,
  options: {
    collision?: boolean;
    height?: boolean;
    occlusion?: boolean;
    water?: boolean;
  },
  chunk: THREE.Group
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
        animatedWaterMaterials.add(
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
  options: {
    y?: number;
    collision?: boolean;
    height?: boolean;
    occlusion?: boolean;
    water?: boolean;
  } = {}
) {
  void loadSource(
    definition.url
  )
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

      object.rotation.y =
        rotationY;

      object.position.set(
        x,
        options.y ?? 0,
        z
      );

      configureModel(object);

      object.updateMatrixWorld(true);

      const bounds =
        new THREE.Box3().setFromObject(
          object
        );

      if (
        Number.isFinite(
          bounds.min.y
        )
      ) {
        object.position.y +=
          (options.y ?? 0) -
          bounds.min.y;
      }

      chunk.add(object);

      object.updateMatrixWorld(true);

      registerModelMeshes(
        object,
        options,
        chunk
      );
    })
    .catch((error) => {
      console.error(
        `Model load failed: ${definition.url}`,
        error
      );
    });
}

function addGround(
  chunk: THREE.Group
) {
  const ground =
    createSurface(
      groundGeometry,
      groundMaterial,
      0,
      0,
      0
    );

  ground.name = "Ground";

  chunk.add(ground);
  heightMeshes.push(ground);
}

function addMarkings(
  chunk: THREE.Group,
  direction: Direction,
  position: number
) {
  for (
    let offset = -62;
    offset <= 62;
    offset += 12
  ) {
    const geometry =
      direction === "x"
        ? new THREE.PlaneGeometry(
            5,
            0.16
          )
        : new THREE.PlaneGeometry(
            0.16,
            5
          );

    const mark =
      createSurface(
        geometry,
        markingMaterial,
        direction === "x"
          ? offset
          : position,
        direction === "x"
          ? position
          : offset,
        0.04
      );

    mark.userData.temporaryGeometry =
      true;

    chunk.add(mark);
  }
}

function addRoad(
  chunk: THREE.Group,
  direction: Direction,
  position: number
) {
  const road =
    createSurface(
      direction === "x"
        ? mainRoadXGeometry
        : mainRoadZGeometry,
      roadMaterial,
      direction === "x"
        ? 0
        : position,
      direction === "x"
        ? position
        : 0,
      0.02
    );

  chunk.add(road);
  heightMeshes.push(road);

  const sidewalkOffset =
    ROAD_WIDTH / 2 +
    SIDEWALK_WIDTH / 2;

  for (const side of [-1, 1]) {
    const sidewalk =
      createSurface(
        direction === "x"
          ? sidewalkXGeometry
          : sidewalkZGeometry,
        sidewalkMaterial,
        direction === "x"
          ? 0
          : position +
            sidewalkOffset * side,
        direction === "x"
          ? position +
            sidewalkOffset * side
          : 0,
        0.045
      );

    chunk.add(sidewalk);
    heightMeshes.push(sidewalk);
  }

  addMarkings(
    chunk,
    direction,
    position
  );
}

function addAlley(
  chunk: THREE.Group,
  direction: Direction,
  position: number
) {
  const alley =
    createSurface(
      direction === "x"
        ? alleyXGeometry
        : alleyZGeometry,
      alleyMaterial,
      direction === "x"
        ? 0
        : position,
      direction === "x"
        ? position
        : 0,
      0.025
    );

  chunk.add(alley);
  heightMeshes.push(alley);
}

function buildRoads(
  chunk: THREE.Group,
  kind: ChunkKind,
  random: () => number
): RoadPoint[] {
  const roadPoints: RoadPoint[] = [];

  let mainDirection: Direction =
    random() < 0.5 ? "x" : "z";

  if (
    kind === "river-x" ||
    kind === "tunnel-x"
  ) {
    mainDirection = "z";
  }

  if (
    kind === "river-z" ||
    kind === "tunnel-z"
  ) {
    mainDirection = "x";
  }

  addRoad(
    chunk,
    mainDirection,
    0
  );

  for (
    let offset = -58;
    offset <= 58;
    offset += 18
  ) {
    roadPoints.push({
      x:
        mainDirection === "x"
          ? offset
          : 0,
      z:
        mainDirection === "x"
          ? 0
          : offset,
      direction: mainDirection,
    });
  }

  if (
    kind === "city" &&
    random() < 0.45
  ) {
    const alleyDirection: Direction =
      mainDirection === "x"
        ? "z"
        : "x";

    const alleyPosition =
      random() < 0.5
        ? -38
        : 38;

    addAlley(
      chunk,
      alleyDirection,
      alleyPosition
    );
  }

  return roadPoints;
}

function buildingSlots(
  mainDirection: Direction,
  kind: ChunkKind
) {
  const positions = [
    -52,
    -18,
    18,
    52,
  ];

  const slots: Array<{
    x: number;
    z: number;
    rotation: number;
  }> = [];

  if (mainDirection === "x") {
    for (const x of positions) {
      slots.push({
        x,
        z: -36,
        rotation: 0,
      });

      slots.push({
        x,
        z: 36,
        rotation: Math.PI,
      });
    }
  } else {
    for (const z of positions) {
      slots.push({
        x: -36,
        z,
        rotation: Math.PI / 2,
      });

      slots.push({
        x: 36,
        z,
        rotation: -Math.PI / 2,
      });
    }
  }

  if (
    kind === "river-x"
  ) {
    return slots.filter(
      (slot) =>
        Math.abs(slot.z) > 28
    );
  }

  if (
    kind === "river-z"
  ) {
    return slots.filter(
      (slot) =>
        Math.abs(slot.x) > 28
    );
  }

  return slots;
}

function spawnBuildings(
  chunk: THREE.Group,
  random: () => number,
  kind: ChunkKind,
  mainDirection: Direction
) {
  if (kind === "park") {
    return;
  }

  const slots =
    buildingSlots(
      mainDirection,
      kind
    );

  for (const slot of slots) {
    if (random() > 0.88) {
      continue;
    }

    placeModel(
      pick(
        URBAN_BUILDINGS,
        random
      ),
      chunk,
      slot.x +
        randomRange(
          random,
          -2,
          2
        ),
      slot.z +
        randomRange(
          random,
          -2,
          2
        ),
      slot.rotation +
        randomRange(
          random,
          -0.035,
          0.035
        ),
      {
        collision: true,
        occlusion: true,
      }
    );
  }
}

function spawnVehicles(
  chunk: THREE.Group,
  random: () => number,
  roadPoints: RoadPoint[]
) {
  const shuffled =
    [...roadPoints].sort(
      () => random() - 0.5
    );

  const count =
    2 +
    Math.floor(
      random() * 3
    );

  for (
    let index = 0;
    index <
      Math.min(
        count,
        shuffled.length
      );
    index++
  ) {
    const point =
      shuffled[index];

    const lane =
      random() < 0.5
        ? -2.3
        : 2.3;

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
          ? 0
          : Math.PI
        : random() < 0.5
          ? Math.PI / 2
          : -Math.PI / 2;

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
      }
    );
  }
}

function spawnRiverAndBridge(
  chunk: THREE.Group,
  random: () => number,
  kind: ChunkKind
) {
  if (
    kind !== "river-x" &&
    kind !== "river-z"
  ) {
    return;
  }

  const riverAlongX =
    kind === "river-x";

  placeModel(
    pick(
      URBAN_RIVER,
      random
    ),
    chunk,
    0,
    0,
    riverAlongX
      ? 0
      : Math.PI / 2,
    {
      y: -0.35,
      water: true,
    }
  );

  placeModel(
    pick(
      URBAN_BRIDGES,
      random
    ),
    chunk,
    0,
    0,
    riverAlongX
      ? Math.PI / 2
      : 0,
    {
      collision: false,
      height: true,
      occlusion: true,
    }
  );
}

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
    alongX ? 52 : 0;

  const tunnelZ =
    alongX ? 0 : 52;

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
    }
  );

  const wallOffsets =
    [-12, 12];

  for (
    let index = 0;
    index <
      wallOffsets.length;
    index++
  ) {
    const offset =
      wallOffsets[index];

    placeModel(
      URBAN_TUNNEL_WALLS[
        index %
          URBAN_TUNNEL_WALLS.length
      ],
      chunk,
      alongX
        ? tunnelX
        : tunnelX + offset,
      alongX
        ? tunnelZ + offset
        : tunnelZ,
      rotation,
      {
        collision: true,
        occlusion: true,
      }
    );
  }
}

function positionBlockedByRoad(
  x: number,
  z: number,
  mainDirection: Direction
) {
  if (mainDirection === "x") {
    return (
      Math.abs(z) <
      ROAD_WIDTH / 2 + 5
    );
  }

  return (
    Math.abs(x) <
    ROAD_WIDTH / 2 + 5
  );
}

function spawnVegetation(
  chunk: THREE.Group,
  random: () => number,
  kind: ChunkKind,
  mainDirection: Direction
) {
  const count =
    kind === "park"
      ? 34
      : kind === "city"
        ? 16
        : 20;

  let created = 0;
  let attempts = 0;

  while (
    created < count &&
    attempts < count * 4
  ) {
    attempts++;

    const x =
      randomRange(
        random,
        -64,
        64
      );

    const z =
      randomRange(
        random,
        -64,
        64
      );

    if (
      positionBlockedByRoad(
        x,
        z,
        mainDirection
      )
    ) {
      continue;
    }

    const value =
      random();

    let definition: ModelDef;

    if (
      kind === "park" &&
      value < 0.48
    ) {
      definition =
        pick(
          FOREST_TREES,
          random
        );
    } else if (value < 0.28) {
      definition =
        pick(
          FOREST_TREES,
          random
        );
    } else if (value < 0.58) {
      definition =
        pick(
          FOREST_BUSHES,
          random
        );
    } else if (value < 0.82) {
      definition =
        pick(
          FOREST_GRASS,
          random
        );
    } else {
      definition =
        pick(
          FOREST_FLOWERS,
          random
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
        collision:
          definition.scale >= 3.5,
      }
    );

    created++;
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

  chunk.userData.kind =
    kind;

  addGround(chunk);

  let mainDirection: Direction =
    random() < 0.5
      ? "x"
      : "z";

  if (
    kind === "river-x" ||
    kind === "tunnel-x"
  ) {
    mainDirection = "z";
  }

  if (
    kind === "river-z" ||
    kind === "tunnel-z"
  ) {
    mainDirection = "x";
  }

  const roads =
    buildRoads(
      chunk,
      kind,
      random
    );

  spawnBuildings(
    chunk,
    random,
    kind,
    mainDirection
  );

  spawnVehicles(
    chunk,
    random,
    roads
  );

  spawnRiverAndBridge(
    chunk,
    random,
    kind
  );

  spawnTunnel(
    chunk,
    random,
    kind
  );

  spawnVegetation(
    chunk,
    random,
    kind,
    mainDirection
  );
}

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

  colliders.splice(
    0,
    colliders.length,
    ...colliders.filter(
      (item) =>
        item.chunk !== chunk
    )
  );

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

  for (const item of colliders) {
    if (
      playerBox.intersectsBox(
        item.box
      )
    ) {
      player.position.x =
        previousX;

      player.position.z =
        previousZ;

      return;
    }
  }
}

export function findSafeSpawnPosition(
  x = 0,
  z = 0,
  radius = 0.75
) {
  const candidates = [
    [x, z],
    [x + 6, z],
    [x - 6, z],
    [x, z + 6],
    [x, z - 6],
    [x + 10, z + 10],
    [x - 10, z - 10],
  ];

  for (
    const candidate
    of candidates
  ) {
    const candidateBox =
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
      colliders.some(
        (item) =>
          candidateBox.intersectsBox(
            item.box
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
    rayDirection
  );

  raycaster.far = 30;

  const intersections =
    raycaster.intersectObjects(
      heightMeshes,
      false
    );

  let targetY =
    PLAYER_BASE_Y;

  if (
    intersections.length > 0
  ) {
    targetY =
      intersections[0].point.y +
      PLAYER_BASE_Y;
  }

  const lerp =
    1 -
    Math.exp(
      -12 * delta
    );

  player.position.y =
    THREE.MathUtils.lerp(
      player.position.y,
      targetY,
      lerp
    );
}

export function updateCameraOcclusion(
  camera: THREE.PerspectiveCamera,
  target: THREE.Vector3
) {
  const direction =
    camera.position
      .clone()
      .sub(target);

  const distance =
    direction.length();

  if (distance <= 0.1) {
    return;
  }

  direction.normalize();

  raycaster.set(
    target,
    direction
  );

  raycaster.far =
    distance;

  const intersections =
    raycaster.intersectObjects(
      occlusionMeshes,
      false
    );

  if (
    intersections.length === 0
  ) {
    return;
  }

  const safeDistance =
    Math.max(
      3,
      intersections[0].distance -
        0.8
    );

  camera.position.copy(
    target
  );

  camera.position.addScaledVector(
    direction,
    safeDistance
  );
}

export function updateWorldAnimations(
  elapsedTime: number
) {
  const pulse =
    0.86 +
    Math.sin(
      elapsedTime * 0.9
    ) * 0.06;

  for (
    const material
    of animatedWaterMaterials
  ) {
    if (
      "opacity" in material &&
      typeof material.opacity ===
        "number"
    ) {
      material.transparent =
        true;

      material.opacity =
        pulse;
    }
  }
}

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
  animatedWaterMaterials.clear();
    }
