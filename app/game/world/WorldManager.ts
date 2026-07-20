// WorldManager.ts
import * as THREE from "three";

// اندازه هر چانک (می‌تونی بعداً تغییر بدی)
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

// اسکلت تابع ساخت چانک (فعلاً فقط یک گروه خالی می‌سازد)
export function generateChunk(scene: THREE.Scene, cx: number, cz: number) {
  const key = chunkKey(cx, cz);

  // اگر قبلاً ساخته شده، دوباره نساز
  if (chunks.has(key)) return;

  // گروه چانک
  const chunkGroup = new THREE.Group();
  chunkGroup.position.set(cx * CHUNK_SIZE, 0, cz * CHUNK_SIZE);

  // فعلاً خالیه — بعداً زمین، آبجکت، دشمن، همه اینجا ساخته می‌شن
  scene.add(chunkGroup);

  chunks.set(key, chunkGroup);

  console.log("Chunk created:", key);
}

// حذف چانک‌های دور (فعلاً اسکلت)
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
