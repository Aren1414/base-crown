import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";

import type { ModelDef } from "../assets/Models";

const loader = new GLTFLoader();

const modelCache = new Map<
  string,
  Promise<THREE.Group>
>();

export type ModelPlacement = {
  x: number;
  y?: number;
  z: number;

  rotationY?: number;

  targetFootprint?: number;
  maxHeight?: number;

  verticalMode?: "ground" | "surface";

  castShadow?: boolean;
  receiveShadow?: boolean;

  collider?: boolean;
  colliderPadding?: number;
};

export type SpawnedModel = {
  object: THREE.Group;
  collider: THREE.Box3 | null;
};

function loadOriginal(
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
          gltf.scene.updateMatrixWorld(true);
          resolve(gltf.scene);
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
  object: THREE.Object3D,
  castShadow: boolean,
  receiveShadow: boolean
): void {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }

    child.castShadow = castShadow;
    child.receiveShadow = receiveShadow;
    child.frustumCulled = true;
  });
}

function getObjectBounds(
  object: THREE.Object3D
): THREE.Box3 {
  object.updateMatrixWorld(true);

  return new THREE.Box3().setFromObject(
    object
  );
}

function normalizeModel(
  object: THREE.Object3D,
  definition: ModelDef,
  placement: ModelPlacement
): void {
  object.position.set(0, 0, 0);
  object.rotation.set(
    0,
    placement.rotationY ?? 0,
    0
  );

  object.scale.setScalar(1);
  object.updateMatrixWorld(true);

  let bounds = getObjectBounds(object);

  const size = new THREE.Vector3();
  bounds.getSize(size);

  const horizontalSize = Math.max(
    size.x,
    size.z,
    0.0001
  );

  let scale = definition.scale;

  if (
    placement.targetFootprint !==
    undefined
  ) {
    scale =
      placement.targetFootprint /
      horizontalSize;
  }

  if (
    placement.maxHeight !== undefined &&
    size.y * scale >
      placement.maxHeight
  ) {
    scale =
      placement.maxHeight /
      Math.max(size.y, 0.0001);
  }

  object.scale.setScalar(scale);
  object.updateMatrixWorld(true);

  bounds = getObjectBounds(object);

  const center =
    new THREE.Vector3();

  bounds.getCenter(center);

  object.position.x -= center.x;
  object.position.z -= center.z;

  if (
    placement.verticalMode === "surface"
  ) {
    object.position.y -= bounds.max.y;
  } else {
    object.position.y -= bounds.min.y;
  }

  object.updateMatrixWorld(true);
}

function createCollider(
  object: THREE.Object3D,
  padding: number
): THREE.Box3 {
  const bounds = getObjectBounds(object);

  bounds.min.x += padding;
  bounds.min.z += padding;

  bounds.max.x -= padding;
  bounds.max.z -= padding;

  if (bounds.min.x > bounds.max.x) {
    const center =
      (bounds.min.x + bounds.max.x) / 2;

    bounds.min.x = center;
    bounds.max.x = center;
  }

  if (bounds.min.z > bounds.max.z) {
    const center =
      (bounds.min.z + bounds.max.z) / 2;

    bounds.min.z = center;
    bounds.max.z = center;
  }

  return bounds;
}

export async function spawnModel(
  definition: ModelDef,
  parent: THREE.Group,
  placement: ModelPlacement
): Promise<SpawnedModel | null> {
  try {
    const original =
      await loadOriginal(
        definition.url
      );

    if (parent.userData.destroyed) {
      return null;
    }

    const clonedModel =
      clone(original);

    normalizeModel(
      clonedModel,
      definition,
      placement
    );

    configureMeshes(
      clonedModel,
      placement.castShadow ?? true,
      placement.receiveShadow ?? true
    );

    const wrapper =
      new THREE.Group();

    wrapper.name =
      definition.url
        .split("/")
        .pop() ?? "WorldModel";

    wrapper.position.set(
      placement.x,
      placement.y ?? 0,
      placement.z
    );

    wrapper.add(clonedModel);

    parent.add(wrapper);

    parent.updateMatrixWorld(true);
    wrapper.updateMatrixWorld(true);

    if (parent.userData.destroyed) {
      wrapper.removeFromParent();
      return null;
    }

    const collider =
      placement.collider
        ? createCollider(
            wrapper,
            placement.colliderPadding ??
              0
          )
        : null;

    return {
      object: wrapper,
      collider,
    };
  } catch (error) {
    console.error(
      `Could not spawn model: ${definition.url}`,
      error
    );

    return null;
  }
}

export function clearModelCache(): void {
  modelCache.clear();
}
