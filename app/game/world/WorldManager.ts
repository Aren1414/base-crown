import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export const CHUNK_SIZE = 120;
export const chunks = new Map<string, THREE.Group>();

const BIOMES = ["urban", "forest", "hell", "snow", "desert"];
const BASE_URL = "https://pub-15ed8100c073408287949c0bebad27a6.r2.dev";

type ModelDef = {
  url: string;
  scale: number;
};

const URBAN_STREETS: ModelDef[] = [
  { url: `${BASE_URL}/streets/Street1.glb`, scale: 7.5 },
  { url: `${BASE_URL}/streets/Street2.glb`, scale: 7.5 },
  { url: `${BASE_URL}/streets/Street3.glb`, scale: 7.5 },
];

const URBAN_ALLEYS: ModelDef[] = [
  { url: `${BASE_URL}/alleys/Alley1.glb`, scale: 7.5 },
  { url: `${BASE_URL}/alleys/Alley2.glb`, scale: 7.5 },
  { url: `${BASE_URL}/alleys/Alley3.glb`, scale: 7.5 },
  { url: `${BASE_URL}/Connecting_alley_and_street/Connecting_alley_and_street.glb`, scale: 7.5 },
];

const URBAN_BUILDINGS: ModelDef[] = [
  { url: `${BASE_URL}/Buildings/Urban_building1.glb`, scale: 4.8 },
  { url: `${BASE_URL}/Buildings/Urban_building2.glb`, scale: 5.2 },
  { url: `${BASE_URL}/Buildings/Urban_building3.glb`, scale: 5.5 },
  { url: `${BASE_URL}/Buildings/Urban_building4.glb`, scale: 5.8 },
  { url: `${BASE_URL}/Buildings/Urban_building5.glb`, scale: 6.0 },
  { url: `${BASE_URL}/Buildings/Urban_building6.glb`, scale: 6.2 },
  { url: `${BASE_URL}/Buildings/Urban_building7.glb`, scale: 6.4 },
  { url: `${BASE_URL}/Buildings/Urban_building8.glb`, scale: 6.6 },
  { url: `${BASE_URL}/Buildings/Urban_building9.glb`, scale: 6.8 },
  { url: `${BASE_URL}/Buildings/Urban_building10.glb`, scale: 7.0 },
  { url: `${BASE_URL}/Buildings/Urban_building11.glb`, scale: 7.2 },
  { url: `${BASE_URL}/Buildings/Villa_house1.glb`, scale: 3.6 },
  { url: `${BASE_URL}/Buildings/Villa_house2.glb`, scale: 3.8 },
  { url: `${BASE_URL}/Buildings/Villa_house3.glb`, scale: 4.0 },
];

const URBAN_VEHICLES: ModelDef[] = [
  { url: `${BASE_URL}/vehicles/Ambulance_car.glb`, scale: 3.2 },
  { url: `${BASE_URL}/vehicles/Motorcycle.glb`, scale: 2.4 },
  { url: `${BASE_URL}/vehicles/Pickup_truck.glb`, scale: 3.4 },
  { url: `${BASE_URL}/vehicles/Police_car.glb`, scale: 3.0 },
  { url: `${BASE_URL}/vehicles/Sports_car1.glb`, scale: 3.0 },
  { url: `${BASE_URL}/vehicles/Sports_car2.glb`, scale: 3.0 },
  { url: `${BASE_URL}/vehicles/Sports_car3.glb`, scale: 3.0 },
  { url: `${BASE_URL}/vehicles/Van_car.glb`, scale: 3.4 },
];

const URBAN_TUNNEL: ModelDef[] = [
  { url: `${BASE_URL}/Tunnel/Tunnel.glb`, scale: 6.0 },
  { url: `${BASE_URL}/Tunnel/Tunnel_wall1.glb`, scale: 6.0 },
  { url: `${BASE_URL}/Tunnel/Tunnel_wall2.glb`, scale: 6.0 },
  { url: `${BASE_URL}/Tunnel/Tunnel_wall3.glb`, scale: 6.0 },
  { url: `${BASE_URL}/Tunnel/Tunnel_wall4.glb`, scale: 6.0 },
];

