import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {
  FOREST_BUSHES,
  FOREST_FLOWERS,
  FOREST_GRASS,
  FOREST_TREES,
  URBAN_ALLEYS,
  URBAN_BRIDGES,
  URBAN_BUILDINGS,
  URBAN_STREETS,
  URBAN_TUNNEL,
  URBAN_TUNNEL_WALLS,
  URBAN_VEHICLES,
  type ModelDef,
} from "../assets/Models";

export const CHUNK_SIZE = 88;

const HALF_CHUNK = CHUNK_SIZE / 2;
const ROAD_WIDTH = 8.2;
const ALLEY_WIDTH = 3.2;
const RIVER_WIDTH = 26;
const RIVER_BANK_WIDTH = 5.5;
const BRIDGE_LENGTH = 35;
const BRIDGE_WIDTH = 9;
const TUNNEL_WIDTH = 10.5;
const TUNNEL_LENGTH = 64;
const PLAYER_BASE_Y = 0.055;

type Direction = "x" | "z";
type ChunkKind = "city" | "park" | "river" | "tunnel-x" | "tunnel-z";
type ColliderType = "tree" | "vehicle" | "wall" | "rail";
type SimpleCollider = { box: THREE.Box3; chunk: THREE.Group };
type PreciseCollisionMesh = { mesh: THREE.Mesh; chunk: THREE.Group };
type RoadPoint = { x: number; z: number; direction: Direction };
type ModelOptions = {
  y?: number;
  collision?: boolean;
  preciseCollision?: boolean;
  colliderType?: ColliderType;
  height?: boolean;
  occlusion?: boolean;
  water?: boolean;
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

const loader = new GLTFLoader();
const modelCache = new Map<string, Promise<THREE.Group>>();
const simpleColliders: SimpleCollider[] = [];
const preciseCollisionMeshes: PreciseCollisionMesh[] = [];
const heightMeshes: THREE.Object3D[] = [];
const occlusionMeshes: THREE.Object3D[] = [];
const waterMaterials = new Set<THREE.Material>();
const waterTextures = new Set<THREE.Texture>();
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

let cameraOcclusionDistance = 0;
let cameraOcclusionReady = false;

const cityGroundMaterial = new THREE.MeshStandardMaterial({ color: 0x202522, roughness: 1, metalness: 0 });
const parkGroundMaterial = new THREE.MeshStandardMaterial({ color: 0x233526, roughness: 1, metalness: 0 });
const riverGroundMaterial = new THREE.MeshStandardMaterial({ color: 0x101718, roughness: 1, metalness: 0 });
const riverBankMaterial = new THREE.MeshStandardMaterial({ color: 0x31382f, roughness: 1, metalness: 0 });
const foundationMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2e2b, roughness: 1, metalness: 0 });
const foundationEdgeMaterial = new THREE.MeshStandardMaterial({ color: 0x202421, roughness: 1, metalness: 0 });
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

function isRiverColumn(cx: number) {
  return modulo(cx - 1, 12) === 0;
}

function isBridgeCrossing(cz: number) {
  return modulo(cz, 4) === 0;
}

function getChunkKind(cx: number, cz: number): ChunkKind {
  if (isRiverColumn(cx)) return "river";
  if (cx === -1 && cz === 0) return "tunnel-x";
  const value = Math.abs(cx * 37 + cz * 61);
  if (value > 0 && value % 23 === 0) return "park";
  return "city";
}

function getRoadDirection(_cx: number, _cz: number, kind: ChunkKind): Direction {
  return kind === "tunnel-z" ? "z" : "x";
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
  const result = material.clone();
  if (
    result instanceof THREE.MeshStandardMaterial ||
    result instanceof THREE.MeshPhysicalMaterial ||
    result instanceof THREE.MeshLambertMaterial ||
    result instanceof THREE.MeshPhongMaterial ||
    result instanceof THREE.MeshBasicMaterial
  ) {
    result.color.lerp(new THREE.Color(0xffffff), amount);
    if (result instanceof THREE.MeshStandardMaterial || result instanceof THREE.MeshPhysicalMaterial) {
      result.roughness = Math.max(0.67, result.roughness);
      result.metalness = Math.min(0.12, result.metalness);
    }
    result.needsUpdate = true;
  }
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
    if (options.height) heightMeshes.push(child);
    if (options.occlusion) occlusionMeshes.push(child);
    if (options.water) {
      const materials = Array.isArray(child.material) ? child.material : [child.material];
      for (const material of materials) waterMaterials.add(material);
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
  simpleColliders.push({
    chunk,
    box: new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(tempCenter.x, bounds.min.y + height / 2, tempCenter.z),
      new THREE.Vector3(width, height, depth)
    ),
  });
}

