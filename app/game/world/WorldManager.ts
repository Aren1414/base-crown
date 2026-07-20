// WorldManager.ts
import * as THREE from "three";

// اندازه هر چانک (بزرگ‌تر تا فقط یک چانک تو دید دوربین باشه)
export const CHUNK_SIZE = 40;

// ذخیرهٔ چانک‌های ساخته‌شده
export const chunks = new Map<string, THREE.Group>();

// لیست Biomeها
const BIOMES = [
  "urban",   // شهری تاریک
  "forest",  // جنگلی
  "hell",    // جهنمی
  "snow",    // برفی
  "desert"   // بیابانی
];

// انتخاب تصادفی Biome
function randomBiome() {
  return BIOMES[Math.floor(Math.random() * BIOMES.length)];
}

// رنگ زمین بر اساس Biome
function biomeGroundColor(biome: string) {
  switch (biome) {
    case "urban":  return "#2b2b2b";   // آسفالت تیره
    case "forest": return "#3a4f2b";   // سبز جنگلی
    case "hell":   return "#4a0f0f";   // قرمز جهنمی
    case "snow":   return "#e8e8e8";   // سفید برفی
    case "desert": return "#c2a15f";   // شن بیابانی
    default:       return "#2b2b2b";
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

// ساخت چانک + ساخت زمین + انتخاب Biome
export function generateChunk(scene: THREE.Scene, cx: number, cz: number) {
  const key = chunkKey(cx, cz);

  // اگر قبلاً ساخته شده، دوباره نساز
  if (chunks.has(key)) return;

  // انتخاب Biome تصادفی
  const biome = randomBiome();
  console.log(`Chunk ${key} biome = ${biome}`);

  // گروه چانک
  const chunkGroup = new THREE.Group();
  chunkGroup.position.set(cx * CHUNK_SIZE, 0, cz * CHUNK_SIZE);

  // زمین چانک
  const groundGeo = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE);
  const groundMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(biomeGroundColor(biome)),
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

    // فقط چانک فعلی رو نگه می‌داریم؛ هر چانک غیر از اون حذف می‌شه
    if (distX > 0 || distZ > 0) {
      chunk.removeFromParent();
      chunks.delete(key);
      console.log("Chunk removed:", key);
    }
  }
}
