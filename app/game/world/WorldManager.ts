import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  EARTH_TEXTURE,
  FOREST_BUSHES,
  FOREST_FLOWERS,
  FOREST_GRASS,
  FOREST_TREES,
  URBAN_ALLEYS,
  URBAN_BUILDINGS,
  URBAN_STREETS,
  URBAN_VEHICLES,
  type ModelDef,
} from "../assets/Models";

type WorldProfile = {
  desktop: boolean;
  chunkSize: number;
  roadWidth: number;
  alleyWidth: number;
  renderDistance: number;
  chunksPerBatch: number;
  buildingScale: number;
  vegetationScale: number;
  vehicleScale: number;
};

function detectDesktopProfile() {
  if (typeof window === "undefined" || typeof navigator === "undefined") return false;
  const coarsePointer = window.matchMedia?.("(pointer: coarse)").matches ?? false;
  const finePointer = window.matchMedia?.("(pointer: fine)").matches ?? false;
  const wideViewport = Math.max(window.innerWidth, window.innerHeight) >= 1100;
  const touchOnly = navigator.maxTouchPoints > 0 && coarsePointer && !finePointer;
  return wideViewport && !touchOnly;
}

const WORLD_PROFILE: WorldProfile = detectDesktopProfile()
  ? {
      desktop: true,
      chunkSize: 72,
      roadWidth: 9.4,
      alleyWidth: 4.2,
      renderDistance: 2,
      chunksPerBatch: 2,
      buildingScale: 1.08,
      vegetationScale: 1.35,
      vehicleScale: 1.2,
    }
  : {
      desktop: false,
      chunkSize: 56,
      roadWidth: 8.2,
      alleyWidth: 3.5,
      renderDistance: 1,
      chunksPerBatch: 2,
      buildingScale: 1,
      vegetationScale: 1,
      vehicleScale: 1,
    };

export const CHUNK_SIZE = WORLD_PROFILE.chunkSize;
export const DEFAULT_RENDER_DISTANCE = WORLD_PROFILE.renderDistance;
export const IS_DESKTOP_WORLD = WORLD_PROFILE.desktop;

const HALF_CHUNK = CHUNK_SIZE / 2;
const ROAD_WIDTH = WORLD_PROFILE.roadWidth;
const ALLEY_WIDTH = WORLD_PROFILE.alleyWidth;
const PLAYER_BASE_Y = 0.055;
const CHUNKS_PER_BATCH = WORLD_PROFILE.chunksPerBatch;
const LAYOUT_SCALE = CHUNK_SIZE / 56;

type Direction = "x" | "z";
type ChunkKind = "city" | "park";
type ColliderType = "tree" | "vehicle" | "wall" | "rail";
type SimpleCollider = { box: THREE.Box3; chunk: THREE.Group };
type PreciseCollisionMesh = {
  mesh: THREE.Mesh;
  chunk: THREE.Group;
  worldBounds: THREE.Box3;
};
type RoadPoint = { x: number; z: number; direction: Direction };
type ModelOptions = {
  y?: number;
  collision?: boolean;
  preciseCollision?: boolean;
  colliderType?: ColliderType;
  height?: boolean;
  occlusion?: boolean;
  foundation?: boolean;
  targetWidth?: number;
  targetHeight?: number;
  maxHeight?: number;
  brightness?: number;
  castShadow?: boolean;
  rotationX?: number;
  rotationY?: number;
  rotationZ?: number;
  sinkIntoGround?: number;
  flattenSurface?: boolean;
};
type LinearModelOptions = ModelOptions & {
  direction: Direction;
  targetLength: number;
  targetCrossSize: number;
};

export const chunks = new Map<string, THREE.Group>();
const desiredChunkKeys = new Set<string>();
const queuedChunkKeys = new Set<string>();
let chunkGenerationQueue: Array<{ scene: THREE.Scene; cx: number; cz: number }> = [];
let chunkGenerationScheduled = false;

const loader = new GLTFLoader();
const textureLoader = new THREE.TextureLoader();
const modelCache = new Map<string, Promise<THREE.Group>>();
const materialVariantCache = new WeakMap<THREE.Material, Map<number, THREE.Material>>();
const simpleColliders: SimpleCollider[] = [];
const preciseCollisionMeshes: PreciseCollisionMesh[] = [];
const simpleCollidersByChunk = new Map<THREE.Group, SimpleCollider[]>();
const preciseCollisionMeshesByChunk = new Map<THREE.Group, PreciseCollisionMesh[]>();
const heightMeshes: THREE.Object3D[] = [];
const heightMeshesByChunk = new Map<THREE.Group, THREE.Object3D[]>();
const occlusionMeshes: THREE.Object3D[] = [];
const occlusionMeshesByChunk = new Map<THREE.Group, THREE.Object3D[]>();
const raycaster = new THREE.Raycaster();
const rayOrigin = new THREE.Vector3();
const rayDirection = new THREE.Vector3();
const downDirection = new THREE.Vector3(0, -1, 0);
const tempBox = new THREE.Box3();
const tempSize = new THREE.Vector3();
const tempCenter = new THREE.Vector3();
const tempVector = new THREE.Vector3();
const tempVectorB = new THREE.Vector3();
const tempQuaternion = new THREE.Quaternion();
const upAxis = new THREE.Vector3(0, 1, 0);
const whiteColor = new THREE.Color(0xffffff);
const nearbyHeightMeshes: THREE.Object3D[] = [];
const playerCollisionBox = new THREE.Box3();
const sweptCollisionBox = new THREE.Box3();
const collisionBoxMin = new THREE.Vector3();
const collisionBoxMax = new THREE.Vector3();
const nearbySimpleColliders: SimpleCollider[] = [];
const nearbyPreciseCollisionMeshes: PreciseCollisionMesh[] = [];
const nearbyPreciseMeshes: THREE.Mesh[] = [];

let cameraOcclusionDistance = 0;
let cameraOcclusionReady = false;
let cameraOcclusionAccumulator = 0;
let cachedCameraTargetDistance = 0;

const earthTexture = textureLoader.load(
  EARTH_TEXTURE,
  (texture) => {
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(WORLD_PROFILE.desktop ? 5 : 4, WORLD_PROFILE.desktop ? 5 : 4);
    texture.anisotropy = WORLD_PROFILE.desktop ? 4 : 2;
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = true;
    texture.needsUpdate = true;
  },
  undefined,
  (error) => console.error(`Earth texture failed: ${EARTH_TEXTURE}`, error)
);