function registerStaticCollider(
  chunk: THREE.Group,
  centerX: number,
  centerY: number,
  centerZ: number,
  width: number,
  height: number,
  depth: number
) {
  simpleColliders.push({
    chunk,
    box: new THREE.Box3().setFromCenterAndSize(
      new THREE.Vector3(centerX + chunk.position.x, centerY, centerZ + chunk.position.z),
      new THREE.Vector3(width, height, depth)
    ),
  });
}

function registerPreciseCollision(object: THREE.Object3D, chunk: THREE.Group) {
  object.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    child.geometry.computeBoundingBox();
    const bounds = child.geometry.boundingBox;
    if (!bounds) return;
    bounds.getSize(tempSize);
    if (tempSize.x < 0.16 && tempSize.y < 0.16 && tempSize.z < 0.16) return;
    preciseCollisionMeshes.push({ mesh: child, chunk });
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
}

function addStreetTiles(
  chunk: THREE.Group,
  random: () => number,
  direction: Direction,
  start = -HALF_CHUNK,
  end = HALF_CHUNK,
  crossOffset = 0
) {
  if (!URBAN_STREETS.length || end <= start) return;
  const count = Math.max(1, Math.ceil((end - start) / 11));
  const exactLength = (end - start) / count;
  const definition = URBAN_STREETS[Math.floor(random() * URBAN_STREETS.length)];
  for (let index = 0; index < count; index++) {
    const along = start + exactLength * (index + 0.5);
    placeLinearModel(
      definition,
      chunk,
      direction === "x" ? along : crossOffset,
      direction === "x" ? crossOffset : along,
      {
        direction,
        targetLength: exactLength + 0.12,
        targetCrossSize: ROAD_WIDTH + 2.4,
        y: 0.006,
        flattenSurface: true,
        brightness: 0.015,
        castShadow: false,
        sinkIntoGround: 0.004,
      }
    );
  }
}

function addAlleyTiles(
  chunk: THREE.Group,
  random: () => number,
  direction: Direction,
  side: -1 | 1
) {
  if (!URBAN_ALLEYS.length) return;
  const connector = URBAN_ALLEYS.find((item) => item.url.includes("Connecting_alley_and_street"));
  const alleys = URBAN_ALLEYS.filter((item) => !item.url.includes("Connecting_alley_and_street"));
  const usable = alleys.length ? alleys : URBAN_ALLEYS;
  const length = 25;
  const start = side === -1 ? -HALF_CHUNK : HALF_CHUNK - length;
  const count = 4;
  const exactLength = length / count;
  for (let index = 0; index < count; index++) {
    const along = start + exactLength * (index + 0.5);
    const connectorIndex = side === -1 ? count - 1 : 0;
    const definition = index === connectorIndex && connector ? connector : usable[modulo(index, usable.length)];
    placeLinearModel(
      definition,
      chunk,
      direction === "x" ? along : 0,
      direction === "x" ? 0 : along,
      {
        direction,
        targetLength: exactLength + 0.1,
        targetCrossSize: ALLEY_WIDTH,
        y: 0.006,
        flattenSurface: true,
        brightness: 0.015,
        castShadow: false,
        sinkIntoGround: 0.004,
      }
    );
  }
}

function getRoadPoints(direction: Direction): RoadPoint[] {
  const result: RoadPoint[] = [];
  for (let offset = -38; offset <= 38; offset += 11) {
    result.push({
      x: direction === "x" ? offset : 0,
      z: direction === "x" ? 0 : offset,
      direction,
    });
  }
  return result;
}

function isVilla(definition: ModelDef) {
  const url = definition.url.toLowerCase();
  return url.includes("villa") || url.includes("house");
}

