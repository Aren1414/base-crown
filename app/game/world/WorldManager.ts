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

export const CHUNK_SIZE = 120;

const ROAD_WIDTH = 12;
const ALLEY_WIDTH = 5;
const SIDEWALK_WIDTH = 2.5;

const ROAD_POSITIONS = [-30, 30];
const ALLEY_POSITIONS = [-49, 0, 49];

type ChunkType =
  | "urban"
  | "river-horizontal"
  | "river-vertical"
  | "tunnel-horizontal"
  | "tunnel-vertical";

type RoadDirection =
  | "horizontal"
  | "vertical";

type RoadPoint = {
  x: number;
  z: number;
  direction: RoadDirection;
};

type WalkableRect = {
  x: number;
  z: number;
  width: number;
  depth: number;
  y: number;
  type: "ground" | "road" | "alley" | "sidewalk" | "bridge";
};

export const chunks =
  new Map<string, THREE.Group>();

const loader = new GLTFLoader();

const modelCache =
  new Map<string, Promise<THREE.Group>>();

const groundMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x696b5b,
    roughness: 1,
    metalness: 0,
  });

const roadMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x30322f,
    roughness: 0.96,
    metalness: 0,
  });

const alleyMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x41433d,
    roughness: 1,
    metalness: 0,
  });

const sidewalkMaterial =
  new THREE.MeshStandardMaterial({
    color: 0x77776d,
    roughness: 1,
    metalness: 0,
  });

const lineMaterial =
  new THREE.MeshBasicMaterial({
    color: 0xb3aa76,
    transparent: true,
    opacity: 0.45,
    depthWrite: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });

function createSeed(
  cx: number,
  cz: number
): number {
  let value =
    Math.imul(cx, 374761393) +
    Math.imul(cz, 668265263);

  value =
    (value ^ (value >>> 13)) >>> 0;

  return value;
}

function createRandom(
  seed: number
): () => number {
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

function pick<T>(
  items: readonly T[],
  random: () => number
): T {
  return items[
    Math.floor(random() * items.length)
  ];
}

function randomRange(
  random: () => number,
  min: number,
  max: number
): number {
  return min + random() * (max - min);
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

function loadCachedModel(
  url: string
): Promise<THREE.Group> {
  const cached = modelCache.get(url);

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

function prepareModel(
  object: THREE.Object3D
): void {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }

    child.castShadow = true;
    child.receiveShadow = true;

    child.frustumCulled = true;
  });
}

function placeModel(
  definition: ModelDef,
  chunk: THREE.Group,
  x: number,
  z: number,
  rotationY = 0,
  y = 0
): void {
  loadCachedModel(definition.url)
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

      object.rotation.y = rotationY;

      object.position.set(x, y, z);

      prepareModel(object);

      /*
       * مدل روی سطح زمین قرار می‌گیرد؛ حتی اگر Origin
       * فایل GLB دقیقاً پایین مدل نباشد.
       */
      object.updateMatrixWorld(true);

      const bounds =
        new THREE.Box3().setFromObject(
          object
        );

      if (
        Number.isFinite(bounds.min.y)
      ) {
        object.position.y +=
          y - bounds.min.y;
      }

      chunk.add(object);
    })
    .catch((error) => {
      console.error(
        `Unable to load model: ${definition.url}`,
        error
      );
    });
}

function createPlane(
  width: number,
  depth: number,
  material: THREE.Material,
  x: number,
  z: number,
  y: number
): THREE.Mesh {
  const mesh =
    new THREE.Mesh(
      new THREE.PlaneGeometry(
        width,
        depth
      ),
      material
    );

  mesh.rotation.x =
    -Math.PI / 2;

  mesh.position.set(x, y, z);

  mesh.receiveShadow = true;

  return mesh;
}

function addWalkableRect(
  chunk: THREE.Group,
  rectangle: WalkableRect
): void {
  const walkable =
    chunk.userData.walkableRects as
      | WalkableRect[]
      | undefined;

  if (walkable) {
    walkable.push(rectangle);
  }
}