earthTexture.colorSpace = THREE.SRGBColorSpace;
earthTexture.wrapS = THREE.RepeatWrapping;
earthTexture.wrapT = THREE.RepeatWrapping;
earthTexture.repeat.set(WORLD_PROFILE.desktop ? 5 : 4, WORLD_PROFILE.desktop ? 5 : 4);
earthTexture.anisotropy = WORLD_PROFILE.desktop ? 4 : 2;
earthTexture.minFilter = THREE.LinearMipmapLinearFilter;
earthTexture.magFilter = THREE.LinearFilter;
earthTexture.generateMipmaps = true;

const earthGroundMaterial = new THREE.MeshStandardMaterial({
  map: earthTexture,
  color: 0xffffff,
  roughness: 0.98,
  metalness: 0,
  envMapIntensity: 0.2,
});
const cityGroundMaterial = earthGroundMaterial;
const parkGroundMaterial = earthGroundMaterial;
const foundationMaterial = earthGroundMaterial;
const foundationEdgeMaterial = earthGroundMaterial;
const rubbleMaterial = new THREE.MeshStandardMaterial({ color: 0x464740, roughness: 1, metalness: 0 });
const grassBladeMaterial = new THREE.MeshStandardMaterial({ color: 0x45683b, roughness: 1, metalness: 0, side: THREE.DoubleSide });
const groundGeometry = new THREE.PlaneGeometry(CHUNK_SIZE, CHUNK_SIZE);
const grassBladeGeometry = new THREE.PlaneGeometry(0.055, 0.24);

grassBladeGeometry.translate(0, 0.12, 0);

function seededRandom(seed: number) {
  let state = seed >>> 0;
  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function chunkSeed(cx: number, cz: number) {
  return (Math.imul(cx, 73856093) ^ Math.imul(cz, 19349663)) >>> 0;
}

function randomRange(random: () => number, min: number, max: number) {
  return min + random() * (max - min);
}

function modulo(value: number, divisor: number) {
  return ((value % divisor) + divisor) % divisor;
}

function pick<T>(values: readonly T[], random: () => number): T {
  return values[Math.floor(random() * values.length)];
}

function shuffle<T>(values: T[], random: () => number) {
  for (let index = values.length - 1; index > 0; index--) {
    const target = Math.floor(random() * (index + 1));
    [values[index], values[target]] = [values[target], values[index]];
  }
  return values;
}

export function getChunkCoord(x: number, z: number) {
  return {
    cx: Math.floor((x + HALF_CHUNK) / CHUNK_SIZE),
    cz: Math.floor((z + HALF_CHUNK) / CHUNK_SIZE),
  };
}

function getChunkKind(cx: number, cz: number): ChunkKind {
  const value = Math.abs(cx * 37 + cz * 61);
  return value > 0 && value % 29 === 0 ? "park" : "city";
}

function getRoadDirection(cx: number, cz: number): Direction {
  return modulo(cx + cz, 2) === 0 ? "x" : "z";
}

function loadSource(url: string) {
  const cached = modelCache.get(url);
  if (cached) return cached;
  const promise = new Promise<THREE.Group>((resolve, reject) => {
    loader.load(url, (gltf) => resolve(gltf.scene), undefined, reject);
  });
  modelCache.set(url, promise);
  return promise;
}

function brightenMaterial(material: THREE.Material, amount: number) {
  const cacheKey = Math.round(amount * 1000);
  let variants = materialVariantCache.get(material);
  if (!variants) { variants = new Map(); materialVariantCache.set(material, variants); }
  const cached = variants.get(cacheKey);
  if (cached) return cached;
  const result = material.clone();
  if (
    result instanceof THREE.MeshStandardMaterial ||
    result instanceof THREE.MeshPhysicalMaterial ||
    result instanceof THREE.MeshLambertMaterial ||
    result instanceof THREE.MeshPhongMaterial ||
    result instanceof THREE.MeshBasicMaterial
  ) {
    result.color.lerp(whiteColor, amount);
    if (result instanceof THREE.MeshStandardMaterial || result instanceof THREE.MeshPhysicalMaterial) {
      result.roughness = Math.max(0.67, result.roughness);
      result.metalness = Math.min(0.12, result.metalness);
    }
    result.needsUpdate = true;
  }
  variants.set(cacheKey, result);
  return result;
}

function configureClone(object: THREE.Object3D, brightness: number, castShadow: boolean) {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.material = Array.isArray(child.material)
      ? child.material.map((material) => brightenMaterial(material, brightness))
      : brightenMaterial(child.material, brightness);
    child.castShadow = castShadow;
    child.receiveShadow = true;
    child.frustumCulled = true;
  });
}

function resizeModel(object: THREE.Object3D, options: ModelOptions) {
  object.updateWorldMatrix(true, true);
  tempBox.setFromObject(object);
  if (tempBox.isEmpty()) return;
  tempBox.getSize(tempSize);
  if (tempSize.x <= 0.001 || tempSize.y <= 0.001 || tempSize.z <= 0.001) return;
  let multiplier = 1;
  if (options.targetWidth) multiplier = options.targetWidth / Math.max(tempSize.x, tempSize.z);
  if (options.targetHeight) multiplier = options.targetHeight / tempSize.y;
  if (options.maxHeight && tempSize.y * multiplier > options.maxHeight) multiplier = options.maxHeight / tempSize.y;
  object.scale.multiplyScalar(multiplier);
}

function alignToGround(object: THREE.Object3D, targetY: number, sinkIntoGround = 0) {
  object.updateWorldMatrix(true, true);
  tempBox.setFromObject(object);
  if (Number.isFinite(tempBox.min.y)) object.position.y += targetY - tempBox.min.y - sinkIntoGround;
}

