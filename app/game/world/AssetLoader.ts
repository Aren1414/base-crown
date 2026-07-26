import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";

import type { ModelDef } from "../assets/Models";

const loader = new GLTFLoader();

const modelCache = new Map<
  string,
  Promise<THREE.Group>
>();

export type SpawnOptions = {
  x: number;
  y?: number;
  z: number;
  rotationY?: number;

  /*
   * When targetSize is provided, the model is automatically
   * resized according to its real bounding box.
   */
  targetSize?: number;

  /*
   * Maximum allowed model height.
   * Useful for preventing unusually tall models.
   */
  maxHeight?: number;

  /*
   * Extra multiplier applied after automatic normalization.
   */
  scaleMultiplier?: number;

  castShadow?: boolean;
  receiveShadow?: boolean;
};

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
          const root = gltf.scene;

          root.updateMatrixWorld(true);

          resolve(root);
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

function configureMeshes(
  root: THREE.Object3D,
  castShadow: boolean,
  receiveShadow: boolean
): void {
  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) {
      return;
    }

    object.castShadow = castShadow;
    object.receiveShadow = receiveShadow;
    object.frustumCulled = true;

    if (Array.isArray(object.material)) {
      for (const material of object.material) {
        material.side = THREE.FrontSide;
      }
    } else if (object.material) {
      object.material.side = THREE.FrontSide;
    }
  });
}

function calculateScale(
  model: THREE.Object3D,
  definition: ModelDef,
  targetSize?: number,
  maxHeight?: number,
  scaleMultiplier = 1
): number {
  model.scale.setScalar(1);
  model.rotation.set(0, 0, 0);
  model.position.set(0, 0, 0);
  model.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(
    model
  );

  const size = new THREE.Vector3();
  box.getSize(size);

  if (
    !Number.isFinite(size.x) ||
    !Number.isFinite(size.y) ||
    !Number.isFinite(size.z)
  ) {
    return definition.scale;
  }

  const horizontalSize = Math.max(
    size.x,
    size.z,
    0.0001
  );

  let scale = definition.scale;

  if (targetSize !== undefined) {
    scale = targetSize / horizontalSize;
  }

  if (
    maxHeight !== undefined &&
    size.y * scale > maxHeight
  ) {
    scale = maxHeight / Math.max(
      size.y,
      0.0001
    );
  }

  return scale * scaleMultiplier;
}

function centerAndGroundModel(
  model: THREE.Object3D
): void {
  model.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(
    model
  );

  const center = new THREE.Vector3();
  box.getCenter(center);

  model.position.x -= center.x;
  model.position.z -= center.z;
  model.position.y -= box.min.y;

  model.updateMatrixWorld(true);
}

export async function spawnModel(
  definition: ModelDef,
  parent: THREE.Group,
  options: SpawnOptions
): Promise<THREE.Group | null> {
  try {
    const original = await loadOriginalModel(
      definition.url
    );

    if (parent.userData.destroyed) {
      return null;
    }

    const model = clone(original);

    const wrapper = new THREE.Group();

    wrapper.name = definition.url
      .split("/")
      .pop() ?? "Model";

    model.rotation.y =
      options.rotationY ?? 0;

    const scale = calculateScale(
      model,
      definition,
      options.targetSize,
      options.maxHeight,
      options.scaleMultiplier ?? 1
    );

    model.scale.setScalar(scale);

    configureMeshes(
      model,
      options.castShadow ?? true,
      options.receiveShadow ?? true
    );

    centerAndGroundModel(model);

    wrapper.add(model);

    wrapper.position.set(
      options.x,
      options.y ?? 0,
      options.z
    );

    if (parent.userData.destroyed) {
      return null;
    }

    parent.add(wrapper);

    return wrapper;
  } catch (error) {
    console.error(
      `Could not spawn model: ${definition.url}`,
      error
    );

    return null;
  }
}

export async function preloadModels(
  definitions: ModelDef[]
): Promise<void> {
  const urls = [
    ...new Set(
      definitions.map(
        (definition) => definition.url
      )
    ),
  ];

  await Promise.allSettled(
    urls.map((url) =>
      loadOriginalModel(url)
    )
  );
}

export function clearModelCache(): void {
  modelCache.clear();
}
