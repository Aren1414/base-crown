import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { clone } from "three/examples/jsm/utils/SkeletonUtils.js";

import type { ModelDef } from "../assets/Models";

const loader = new GLTFLoader();

const modelCache = new Map<
  string,
  Promise<THREE.Group>
>();

const EPSILON = 0.0001;
const DEFAULT_CHARACTER_HEIGHT = 2.8;
const MIN_COLLIDER_HEIGHT = 0.12;
const FLAT_SURFACE_HEIGHT = 0.35;

const boundsSize = new THREE.Vector3();
const boundsCenter = new THREE.Vector3();

const centerRaycaster =
  new THREE.Raycaster();

const centerRayOrigin =
  new THREE.Vector3();

const DOWN_DIRECTION =
  new THREE.Vector3(0, -1, 0);

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

function isDestroyed(
  object: THREE.Object3D
): boolean {
  return object.userData.destroyed === true;
}

function getModelName(
  url: string
): string {
  try {
    const cleanUrl =
      url.split("?")[0];

    return (
      cleanUrl
        .split("/")
        .pop() ||
      "WorldModel"
    );
  } catch {
    return "WorldModel";
  }
}

function loadOriginal(
  url: string
): Promise<THREE.Group> {
  const cached =
    modelCache.get(url);

  if (cached) {
    return cached;
  }

  const job =
    new Promise<THREE.Group>(
      (resolve, reject) => {
        loader.load(
          url,
          (gltf) => {
            const scene =
              gltf.scene;

            scene.name =
              scene.name ||
              getModelName(url);

            scene.position.set(
              0,
              0,
              0
            );

            scene.updateMatrixWorld(
              true
            );

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

  modelCache.set(
    url,
    job
  );

  return job;
}

function isColliderName(
  name: string
): boolean {
  const normalized =
    name.toLowerCase();

  return (
    normalized.includes(
      "collider"
    ) ||
    normalized.includes(
      "collision"
    ) ||
    normalized.startsWith(
      "ucx_"
    ) ||
    normalized.startsWith(
      "ubx_"
    ) ||
    normalized.startsWith(
      "usp_"
    ) ||
    normalized.startsWith(
      "ucp_"
    )
  );
}

function isIgnoredColliderName(
  name: string
): boolean {
  const normalized =
    name.toLowerCase();

  return (
    normalized.includes(
      "water"
    ) ||
    normalized.includes(
      "glass"
    ) ||
    normalized.includes(
      "window"
    ) ||
    normalized.includes(
      "light"
    ) ||
    normalized.includes(
      "lamp"
    ) ||
    normalized.includes(
      "shadow"
    ) ||
    normalized.includes(
      "decal"
    ) ||
    normalized.includes(
      "particle"
    ) ||
    normalized.includes(
      "effect"
    ) ||
    normalized.includes(
      "fx_"
    )
  );
}

function cloneMaterial(
  material: THREE.Material
): THREE.Material {
  const cloned =
    material.clone();

  cloned.needsUpdate = true;

  return cloned;
}

function cloneMeshMaterials(
  root: THREE.Object3D
): void {
  root.traverse(
    (child) => {
      if (
        !(child instanceof THREE.Mesh)
      ) {
        return;
      }

      if (
        isColliderName(child.name)
      ) {
        return;
      }

      if (
        Array.isArray(
          child.material
        )
      ) {
        child.material =
          child.material.map(
            cloneMaterial
          );
      } else if (
        child.material
      ) {
        child.material =
          cloneMaterial(
            child.material
          );
      }
    }
  );
}

function prepareClone(
  root: THREE.Object3D
): void {
  root.position.set(
    0,
    0,
    0
  );

  root.rotation.set(
    0,
    0,
    0
  );

  root.scale.setScalar(1);

  root.visible = true;

  root.updateMatrixWorld(true);
}

function configureMeshes(
  root: THREE.Object3D,
  placement: ModelPlacement
): THREE.Mesh[] {
  const occluders:
    THREE.Mesh[] = [];

  const castShadow =
    placement.castShadow ??
    true;

  const receiveShadow =
    placement.receiveShadow ??
    true;

  const cameraOccluder =
    placement.cameraOccluder ??
    false;

  root.traverse(
    (child) => {
      if (
        !(child instanceof THREE.Mesh)
      ) {
        return;
      }

      if (
        isColliderName(child.name)
      ) {
        child.visible = false;
        child.castShadow = false;
        child.receiveShadow = false;
        child.frustumCulled = false;

        child.userData.isCollider =
          true;

        return;
      }

      child.castShadow =
        castShadow;

      child.receiveShadow =
        receiveShadow;

      child.frustumCulled = true;

      child.matrixAutoUpdate =
        true;

      child.userData.cameraOccluder =
        cameraOccluder;

      if (cameraOccluder) {
        occluders.push(child);
      }
    }
  );

  return occluders;
}

function getBounds(
  object: THREE.Object3D,
  target = new THREE.Box3()
): THREE.Box3 {
  object.updateMatrixWorld(true);

  target.makeEmpty();
  target.setFromObject(object);

  return target;
}

function calculateScale(
  object: THREE.Object3D,
  definition: ModelDef,
  placement: ModelPlacement
): number {
  object.scale.setScalar(1);
  object.updateMatrixWorld(true);

  const bounds =
    getBounds(object);

  bounds.getSize(
    boundsSize
  );

  const footprint =
    Math.max(
      boundsSize.x,
      boundsSize.z,
      EPSILON
    );

  const originalHeight =
    Math.max(
      boundsSize.y,
      EPSILON
    );

  let scale =
    Number.isFinite(
      definition.scale
    )
      ? definition.scale
      : 1;

  if (
    placement.targetFootprint !==
      undefined &&
    placement.targetFootprint > 0
  ) {
    scale =
      placement.targetFootprint /
      footprint;
  }

  if (
    placement.maxHeight !==
      undefined &&
    placement.maxHeight > 0 &&
    originalHeight * scale >
      placement.maxHeight
  ) {
    scale =
      placement.maxHeight /
      originalHeight;
  }

  if (
    !Number.isFinite(scale) ||
    scale <= 0
  ) {
    return 1;
  }

  return scale;
}

function centerHorizontally(
  object: THREE.Object3D
): void {
  const bounds =
    getBounds(object);

  if (bounds.isEmpty()) {
    return;
  }

  bounds.getCenter(
    boundsCenter
  );

  object.position.x -=
    boundsCenter.x;

  object.position.z -=
    boundsCenter.z;

  object.updateMatrixWorld(true);
}

function placeOnGround(
  object: THREE.Object3D
): void {
  const bounds =
    getBounds(object);

  if (bounds.isEmpty()) {
    return;
  }

  object.position.y -=
    bounds.min.y;

  object.updateMatrixWorld(true);
}

function getCenterSurfaceHeight(
  object: THREE.Object3D,
  bounds: THREE.Box3
): number | null {
  centerRayOrigin.set(
    0,
    bounds.max.y + 10,
    0
  );

  centerRaycaster.set(
    centerRayOrigin,
    DOWN_DIRECTION
  );

  centerRaycaster.near = 0;
  centerRaycaster.far =
    Math.max(
      bounds.max.y -
        bounds.min.y +
        20,
      20
    );

  const hits =
    centerRaycaster.intersectObject(
      object,
      true
    );

  for (const hit of hits) {
    if (
      !(
        hit.object instanceof
        THREE.Mesh
      )
    ) {
      continue;
    }

    if (
      isColliderName(
        hit.object.name
      )
    ) {
      continue;
    }

    if (
      isIgnoredColliderName(
        hit.object.name
      )
    ) {
      continue;
    }

    return hit.point.y;
  }

  return null;
}

/*
 * برای خیابان، کوچه و مدل‌هایی که کف اصلی آن‌ها
 * دقیقاً در پایین‌ترین نقطه مدل قرار ندارد، از مرکز مدل
 * یک Ray رو به پایین زده می‌شود.
 */
function placeCenterSurfaceOnGround(
  object: THREE.Object3D
): void {
  object.updateMatrixWorld(true);

  const bounds =
    getBounds(object);

  if (bounds.isEmpty()) {
    return;
  }

  const surfaceHeight =
    getCenterSurfaceHeight(
      object,
      bounds
    );

  if (
    surfaceHeight !== null
  ) {
    object.position.y -=
      surfaceHeight;
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
  object.position.set(
    0,
    0,
    0
  );

  object.rotation.set(
    placement.rotationX ?? 0,
    placement.rotationY ?? 0,
    placement.rotationZ ?? 0
  );

  object.scale.setScalar(1);
  object.updateMatrixWorld(true);

  const scale =
    calculateScale(
      object,
      definition,
      placement
    );

  object.scale.setScalar(
    scale
  );

  object.updateMatrixWorld(true);

  centerHorizontally(object);

  if (
    placement.verticalMode ===
    "center-surface"
  ) {
    placeCenterSurfaceOnGround(
      object
    );
  } else {
    placeOnGround(object);
  }

  object.updateMatrixWorld(true);
}

function shrinkCollider(
  collider: THREE.Box3,
  padding: number
): void {
  if (
    padding <= 0 ||
    collider.isEmpty()
  ) {
    return;
  }

  const width =
    collider.max.x -
    collider.min.x;

  const depth =
    collider.max.z -
    collider.min.z;

  const safeX =
    Math.min(
      padding,
      width * 0.35
    );

  const safeZ =
    Math.min(
      padding,
      depth * 0.35
    );

  collider.min.x += safeX;
  collider.max.x -= safeX;

  collider.min.z += safeZ;
  collider.max.z -= safeZ;
}

function isValidCollider(
  box: THREE.Box3,
  meshName: string,
  explicitCollider: boolean
): boolean {
  if (box.isEmpty()) {
    return false;
  }

  box.getSize(boundsSize);

  if (
    boundsSize.x <
      EPSILON ||
    boundsSize.y <
      EPSILON ||
    boundsSize.z <
      EPSILON
  ) {
    return false;
  }

  if (explicitCollider) {
    return true;
  }

  if (
    isIgnoredColliderName(
      meshName
    )
  ) {
    return false;
  }

  const isFlatSurface =
    boundsSize.y <
      FLAT_SURFACE_HEIGHT &&
    (
      boundsSize.x > 1 ||
      boundsSize.z > 1
    );

  if (isFlatSurface) {
    return false;
  }

  if (
    box.min.y >
    DEFAULT_CHARACTER_HEIGHT
  ) {
    return false;
  }

  if (
    box.max.y <
    MIN_COLLIDER_HEIGHT
  ) {
    return false;
  }

  return true;
}

function createColliderFromMesh(
  mesh: THREE.Mesh,
  padding: number,
  explicitCollider: boolean
): THREE.Box3 | null {
  const box =
    new THREE.Box3()
      .setFromObject(mesh);

  if (
    !isValidCollider(
      box,
      mesh.name,
      explicitCollider
    )
  ) {
    return null;
  }

  shrinkCollider(
    box,
    padding
  );

  if (box.isEmpty()) {
    return null;
  }

  return box;
}

function collectExplicitColliderMeshes(
  root: THREE.Object3D
): THREE.Mesh[] {
  const meshes:
    THREE.Mesh[] = [];

  root.traverse(
    (child) => {
      if (
        !(child instanceof THREE.Mesh)
      ) {
        return;
      }

      if (
        isColliderName(child.name)
      ) {
        meshes.push(child);
      }
    }
  );

  return meshes;
}

/*
 * اگر مدل دارای Meshهایی با نام Collider، Collision
 * یا پیشوندهای UCX / UBX باشد، فقط از همان‌ها استفاده
 * می‌شود. در غیر این صورت برای Meshهای قابل‌مشاهده
 * Colliderهای جداگانه ساخته می‌شود.
 */
function createMeshColliders(
  root: THREE.Object3D,
  padding: number
): THREE.Box3[] {
  const colliders:
    THREE.Box3[] = [];

  root.updateMatrixWorld(true);

  const explicitColliders =
    collectExplicitColliderMeshes(
      root
    );

  if (
    explicitColliders.length > 0
  ) {
    for (
      const mesh of
      explicitColliders
    ) {
      const collider =
        createColliderFromMesh(
          mesh,
          padding,
          true
        );

      if (collider) {
        colliders.push(
          collider
        );
      }
    }

    return colliders;
  }

  root.traverse(
    (child) => {
      if (
        !(child instanceof THREE.Mesh)
      ) {
        return;
      }

      if (!child.visible) {
        return;
      }

      const collider =
        createColliderFromMesh(
          child,
          padding,
          false
        );

      if (collider) {
        colliders.push(
          collider
        );
      }
    }
  );

  return colliders;
}

function removeOccluderFlags(
  root: THREE.Object3D
): void {
  root.traverse(
    (child) => {
      if (
        !(child instanceof THREE.Mesh)
      ) {
        return;
      }

      child.userData.cameraOccluder =
        false;
    }
  );
}

function disposeClonedMaterials(
  root: THREE.Object3D
): void {
  const disposed =
    new Set<THREE.Material>();

  root.traverse(
    (child) => {
      if (
        !(child instanceof THREE.Mesh)
      ) {
        return;
      }

      const materials =
        Array.isArray(
          child.material
        )
          ? child.material
          : [child.material];

      for (
        const material of
        materials
      ) {
        if (
          !material ||
          disposed.has(material)
        ) {
          continue;
        }

        disposed.add(material);
        material.dispose();
      }
    }
  );
}

function removeSpawnedWrapper(
  wrapper: THREE.Group,
  materialsWereCloned: boolean
): void {
  removeOccluderFlags(
    wrapper
  );

  wrapper.removeFromParent();

  if (
    materialsWereCloned
  ) {
    disposeClonedMaterials(
      wrapper
    );
  }

  wrapper.clear();
}

export async function spawnModel(
  definition: ModelDef,
  parent: THREE.Group,
  placement: ModelPlacement
): Promise<SpawnedModel | null> {
  let wrapper:
    THREE.Group | null = null;

  let materialsWereCloned =
    false;

  try {
    if (
      !definition?.url
    ) {
      console.error(
        "Could not spawn model: model URL is missing."
      );

      return null;
    }

    if (
      isDestroyed(parent)
    ) {
      return null;
    }

    const original =
      await loadOriginal(
        definition.url
      );

    if (
      isDestroyed(parent)
    ) {
      return null;
    }

    const model =
      clone(original);

    prepareClone(model);

    /*
     * مواد فقط برای مدل‌هایی Clone می‌شوند که ممکن است
     * توسط سیستم Occlusion شفاف شوند. برای بقیه مدل‌ها
     * Material و Geometry مشترک باقی می‌مانند تا حافظه
     * و Draw-state کمتری مصرف شود.
     */
    if (
      placement.cameraOccluder ===
      true
    ) {
      cloneMeshMaterials(
        model
      );

      materialsWereCloned =
        true;
    }

    normalizeModel(
      model,
      definition,
      placement
    );

    wrapper =
      new THREE.Group();

    wrapper.name =
      getModelName(
        definition.url
      );

    wrapper.userData.modelUrl =
      definition.url;

    wrapper.userData.spawnedModel =
      true;

    wrapper.position.set(
      placement.x,
      placement.y ?? 0,
      placement.z
    );

    wrapper.add(model);
    parent.add(wrapper);

    wrapper.updateMatrixWorld(
      true
    );

    if (
      isDestroyed(parent)
    ) {
      removeSpawnedWrapper(
        wrapper,
        materialsWereCloned
      );

      return null;
    }

    const occluders =
      configureMeshes(
        model,
        placement
      );

    wrapper.updateMatrixWorld(
      true
    );

    const colliders =
      placement.colliderMode ===
      "mesh"
        ? createMeshColliders(
            wrapper,
            Math.max(
              placement.colliderPadding ??
                0,
              0
            )
          )
        : [];

    wrapper.userData.colliders =
      colliders;

    wrapper.userData.occluders =
      occluders;

    return {
      object: wrapper,
      colliders,
      occluders,
    };
  } catch (error) {
    if (wrapper) {
      removeSpawnedWrapper(
        wrapper,
        materialsWereCloned
      );
    }

    console.error(
      `Could not spawn model: ${definition.url}`,
      error
    );

    return null;
  }
}

export function disposeSpawnedModel(
  spawned:
    | SpawnedModel
    | THREE.Group
    | null
    | undefined
): void {
  if (!spawned) {
    return;
  }

  const object =
    spawned instanceof
    THREE.Group
      ? spawned
      : spawned.object;

  const materialsWereCloned =
    object.userData
      .materialsWereCloned ===
    true;

  removeSpawnedWrapper(
    object,
    materialsWereCloned
  );

  if (
    !(
      spawned instanceof
      THREE.Group
    )
  ) {
    spawned.colliders.length =
      0;

    spawned.occluders.length =
      0;
  }
}

export function hasModelInCache(
  url: string
): boolean {
  return modelCache.has(url);
}

export async function preloadModel(
  definition: ModelDef
): Promise<boolean> {
  try {
    await loadOriginal(
      definition.url
    );

    return true;
  } catch {
    return false;
  }
}

export async function preloadModels(
  definitions: readonly ModelDef[]
): Promise<void> {
  const uniqueDefinitions =
    new Map<
      string,
      ModelDef
    >();

  for (
    const definition of
    definitions
  ) {
    if (
      !definition?.url
    ) {
      continue;
    }

    uniqueDefinitions.set(
      definition.url,
      definition
    );
  }

  await Promise.allSettled(
    Array.from(
      uniqueDefinitions.values()
    ).map(preloadModel)
  );
}

export function clearModelCache(): void {
  modelCache.clear();
}