function addGround(
  chunk: THREE.Group
): void {
  const ground =
    createPlane(
      CHUNK_SIZE,
      CHUNK_SIZE,
      groundMaterial,
      0,
      0,
      0
    );

  ground.name = "CityGround";

  chunk.add(ground);

  addWalkableRect(chunk, {
    x: 0,
    z: 0,
    width: CHUNK_SIZE,
    depth: CHUNK_SIZE,
    y: 0,
    type: "ground",
  });
}

function addRoad(
  chunk: THREE.Group,
  direction: RoadDirection,
  position: number
): void {
  const horizontal =
    direction === "horizontal";

  const road =
    createPlane(
      horizontal
        ? CHUNK_SIZE
        : ROAD_WIDTH,
      horizontal
        ? ROAD_WIDTH
        : CHUNK_SIZE,
      roadMaterial,
      horizontal ? 0 : position,
      horizontal ? position : 0,
      0.03
    );

  road.name = "ProceduralRoad";

  chunk.add(road);

  addWalkableRect(chunk, {
    x: horizontal ? 0 : position,
    z: horizontal ? position : 0,
    width: horizontal
      ? CHUNK_SIZE
      : ROAD_WIDTH,
    depth: horizontal
      ? ROAD_WIDTH
      : CHUNK_SIZE,
    y: 0.03,
    type: "road",
  });

  const sidewalkOffset =
    ROAD_WIDTH / 2 +
    SIDEWALK_WIDTH / 2;

  for (const side of [-1, 1]) {
    const sidewalk =
      createPlane(
        horizontal
          ? CHUNK_SIZE
          : SIDEWALK_WIDTH,
        horizontal
          ? SIDEWALK_WIDTH
          : CHUNK_SIZE,
        sidewalkMaterial,
        horizontal
          ? 0
          : position +
            sidewalkOffset * side,
        horizontal
          ? position +
            sidewalkOffset * side
          : 0,
        0.055
      );

    sidewalk.name =
      "ProceduralSidewalk";

    chunk.add(sidewalk);

    addWalkableRect(chunk, {
      x: sidewalk.position.x,
      z: sidewalk.position.z,
      width: horizontal
        ? CHUNK_SIZE
        : SIDEWALK_WIDTH,
      depth: horizontal
        ? SIDEWALK_WIDTH
        : CHUNK_SIZE,
      y: 0.055,
      type: "sidewalk",
    });
  }

  addRoadMarkings(
    chunk,
    direction,
    position
  );
}

function addRoadMarkings(
  chunk: THREE.Group,
  direction: RoadDirection,
  position: number
): void {
  const horizontal =
    direction === "horizontal";

  for (
    let offset = -52;
    offset <= 52;
    offset += 10
  ) {
    const marking =
      createPlane(
        horizontal ? 4.8 : 0.18,
        horizontal ? 0.18 : 4.8,
        lineMaterial,
        horizontal ? offset : position,
        horizontal ? position : offset,
        0.072
      );

    marking.name = "RoadMarking";

    chunk.add(marking);
  }
}

function addAlley(
  chunk: THREE.Group,
  direction: RoadDirection,
  position: number
): void {
  const horizontal =
    direction === "horizontal";

  const alley =
    createPlane(
      horizontal
        ? CHUNK_SIZE
        : ALLEY_WIDTH,
      horizontal
        ? ALLEY_WIDTH
        : CHUNK_SIZE,
      alleyMaterial,
      horizontal ? 0 : position,
      horizontal ? position : 0,
      0.04
    );

  alley.name = "ProceduralAlley";

  chunk.add(alley);

  addWalkableRect(chunk, {
    x: alley.position.x,
    z: alley.position.z,
    width: horizontal
      ? CHUNK_SIZE
      : ALLEY_WIDTH,
    depth: horizontal
      ? ALLEY_WIDTH
      : CHUNK_SIZE,
    y: 0.04,
    type: "alley",
  });
}