const URBAN_BRIDGES: ModelDef[] = [
  { url: `${BASE_URL}/Bridges/Crescent_Bridge.glb`, scale: 6.5 },
  { url: `${BASE_URL}/Bridges/Stone_bridge.glb`, scale: 6.5 },
  { url: `${BASE_URL}/Bridges/Urban_bridge1.glb`, scale: 6.5 },
  { url: `${BASE_URL}/Bridges/Urban_bridge2.glb`, scale: 6.5 },
];

const URBAN_RIVER: ModelDef[] = [
  { url: `${BASE_URL}/river/River.glb`, scale: 6.5 },
];

const FOREST_TREES = [
  `${BASE_URL}/Plants_and_trees/glTF/BirchTree_1.gltf`,
  `${BASE_URL}/Plants_and_trees/glTF/BirchTree_2.gltf`,
  `${BASE_URL}/Plants_and_trees/glTF/BirchTree_3.gltf`,
  `${BASE_URL}/Plants_and_trees/glTF/BirchTree_4.gltf`,
  `${BASE_URL}/Plants_and_trees/glTF/BirchTree_5.gltf`,
  `${BASE_URL}/Plants_and_trees/glTF/MapleTree_1.gltf`,
  `${BASE_URL}/Plants_and_trees/glTF/MapleTree_2.gltf`,
  `${BASE_URL}/Plants_and_trees/glTF/MapleTree_3.gltf`,
  `${BASE_URL}/Plants_and_trees/glTF/MapleTree_4.gltf`,
  `${BASE_URL}/Plants_and_trees/glTF/MapleTree_5.gltf`,
  `${BASE_URL}/Plants_and_trees/glTF/DeadTree_1.gltf`,
  `${BASE_URL}/Plants_and_trees/glTF/DeadTree_2.gltf`,
  `${BASE_URL}/Plants_and_trees/glTF/DeadTree_3.gltf`,
  `${BASE_URL}/Plants_and_trees/glTF/DeadTree_4.gltf`,
  `${BASE_URL}/Plants_and_trees/glTF/DeadTree_5.gltf`,
  `${BASE_URL}/Plants_and_trees/glTF/DeadTree_6.gltf`,
  `${BASE_URL}/Plants_and_trees/glTF/DeadTree_7.gltf`,
  `${BASE_URL}/Plants_and_trees/glTF/DeadTree_8.gltf`,
  `${BASE_URL}/Plants_and_trees/glTF/DeadTree_9.gltf`,
  `${BASE_URL}/Plants_and_trees/glTF/DeadTree_10.gltf`,
];

const FOREST_BUSHES = [
  `${BASE_URL}/Plants_and_trees/glTF/Bush.gltf`,
  `${BASE_URL}/Plants_and_trees/glTF/Bush_Small.gltf`,
  `${BASE_URL}/Plants_and_trees/glTF/Bush_Large.gltf`,
  `${BASE_URL}/Plants_and_trees/glTF/Bush_Flowers.gltf`,
  `${BASE_URL}/Plants_and_trees/glTF/Bush_Large_Flowers.gltf`,
  `${BASE_URL}/Plants_and_trees/glTF/Bush_Small_Flowers.gltf`,
];

const FOREST_GRASS = [
  `${BASE_URL}/Plants_and_trees/glTF/Grass_Large.gltf`,
  `${BASE_URL}/Plants_and_trees/glTF/Grass_Large_Extruded.gltf`,
  `${BASE_URL}/Plants_and_trees/glTF/Grass_Small.gltf`,
];

