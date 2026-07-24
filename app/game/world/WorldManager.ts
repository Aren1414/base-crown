// app/game/world/WorldManager.ts
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export const CHUNK_SIZE = 40;
export const chunks = new Map<string, THREE.Group>();

const BIOMES = ["urban", "forest", "hell", "snow", "desert"];

const BASE_URL =
  "https://0f937cebeb25a82a4a370d0f0d94125c.r2.cloudflarestorage.com/realmdevils";

// ---------------- ASSETS ----------------

// URBAN
const URBAN_STREETS = [
  `${BASE_URL}/streets/Street1.glb`,
  `${BASE_URL}/streets/Street2.glb`,
  `${BASE_URL}/streets/Street3.glb`,
];

const URBAN_ALLEYS = [
  `${BASE_URL}/alleys/Alley1.glb`,
  `${BASE_URL}/alleys/Alley2.glb`,
  `${BASE_URL}/alleys/Alley3.glb`,
  `${BASE_URL}/Connecting_alley_and_street/Connecting_alley_and_street.glb`,
];

const URBAN_BUILDINGS = [
  `${BASE_URL}/Buildings/Urban_building1.glb`,
  `${BASE_URL}/Buildings/Urban_building2.glb`,
  `${BASE_URL}/Buildings/Urban_building3.glb`,
  `${BASE_URL}/Buildings/Urban_building4.glb`,
  `${BASE_URL}/Buildings/Urban_building5.glb`,
  `${BASE_URL}/Buildings/Urban_building6.glb`,
  `${BASE_URL}/Buildings/Urban_building7.glb`,
  `${BASE_URL}/Buildings/Urban_building8.glb`,
  `${BASE_URL}/Buildings/Urban_building9.glb`,
  `${BASE_URL}/Buildings/Urban_building10.glb`,
  `${BASE_URL}/Buildings/Urban_building11.glb`,
  `${BASE_URL}/Buildings/Villa_house1.glb`,
  `${BASE_URL}/Buildings/Villa_house2.glb`,
  `${BASE_URL}/Buildings/Villa_house3.glb`,
];

const URBAN_VEHICLES = [
  `${BASE_URL}/vehicles/Ambulance_car.glb`,
  `${BASE_URL}/vehicles/Motorcycle.glb`,
  `${BASE_URL}/vehicles/Pickup_truck.glb`,
  `${BASE_URL}/vehicles/Police_car.glb`,
  `${BASE_URL}/vehicles/Sports_car1.glb`,
  `${BASE_URL}/vehicles/Sports_car2.glb`,
  `${BASE_URL}/vehicles/Sports_car3.glb`,
  `${BASE_URL}/vehicles/Van_car.glb`,
];

const URBAN_TUNNEL = [
  `${BASE_URL}/Tunnel/Tunnel.glb`,
  `${BASE_URL}/Tunnel/Tunnel_wall1.glb`,
  `${BASE_URL}/Tunnel/Tunnel_wall2.glb`,
  `${BASE_URL}/Tunnel/Tunnel_wall3.glb`,
  `${BASE_URL}/Tunnel/Tunnel_wall4.glb`,
];

const URBAN_BRIDGES = [
  `${BASE_URL}/Bridges/Crescent_Bridge.glb`,
  `${BASE_URL}/Bridges/Stone_bridge.glb`,
  `${BASE_URL}/Bridges/Urban_bridge1.glb`,
  `${BASE_URL}/Bridges/Urban_bridge2.glb`,
];

const URBAN_RIVER = [`${BASE_URL}/river/River.glb`];

// FOREST (glTF)
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

const FOREST_ROCKS = [`${BASE_URL}/Plants_and_trees/glTF/Rocks.jpg`]; // اگر GLB داشتی جایگزین کن

const gltfLoader = new GLTFLoader();

function randomBiome() {
  return BIOMES[Math.floor(Math.random() * BIOMES.length)];
}