function registerModel(object: THREE.Object3D, chunk: THREE.Group, options: ModelOptions) {
  if (options.preciseCollision) registerPreciseCollision(object, chunk);
  else if (options.collision) registerSimpleCollider(object, chunk, options.colliderType ?? "vehicle");
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    if (options.height) {
      heightMeshes.push(child);
      const chunkHeights = heightMeshesByChunk.get(chunk);
      if (chunkHeights) chunkHeights.push(child);
      else heightMeshesByChunk.set(chunk, [child]);
    }
    if (options.occlusion) {
      occlusionMeshes.push(child);
      const chunkOccluders = occlusionMeshesByChunk.get(chunk);
      if (chunkOccluders) chunkOccluders.push(child);
      else occlusionMeshesByChunk.set(chunk, [child]);
    }
  });
}

function placeModel(
  definition: ModelDef,
  chunk: THREE.Group,
  x: number,
  z: number,
  rotationY = 0,
  options: ModelOptions = {}
) {
  void loadSource(definition.url)
    .then((source) => {
      if (chunk.userData.destroyed || !chunk.parent) return;
      const object = source.clone(true);
      object.scale.setScalar(definition.scale);
      object.position.set(x, options.y ?? 0, z);
      object.rotation.set(options.rotationX ?? 0, rotationY + (options.rotationY ?? 0), options.rotationZ ?? 0);
      configureClone(object, options.brightness ?? 0.18, options.castShadow ?? true);
      resizeModel(object, options);
      alignToGround(object, options.y ?? 0, options.sinkIntoGround ?? 0);
      chunk.add(object);
      object.updateWorldMatrix(true, true);
      if (options.foundation) createBuildingFoundation(object, chunk);
      registerModel(object, chunk, options);
    })
    .catch((error) => console.error(`Model load failed: ${definition.url}`, error));
}

function placeLinearModel(
  definition: ModelDef,
  chunk: THREE.Group,
  x: number,
  z: number,
  options: LinearModelOptions
) {
  void loadSource(definition.url)
    .then((source) => {
      if (chunk.userData.destroyed || !chunk.parent) return;
      const object = source.clone(true);
      object.scale.setScalar(definition.scale);
      object.position.set(x, options.y ?? 0, z);
      object.rotation.set(options.rotationX ?? 0, 0, options.rotationZ ?? 0);
      configureClone(object, options.brightness ?? 0.06, options.castShadow ?? false);
      object.updateWorldMatrix(true, true);
      tempBox.setFromObject(object);
      tempBox.getSize(tempSize);
      const longAxis: Direction = tempSize.x >= tempSize.z ? "x" : "z";
      if (longAxis !== options.direction) object.rotation.y += Math.PI / 2;
      object.rotation.y += options.rotationY ?? 0;
      object.updateWorldMatrix(true, true);
      tempBox.setFromObject(object);
      tempBox.getSize(tempSize);
      const currentLength = options.direction === "x" ? tempSize.x : tempSize.z;
      const currentCrossSize = options.direction === "x" ? tempSize.z : tempSize.x;
      const lengthScale = options.targetLength / Math.max(currentLength, 0.001);
      const crossScale = options.targetCrossSize / Math.max(currentCrossSize, 0.001);
      if (options.direction === "x") {
        object.scale.x *= lengthScale;
        object.scale.z *= crossScale;
      } else {
        object.scale.z *= lengthScale;
        object.scale.x *= crossScale;
      }
      if (options.flattenSurface) {
        object.updateWorldMatrix(true, true);
        tempBox.setFromObject(object);
        tempBox.getSize(tempSize);
        const targetThickness = 0.025;
        if (tempSize.y > targetThickness) object.scale.y *= targetThickness / tempSize.y;
      }
      alignToGround(object, options.y ?? 0, options.sinkIntoGround ?? 0);
      chunk.add(object);
      object.updateWorldMatrix(true, true);
      registerModel(object, chunk, options);
    })
    .catch((error) => console.error(`Linear model failed: ${definition.url}`, error));
}

function createBuildingFoundation(object: THREE.Object3D, chunk: THREE.Group) {
  object.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3().setFromObject(object);
  if (bounds.isEmpty()) return;
  bounds.getSize(tempSize);
  bounds.getCenter(tempCenter);
  chunk.worldToLocal(tempCenter);
  const width = Math.min(tempSize.x + 0.45, 17);
  const depth = Math.min(tempSize.z + 0.45, 17);
  const edge = new THREE.Mesh(new THREE.BoxGeometry(width + 0.45, 0.055, depth + 0.45), foundationEdgeMaterial);
  edge.position.set(tempCenter.x, -0.01, tempCenter.z);
  edge.rotation.y = object.rotation.y;
  edge.receiveShadow = true;
  edge.userData.temporaryGeometry = true;
  chunk.add(edge);
  const foundation = new THREE.Mesh(new THREE.BoxGeometry(width, 0.11, depth), foundationMaterial);
  foundation.position.set(tempCenter.x, 0.008, tempCenter.z);
  foundation.rotation.y = object.rotation.y;
  foundation.receiveShadow = true;
  foundation.userData.temporaryGeometry = true;
  chunk.add(foundation);
  heightMeshes.push(foundation);
  const chunkHeights = heightMeshesByChunk.get(chunk);
  if (chunkHeights) chunkHeights.push(foundation);
  else heightMeshesByChunk.set(chunk, [foundation]);
  const random = seededRandom(Math.floor((tempCenter.x + 1000) * 37 + (tempCenter.z + 1000) * 71));
  const rubbleCount = 3 + Math.floor(random() * 4);
  for (let index = 0; index < rubbleCount; index++) {
    const rubble = new THREE.Mesh(
      new THREE.BoxGeometry(
        randomRange(random, 0.25, 0.65),
        randomRange(random, 0.1, 0.26),
        randomRange(random, 0.25, 0.65)
      ),
      rubbleMaterial
    );
    const horizontal = random() < 0.5;
    const side = random() < 0.5 ? -1 : 1;
    rubble.position.set(
      tempCenter.x + (horizontal ? side * (width / 2 + 0.2) : randomRange(random, -width / 2, width / 2)),
      0.08,
      tempCenter.z + (horizontal ? randomRange(random, -depth / 2, depth / 2) : side * (depth / 2 + 0.2))
    );
    rubble.rotation.set(randomRange(random, -0.15, 0.15), random() * Math.PI, randomRange(random, -0.15, 0.15));
    rubble.castShadow = true;
    rubble.receiveShadow = true;
    rubble.userData.temporaryGeometry = true;
    chunk.add(rubble);
  }
}