function getChunkType(
  random: () => number
): ChunkType {
  const value = random();

  if (value < 0.08) {
    return random() < 0.5
      ? "river-horizontal"
      : "river-vertical";
  }

  if (value < 0.14) {
    return random() < 0.5
      ? "tunnel-horizontal"
      : "tunnel-vertical";
  }

  return "urban";
}

function buildRoadLayout(
  chunk: THREE.Group,
  chunkType: ChunkType
): RoadPoint[] {
  const roadPoints: RoadPoint[] = [];

  let horizontalRoads =
    [...ROAD_POSITIONS];

  let verticalRoads =
    [...ROAD_POSITIONS];

  if (
    chunkType === "river-horizontal"
  ) {
    horizontalRoads = [-38, 38];
  }

  if (
    chunkType === "river-vertical"
  ) {
    verticalRoads = [-38, 38];
  }

  for (const z of horizontalRoads) {
    addRoad(chunk, "horizontal", z);

    for (
      let x = -50;
      x <= 50;
      x += 20
    ) {
      roadPoints.push({
        x,
        z,
        direction: "horizontal",
      });
    }
  }

  for (const x of verticalRoads) {
    addRoad(chunk, "vertical", x);

    for (
      let z = -50;
      z <= 50;
      z += 20
    ) {
      roadPoints.push({
        x,
        z,
        direction: "vertical",
      });
    }
  }

  for (const z of ALLEY_POSITIONS) {
    if (
      chunkType ===
        "river-horizontal" &&
      Math.abs(z) < 10
    ) {
      continue;
    }

    addAlley(chunk, "horizontal", z);
  }

  for (const x of ALLEY_POSITIONS) {
    if (
      chunkType ===
        "river-vertical" &&
      Math.abs(x) < 10
    ) {
      continue;
    }

    addAlley(chunk, "vertical", x);
  }

  return roadPoints;
}

function createBuildingSlots(
  chunkType: ChunkType
): Array<{
  x: number;
  z: number;
  rotation: number;
}> {
  const slots = [
    { x: -45, z: -45, rotation: 0 },
    { x: -15, z: -45, rotation: 0 },
    { x: 15, z: -45, rotation: 0 },
    { x: 45, z: -45, rotation: 0 },

    {
      x: -45,
      z: -15,
      rotation: Math.PI / 2,
    },
    {
      x: 45,
      z: -15,
      rotation: -Math.PI / 2,
    },

    {
      x: -45,
      z: 15,
      rotation: Math.PI / 2,
    },
    {
      x: 45,
      z: 15,
      rotation: -Math.PI / 2,
    },

    {
      x: -45,
      z: 45,
      rotation: Math.PI,
    },
    {
      x: -15,
      z: 45,
      rotation: Math.PI,
    },
    {
      x: 15,
      z: 45,
      rotation: Math.PI,
    },
    {
      x: 45,
      z: 45,
      rotation: Math.PI,
    },
  ];

  if (
    chunkType === "river-horizontal"
  ) {
    return slots.filter(
      (slot) =>
        Math.abs(slot.z) > 20
    );
  }

  if (
    chunkType === "river-vertical"
  ) {
    return slots.filter(
      (slot) =>
        Math.abs(slot.x) > 20
    );
  }

  return slots;
}

function spawnBuildings(
  chunk: THREE.Group,
  random: () => number,
  chunkType: ChunkType
): void {
  const slots =
    createBuildingSlots(chunkType);

  for (const slot of slots) {
    if (random() > 0.76) {
      continue;
    }

    const building =
      pick(
        URBAN_BUILDINGS,
        random
      );

    const jitterX =
      randomRange(random, -2, 2);

    const jitterZ =
      randomRange(random, -2, 2);

    placeModel(
      building,
      chunk,
      slot.x + jitterX,
      slot.z + jitterZ,
      slot.rotation +
        randomRange(
          random,
          -0.04,
          0.04
        )
    );
  }
}

