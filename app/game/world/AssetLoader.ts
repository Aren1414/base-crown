import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";

import type { ModelDef } from "../assets/Models";

const loader = new GLTFLoader();

const modelCache = new Map<
  string,
  Promise<THREE.Group>
>();

export type VerticalMode =
  | "ground"
  | "center-surface";

export type ColliderMode =
  | "none"
  | "mesh";

export type ModelPlacement = {
  x: number;
  y?: number;
  z: number;

  rotationX?: number;
  rotationY?: number;
  rotationZ?: number;

  targetFootprint?: number;
  maxHeight?: number;

  verticalMode?: VerticalMode;

  colliderMode?: ColliderMode;
  colliderPadding?: number;

  castShadow?: boolean;
  receiveShadow?: boolean;
  cameraOccluder?: boolean;
};

export type SpawnedModel = {
  object: THREE.Group;
  colliders: THREE.Box3[];
  occluders: THREE.Mesh[];
};

function loadOriginal(
  url: string
): Promise<THREE.Group> {
  const cached = modelCache.get(url);

  if (cached) {
    return cached;
  }

  const job = new Promise<THREE.Group>(
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

  modelCache.set(url, job);

  return job;
}

function cloneMeshMaterials(
  root: THREE.Object3D
): void {
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }

    if (Array.isArray(child.material)) {
      child.material = child.material.map(
        (material) => material.clone()
      );
    } else if (child.material) {
      child.material =
        child.material.clone();
    }
  });
}

function configureMeshes(
  root: THREE.Object3D,
  placement: ModelPlacement
): THREE.Mesh[] {
  const occluders: THREE.Mesh[] = [];

  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }

    child.castShadow =
      placement.castShadow ?? true;

    child.receiveShadow =
      placement.receiveShadow ?? true;

    child.frustumCulled = true;

    if (
      placement.cameraOccluder ??
      false
    ) {
      child.userData.cameraOccluder =
        true;

      occluders.push(child);
    }
  });

  return occluders;
}

function getBounds(
  object: THREE.Object3D
): THREE.Box3 {
  object.updateMatrixWorld(true);

  return new THREE.Box3().setFromObject(
    object
  );
}

function calculateScale(
  object: THREE.Object3D,
  definition: ModelDef,
  placement: ModelPlacement
): number {
  object.scale.setScalar(1);
  object.updateMatrixWorld(true);

  const bounds = getBounds(object);

  const size = new THREE.Vector3();
  bounds.getSize(size);

  const footprint = Math.max(
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
      footprint;
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

  return scale;
}

function centerHorizontally(
  object: THREE.Object3D
): void {
  const bounds = getBounds(object);

  const center = new THREE.Vector3();
  bounds.getCenter(center);

  object.position.x -= center.x;
  object.position.z -= center.z;

  object.updateMatrixWorld(true);
}

function placeOnGround(
  object: THREE.Object3D
): void {
  const bounds = getBounds(object);

  object.position.y -= bounds.min.y;
  object.updateMatrixWorld(true);
}

/*
 * برای خیابان و کوچه:
 * از مرکز مدل یک Ray به پایین زده می‌شود تا سطح واقعی
 * قابل راه رفتن پیدا شود. بنابراین دیواره‌های بلند مدل
 * باعث نمی‌شوند کل خیابان زیر زمین برود.
 */
function placeCenterSurfaceOnGround(
  object: THREE.Object3D
): void {
  object.updateMatrixWorld(true);

  const bounds = getBounds(object);

  const raycaster = new THREE.Raycaster();

  raycaster.set(
    new THREE.Vector3(
      0,
      bounds.max.y + 10,
      0
    ),
    new THREE.Vector3(
      0,
      -1,
      0
    )
  );

  const hits = raycaster.intersectObject(
    object,
    true
  );

  if (hits.length > 0) {
    object.position.y -=
      hits[0].point.y;
  } else {
    object.position.y -=
      bounds.min.y;
  }

  object.updateMatrixWorld(true);
}

function normalizeModel(
  object: THREE.Object3D,
  definition: ModelDef,
  placement: ModelPlacement
): void {
  object.position.set(0, 0, 0);

  object.rotation.set(
    placement.rotationX ?? 0,
    placement.rotationY ?? 0,
    placement.rotationZ ?? 0
  );

  object.scale.setScalar(1);
  object.updateMatrixWorld(true);

  const scale = calculateScale(
    object,
    definition,
    placement
  );

  object.scale.setScalar(scale);
  object.updateMatrixWorld(true);

  centerHorizontally(object);

  if (
    placement.verticalMode ===
    "center-surface"
  ) {
    placeCenterSurfaceOnGround(object);
  } else {
    placeOnGround(object);
  }
}

function shrinkCollider(
  collider: THREE.Box3,
  padding: number
): void {
  if (padding <= 0) {
    return;
  }

  const width =
    collider.max.x - collider.min.x;

  const depth =
    collider.max.z - collider.min.z;

  const safeX = Math.min(
    padding,
    width * 0.35
  );

  const safeZ = Math.min(
    padding,
    depth * 0.35
  );

  collider.min.x += safeX;
  collider.max.x -= safeX;

  collider.min.z += safeZ;
  collider.max.z -= safeZ;
}

/*
 * Collider جدا برای Meshها ساخته می‌شود، نه یک Box
 * بزرگ برای کل ساختمان. اگر در و فضای خالی مدل با
 * Meshهای جدا ساخته شده باشد، کاراکتر می‌تواند وارد شود.
 */
function createMeshColliders(
  root: THREE.Object3D,
  padding: number
): THREE.Box3[] {
  const colliders: THREE.Box3[] = [];

  root.updateMatrixWorld(true);

  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) {
      return;
    }

    const box =
      new THREE.Box3().setFromObject(
        child
      );

    if (box.isEmpty()) {
      return;
    }

    const size = new THREE.Vector3();
    box.getSize(size);

    /*
     * کف خیابان، کف ساختمان و سقف‌های نازک
     * مانع حرکت افقی نیستند.
     */
    const isFlatSurface =
      size.y < 0.35 &&
      (
        size.x > 1 ||
        size.z > 1
      );

    if (isFlatSurface) {
      return;
    }

    /*
     * اشیایی که کاملاً بالاتر از ارتفاع کاراکتر هستند،
     * مانند سقف، Collider حرکتی نمی‌گیرند.
     */
    if (box.min.y > 2.8) {
      return;
    }

    /*
     * بخش‌هایی که کاملاً زیر زمین‌اند حذف می‌شوند.
     */
    if (box.max.y < 0.12) {
      return;
    }

    shrinkCollider(
      box,
      padding
    );

    colliders.push(box);
  });

  return colliders;
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

    const model = clone(original);

    cloneMeshMaterials(model);

    normalizeModel(
      model,
      definition,
      placement
    );

    const wrapper =
      new THREE.Group();

    wrapper.name =
      definition.url
        .split("/")
        .pop() ??
      "WorldModel";

    wrapper.position.set(
      placement.x,
      placement.y ?? 0,
      placement.z
    );

    wrapper.add(model);
    parent.add(wrapper);

    parent.updateMatrixWorld(true);
    wrapper.updateMatrixWorld(true);

    if (parent.userData.destroyed) {
      wrapper.removeFromParent();
      return null;
    }

    const occluders =
      configureMeshes(
        model,
        placement
      );

    const colliders =
      placement.colliderMode ===
      "mesh"
        ? createMeshColliders(
            wrapper,
            placement.colliderPadding ??
              0
          )
        : [];

    return {
      object: wrapper,
      colliders,
      occluders,
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
