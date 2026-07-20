// WorldManager.ts
import * as THREE from "three";

// اندازه هر چانک (بزرگ‌تر تا فقط یک چانک دیده شود)
export const CHUNK_SIZE = 40;

// ذخیرهٔ چانک‌های ساخته‌شده
export const chunks = new Map<string, THREE.Group>();

// لیست Biomeها
const BIOMES = [
  "urban",   // شهری
  "forest",  // جنگلی
  "hell",    // جهنمی
  "snow",    // برفی
  "desert"   // بیابانی
];

// انتخاب تصادفی Biome
function randomBiome() {
  return BIOMES[Math.floor(Math.random() * BIOMES.length)];
}

// تکسچر مخصوص هر Biome
function biomeTexture(biome: string) {
  switch (biome) {
    case "urban":
      return "https://raw.githubusercontent.com/mrdoob/three.js/dev/examples/textures/terrain/grasslight-big.jpg"; // آسفالت واقعی پیدا نکردم، بعداً می‌ذاریم
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

// تشخیص اینکه بازیکن داخل کدام چانک است
export function getChunkCoord(x: number, z: number) {
  return {
    cx: Math.floor(x / CHUNK_SIZE),
    cz: Math.floor(z / CHUNK_SIZE)
  };
}

// ساخت کلید چانک
function chunkKey(cx: number, cz: number) {
  return `${cx},${cz}`;
}

// ساخت چانک + ساخت زمین واقعی + انتخاب Biome
export function generateChunk(scene: THREE.Scene, cx: number, cz: number) {
  const key = chunkKey(cx, cz);

  if (chunks.has(key)) return;

  const biome = randomBiome();
  console.log(`Chunk ${key} biome = ${biome}`);

  const chunkGroup = new THREE.Group();
  chunkGroup.position.set(cx * CHUNK_SIZE, 0, cz * CHUNK_SIZE);

  // ⭐ تکسچر واقعی
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

  scene.add(chunkGroup);
  chunks.set(key, chunkGroup);

  console.log("Chunk created:", key);
}

// حذف چانک‌های دور
export function destroyFarChunks(playerX: number, playerZ: number) {
  const { cx, cz } = getChunkCoord(playerX, playerZ);

  for (const [key, chunk] of chunks) {
    const [chunkX, chunkZ] = key.split(",").map(Number);

    const distX = Math.abs(chunkX - cx);
    const distZ = Math.abs(chunkZ - cz);

    // فقط چانک فعلی را نگه می‌داریم
    if (distX > 0 || distZ > 0) {
      chunk.removeFromParent();
      chunks.delete(key);
      console.log("Chunk removed:", key);
    }
  }
}
