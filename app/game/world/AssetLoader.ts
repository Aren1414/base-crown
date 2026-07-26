import * as THREE from "three";
import { GLTF, GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { SkeletonUtils } from "three/examples/jsm/utils/SkeletonUtils.js";
import { ModelDef } from "../assets/Models";

const loader = new GLTFLoader();

const cache = new Map<string, GLTF>();

async function getGLTF(url: string): Promise<GLTF> {
  const cached = cache.get(url);

  if (cached) return cached;

  return new Promise((resolve, reject) => {
    loader.load(
      url,
      (gltf) => {
        cache.set(url, gltf);
        resolve(gltf);
      },
      undefined,
      reject
    );
  });
}

function prepareObject(object: THREE.Object3D) {
  object.traverse((child: any) => {
    if (!child.isMesh) return;

    child.castShadow = true;
    child.receiveShadow = true;

    child.frustumCulled = true;

    if (Array.isArray(child.material)) {
      child.material.forEach((m: any) => {
        if (m) {
          m.needsUpdate = true;
        }
      });
    } else if (child.material) {
      child.material.needsUpdate = true;
    }
  });
}

export async function spawnModel(
  group: THREE.Group,
  model: ModelDef,
  position: THREE.Vector3,
  rotationY = 0
): Promise<THREE.Object3D> {
  const gltf = await getGLTF(model.url);

  const object = SkeletonUtils.clone(gltf.scene);

  object.position.copy(position);

  object.rotation.y = rotationY;

  object.scale.setScalar(model.scale);

  prepareObject(object);

  group.add(object);

  return object;
}

export async function spawnSimple(
  group: THREE.Group,
  url: string,
  scale: number,
  x: number,
  z: number,
  rotationY = 0
): Promise<THREE.Object3D> {
  return spawnModel(
    group,
    {
      url,
      scale,
    },
    new THREE.Vector3(x, 0, z),
    rotationY
  );
}

export function clearModelCache() {
  cache.clear();
}

export function preloadModels(models: ModelDef[]) {
  return Promise.all(
    models.map((m) =>
      getGLTF(m.url).catch(() => undefined)
    )
  );
}