function getBuildingSlots(direction: Direction) {
  const alongPositions = [-36, -24, -12, 0, 12, 24, 36];
  const rowOffsets = [12.2, 24.8, 36.2];
  const slots: Array<{ x: number; z: number; rotation: number; outer: boolean }> = [];
  for (const rowOffset of rowOffsets) {
    for (const value of alongPositions) {
      const outer = rowOffset > 30;
      if (direction === "x") {
        slots.push({ x: value, z: -rowOffset, rotation: 0, outer });
        slots.push({ x: value, z: rowOffset, rotation: Math.PI, outer });
      } else {
        slots.push({ x: -rowOffset, z: value, rotation: Math.PI / 2, outer });
        slots.push({ x: rowOffset, z: value, rotation: -Math.PI / 2, outer });
      }
    }
  }
  return slots;
}

function spawnBuildings(chunk: THREE.Group, random: () => number, direction: Direction) {
  if (!URBAN_BUILDINGS.length) return;
  for (const slot of getBuildingSlots(direction)) {
    const definition = pick(URBAN_BUILDINGS, random);
    const villa = isVilla(definition);
    placeModel(
      definition,
      chunk,
      slot.x + randomRange(random, -0.1, 0.1),
      slot.z + randomRange(random, -0.1, 0.1),
      slot.rotation + randomRange(random, -0.005, 0.005),
      {
        preciseCollision: true,
        foundation: true,
        sinkIntoGround: randomRange(random, 0.1, 0.16),
        occlusion: !slot.outer && random() < 0.3,
        targetWidth: slot.outer
          ? randomRange(random, 9.4, 10.8)
          : villa
            ? randomRange(random, 10.6, 11.8)
            : randomRange(random, 11, 12.2),
        maxHeight: villa ? randomRange(random, 8, 10.5) : randomRange(random, 12, 17),
        brightness: 0.22,
      }
    );
  }
}

function isMotorcycle(definition: ModelDef) {
  const url = definition.url.toLowerCase();
  return url.includes("motor") || url.includes("bike") || url.includes("cycle") || url.includes("scooter");
}