const FOREST_FLOWERS = [
  `${BASE_URL}/Plants_and_trees/glTF/Flower_1.gltf`,
  `${BASE_URL}/Plants_and_trees/glTF/Flower_1_Clump.gltf`,
  `${BASE_URL}/Plants_and_trees/glTF/Flower_2.gltf`,
  `${BASE_URL}/Plants_and_trees/glTF/Flower_2_Clump.gltf`,
  `${BASE_URL}/Plants_and_trees/glTF/Flower_3_Clump.gltf`,
  `${BASE_URL}/Plants_and_trees/glTF/Flower_4_Clump.gltf`,
  `${BASE_URL}/Plants_and_trees/glTF/Flower_5_Clump.gltf`,
];

const gltfLoader = new GLTFLoader();

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBiome() {
  return BIOMES[Math.floor(Math.random() * BIOMES.length)];
}

function loadModel(
  def: ModelDef,
  group: THREE.Group,
  x: number,
  z: number,
  rotationY: number = 0
) {
  gltfLoader.load(def.url, (gltf) => {
    const o = gltf.scene;
    o.position.set(x, 0, z);
    o.scale.set(def.scale, def.scale, def.scale);
    o.rotation.y = rotationY;
    group.add(o);
  });
}

function loadUrl(
  url: string,
  group: THREE.Group,
  x: number,
  z: number,
  scale: number
) {
  gltfLoader.load(url, (gltf) => {
    const o = gltf.scene;
    o.position.set(x, 0, z);
    o.scale.set(scale, scale, scale);
    group.add(o);
  });
}

export function getChunkCoord(x: number, z: number) {
  return {
    cx: Math.floor(x / CHUNK_SIZE),
    cz: Math.floor(z / CHUNK_SIZE),
  };
}

function chunkKey(cx: number, cz: number) {
  return `${cx},${cz}`;
}

// شبکه خیابان روی چانک
type Cell = { x: number; z: number };

function buildRoadGrid(chunk: THREE.Group): Cell[] {
  const gridSize = 6;
  const cellSize = CHUNK_SIZE / gridSize;
  const roadCells: Cell[] = [];

  for (let gx = 0; gx < gridSize; gx++) {
    for (let gz = 0; gz < gridSize; gz++) {
      const x = gx * cellSize - CHUNK_SIZE / 2 + cellSize / 2;
      const z = gz * cellSize - CHUNK_SIZE / 2 + cellSize / 2;

      // ردیف‌های اصلی افقی و عمودی برای خیابان
      const isMainRow = gz === 2 || gz === 3;
      const isMainCol = gx === 2 || gx === 3;

      if (isMainRow || isMainCol) {
        const street = pick(URBAN_STREETS);
        const rotation =
          isMainRow && !isMainCol ? 0 : Math.PI / 2; // افقی و عمودی
        loadModel(street, chunk, x, z, rotation);
        roadCells.push({ x, z });
      }
    }
  }

  return roadCells;
}

function spawnUrban(chunk: THREE.Group) {
  const roadCells = buildRoadGrid(chunk);

  // کوچه‌ها روی بعضی سلول‌های خیابان
  for (let i = 0; i < roadCells.length; i++) {
    if (Math.random() < 0.4) {
      const c = roadCells[i];
      const alley = pick(URBAN_ALLEYS);
      const rotation = Math.random() < 0.5 ? 0 : Math.PI / 2;
      loadModel(alley, chunk, c.x, c.z, rotation);
    }
  }

  // ساختمان‌ها کنار خیابان، با Offset
  const buildingOffset = 8;
  for (let i = 0; i < roadCells.length; i++) {
    if (Math.random() < 0.7) {
      const c = roadCells[i];
      const b = pick(URBAN_BUILDINGS);

      const side = Math.floor(Math.random() * 4);
      let bx = c.x;
      let bz = c.z;

      if (side === 0) bx += buildingOffset;
      else if (side === 1) bx -= buildingOffset;
      else if (side === 2) bz += buildingOffset;
      else bz -= buildingOffset;

      loadModel(b, chunk, bx, bz, 0);
    }
  }

  // ماشین‌ها روی خیابان
  for (let i = 0; i < roadCells.length; i++) {
    if (Math.random() < 0.5) {
      const c = roadCells[i];
      const v = pick(URBAN_VEHICLES);
      const rotation = Math.random() < 0.5 ? 0 : Math.PI / 2;
      loadModel(v, chunk, c.x, c.z, rotation);
    }
  }

  // رودخانه و پل در یک سمت چانک
  if (Math.random() < 0.25) {
    const river = pick(URBAN_RIVER);
    loadModel(river, chunk, 0, -CHUNK_SIZE / 2 + 10, 0);

    if (Math.random() < 0.7) {
      const bridge = pick(URBAN_BRIDGES);
      loadModel(bridge, chunk, 0, -CHUNK_SIZE / 2 + 10, Math.PI / 2);
    }
  }

  // تونل در گوشه چانک
  if (Math.random() < 0.3) {
    const t = pick(URBAN_TUNNEL);
    loadModel(t, chunk, CHUNK_SIZE / 2 - 15, CHUNK_SIZE / 2 - 15, 0);
  }
}

