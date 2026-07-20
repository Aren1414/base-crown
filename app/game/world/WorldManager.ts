// WorldManager.ts
import * as THREE from "three";

// اندازه هر چانک
export const CHUNK_SIZE = 20;

// ذخیرهٔ چانک‌های ساخته‌شده
export const chunks = new Map<string, THREE.Group>();

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

// ساخت چانک + ساخت زمین داخل چانک
export function generateChunk(scene: THREE.Scene, cx: number, cz: number) {
  const key = chunkKey(cx, cz);

  // اگر قبلاً ساخته شده، دوباره نساز
  if (chunks.has(key)) return;

  // گروه چانک
  const chunkGroup = new THREE.Group();
  chunkGroup.position.set(cx * CHUNK_SIZE, 0, cz * CHUNK_SIZE);

  // ⭐ ساخت زمین داخل چانک
  const groundGeo = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE);
  const groundMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color("#2b2b2b"),
    roughness: 0.9,
    metalness: 0.0
  });

  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.set(0, -0.5, 0);

  chunkGroup.add(ground);

  // اضافه کردن چانک به صحنه
  scene.add(chunkGroup);

  // ذخیره چانک
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

    // اگر چانک خیلی دور بود، حذفش کن
    if (distX > 2 || distZ > 2) {
      chunk.removeFromParent();
      chunks.delete(key);
      console.log("Chunk removed:", key);
    }
  }
}