function biomeTexture(biome: string) {
  switch (biome) {
    case "urban":
      return "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/terrain/grasslight-big.jpg";
    case "forest":
      return "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/terrain/grasslight-big.jpg";
    case "hell":
      return "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/lava/lava.jpg";
    case "snow":
      return "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/snow/snow.jpg";
    case "desert":
      return "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/sand/sand.jpg";
    default:
      return "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/terrain/grasslight-big.jpg";
  }
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

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

// لود یک مدل و اضافه کردن به چانک
function loadAndPlace(
  url: string,
  chunkGroup: THREE.Group,
  x: number,
  z: number,
  y: number = 0,
  scale: number = 1
) {
  gltfLoader.load(
    url,
    (gltf) => {
      const obj = gltf.scene;
      obj.position.set(x, y, z);
      obj.scale.set(scale, scale, scale);
      chunkGroup.add(obj);
    },
    undefined,
    (err) => {
      console.warn("GLTF load error:", url, err);
    }
  );
}

// ساخت آبجکت‌های واقعی داخل چانک
function spawnObjects(chunkGroup: THREE.Group, biome: string) {
  const count = 6 + Math.floor(Math.random() * 6);

  for (let i = 0; i < count; i++) {
    const x = (Math.random() - 0.5) * CHUNK_SIZE;
    const z = (Math.random() - 0.5) * CHUNK_SIZE;

    if (biome === "urban") {
      const r = Math.random();
      if (r < 0.25) {
        loadAndPlace(pick(URBAN_BUILDINGS), chunkGroup, x, z, 0, 1);
      } else if (r < 0.5) {
        loadAndPlace(pick(URBAN_VEHICLES), chunkGroup, x, z, 0, 1);
      } else if (r < 0.7) {
        loadAndPlace(pick(URBAN_ALLEYS), chunkGroup, x, z, 0, 1);
      } else if (r < 0.85) {
        loadAndPlace(pick(URBAN_STREETS), chunkGroup, x, z, 0, 1);
      } else {
        loadAndPlace(pick(URBAN_TUNNEL), chunkGroup, x, z, 0, 1);
      }
    } else if (biome === "forest") {
      const r = Math.random();
      if (r < 0.4) {
        loadAndPlace(pick(FOREST_TREES), chunkGroup, x, z, 0, 1);
      } else if (r < 0.7) {
        loadAndPlace(pick(FOREST_BUSHES), chunkGroup, x, z, 0, 0.8);
      } else if (r < 0.9) {
        loadAndPlace(pick(FOREST_GRASS), chunkGroup, x, z, 0, 0.7);
      } else {
        loadAndPlace(pick(FOREST_FLOWERS), chunkGroup, x, z, 0, 0.6);
      }
    } else if (biome === "hell") {
      // می‌تونی بعداً آبجکت‌های خاص جهنم اضافه کنی؛ فعلاً درخت‌های خشک + سنگ
      const r = Math.random();
      if (r < 0.7) {
        loadAndPlace(pick(FOREST_TREES), chunkGroup, x, z, 0, 1);
      } else {
        // اگر GLB سنگ داشتی، اینجا جایگزین کن
      }
    } else if (biome === "snow" || biome === "desert") {
      // فعلاً از ترکیب خیابون + ساختمان + درخت کم استفاده می‌کنیم
      const r = Math.random();
      if (r < 0.5) {
        loadAndPlace(pick(URBAN_BUILDINGS), chunkGroup, x, z, 0, 1);
      } else {
        loadAndPlace(pick(FOREST_TREES), chunkGroup, x, z, 0, 0.8);
      }
    }
  }

  // رودخانه و پل‌ها را گاهی اضافه کن (برای تنوع)
  if (biome === "urban" || biome === "forest") {
    if (Math.random() < 0.3) {
      loadAndPlace(pick(URBAN_RIVER), chunkGroup, 0, 0, -0.2, 1);
      if (Math.random() < 0.7) {
        loadAndPlace(pick(URBAN_BRIDGES), chunkGroup, 0, 0, 0, 1);
      }
    }
  }
}

export function generateChunk(scene: THREE.Scene, cx: number, cz: number) {
  const key = chunkKey(cx, cz);
  if (chunks.has(key)) return;

  const biome = randomBiome();
  console.log(`Chunk ${key} biome = ${biome}`);

  const chunkGroup = new THREE.Group();
  chunkGroup.position.set(cx * CHUNK_SIZE, 0, cz * CHUNK_SIZE);

  const texLoader = new THREE.TextureLoader();
  const texture = texLoader.load(biomeTexture(biome));
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 2);

  const groundGeo = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE);
  const groundMat = new THREE.MeshStandardMaterial({
    map: texture,
    roughness: 0.9,
    metalness: 0.0,
  });

  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.5, 0);

  chunkGroup.add(ground);

  // آبجکت‌های واقعی از R2
  spawnObjects(chunkGroup, biome);

  scene.add(chunkGroup);
  chunks.set(key, chunkGroup);
}

export function destroyFarChunks(playerX: number, playerZ: number) {
  const { cx, cz } = getChunkCoord(playerX, playerZ);

  for (const [key, chunk] of chunks) {
    const [chunkX, chunkZ] = key.split(",").map(Number);

    if (chunkX !== cx || chunkZ !== cz) {
      chunk.removeFromParent();
      chunks.delete(key);
    }
  }
}
