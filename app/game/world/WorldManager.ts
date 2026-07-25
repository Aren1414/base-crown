import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export const CHUNK_SIZE = 120;
export const chunks = new Map<string, THREE.Group>();

const BIOMES = ["urban", "forest", "hell", "snow", "desert"];
const BASE_URL = "https://pub-15ed8100c073408287949c0bebad27a6.r2.dev";

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

function load(url: string, group: THREE.Group, x: number, z: number, scale: number) {
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

function spawnObjects(chunk: THREE.Group, biome: string) {
  for (let i = 0; i < 6; i++) {
    const x = (Math.random() - 0.5) * CHUNK_SIZE;
    const z = (Math.random() - 0.5) * CHUNK_SIZE;
    load(pick(URBAN_STREETS), chunk, x, z, 1.2);
  }

  for (let i = 0; i < 6; i++) {
    const x = (Math.random() - 0.5) * CHUNK_SIZE;
    const z = (Math.random() - 0.5) * CHUNK_SIZE;
    load(pick(URBAN_ALLEYS), chunk, x, z, 1.2);
  }

  for (let i = 0; i < 10; i++) {
    const x = (Math.random() - 0.5) * CHUNK_SIZE;
    const z = (Math.random() - 0.5) * CHUNK_SIZE;
    load(pick(URBAN_BUILDINGS), chunk, x, z, 1.3);
  }

  for (let i = 0; i < 4; i++) {
    const x = (Math.random() - 0.5) * CHUNK_SIZE;
    const z = (Math.random() - 0.5) * CHUNK_SIZE;
    load(pick(URBAN_VEHICLES), chunk, x, z, 0.8);
  }

  if (Math.random() < 0.2) {
    load(pick(URBAN_RIVER), chunk, 0, 0, 1.2);
    if (Math.random() < 0.7) {
      load(pick(URBAN_BRIDGES), chunk, 0, 0, 1.2);
    }
  }

  if (biome === "forest") {
    for (let i = 0; i < 6; i++) {
      const x = (Math.random() - 0.5) * CHUNK_SIZE;
      const z = (Math.random() - 0.5) * CHUNK_SIZE;
      load(pick(FOREST_TREES), chunk, x, z, 0.5);
    }

    for (let i = 0; i < 6; i++) {
      const x = (Math.random() - 0.5) * CHUNK_SIZE;
      const z = (Math.random() - 0.5) * CHUNK_SIZE;
      load(pick(FOREST_BUSHES), chunk, x, z, 0.3);
    }

    for (let i = 0; i < 6; i++) {
      const x = (Math.random() - 0.5) * CHUNK_SIZE;
      const z = (Math.random() - 0.5) * CHUNK_SIZE;
      load(pick(FOREST_GRASS), chunk, x, z, 0.25);
    }

    for (let i = 0; i < 6; i++) {
      const x = (Math.random() - 0.5) * CHUNK_SIZE;
      const z = (Math.random() - 0.5) * CHUNK_SIZE;
      load(pick(FOREST_FLOWERS), chunk, x, z, 0.2);
    }
  }
}

export function generateChunk(scene: THREE.Scene, cx: number, cz: number) {
  const key = chunkKey(cx, cz);
  if (chunks.has(key)) return;

  const biome = randomBiome();
  const chunk = new THREE.Group();
  chunk.position.set(cx * CHUNK_SIZE, 0, cz * CHUNK_SIZE);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE),
    new THREE.MeshBasicMaterial({ visible: false })
  );
  ground.rotation.x = -Math.PI / 2;
  chunk.add(ground);

  spawnObjects(chunk, biome);

  scene.add(chunk);
  chunks.set(key, chunk);
}

export function destroyFarChunks(px: number, pz: number) {
  const { cx, cz } = getChunkCoord(px, pz);

  for (const [key, chunk] of chunks) {
    const [x, z] = key.split(",").map(Number);
    if (x !== cx || z !== cz) {
      chunk.removeFromParent();
      chunks.delete(key);
    }
  }
    }