function spawnVehicles(chunk: THREE.Group, random: () => number, points: RoadPoint[]) {
  if (!URBAN_VEHICLES.length) return;
  const available = shuffle([...points], random);
  const count = Math.min(available.length, 4 + Math.floor(random() * 3));
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
  const count = 950;
  const grass = new THREE.InstancedMesh(grassBladeGeometry, grassBladeMaterial, count);
  const matrix = new THREE.Matrix4();
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();
  for (let index = 0; index < count; index++) {
    position.set(randomRange(random, -41, 41), 0.02, randomRange(random, -41, 41));
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
    for (const value of [-38, -26, -14, 14, 26, 38]) {
      if (random() < 0.2) continue;
      const sideOffset = randomRange(random, 8.7, 10) * (random() < 0.5 ? -1 : 1);
      placeModel(
        pick(FOREST_TREES, random),
        chunk,
        direction === "x" ? value : sideOffset,
        direction === "x" ? sideOffset : value,
        random() * Math.PI * 2,
        {
          collision: true,
          colliderType: "tree",
          targetHeight: randomRange(random, 4.1, 5.9),
          brightness: 0.03,
        }
      );
    }
  }
  const decorationSources = [...FOREST_BUSHES, ...FOREST_FLOWERS];
  if (!decorationSources.length) return;
  for (let index = 0; index < 18; index++) {
    const side = random() < 0.5 ? -1 : 1;
    const along = randomRange(random, -40, 40);
    const across = randomRange(random, 8.1, 10) * side;
    placeModel(
      pick(decorationSources, random),
      chunk,
      direction === "x" ? along : across,
      direction === "x" ? across : along,
      random() * Math.PI * 2,
      {
        targetWidth: randomRange(random, 0.55, 1.3),
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
    for (let index = 0; index < 28; index++) {
      placeModel(
        pick(FOREST_TREES, random),
        chunk,
        randomRange(random, -39, 39),
        randomRange(random, -39, 39),
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
  for (let index = 0; index < 48; index++) {
    placeModel(
      pick(sources, random),
      chunk,
      randomRange(random, -40, 40),
      randomRange(random, -40, 40),
      random() * Math.PI * 2,
      {
        targetWidth: randomRange(random, 0.45, 1.7),
        brightness: 0.01,
        castShadow: false,
      }
    );
  }
}

function createWaterTexture() {
  const width = 128;
  const height = 128;
  const data = new Uint8Array(width * height * 4);
  const random = seededRandom(874126);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4;
      const wave = Math.sin(y * 0.31 + x * 0.09) * 22 + Math.sin(y * 0.13 - x * 0.23) * 13;
      const noise = random() * 16;
      data[index] = Math.max(12, 24 + wave + noise);
      data[index + 1] = Math.max(45, 108 + wave + noise);
      data[index + 2] = Math.max(70, 145 + wave + noise);
      data[index + 3] = 242;
    }
  }
  const texture = new THREE.DataTexture(data, width, height, THREE.RGBAFormat);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 9);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;
  waterTextures.add(texture);
  return texture;
}

function createRiverWater(chunk: THREE.Group) {
  const texture = createWaterTexture();
  const material = new THREE.MeshPhysicalMaterial({
    map: texture,
    color: new THREE.Color(0x2f8298),
    roughness: 0.2,
    metalness: 0,
    transparent: true,
    opacity: 0.94,
    transmission: 0,
    clearcoat: 0.5,
    clearcoatRoughness: 0.16,
    side: THREE.DoubleSide,
    depthWrite: true,
  });
  const water = new THREE.Mesh(new THREE.PlaneGeometry(RIVER_WIDTH, CHUNK_SIZE + 1.5, 1, 24), material);
  water.rotation.x = -Math.PI / 2;
  water.position.y = -0.08;
  water.receiveShadow = true;
  water.renderOrder = 2;
  water.userData.temporaryGeometry = true;
  chunk.add(water);
  waterMaterials.add(material);
}

function createRiverBanks(chunk: THREE.Group, random: () => number) {
  for (const side of [-1, 1] as const) {
    const bank = new THREE.Mesh(new THREE.BoxGeometry(RIVER_BANK_WIDTH, 0.24, CHUNK_SIZE), riverBankMaterial);
    bank.position.set(side * (RIVER_WIDTH / 2 + RIVER_BANK_WIDTH / 2), -0.04, 0);
    bank.receiveShadow = true;
    bank.userData.temporaryGeometry = true;
    chunk.add(bank);
    heightMeshes.push(bank);
    const sources = [...FOREST_BUSHES, ...FOREST_GRASS];
    if (!sources.length) continue;
    for (let index = 0; index < 14; index++) {
      placeModel(
        pick(sources, random),
        chunk,
        side * randomRange(random, RIVER_WIDTH / 2 + 0.7, RIVER_WIDTH / 2 + RIVER_BANK_WIDTH - 0.35),
        randomRange(random, -42, 42),
        random() * Math.PI * 2,
        {
          targetWidth: randomRange(random, 0.6, 1.5),
          brightness: 0.01,
          castShadow: false,
        }
      );
    }
  }
}

function buildBridge(chunk: THREE.Group, random: () => number) {
  if (!URBAN_BRIDGES.length) return;
  placeLinearModel(pick(URBAN_BRIDGES, random), chunk, 0, 0, {
    direction: "x",
    targetLength: BRIDGE_LENGTH,
    targetCrossSize: BRIDGE_WIDTH,
    y: 0.03,
    height: true,
    occlusion: true,
    brightness: 0.17,
    castShadow: true,
    sinkIntoGround: 0.025,
  });
  addStreetTiles(chunk, random, "x", -HALF_CHUNK, -BRIDGE_LENGTH / 2 + 0.25);
  addStreetTiles(chunk, random, "x", BRIDGE_LENGTH / 2 - 0.25, HALF_CHUNK);
  registerStaticCollider(chunk, 0, 1.15, BRIDGE_WIDTH / 2, BRIDGE_LENGTH, 2.3, 0.35);
  registerStaticCollider(chunk, 0, 1.15, -BRIDGE_WIDTH / 2, BRIDGE_LENGTH, 2.3, 0.35);
}

function buildRiverChunk(chunk: THREE.Group, random: () => number, cz: number) {
  addGround(chunk, riverGroundMaterial);
  createRiverWater(chunk);
  createRiverBanks(chunk, random);
  if (isBridgeCrossing(cz)) buildBridge(chunk, random);
}

function buildTunnel(chunk: THREE.Group, random: () => number, direction: Direction) {
  addStreetTiles(chunk, random, direction, -HALF_CHUNK, HALF_CHUNK);
  const entranceOffset = TUNNEL_LENGTH / 2;
  if (URBAN_TUNNEL.length) {
    const entrance = URBAN_TUNNEL[0];
    placeModel(
      entrance,
      chunk,
      direction === "x" ? -entranceOffset : 0,
      direction === "x" ? 0 : -entranceOffset,
      direction === "x" ? Math.PI / 2 : 0,
      {
        targetWidth: TUNNEL_WIDTH + 1.5,
        maxHeight: 8,
        y: 0.02,
        preciseCollision: true,
        occlusion: true,
        brightness: 0.13,
        castShadow: true,
        sinkIntoGround: 0.1,
      }
    );
    placeModel(
      entrance,
      chunk,
      direction === "x" ? entranceOffset : 0,
      direction === "x" ? 0 : entranceOffset,
      direction === "x" ? -Math.PI / 2 : Math.PI,
      {
        targetWidth: TUNNEL_WIDTH + 1.5,
        maxHeight: 8,
        y: 0.02,
        preciseCollision: true,
        occlusion: true,
        brightness: 0.13,
        castShadow: true,
        sinkIntoGround: 0.1,
      }
    );
  }
  if (URBAN_TUNNEL_WALLS.length) {
    const wallStart = -entranceOffset + 6;
    const wallEnd = entranceOffset - 6;
    const sectionCount = Math.max(1, Math.ceil((wallEnd - wallStart) / 8));
    const exactLength = (wallEnd - wallStart) / sectionCount;
    const wallOffset = TUNNEL_WIDTH / 2;
    for (let index = 0; index < sectionCount; index++) {
      const along = wallStart + exactLength * (index + 0.5);
      for (const side of [-1, 1] as const) {
        const definition = URBAN_TUNNEL_WALLS[modulo(index + (side === 1 ? 1 : 0), URBAN_TUNNEL_WALLS.length)];
        placeLinearModel(
          definition,
          chunk,
          direction === "x" ? along : wallOffset * side,
          direction === "x" ? wallOffset * side : along,
          {
            direction,
            targetLength: exactLength + 0.12,
            targetCrossSize: 1.15,
            y: 0.015,
            rotationY: side === -1 ? Math.PI : 0,
            occlusion: index % 3 === 0,
            brightness: 0.11,
            castShadow: true,
            sinkIntoGround: 0.075,
          }
        );
      }
    }
    if (direction === "x") {
      registerStaticCollider(chunk, 0, 3.2, wallOffset, wallEnd - wallStart, 6.4, 0.65);
      registerStaticCollider(chunk, 0, 3.2, -wallOffset, wallEnd - wallStart, 6.4, 0.65);
    } else {
      registerStaticCollider(chunk, wallOffset, 3.2, 0, 0.65, 6.4, wallEnd - wallStart);
      registerStaticCollider(chunk, -wallOffset, 3.2, 0, 0.65, 6.4, wallEnd - wallStart);
    }
  }
}

function buildCityChunk(
  chunk: THREE.Group,
  random: () => number,
  direction: Direction,
  tunnel: boolean
) {
  addGround(chunk, cityGroundMaterial);
  if (tunnel) {
    buildTunnel(chunk, random, direction);
    return;
  }
  addStreetTiles(chunk, random, direction);
  if (random() < 0.22) addAlleyTiles(chunk, random, direction === "x" ? "z" : "x", random() < 0.5 ? -1 : 1);
  spawnBuildings(chunk, random, direction);
  spawnVehicles(chunk, random, getRoadPoints(direction));
  spawnCityVegetation(chunk, random, direction);
}

function buildChunk(chunk: THREE.Group, cx: number, cz: number) {
  const random = seededRandom(chunkSeed(cx, cz));
  const kind = getChunkKind(cx, cz);
  const direction = getRoadDirection(cx, cz, kind);
  chunk.userData.kind = kind;
  if (kind === "park") {
    buildPark(chunk, random);
    return;
  }
  if (kind === "river") {
    buildRiverChunk(chunk, random, cz);
    return;
  }
  buildCityChunk(chunk, random, direction, kind === "tunnel-x" || kind === "tunnel-z");
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

export async function updateChunks(
  scene: THREE.Scene,
  playerX: number,
  playerZ: number,
  renderDistance = 1
) {
  const { cx, cz } = getChunkCoord(playerX, playerZ);
  for (let x = cx - renderDistance; x <= cx + renderDistance; x++) {
    for (let z = cz - renderDistance; z <= cz + renderDistance; z++) generateChunk(scene, x, z);
  }
  destroyFarChunks(cx, cz, renderDistance);
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

function intersectsSimpleCollider(player: THREE.Object3D, x: number, z: number, radius: number) {
  const box = new THREE.Box3(
    new THREE.Vector3(x - radius, player.position.y + 0.08, z - radius),
    new THREE.Vector3(x + radius, player.position.y + 2.05, z + radius)
  );
  for (const collider of simpleColliders) {
    if (box.intersectsBox(collider.box)) return true;
  }
  return false;
}

function getNearbyCollisionMeshes(x: number, z: number, range: number) {
  return preciseCollisionMeshes
    .filter((entry) => {
      entry.mesh.getWorldPosition(tempVector);
      return Math.abs(tempVector.x - x) < range && Math.abs(tempVector.z - z) < range;
    })
    .map((entry) => entry.mesh);
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
  const meshes = getNearbyCollisionMeshes(toX, toZ, 20);
  if (!meshes.length) return false;
  if (distance > 0.0001) {
    rayDirection.set(dx / distance, 0, dz / distance);
    tempVectorB.set(-rayDirection.z, 0, rayDirection.x);
    for (const height of [0.3, 0.9, 1.5]) {
      for (const side of [-radius, 0, radius]) {
        rayOrigin.set(fromX + tempVectorB.x * side, player.position.y + height, fromZ + tempVectorB.z * side);
        raycaster.set(rayOrigin, rayDirection);
        raycaster.near = 0;
        raycaster.far = distance + radius + 0.1;
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
    rayOrigin.set(toX, player.position.y + 0.85, toZ);
    rayDirection.set(probeX, 0, probeZ);
    raycaster.set(rayOrigin, rayDirection);
    raycaster.near = 0;
    raycaster.far = radius + 0.08;
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
  rayOrigin.set(player.position.x, player.position.y + 12, player.position.z);
  raycaster.set(rayOrigin, downDirection);
  raycaster.near = 0;
  raycaster.far = 28;
  const hits = raycaster.intersectObjects(heightMeshes, false);
  let targetY = PLAYER_BASE_Y;
  for (const hit of hits) {
    if (hit.point.y <= player.position.y + 2) {
      targetY = hit.point.y + PLAYER_BASE_Y;
      break;
    }
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
  raycaster.set(target, tempVector);
  raycaster.near = 0;
  raycaster.far = desiredDistance;
  const hits = raycaster.intersectObjects(occlusionMeshes, false);
  let targetDistance = desiredDistance;
  if (hits.length) targetDistance = Math.max(4.3, hits[0].distance - 0.48);
  if (!cameraOcclusionReady) {
    cameraOcclusionDistance = targetDistance;
    cameraOcclusionReady = true;
  }
  const speed = targetDistance < cameraOcclusionDistance ? 10 : 3.5;
  cameraOcclusionDistance = THREE.MathUtils.lerp(
    cameraOcclusionDistance,
    targetDistance,
    1 - Math.exp(-speed * delta)
  );
  camera.position.copy(target).addScaledVector(tempVector, cameraOcclusionDistance);
}

export function updateWorldAnimations(elapsedTime: number) {
  for (const texture of waterTextures) {
    texture.offset.y = -elapsedTime * 0.075;
    texture.offset.x = Math.sin(elapsedTime * 0.4) * 0.025;
  }
  const opacity = 0.93 + Math.sin(elapsedTime * 0.85) * 0.015;
  for (const material of waterMaterials) {
    if ("opacity" in material && typeof material.opacity === "number") {
      material.transparent = true;
      material.opacity = opacity;
    }
  }
}

export function destroyAllChunks() {
  for (const [key, chunk] of [...chunks]) removeChunk(key, chunk);
  chunks.clear();
  simpleColliders.length = 0;
  preciseCollisionMeshes.length = 0;
  heightMeshes.length = 0;
  occlusionMeshes.length = 0;
  waterMaterials.clear();
  for (const texture of waterTextures) texture.dispose();
  waterTextures.clear();
  cameraOcclusionDistance = 0;
  cameraOcclusionReady = false;
}
