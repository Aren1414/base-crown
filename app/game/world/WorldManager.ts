import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

import {
  URBAN_STREETS,
  URBAN_ALLEYS,
  URBAN_BUILDINGS,
  URBAN_VEHICLES,
  URBAN_TUNNEL,
  URBAN_BRIDGES,
  URBAN_RIVER,
  FOREST_TREES,
  FOREST_BUSHES,
  FOREST_GRASS,
  FOREST_FLOWERS
} from "./Models";

export const CHUNK_SIZE = 120;
export const chunks = new Map<string, THREE.Group>();

const gltfLoader = new GLTFLoader();

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function loadModel(def, group, x, z, rot = 0) {
  gltfLoader.load(def.url, (gltf) => {
    const o = gltf.scene;
    o.position.set(x, 0, z);
    o.scale.set(def.scale, def.scale, def.scale);
    o.rotation.y = rot;
    group.add(o);
  });
}

function buildRoadGrid(chunk) {
  const gridSize = 4;
  const cellSize = CHUNK_SIZE / gridSize;
  const roadCells = [];

  for (let gx = 0; gx < gridSize; gx++) {
    for (let gz = 0; gz < gridSize; gz++) {
      const x = gx * cellSize - CHUNK_SIZE / 2 + cellSize / 2;
      const z = gz * cellSize - CHUNK_SIZE / 2 + cellSize / 2;

      const isMainRow = gz === 1 || gz === 2;
      const isMainCol = gx === 1 || gx === 2;

      if (isMainRow || isMainCol) {
        const street = pick(URBAN_STREETS);
        const rot = isMainRow && !isMainCol ? 0 : Math.PI / 2;
        loadModel(street, chunk, x, z, rot);
        roadCells.push({ x, z });
      }
    }
  }

  return roadCells;
}

function spawnBuildings(chunk, roadCells) {
  const offset = 22;

  for (const c of roadCells) {
    if (Math.random() < 0.9) {
      const b = pick(URBAN_BUILDINGS);

      const side = Math.floor(Math.random() * 4);
      let bx = c.x;
      let bz = c.z;

      if (side === 0) bx += offset;
      else if (side === 1) bx -= offset;
      else if (side === 2) bz += offset;
      else bz -= offset;

      loadModel(b, chunk, bx, bz);
    }
  }
}

function spawnVehicles(chunk, roadCells) {
  for (const c of roadCells) {
    if (Math.random() < 0.6) {
      const v = pick(URBAN_VEHICLES);
      const rot = Math.random() < 0.5 ? 0 : Math.PI / 2;
      loadModel(v, chunk, c.x, c.z, rot);
    }
  }
}

function spawnUrban(chunk) {
  const roads = buildRoadGrid(chunk);
  spawnBuildings(chunk, roads);
  spawnVehicles(chunk, roads);

  if (Math.random() < 0.3) {
    const t = pick(URBAN_TUNNEL);
    loadModel(t, chunk, CHUNK_SIZE / 2 - 30, CHUNK_SIZE / 2 - 30);
  }

  if (Math.random() < 0.25) {
    const river = pick(URBAN_RIVER);
    loadModel(river, chunk, 0, -CHUNK_SIZE / 2 + 20);

    if (Math.random() < 0.7) {
      const bridge = pick(URBAN_BRIDGES);
      loadModel(bridge, chunk, 0, -CHUNK_SIZE / 2 + 20, Math.PI / 2);
    }
  }
}

function spawnForest(chunk) {
  for (let i = 0; i < 10; i++) {
    const x = (Math.random() - 0.5) * CHUNK_SIZE;
    const z = (Math.random() - 0.5) * CHUNK_SIZE;
    loadModel({ url: pick(FOREST_TREES), scale: 3 }, chunk, x, z);
  }

  for (let i = 0; i < 8; i++) {
    const x = (Math.random() - 0.5) * CHUNK_SIZE;
    const z = (Math.random() - 0.5) * CHUNK_SIZE;
    loadModel({ url: pick(FOREST_BUSHES), scale: 2 }, chunk, x, z);
  }

  for (let i = 0; i < 8; i++) {
    const x = (Math.random() - 0.5) * CHUNK_SIZE;
    const z = (Math.random() - 0.5) * CHUNK_SIZE;
    loadModel({ url: pick(FOREST_GRASS), scale: 1.5 }, chunk, x, z);
  }

  for (let i = 0; i < 8; i++) {
    const x = (Math.random() - 0.5) * CHUNK_SIZE;
    const z = (Math.random() - 0.5) * CHUNK_SIZE;
    loadModel({ url: pick(FOREST_FLOWERS), scale: 1.2 }, chunk, x, z);
  }
}

export function generateChunk(scene, cx, cz) {
  const key = `${cx},${cz}`;
  if (chunks.has(key)) return;

  const chunk = new THREE.Group();
  chunk.position.set(cx * CHUNK_SIZE, 0, cz * CHUNK_SIZE);

  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE),
    new THREE.MeshStandardMaterial({ color: 0x444444 })
  );
  ground.rotation.x = -Math.PI / 2;
  chunk.add(ground);

  spawnUrban(chunk);

  scene.add(chunk);
  chunks.set(key, chunk);
}

export function destroyFarChunks(px, pz) {
  const cx = Math.floor(px / CHUNK_SIZE);
  const cz = Math.floor(pz / CHUNK_SIZE);

  for (const [key, chunk] of chunks) {
    const [x, z] = key.split(",").map(Number);
    if (Math.abs(x - cx) > 1 || Math.abs(z - cz) > 1) {
      chunk.removeFromParent();
      chunks.delete(key);
    }
  }
}