function getColliderFactors(type: ColliderType) {
  if (type === "tree") return { x: 0.15, z: 0.15, y: 0.76, minimum: 0.38 };
  if (type === "vehicle") return { x: 0.8, z: 0.8, y: 0.82, minimum: 0.6 };
  if (type === "wall") return { x: 0.94, z: 0.94, y: 0.95, minimum: 0.5 };
  return { x: 0.98, z: 0.98, y: 0.98, minimum: 0.22 };
}

function registerSimpleCollider(object: THREE.Object3D, chunk: THREE.Group, type: ColliderType) {
  object.updateWorldMatrix(true, true);
  const bounds = new THREE.Box3().setFromObject(object);
  if (bounds.isEmpty()) return;
  bounds.getSize(tempSize);
  bounds.getCenter(tempCenter);
  const factors = getColliderFactors(type);
  let width = Math.max(factors.minimum, tempSize.x * factors.x);
  let depth = Math.max(factors.minimum, tempSize.z * factors.z);
  if (type === "tree") {
    width = Math.min(width, 1.15);
    depth = Math.min(depth, 1.15);
  }
  const height = Math.max(0.8, tempSize.y * factors.y);
  const collider: SimpleCollider = {
    chunk,
    box: new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(tempCenter.x, bounds.min.y + height / 2, tempCenter.z),
      new THREE.Vector3(width, height, depth)
    ),
  };
  simpleColliders.push(collider);
  const chunkColliders = simpleCollidersByChunk.get(chunk);
  if (chunkColliders) chunkColliders.push(collider);
  else simpleCollidersByChunk.set(chunk, [collider]);
}

function registerPreciseCollision(object: THREE.Object3D, chunk: THREE.Group) {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry.computeBoundingBox();
    const bounds = child.geometry.boundingBox;
    if (!bounds) return;
    bounds.getSize(tempSize);
    if (tempSize.x < 0.16 && tempSize.y < 0.16 && tempSize.z < 0.16) return;
    child.updateWorldMatrix(true, false);
    const entry: PreciseCollisionMesh = {
      mesh: child,
      chunk,
      worldBounds: new THREE.Box3().setFromObject(child),
    };
    preciseCollisionMeshes.push(entry);
    const chunkMeshes = preciseCollisionMeshesByChunk.get(chunk);
    if (chunkMeshes) chunkMeshes.push(entry);
    else preciseCollisionMeshesByChunk.set(chunk, [entry]);
  });
}

function createSurface(
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  x: number,
  z: number,
  y: number
) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.set(x, y, z);
  mesh.receiveShadow = true;
  return mesh;
}

function addGround(chunk: THREE.Group, material: THREE.Material) {
  const ground = createSurface(groundGeometry, material, 0, 0, -0.045);
  ground.name = "Ground";
  chunk.add(ground);
  heightMeshes.push(ground);
  const chunkHeights = heightMeshesByChunk.get(chunk);
  if (chunkHeights) chunkHeights.push(ground);
  else heightMeshesByChunk.set(chunk, [ground]);
}

function addStreetTiles(
  _chunk: THREE.Group,
  _random: () => number,
  _direction: Direction,
  _start = -HALF_CHUNK,
  _end = HALF_CHUNK,
  _crossOffset = 0
) {
  return;
}

function addAlleyTiles(
  _chunk: THREE.Group,
  _random: () => number,
  _direction: Direction,
  _crossOffset = 0,
  _start = -HALF_CHUNK,
  _end = HALF_CHUNK
) {
  return;
}


function getRoadPoints(direction: Direction): RoadPoint[] {
  const result: RoadPoint[] = [];
  const limit = 23 * LAYOUT_SCALE;
  const step = 8 * LAYOUT_SCALE;
  for (let offset = -limit; offset <= limit + 0.001; offset += step) {
    result.push({ x: direction === "x" ? offset : 0, z: direction === "x" ? 0 : offset, direction });
  }
  return result;
}

function isVilla(definition: ModelDef) {
  const url = definition.url.toLowerCase();
  return url.includes("villa") || url.includes("house");
}

function getBuildingSlots(direction: Direction) {
  const alongPositions = WORLD_PROFILE.desktop
    ? [-29, -17.4, -5.8, 5.8, 17.4, 29]
    : [-20, -6.7, 6.7, 20];
  const innerOffset = WORLD_PROFILE.desktop ? 13.6 : 11.5;
  const outerOffset = WORLD_PROFILE.desktop ? 27.2 : 22.5;
  const outerAlong = WORLD_PROFILE.desktop ? [-27.5, -9.2, 9.2, 27.5] : [-19.5, 19.5];
  const slots: Array<{ x: number; z: number; rotation: number; outer: boolean }> = [];
  for (const value of alongPositions) {
    if (direction === "x") {
      slots.push({ x: value, z: -innerOffset, rotation: 0, outer: false });
      slots.push({ x: value, z: innerOffset, rotation: Math.PI, outer: false });
    } else {
      slots.push({ x: -innerOffset, z: value, rotation: Math.PI / 2, outer: false });
      slots.push({ x: innerOffset, z: value, rotation: -Math.PI / 2, outer: false });
    }
  }
  for (const value of outerAlong) {
    if (direction === "x") {
      slots.push({ x: value, z: -outerOffset, rotation: 0, outer: true });
      slots.push({ x: value, z: outerOffset, rotation: Math.PI, outer: true });
    } else {
      slots.push({ x: -outerOffset, z: value, rotation: Math.PI / 2, outer: true });
      slots.push({ x: outerOffset, z: value, rotation: -Math.PI / 2, outer: true });
    }
  }
  return slots;
}

