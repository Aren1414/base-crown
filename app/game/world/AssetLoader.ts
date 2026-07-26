import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";

import type { ModelDef } from "../assets/Models";

const loader = new GLTFLoader();

const modelCache = new Map<
  string,
  Promise<THREE.Group>
>();

function loadOriginalModel(
  url: string
): Promise<THREE.Group> {
  const cached = modelCache.get(url);

  if (cached) {
    return cached;
  }

  const promise = new Promise<THREE.Group>(
    (resolve, reject) => {
      loader.load(
        url,
        (gltf) => {
          const scene = gltf.scene;

          scene.traverse((object) => {
            if (!(object instanceof THREE.Mesh)) {
              return;
            }

            object.castShadow = true;
            object.receiveShadow = true;

            object.frustumCulled = true;
          });

          resolve(scene);
        },
        undefined,
        (error) => {
          modelCache.delete(url);

          console.error(
            `Failed to load model: ${url}`,
            error
          );

          reject(error);
        }
      );
    }
  );

  modelCache.set(url, promise);

  return promise;
}

export async function spawnModel(
  definition: ModelDef,
  parent: THREE.Group,
  x: number,
  z: number,
  rotationY = 0,
  y = 0
): Promise<THREE.Object3D | null> {
  try {
    const original =
      await loadOriginalModel(definition.url);

    if (parent.userData.destroyed) {
      return null;
    }

    const instance = clone(original);

    instance.position.set(x, y, z);

    instance.scale.setScalar(
      definition.scale
    );

    instance.rotation.y = rotationY;

    parent.add(instance);

    return instance;
  } catch {
    return null;
  }
}

export async function preloadModels(
  definitions: ModelDef[]
): Promise<void> {
  const uniqueUrls = [
    ...new Set(
      definitions.map(
        (definition) => definition.url
      )
    ),
  ];

  await Promise.allSettled(
    uniqueUrls.map((url) =>
      loadOriginalModel(url)
    )
  );
}

export function hasCachedModel(
  url: string
): boolean {
  return modelCache.has(url);
}

export function clearModelCache(): void {
  modelCache.clear();
}