function spawnVehicles(
  chunk: THREE.Group,
  random: () => number,
  roads: RoadPoint[]
): void {
  let vehicleCount = 0;

  for (const road of roads) {
    if (
      vehicleCount >= 5 ||
      random() > 0.12
    ) {
      continue;
    }

    const vehicle =
      pick(
        URBAN_VEHICLES,
        random
      );

    const rotation =
      road.direction === "horizontal"
        ? random() < 0.5
          ? 0
          : Math.PI
        : random() < 0.5
          ? Math.PI / 2
          : -Math.PI / 2;

    const laneOffset =
      random() < 0.5 ? -2.2 : 2.2;

    placeModel(
      vehicle,
      chunk,
      road.direction === "vertical"
        ? road.x + laneOffset
        : road.x,
      road.direction === "horizontal"
        ? road.z + laneOffset
        : road.z,
      rotation,
      0.04
    );

    vehicleCount++;
  }
}

function spawnRiver(
  chunk: THREE.Group,
  random: () => number,
  chunkType: ChunkType
): void {
  if (
    chunkType !== "river-horizontal" &&
    chunkType !== "river-vertical"
  ) {
    return;
  }

  const horizontal =
    chunkType === "river-horizontal";

  const river =
    pick(URBAN_RIVER, random);

  placeModel(
    river,
    chunk,
    0,
    0,
    horizontal
      ? 0
      : Math.PI / 2,
    -0.2
  );

  const bridge =
    pick(URBAN_BRIDGES, random);

  placeModel(
    bridge,
    chunk,
    horizontal ? 30 : 0,
    horizontal ? 0 : 30,
    horizontal
      ? 0
      : Math.PI / 2,
    0.02
  );

  addWalkableRect(chunk, {
    x: horizontal ? 30 : 0,
    z: horizontal ? 0 : 30,
    width: horizontal
      ? ROAD_WIDTH
      : 32,
    depth: horizontal
      ? 32
      : ROAD_WIDTH,
    y: 0.5,
    type: "bridge",
  });
}

function spawnTunnel(
  chunk: THREE.Group,
  random: () => number,
  chunkType: ChunkType
): void {
  if (
    chunkType !== "tunnel-horizontal" &&
    chunkType !== "tunnel-vertical"
  ) {
    return;
  }

  const horizontal =
    chunkType === "tunnel-horizontal";

  const tunnel =
    pick(URBAN_TUNNEL, random);

  const tunnelX =
    horizontal ? 52 : 30;

  const tunnelZ =
    horizontal ? -30 : -52;

  const rotation =
    horizontal ? Math.PI / 2 : 0;

  placeModel(
    tunnel,
    chunk,
    tunnelX,
    tunnelZ,
    rotation
  );

  /*
   * فقط دو دیواره استفاده می‌شود تا چانک بی‌دلیل
   * سنگین نشود.
   */
  for (let index = 0; index < 2; index++) {
    const wall =
      URBAN_TUNNEL_WALLS[
        index %
          URBAN_TUNNEL_WALLS.length
      ];

    placeModel(
      wall,
      chunk,
      horizontal
        ? tunnelX
        : tunnelX +
          (index === 0 ? -7 : 7),
      horizontal
        ? tunnelZ +
          (index === 0 ? -7 : 7)
        : tunnelZ,
      rotation
    );
  }
}

function isNearRoad(
  x: number,
  z: number
): boolean {
  return (
    ROAD_POSITIONS.some(
      (roadX) =>
        Math.abs(x - roadX) <
        ROAD_WIDTH
    ) ||
    ROAD_POSITIONS.some(
      (roadZ) =>
        Math.abs(z - roadZ) <
        ROAD_WIDTH
    ) ||
    ALLEY_POSITIONS.some(
      (alleyX) =>
        Math.abs(x - alleyX) <
        ALLEY_WIDTH
    ) ||
    ALLEY_POSITIONS.some(
      (alleyZ) =>
        Math.abs(z - alleyZ) <
        ALLEY_WIDTH
    )
  );
}