function spawnBuildings(chunk: THREE.Group, random: () => number, direction: Direction, skippedSlot = -1) {
  if (!URBAN_BUILDINGS.length) return;
  const slots = getBuildingSlots(direction);
  for (let index = 0; index < slots.length; index++) {
    if (index === skippedSlot) continue;
    const slot = slots[index], definition = pick(URBAN_BUILDINGS, random), villa = isVilla(definition);
    placeModel(definition, chunk, slot.x + randomRange(random, -0.18, 0.18), slot.z + randomRange(random, -0.18, 0.18), slot.rotation + randomRange(random, -0.009, 0.009), {
      preciseCollision: true, foundation: true, sinkIntoGround: randomRange(random, 0.1, 0.16), occlusion: !slot.outer && random() < 0.3, castShadow: !slot.outer,
      targetWidth:
        (slot.outer
          ? randomRange(random, 10.2, 11.2)
          : villa
            ? randomRange(random, 10.8, 11.8)
            : randomRange(random, 11.1, 12.1)) * WORLD_PROFILE.buildingScale,
      maxHeight:
        (villa ? randomRange(random, 8.2, 10.2) : randomRange(random, 12, 17)) *
        (WORLD_PROFILE.desktop ? 1.08 : 1),
      brightness: 0.22,
    });
  }
}

function isMotorcycle(definition: ModelDef) {
  const url = definition.url.toLowerCase();
  return url.includes("motor") || url.includes("bike") || url.includes("cycle") || url.includes("scooter");
}

function spawnVehicles(chunk: THREE.Group, random: () => number, points: RoadPoint[]) {
  if (!URBAN_VEHICLES.length) return;
  const available = shuffle([...points], random);
  const count = Math.min(available.length, Math.round((2 + Math.floor(random() * 2)) * WORLD_PROFILE.vehicleScale));
  for (let index = 0; index < count; index++) {
    const point = available[index];
    const definition = pick(URBAN_VEHICLES, random);
    const motorcycle = isMotorcycle(definition);
    const lane = random() < 0.5 ? -1.85 : 1.85;
    const x = point.direction === "x" ? point.x : point.x + lane;
    const z = point.direction === "x" ? point.z + lane : point.z;
    const rotation =
      point.direction === "x"
        ? random() < 0.5
          ? Math.PI / 2
          : -Math.PI / 2
        : random() < 0.5
          ? 0
          : Math.PI;
    placeModel(
      definition,
      chunk,
      x,
      z,
      rotation + (motorcycle ? randomRange(random, -0.5, 0.5) : randomRange(random, -0.08, 0.08)),
      {
        collision: true,
        colliderType: "vehicle",
        targetWidth: motorcycle ? randomRange(random, 2.5, 3.15) : randomRange(random, 5, 6.2),
        maxHeight: motorcycle ? 2.3 : 3.4,
        rotationZ: motorcycle ? (random() < 0.5 ? -1 : 1) * randomRange(random, 1.2, 1.46) : 0,
        sinkIntoGround: motorcycle ? 0.06 : 0.025,
        brightness: 0.22,
      }
    );
  }
}

function addFineGrass(chunk: THREE.Group, random: () => number) {
  const count = Math.round(700 * WORLD_PROFILE.vegetationScale);
  const grass = new THREE.InstancedMesh(grassBladeGeometry, grassBladeMaterial, count);
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  for (let index = 0; index < count; index++) {
    position.set(randomRange(random, -HALF_CHUNK + 2, HALF_CHUNK - 2), 0.02, randomRange(random, -HALF_CHUNK + 2, HALF_CHUNK - 2));
    tempQuaternion.setFromAxisAngle(upAxis, random() * Math.PI * 2);
    scale.set(randomRange(random, 0.7, 1.1), randomRange(random, 0.5, 1), 1);
    matrix.compose(position, tempQuaternion, scale);
    grass.setMatrixAt(index, matrix);
  }
  grass.instanceMatrix.needsUpdate = true;
  grass.castShadow = false;
  grass.receiveShadow = false;
  chunk.add(grass);
}

function spawnCityVegetation(chunk: THREE.Group, random: () => number, direction: Direction) {
  if (FOREST_TREES.length) {
    const basePositions = WORLD_PROFILE.desktop
      ? [-31, -25, -19, -13, -7, 7, 13, 19, 25, 31]
      : [-23, -16, -9, 9, 16, 23];
    for (const value of basePositions) {
      for (const side of [-1, 1] as const) {
        if (random() < (WORLD_PROFILE.desktop ? 0.2 : 0.28)) continue;
        const sideOffset = randomRange(
          random,
          WORLD_PROFILE.desktop ? 8.4 : 7.1,
          WORLD_PROFILE.desktop ? 11.4 : 9.3
        ) * side;
        placeModel(
          pick(FOREST_TREES, random),
          chunk,
          direction === "x" ? value + randomRange(random, -0.6, 0.6) : sideOffset,
          direction === "x" ? sideOffset : value + randomRange(random, -0.6, 0.6),
          random() * Math.PI * 2,
          {
            collision: true,
            colliderType: "tree",
            targetHeight: randomRange(random, 3.8, WORLD_PROFILE.desktop ? 6.4 : 5.8),
            brightness: 0.03,
            castShadow: random() < (WORLD_PROFILE.desktop ? 0.65 : 0.5),
          }
        );
      }
    }
  }
  const sources = [...FOREST_BUSHES, ...FOREST_FLOWERS, ...FOREST_GRASS];
  if (!sources.length) return;
  const decorationCount = Math.round(24 * WORLD_PROFILE.vegetationScale);
  for (let index = 0; index < decorationCount; index++) {
    const side = random() < 0.5 ? -1 : 1;
    const along = randomRange(random, -HALF_CHUNK + 2, HALF_CHUNK - 2);
    const across = randomRange(
      random,
      WORLD_PROFILE.desktop ? 8.2 : 7,
      WORLD_PROFILE.desktop ? 12.2 : 10.2
    ) * side;
    placeModel(
      pick(sources, random),
      chunk,
      direction === "x" ? along : across,
      direction === "x" ? across : along,
      random() * Math.PI * 2,
      {
        targetWidth: randomRange(random, 0.5, WORLD_PROFILE.desktop ? 1.55 : 1.35),
        brightness: 0.01,
        castShadow: false,
      }
    );
  }
}

