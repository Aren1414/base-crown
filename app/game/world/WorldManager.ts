// WorldManager.ts
import * as THREE from "three";

export const CHUNK_SIZE = 40;
export const chunks = new Map<string, THREE.Group>();

const BIOMES = ["urban", "forest", "hell", "snow", "desert"];

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
    cz: Math.floor(z / CHUNK_SIZE)
  };
}

function chunkKey(cx: number, cz: number) {
  return `${cx},${cz}`;
}

// ⭐ ساخت آبجکت‌های واقعی داخل چانک
function spawnObjects(chunkGroup: THREE.Group, biome: string) {
  const count = 5 + Math.floor(Math.random() * 5); // تعداد آبجکت‌ها

  for (let i = 0; i < count; i++) {
    let mesh;

    if (biome === "forest") {
      // درخت ساده
      const trunk = new THREE.Mesh(
        new THREE.CylinderGeometry(0.3, 0.3, 2),
        new THREE.MeshStandardMaterial({ color: "#5a3e2b" })
      );
      trunk.position.y = 1;

      const leaves = new THREE.Mesh(
        new THREE.SphereGeometry(1.2),
        new THREE.MeshStandardMaterial({ color: "#2e5f2b" })
      );
      leaves.position.y = 2.5;

      const tree = new THREE.Group();
      tree.add(trunk);
      tree.add(leaves);
      mesh = tree;
    }

    else if (biome === "hell") {
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1, 1, 1),
        new THREE.MeshStandardMaterial({ color: "#ff3300", emissive: "#550000" })
      );
    }

    else if (biome === "snow") {
      mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.8),
        new THREE.MeshStandardMaterial({ color: "#ffffff" })
      );
    }

    else if (biome === "desert") {
      mesh = new THREE.Mesh(
        new THREE.ConeGeometry(0.6, 1.2),
        new THREE.MeshStandardMaterial({ color: "#c2a15f" })
      );
    }

    else {
      // شهری → مانع ساده
      mesh = new THREE.Mesh(
        new THREE.BoxGeometry(1.2, 1.2, 1.2),
        new THREE.MeshStandardMaterial({ color: "#444444" })
      );
    }

    mesh.position.x = (Math.random() - 0.5) * CHUNK_SIZE;
    mesh.position.z = (Math.random() - 0.5) * CHUNK_SIZE;
    mesh.position.y = 0;

    chunkGroup.add(mesh);
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
    metalness: 0.0
  });

  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.5, 0);

  chunkGroup.add(ground);

  // ⭐ اضافه کردن آبجکت‌های واقعی
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