function spawnVegetation(
  chunk: THREE.Group,
  random: () => number,
  chunkType: ChunkType
): void {
  const vegetationCount =
    chunkType === "urban" ? 14 : 20;

  for (
    let index = 0;
    index < vegetationCount;
    index++
  ) {
    const x =
      randomRange(random, -56, 56);

    const z =
      randomRange(random, -56, 56);

    if (isNearRoad(x, z)) {
      continue;
    }

    const value = random();

    let definition: ModelDef;

    if (value < 0.34) {
      definition =
        pick(FOREST_TREES, random);
    } else if (value < 0.62) {
      definition =
        pick(FOREST_BUSHES, random);
    } else if (value < 0.84) {
      definition =
        pick(FOREST_GRASS, random);
    } else {
      definition =
        pick(FOREST_FLOWERS, random);
    }

    placeModel(
      definition,
      chunk,
      x,
      z,
      random() *
        Math.PI *
        2
    );
  }
}

function buildChunk(
  chunk: THREE.Group,
  cx: number,
  cz: number
): void {
  const random =
    createRandom(
      createSeed(cx, cz)
    );

  const chunkType =
    getChunkType(random);

  chunk.userData.chunkType =
    chunkType;

  chunk.userData.walkableRects =
    [] as WalkableRect[];

  addGround(chunk);

  const roads =
    buildRoadLayout(
      chunk,
      chunkType
    );

  spawnBuildings(
    chunk,
    random,
    chunkType
  );

  spawnVehicles(
    chunk,
    random,
    roads
  );

  spawnRiver(
    chunk,
    random,
    chunkType
  );

  spawnTunnel(
    chunk,
    random,
    chunkType
  );

  spawnVegetation(
    chunk,
    random,
    chunkType
  );
}

export function generateChunk(
  scene: THREE.Scene,
  cx: number,
  cz: number
): THREE.Group {
  const key = `${cx},${cz}`;

  const existing =
    chunks.get(key);

  if (existing) {
    return existing;
  }

  const chunk =
    new THREE.Group();

  chunk.name = `WorldChunk_${key}`;

  chunk.position.set(
    cx * CHUNK_SIZE,
    0,
    cz * CHUNK_SIZE
  );

  chunk.userData.destroyed = false;

  buildChunk(chunk, cx, cz);

  scene.add(chunk);

  chunks.set(key, chunk);

  return chunk;
}

export function updateWorldChunks(
  scene: THREE.Scene,
  playerX: number,
  playerZ: number,
  renderDistance = 1
): void {
  const { cx, cz } =
    getChunkCoord(
      playerX,
      playerZ
    );

  for (
    let x = cx - renderDistance;
    x <= cx + renderDistance;
    x++
  ) {
    for (
      let z = cz - renderDistance;
      z <= cz + renderDistance;
      z++
    ) {
      generateChunk(scene, x, z);
    }
  }

  destroyFarChunks(
    playerX,
    playerZ,
    renderDistance
  );
}

export function destroyFarChunks(
  playerX: number,
  playerZ: number,
  renderDistance = 1
): void {
  const { cx, cz } =
    getChunkCoord(
      playerX,
      playerZ
    );

  for (const [key, chunk] of chunks) {
    const [chunkX, chunkZ] =
      key.split(",").map(Number);

    const tooFar =
      Math.abs(chunkX - cx) >
        renderDistance ||
      Math.abs(chunkZ - cz) >
        renderDistance;

    if (!tooFar) {
      continue;
    }

    chunk.userData.destroyed = true;

    chunk.removeFromParent();

    chunks.delete(key);
  }
}

export function clearWorld(): void {
  for (const chunk of chunks.values()) {
    chunk.userData.destroyed = true;
    chunk.removeFromParent();
  }

  chunks.clear();
  }