function buildPark(chunk: THREE.Group, random: () => number) {
  addGround(chunk, parkGroundMaterial);
  addFineGrass(chunk, random);
  if (FOREST_TREES.length) {
    for (let index = 0; index < Math.round(22 * WORLD_PROFILE.vegetationScale); index++) {
      placeModel(
        pick(FOREST_TREES, random),
        chunk,
        randomRange(random, -HALF_CHUNK + 3, HALF_CHUNK - 3),
        randomRange(random, -HALF_CHUNK + 3, HALF_CHUNK - 3),
        random() * Math.PI * 2,
        {
          collision: true,
          colliderType: "tree",
          targetHeight: randomRange(random, 4.8, 7),
          brightness: 0.03,
        }
      );
    }
  }
  const sources = [...FOREST_BUSHES, ...FOREST_FLOWERS, ...FOREST_GRASS];
  if (!sources.length) return;
  for (let index = 0; index < Math.round(42 * WORLD_PROFILE.vegetationScale); index++) {
    placeModel(
      pick(sources, random),
      chunk,
      randomRange(random, -HALF_CHUNK + 2, HALF_CHUNK - 2),
      randomRange(random, -HALF_CHUNK + 2, HALF_CHUNK - 2),
      random() * Math.PI * 2,
      {
        targetWidth: randomRange(random, 0.45, 1.7),
        brightness: 0.01,
        castShadow: false,
      }
    );
  }
}

function buildSmallPark(chunk: THREE.Group, random: () => number, direction: Direction, slotIndex: number) {
  const slot = getBuildingSlots(direction)[slotIndex];
  if (!slot) return;
  const parkSize = WORLD_PROFILE.desktop ? 10.8 : 9.5;
  const park = new THREE.Mesh(new THREE.BoxGeometry(parkSize, 0.045, parkSize), parkGroundMaterial);
  park.position.set(slot.x, -0.012, slot.z); park.receiveShadow = true; park.userData.temporaryGeometry = true; chunk.add(park); heightMeshes.push(park);
  if (FOREST_TREES.length) {
    const treeCount = Math.round((6 + Math.floor(random() * 3)) * WORLD_PROFILE.vegetationScale);
    for (let index = 0; index < treeCount; index++) placeModel(pick(FOREST_TREES, random), chunk, slot.x + randomRange(random, -3.5, 3.5), slot.z + randomRange(random, -3.5, 3.5), random() * Math.PI * 2, { collision: true, colliderType: "tree", targetHeight: randomRange(random, 3.8, 5.5), brightness: 0.03, castShadow: index < 3 });
  }
  const sources = [...FOREST_BUSHES, ...FOREST_FLOWERS, ...FOREST_GRASS];
  if (!sources.length) return;
  const decorationCount = Math.round((12 + Math.floor(random() * 5)) * WORLD_PROFILE.vegetationScale);
  for (let index = 0; index < decorationCount; index++) placeModel(pick(sources, random), chunk, slot.x + randomRange(random, -4, 4), slot.z + randomRange(random, -4, 4), random() * Math.PI * 2, { targetWidth: randomRange(random, 0.45, 1.15), brightness: 0.01, castShadow: false });
}

function buildCityChunk(chunk: THREE.Group, random: () => number, direction: Direction) {
  addGround(chunk, cityGroundMaterial);
  addStreetTiles(chunk, random, direction);
  const crossDirection: Direction = direction === "x" ? "z" : "x";
  addAlleyTiles(chunk, random, crossDirection, 0);

  if (WORLD_PROFILE.desktop) {
    addAlleyTiles(chunk, random, direction, -22.5);
    addAlleyTiles(chunk, random, direction, 22.5);
    if (random() < 0.72) {
      addAlleyTiles(chunk, random, crossDirection, random() < 0.5 ? -18 : 18);
    }
  } else {
    const firstSide = random() < 0.5 ? -1 : 1;
    addAlleyTiles(chunk, random, direction, firstSide * 17.2);
    if (random() < 0.7) addAlleyTiles(chunk, random, direction, firstSide * -17.2);
  }

  const hasSmallPark = random() < (WORLD_PROFILE.desktop ? 0.2 : 0.24);
  const slots = getBuildingSlots(direction);
  const parkSlot = hasSmallPark ? Math.floor(random() * slots.length) : -1;
  spawnBuildings(chunk, random, direction, parkSlot);
  if (hasSmallPark) buildSmallPark(chunk, random, direction, parkSlot);
  spawnVehicles(chunk, random, getRoadPoints(direction));
  spawnCityVegetation(chunk, random, direction);
}

function buildChunk(chunk: THREE.Group, cx: number, cz: number) {
  const random = seededRandom(chunkSeed(cx, cz));
  const kind = getChunkKind(cx, cz);
  const direction = getRoadDirection(cx, cz);
  chunk.userData.kind = kind;
  if (kind === "park") {
    buildPark(chunk, random);
    return;
  }
  buildCityChunk(chunk, random, direction);
}

export function generateChunk(scene: THREE.Scene, cx: number, cz: number) {
  const key = `${cx},${cz}`;
  const existing = chunks.get(key);
  if (existing) return existing;
  const chunk = new THREE.Group();
  chunk.name = `Chunk_${key}`;
  chunk.position.set(cx * CHUNK_SIZE, 0, cz * CHUNK_SIZE);
  chunk.userData.destroyed = false;
  scene.add(chunk);
  chunks.set(key, chunk);
  buildChunk(chunk, cx, cz);
  return chunk;
}

function scheduleNextChunkBatch() {
  if (chunkGenerationScheduled || !chunkGenerationQueue.length) return;
  chunkGenerationScheduled = true;
  const run = () => {
    chunkGenerationScheduled = false;
    let generated = 0;
    while (chunkGenerationQueue.length && generated < CHUNKS_PER_BATCH) {
      const task = chunkGenerationQueue.shift();
      if (!task) break;
      const key = `${task.cx},${task.cz}`;
      queuedChunkKeys.delete(key);
      if (!desiredChunkKeys.has(key) || chunks.has(key)) continue;
      generateChunk(task.scene, task.cx, task.cz); generated++;
    }
    if (chunkGenerationQueue.length) scheduleNextChunkBatch();
  };
  if (typeof requestAnimationFrame === "function") requestAnimationFrame(run); else setTimeout(run, 16);
}

function queueChunkGeneration(scene: THREE.Scene, cx: number, cz: number) {
  const key = `${cx},${cz}`;
  if (chunks.has(key) || queuedChunkKeys.has(key)) return;
  queuedChunkKeys.add(key); chunkGenerationQueue.push({ scene, cx, cz });
}