function spawnForest(chunk: THREE.Group) {
  for (let i = 0; i < 10; i++) {
    const x = (Math.random() - 0.5) * CHUNK_SIZE;
    const z = (Math.random() - 0.5) * CHUNK_SIZE;
    loadUrl(pick(FOREST_TREES), chunk, x, z, 3);
  }

  for (let i = 0; i < 8; i++) {
    const x = (Math.random() - 0.5) * CHUNK_SIZE;
    const z = (Math.random() - 0.5) * CHUNK_SIZE;
    loadUrl(pick(FOREST_BUSHES), chunk, x, z, 2);
  }

  for (let i = 0; i < 8; i++) {
    const x = (Math.random() - 0.5) * CHUNK_SIZE;
    const z = (Math.random() - 0.5) * CHUNK_SIZE;
    loadUrl(pick(FOREST_GRASS), chunk, x, z, 1.5);
  }

  for (let i = 0; i < 8; i++) {
    const x = (Math.random() - 0.5) * CHUNK_SIZE;
    const z = (Math.random() - 0.5) * CHUNK_SIZE;
    loadUrl(pick(FOREST_FLOWERS), chunk, x, z, 1.2);
  }
}

function spawnObjects(chunk: THREE.Group, biome: string) {
  if (biome === "urban") {
    spawnUrban(chunk);
  } else if (biome === "forest") {
    spawnForest(chunk);
  } else {
    // بقیه بیوم‌ها بعداً
    spawnUrban(chunk);
  }
}

export function generateChunk(scene: THREE.Scene, cx: number, cz: number) {
  const key = chunkKey(cx, cz);
  if (chunks.has(key)) return;

  const biome = randomBiome();
  const chunk = new THREE.Group();
  chunk.position.set(cx * CHUNK_SIZE, 0, cz * CHUNK_SIZE);

  const groundColor =
    biome === "urban"
      ? 0x444444
      : biome === "forest"
      ? 0x225522
      : biome === "hell"
      ? 0x552222
      : biome === "snow"
      ? 0xffffff
      : 0xccaa55;

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE),
    new THREE.MeshStandardMaterial({
      color: groundColor,
      roughness: 0.9,
      metalness: 0.0,
    })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.1, 0);
  chunk.add(ground);

  const ambient = new THREE.AmbientLight(0xffffff, 0.9);
  chunk.add(ambient);

  const dirLight = new THREE.DirectionalLight(0xffffff, 1.4);
  dirLight.position.set(80, 120, 60);
  chunk.add(dirLight);

  spawnObjects(chunk, biome);

  scene.add(chunk);
  chunks.set(key, chunk);
}

export function destroyFarChunks(px: number, pz: number) {
  const { cx, cz } = getChunkCoord(px, pz);

  for (const [key, chunk] of chunks) {
    const [x, z] = key.split(",").map(Number);
    if (Math.abs(x - cx) > 1 || Math.abs(z - cz) > 1) {
      chunk.removeFromParent();
      chunks.delete(key);
    }
  }
}
