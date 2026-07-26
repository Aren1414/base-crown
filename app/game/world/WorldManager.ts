import * as THREE from "three";

import { generateChunkContent } from "./WorldGenerator";

export const CHUNK_SIZE = 120;

const RENDER_DISTANCE = 2;

export const chunks = new Map<
  string,
  THREE.Group
>();

function key(
  cx: number,
  cz: number
) {
  return `${cx},${cz}`;
}

export function getChunkCoord(
  x: number,
  z: number
) {
  return {
    cx: Math.floor(x / CHUNK_SIZE),
    cz: Math.floor(z / CHUNK_SIZE),
  };
}

function createGround() {
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(
      CHUNK_SIZE,
      CHUNK_SIZE
    ),
    new THREE.MeshStandardMaterial({
      color: 0x474747,
    })
  );

  mesh.rotation.x = -Math.PI / 2;

  mesh.receiveShadow = true;

  return mesh;
}

export async function generateChunk(
  scene: THREE.Scene,
  cx: number,
  cz: number
) {
  const id = key(cx, cz);

  if (chunks.has(id))
    return;

  const chunk =
    new THREE.Group();

  chunk.position.set(
    cx * CHUNK_SIZE,
    0,
    cz * CHUNK_SIZE
  );

  chunk.add(createGround());

  scene.add(chunk);

  chunks.set(id, chunk);

  await generateChunkContent(
    chunk,
    CHUNK_SIZE,
    cx,
    cz
  );
}

export async function updateChunks(
  scene: THREE.Scene,
  playerX: number,
  playerZ: number
) {
  const {
    cx,
    cz,
  } = getChunkCoord(
    playerX,
    playerZ
  );

  const jobs: Promise<void>[] = [];

  for (
    let x = cx - RENDER_DISTANCE;
    x <= cx + RENDER_DISTANCE;
    x++
  ) {
    for (
      let z = cz - RENDER_DISTANCE;
      z <= cz + RENDER_DISTANCE;
      z++
    ) {
      jobs.push(
        generateChunk(
          scene,
          x,
          z
        )
      );
    }
  }

  await Promise.all(jobs);

  destroyFarChunks(cx, cz);
}

export function destroyFarChunks(
  currentCX: number,
  currentCZ: number
) {
  for (const [
    id,
    chunk,
  ] of chunks) {
    const [
      x,
      z,
    ] = id
      .split(",")
      .map(Number);

    if (
      Math.abs(
        x - currentCX
      ) >
        RENDER_DISTANCE ||
      Math.abs(
        z - currentCZ
      ) >
        RENDER_DISTANCE
    ) {
      chunk.traverse(
        (obj: any) => {
          if (!obj.isMesh)
            return;

          obj.geometry?.dispose();

          if (
            Array.isArray(
              obj.material
            )
          ) {
            obj.material.forEach(
              (m: any) =>
                m.dispose()
            );
          } else {
            obj.material?.dispose();
          }
        }
      );

      chunk.removeFromParent();

      chunks.delete(id);
    }
  }
}