export async function updateChunks(
  scene: THREE.Scene,
  playerX: number,
  playerZ: number,
  renderDistance = DEFAULT_RENDER_DISTANCE
) {
  const effectiveRenderDistance = WORLD_PROFILE.desktop
    ? Math.max(renderDistance, DEFAULT_RENDER_DISTANCE)
    : renderDistance;
  const { cx, cz } = getChunkCoord(playerX, playerZ);
  const required: Array<{ cx: number; cz: number; distance: number }> = [];
  desiredChunkKeys.clear();
  for (let x = cx - effectiveRenderDistance; x <= cx + effectiveRenderDistance; x++) for (let z = cz - effectiveRenderDistance; z <= cz + effectiveRenderDistance; z++) {
    const key = `${x},${z}`; desiredChunkKeys.add(key); required.push({ cx: x, cz: z, distance: Math.abs(x - cx) + Math.abs(z - cz) });
  }
  required.sort((a, b) => a.distance - b.distance);
  for (const item of required) queueChunkGeneration(scene, item.cx, item.cz);
  chunkGenerationQueue = chunkGenerationQueue.filter((task) => { const key = `${task.cx},${task.cz}`; if (desiredChunkKeys.has(key)) return true; queuedChunkKeys.delete(key); return false; });
  scheduleNextChunkBatch(); destroyFarChunks(cx, cz, effectiveRenderDistance);
}

function destroyFarChunks(centerX: number, centerZ: number, renderDistance: number) {
  for (const [key, chunk] of chunks) {
    const [cx, cz] = key.split(",").map(Number);
    if (Math.abs(cx - centerX) <= renderDistance && Math.abs(cz - centerZ) <= renderDistance) continue;
    removeChunk(key, chunk);
  }
}

function removeChunk(key: string, chunk: THREE.Group) {
  chunk.userData.destroyed = true;
  for (let index = simpleColliders.length - 1; index >= 0; index--) {
    if (simpleColliders[index].chunk === chunk) simpleColliders.splice(index, 1);
  }
  for (let index = preciseCollisionMeshes.length - 1; index >= 0; index--) {
    if (preciseCollisionMeshes[index].chunk === chunk) preciseCollisionMeshes.splice(index, 1);
  }
  simpleCollidersByChunk.delete(chunk);
  preciseCollisionMeshesByChunk.delete(chunk);
  heightMeshesByChunk.delete(chunk);
  occlusionMeshesByChunk.delete(chunk);
  const objects = new Set<THREE.Object3D>();
  chunk.traverse((object) => {
    objects.add(object);
    if (object instanceof THREE.Mesh && object.userData.temporaryGeometry) object.geometry.dispose();
  });
  for (let index = heightMeshes.length - 1; index >= 0; index--) {
    if (objects.has(heightMeshes[index])) heightMeshes.splice(index, 1);
  }
  for (let index = occlusionMeshes.length - 1; index >= 0; index--) {
    if (objects.has(occlusionMeshes[index])) occlusionMeshes.splice(index, 1);
  }
  chunk.removeFromParent();
  chunks.delete(key);
}

function collectNearbyChunks(x: number, z: number, radiusInChunks = 1) {
  const { cx, cz } = getChunkCoord(x, z);
  const result: THREE.Group[] = [];
  for (let offsetX = -radiusInChunks; offsetX <= radiusInChunks; offsetX++) {
    for (let offsetZ = -radiusInChunks; offsetZ <= radiusInChunks; offsetZ++) {
      const chunk = chunks.get(`${cx + offsetX},${cz + offsetZ}`);
      if (chunk) result.push(chunk);
    }
  }
  return result;
}

function intersectsSimpleCollider(player: THREE.Object3D, x: number, z: number, radius: number) {
  collisionBoxMin.set(x - radius, player.position.y + 0.08, z - radius);
  collisionBoxMax.set(x + radius, player.position.y + 2.05, z + radius);
  playerCollisionBox.set(collisionBoxMin, collisionBoxMax);
  nearbySimpleColliders.length = 0;
  for (const chunk of collectNearbyChunks(x, z, 1)) {
    const colliders = simpleCollidersByChunk.get(chunk);
    if (colliders) nearbySimpleColliders.push(...colliders);
  }
  for (const collider of nearbySimpleColliders) {
    if (playerCollisionBox.intersectsBox(collider.box)) return true;
  }
  return false;
}

function getNearbyCollisionMeshes(
  fromX: number,
  fromZ: number,
  toX: number,
  toZ: number,
  playerY: number,
  radius: number
) {
  collisionBoxMin.set(
    Math.min(fromX, toX) - radius - 0.12,
    playerY + 0.08,
    Math.min(fromZ, toZ) - radius - 0.12
  );
  collisionBoxMax.set(
    Math.max(fromX, toX) + radius + 0.12,
    playerY + 2.05,
    Math.max(fromZ, toZ) + radius + 0.12
  );
  sweptCollisionBox.set(collisionBoxMin, collisionBoxMax);
  nearbyPreciseCollisionMeshes.length = 0;
  nearbyPreciseMeshes.length = 0;
  for (const chunk of collectNearbyChunks(toX, toZ, 1)) {
    const entries = preciseCollisionMeshesByChunk.get(chunk);
    if (entries) nearbyPreciseCollisionMeshes.push(...entries);
  }
  for (const entry of nearbyPreciseCollisionMeshes) {
    if (entry.worldBounds.intersectsBox(sweptCollisionBox)) nearbyPreciseMeshes.push(entry.mesh);
  }
  return nearbyPreciseMeshes;
}

function preciseMovementBlocked(
  player: THREE.Object3D,
  fromX: number,
  fromZ: number,
  toX: number,
  toZ: number,
  radius: number
) {
  const dx = toX - fromX;
  const dz = toZ - fromZ;
  const distance = Math.hypot(dx, dz);
  const meshes = getNearbyCollisionMeshes(fromX, fromZ, toX, toZ, player.position.y, radius);
  if (!meshes.length) return false;
  if (distance > 0.0001) {
    rayDirection.set(dx / distance, 0, dz / distance);
    tempVectorB.set(-rayDirection.z, 0, rayDirection.x);
    for (const height of [0.32, 0.95, 1.55]) {
      for (const side of [-radius, 0, radius]) {
        rayOrigin.set(fromX + tempVectorB.x * side, player.position.y + height, fromZ + tempVectorB.z * side);
        raycaster.set(rayOrigin, rayDirection);
        raycaster.near = 0;
        raycaster.far = distance + radius + 0.08;
        if (raycaster.intersectObjects(meshes, false).length) return true;
      }
    }
  }
  const probeDirections = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
    [0.707, 0.707],
    [-0.707, 0.707],
    [0.707, -0.707],
    [-0.707, -0.707],
  ] as const;
  for (const [probeX, probeZ] of probeDirections) {
    rayOrigin.set(toX, player.position.y + 0.9, toZ);
    rayDirection.set(probeX, 0, probeZ);
    raycaster.set(rayOrigin, rayDirection);
    raycaster.near = 0;
    raycaster.far = radius + 0.055;
    if (raycaster.intersectObjects(meshes, false).length) return true;
  }
  return false;
}

function movementBlocked(
  player: THREE.Object3D,
  fromX: number,
  fromZ: number,
  toX: number,
  toZ: number,
  radius: number
) {
  return (
    intersectsSimpleCollider(player, toX, toZ, radius) ||
    preciseMovementBlocked(player, fromX, fromZ, toX, toZ, radius)
  );
}

export function resolveWorldCollision(
  player: THREE.Object3D,
  previousX: number,
  previousZ: number,
  radius = 0.38
) {
  const targetX = player.position.x;
  const targetZ = player.position.z;
  if (!movementBlocked(player, previousX, previousZ, targetX, targetZ, radius)) return;
  if (!movementBlocked(player, previousX, previousZ, targetX, previousZ, radius)) {
    player.position.z = previousZ;
    return;
  }
  if (!movementBlocked(player, previousX, previousZ, previousX, targetZ, radius)) {
    player.position.x = previousX;
    return;
  }
  player.position.set(previousX, player.position.y, previousZ);
}

export function findSafeSpawnPosition(x = 0, z = 0, radius = 0.5) {
  const candidates = [
    [x, z],
    [x + 4, z],
    [x - 4, z],
    [x, z + 3],
    [x, z - 3],
    [x + 7, z],
    [x - 7, z],
  ] as const;
  const testPlayer = new THREE.Object3D();
  testPlayer.position.set(x, PLAYER_BASE_Y, z);
  for (const [candidateX, candidateZ] of candidates) {
    if (!intersectsSimpleCollider(testPlayer, candidateX, candidateZ, radius)) {
      return new THREE.Vector3(candidateX, PLAYER_BASE_Y, candidateZ);
    }
  }
  return new THREE.Vector3(x, PLAYER_BASE_Y, z);
}

export function updatePlayerWorldHeight(player: THREE.Object3D, delta: number) {
  nearbyHeightMeshes.length = 0;
  for (const chunk of collectNearbyChunks(player.position.x, player.position.z, 1)) {
    const meshes = heightMeshesByChunk.get(chunk);
    if (meshes) nearbyHeightMeshes.push(...meshes);
  }
  rayOrigin.set(player.position.x, player.position.y + 12, player.position.z);
  raycaster.set(rayOrigin, downDirection);
  raycaster.near = 0;
  raycaster.far = 28;
  const hits = raycaster.intersectObjects(nearbyHeightMeshes, false);
  let targetY = PLAYER_BASE_Y;
  for (const hit of hits) {
    if (hit.point.y <= player.position.y + 2) { targetY = hit.point.y + PLAYER_BASE_Y; break; }
  }
  player.position.y = THREE.MathUtils.lerp(player.position.y, targetY, 1 - Math.exp(-14 * delta));
}

export function updateCameraOcclusion(
  camera: THREE.PerspectiveCamera,
  target: THREE.Vector3,
  delta = 1 / 60
) {
  tempVector.copy(camera.position).sub(target);
  const desiredDistance = tempVector.length();
  if (desiredDistance <= 0.1) return;
  tempVector.normalize();
  cameraOcclusionAccumulator += delta;
  const occlusionInterval = WORLD_PROFILE.desktop ? 1 / 45 : 1 / 30;
  if (!cameraOcclusionReady || cameraOcclusionAccumulator >= occlusionInterval) {
    cameraOcclusionAccumulator = 0;
    raycaster.set(target, tempVector);
    raycaster.near = 0;
    raycaster.far = desiredDistance;
    const nearbyOcclusionMeshes: THREE.Object3D[] = [];
    for (const chunk of collectNearbyChunks(target.x, target.z, 1)) {
      const chunkOccluders = occlusionMeshesByChunk.get(chunk);
      if (chunkOccluders) nearbyOcclusionMeshes.push(...chunkOccluders);
    }
    const hits = raycaster.intersectObjects(nearbyOcclusionMeshes, false);
    cachedCameraTargetDistance = hits.length
      ? Math.max(4.3, hits[0].distance - 0.48)
      : desiredDistance;
  }
  if (!cameraOcclusionReady) {
    cameraOcclusionDistance = cachedCameraTargetDistance || desiredDistance;
    cameraOcclusionReady = true;
  }
  const targetDistance = cachedCameraTargetDistance || desiredDistance;
  const speed = targetDistance < cameraOcclusionDistance ? 10 : 3.5;
  cameraOcclusionDistance = THREE.MathUtils.lerp(
    cameraOcclusionDistance,
    targetDistance,
    1 - Math.exp(-speed * delta)
  );
  camera.position.copy(target).addScaledVector(tempVector, cameraOcclusionDistance);
}

export function updateWorldAnimations(elapsedTime: number) {
  void elapsedTime;
}

export function destroyAllChunks() {
  for (const [key, chunk] of [...chunks]) removeChunk(key, chunk);
  chunks.clear();
  simpleColliders.length = 0;
  preciseCollisionMeshes.length = 0;
  simpleCollidersByChunk.clear();
  preciseCollisionMeshesByChunk.clear();
  heightMeshes.length = 0;
  heightMeshesByChunk.clear();
  occlusionMeshes.length = 0;
  occlusionMeshesByChunk.clear();
  cameraOcclusionDistance = 0;
  cameraOcclusionReady = false;
  cameraOcclusionAccumulator = 0;
  cachedCameraTargetDistance = 0;
  desiredChunkKeys.clear();
  queuedChunkKeys.clear();
  chunkGenerationQueue.length = 0;
  chunkGenerationScheduled = false;
}
