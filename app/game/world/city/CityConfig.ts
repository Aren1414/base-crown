import * as THREE from "three";

import type { ModelDef } from "../../assets/Models";
import type { SpawnedModel } from "../AssetLoader";

export const CITY_CHUNK_SIZE = 120;

export const MAIN_ROAD_WIDTH = 18;
export const ALLEY_WIDTH = 7;

export const BUILDING_SIZE = 21;
export const VILLA_SIZE = 16;

export const CAR_SIZE = 5.5;
export const MOTORCYCLE_SIZE = 3.2;

export const RIVER_WIDTH = 24;
export const RIVER_DEPTH = 5.5;
export const RIVER_WATER_LEVEL = -2.5;

export const BRIDGE_WIDTH = 18;
export const BRIDGE_HEIGHT = 5;
export const BRIDGE_DECK_THICKNESS = 1;
export const BRIDGE_RAMP_LENGTH = 26;

export const TUNNEL_WIDTH = 18;
export const TUNNEL_HEIGHT = 7;
export const TUNNEL_LENGTH = 76;

export const PARK_SIZE = 38;
export const PARK_PATH_WIDTH = 3.5;

export const DEFAULT_CITY_SEED = 0x4f1bbcdc;

export type RandomFunction = () => number;

export type Placement = {
  x: number;
  z: number;
  rotationY: number;
};

export type SpecialChunkType =
  | "normal"
  | "park"
  | "river-horizontal"
  | "river-vertical"
  | "bridge-horizontal"
  | "bridge-vertical"
  | "tunnel-north"
  | "tunnel-east";

export type CityGenerationResult = {
  colliders: THREE.Box3[];
  occluders: THREE.Mesh[];
};

export type CityChunkFeatures = {
  specialType: SpecialChunkType;
  hasRiver: boolean;
  hasBridge: boolean;
  hasTunnel: boolean;
  hasPark: boolean;
  riverDirection:
    | "horizontal"
    | "vertical"
    | null;
  bridgeDirection:
    | "horizontal"
    | "vertical"
    | null;
  tunnelDirection:
    | "north"
    | "east"
    | null;
};

let activeCitySeed =
  DEFAULT_CITY_SEED;

export function setCitySeed(
  seed: number
): void {
  if (!Number.isFinite(seed)) {
    activeCitySeed =
      DEFAULT_CITY_SEED;

    return;
  }

  activeCitySeed =
    Math.floor(seed) >>> 0;
}

export function getCitySeed(): number {
  return activeCitySeed;
}

export function createSessionCitySeed(): number {
  const time =
    Date.now() >>> 0;

  const random =
    Math.floor(
      Math.random() *
        0xffffffff
    ) >>> 0;

  const mixed =
    hashInteger(
      time ^
        random ^
        DEFAULT_CITY_SEED
    );

  setCitySeed(mixed);

  return mixed;
}

export function positiveModulo(
  value: number,
  divisor: number
): number {
  if (divisor === 0) {
    return 0;
  }

  return (
    (value % divisor) +
    divisor
  ) % divisor;
}

function hashInteger(
  value: number
): number {
  let hash = value >>> 0;

  hash ^= hash >>> 16;

  hash = Math.imul(
    hash,
    0x7feb352d
  );

  hash ^= hash >>> 15;

  hash = Math.imul(
    hash,
    0x846ca68b
  );

  hash ^= hash >>> 16;

  return hash >>> 0;
}

function combineSeed(
  chunkX: number,
  chunkZ: number,
  salt: number,
  worldSeed: number
): number {
  let seed =
    worldSeed >>> 0;

  seed ^=
    Math.imul(
      chunkX | 0,
      0x9e3779b1
    );

  seed ^=
    Math.imul(
      chunkZ | 0,
      0x85ebca77
    );

  seed ^=
    Math.imul(
      salt | 0,
      0xc2b2ae3d
    );

  seed =
    hashInteger(seed);

  if (seed === 0) {
    seed =
      DEFAULT_CITY_SEED;
  }

  return seed >>> 0;
}

export function createRandom(
  chunkX: number,
  chunkZ: number,
  salt = 0,
  worldSeed = activeCitySeed
): RandomFunction {
  let seed =
    combineSeed(
      chunkX,
      chunkZ,
      salt,
      worldSeed
    );

  return () => {
    seed =
      (seed + 0x6d2b79f5) >>>
      0;

    let value = seed;

    value = Math.imul(
      value ^
        (value >>> 15),
      value | 1
    );

    value ^=
      value +
      Math.imul(
        value ^
          (value >>> 7),
        value | 61
      );

    return (
      (
        value ^
        (value >>> 14)
      ) >>>
      0
    ) / 4294967296;
  };
}

export function randomRange(
  random: RandomFunction,
  min: number,
  max: number
): number {
  return (
    min +
    random() *
      (max - min)
  );
}

export function randomInteger(
  random: RandomFunction,
  min: number,
  max: number
): number {
  const lower =
    Math.ceil(min);

  const upper =
    Math.floor(max);

  return Math.floor(
    randomRange(
      random,
      lower,
      upper + 1
    )
  );
}

export function randomBoolean(
  random: RandomFunction,
  probability = 0.5
): boolean {
  return (
    random() <
    THREE.MathUtils.clamp(
      probability,
      0,
      1
    )
  );
}

export function pick<T>(
  items: readonly T[],
  random: RandomFunction
): T {
  if (items.length === 0) {
    throw new Error(
      "Cannot pick an item from an empty array."
    );
  }

  const index =
    Math.min(
      items.length - 1,
      Math.floor(
        random() *
          items.length
      )
    );

  return items[index];
}

export function getCycledItem<T>(
  items: readonly T[],
  chunkX: number,
  chunkZ: number,
  slotIndex: number
): T {
  if (items.length === 0) {
    throw new Error(
      "Cannot cycle through an empty array."
    );
  }

  const offset =
    positiveModulo(
      chunkX * 11 +
        chunkZ * 17 +
        chunkX *
          chunkZ *
          3 +
        activeCitySeed,
      items.length
    );

  return items[
    positiveModulo(
      offset +
        slotIndex,
      items.length
    )
  ];
}

export function modelFromUrl(
  url: string
): ModelDef {
  return {
    url,
    scale: 1,
  };
}

export function isVilla(
  definition: ModelDef
): boolean {
  return definition.url
    .toLowerCase()
    .includes("villa");
}

export function isMotorcycle(
  definition: ModelDef
): boolean {
  return definition.url
    .toLowerCase()
    .includes(
      "motorcycle"
    );
}

export function collectSpawnedModels(
  results: PromiseSettledResult<
    SpawnedModel | null
  >[],
  colliders: THREE.Box3[],
  occluders: THREE.Mesh[]
): void {
  for (const result of results) {
    if (
      result.status !==
        "fulfilled" ||
      !result.value
    ) {
      continue;
    }

    colliders.push(
      ...result.value
        .colliders
    );

    occluders.push(
      ...result.value
        .occluders
    );
  }
}

function isHorizontalRiverRow(
  chunkZ: number
): boolean {
  return (
    positiveModulo(
      chunkZ,
      9
    ) === 4
  );
}

function isVerticalRiverColumn(
  chunkX: number
): boolean {
  return (
    positiveModulo(
      chunkX,
      11
    ) === 5
  );
}

function isHorizontalBridgeChunk(
  chunkX: number,
  chunkZ: number
): boolean {
  if (
    !isHorizontalRiverRow(
      chunkZ
    )
  ) {
    return false;
  }

  return (
    positiveModulo(
      chunkX,
      5
    ) === 2
  );
}

function isVerticalBridgeChunk(
  chunkX: number,
  chunkZ: number
): boolean {
  if (
    !isVerticalRiverColumn(
      chunkX
    )
  ) {
    return false;
  }

  return (
    positiveModulo(
      chunkZ,
      5
    ) === 2
  );
}

function getTunnelValue(
  chunkX: number,
  chunkZ: number
): number {
  return positiveModulo(
    chunkX * 7 +
      chunkZ * 13 +
      activeCitySeed,
    23
  );
}

function isParkChunk(
  chunkX: number,
  chunkZ: number
): boolean {
  const value =
    positiveModulo(
      chunkX * 5 +
        chunkZ * 3 +
        Math.imul(
          chunkX,
          chunkZ
        ) +
        activeCitySeed,
      17
    );

  return value === 6;
}

export function getSpecialChunkType(
  chunkX: number,
  chunkZ: number
): SpecialChunkType {
  /*
   * Chunk ابتدایی همیشه معمولی می‌ماند تا محل
   * Spawn بازیکن امن و قابل پیش‌بینی باشد.
   */
  if (
    chunkX === 0 &&
    chunkZ === 0
  ) {
    return "normal";
  }

  const horizontalRiver =
    isHorizontalRiverRow(
      chunkZ
    );

  const verticalRiver =
    isVerticalRiverColumn(
      chunkX
    );

  /*
   * در محل تقاطع دو مسیر رودخانه، مسیر افقی
   * اولویت دارد تا از تولید هم‌زمان دو رودخانه
   * روی یک Chunk جلوگیری شود.
   */
  if (horizontalRiver) {
    if (
      isHorizontalBridgeChunk(
        chunkX,
        chunkZ
      )
    ) {
      return "bridge-horizontal";
    }

    return "river-horizontal";
  }

  if (verticalRiver) {
    if (
      isVerticalBridgeChunk(
        chunkX,
        chunkZ
      )
    ) {
      return "bridge-vertical";
    }

    return "river-vertical";
  }

  /*
   * تونل فقط روی Chunkهایی ایجاد می‌شود که مسیر
   * رودخانه یا پل ندارند.
   */
  const tunnelValue =
    getTunnelValue(
      chunkX,
      chunkZ
    );

  if (tunnelValue === 3) {
    return "tunnel-north";
  }

  if (tunnelValue === 10) {
    return "tunnel-east";
  }

  /*
   * پارک بعد از رودخانه و تونل بررسی می‌شود تا
   * با Special Zoneهای اصلی تداخل نداشته باشد.
   */
  if (
    isParkChunk(
      chunkX,
      chunkZ
    )
  ) {
    return "park";
  }

  return "normal";
}

export function getCityChunkFeatures(
  chunkX: number,
  chunkZ: number
): CityChunkFeatures {
  const specialType =
    getSpecialChunkType(
      chunkX,
      chunkZ
    );

  const horizontalRiver =
    specialType ===
      "river-horizontal" ||
    specialType ===
      "bridge-horizontal";

  const verticalRiver =
    specialType ===
      "river-vertical" ||
    specialType ===
      "bridge-vertical";

  const horizontalBridge =
    specialType ===
    "bridge-horizontal";

  const verticalBridge =
    specialType ===
    "bridge-vertical";

  const northTunnel =
    specialType ===
    "tunnel-north";

  const eastTunnel =
    specialType ===
    "tunnel-east";

  return {
    specialType,

    hasRiver:
      horizontalRiver ||
      verticalRiver,

    hasBridge:
      horizontalBridge ||
      verticalBridge,

    hasTunnel:
      northTunnel ||
      eastTunnel,

    hasPark:
      specialType ===
      "park",

    riverDirection:
      horizontalRiver
        ? "horizontal"
        : verticalRiver
          ? "vertical"
          : null,

    bridgeDirection:
      horizontalBridge
        ? "horizontal"
        : verticalBridge
          ? "vertical"
          : null,

    tunnelDirection:
      northTunnel
        ? "north"
        : eastTunnel
          ? "east"
          : null,
  };
}

export function isRiverChunk(
  specialType: SpecialChunkType
): boolean {
  return (
    specialType ===
      "river-horizontal" ||
    specialType ===
      "river-vertical" ||
    specialType ===
      "bridge-horizontal" ||
    specialType ===
      "bridge-vertical"
  );
}

export function isBridgeChunk(
  specialType: SpecialChunkType
): boolean {
  return (
    specialType ===
      "bridge-horizontal" ||
    specialType ===
      "bridge-vertical"
  );
}

export function isTunnelChunk(
  specialType: SpecialChunkType
): boolean {
  return (
    specialType ===
      "tunnel-north" ||
    specialType ===
      "tunnel-east"
  );
}

export function isParkSpecialChunk(
  specialType: SpecialChunkType
): boolean {
  return (
    specialType === "park"
  );
}

export function getBuildingSlots(
  specialType: SpecialChunkType
): Placement[] {
  const slots: Placement[] = [
    {
      x: -49,
      z: -49,
      rotationY:
        Math.PI,
    },
    {
      x: 0,
      z: -49,
      rotationY:
        Math.PI,
    },
    {
      x: 49,
      z: -49,
      rotationY:
        Math.PI,
    },

    {
      x: -49,
      z: 0,
      rotationY:
        -Math.PI / 2,
    },
    {
      x: 49,
      z: 0,
      rotationY:
        Math.PI / 2,
    },

    {
      x: -49,
      z: 49,
      rotationY: 0,
    },
    {
      x: 0,
      z: 49,
      rotationY: 0,
    },
    {
      x: 49,
      z: 49,
      rotationY: 0,
    },
  ];

  if (
    specialType ===
      "river-horizontal" ||
    specialType ===
      "bridge-horizontal"
  ) {
    return slots.filter(
      (slot) =>
        Math.abs(
          slot.z
        ) >= 40
    );
  }

  if (
    specialType ===
      "river-vertical" ||
    specialType ===
      "bridge-vertical"
  ) {
    return slots.filter(
      (slot) =>
        Math.abs(
          slot.x
        ) >= 40
    );
  }

  if (
    specialType ===
    "tunnel-north"
  ) {
    return slots.filter(
      (slot) =>
        !(
          slot.z < -34 &&
          Math.abs(
            slot.x
          ) < 24
        )
    );
  }

  if (
    specialType ===
    "tunnel-east"
  ) {
    return slots.filter(
      (slot) =>
        !(
          slot.x > 34 &&
          Math.abs(
            slot.z
          ) < 24
        )
    );
  }

  if (
    specialType === "park"
  ) {
    /*
     * مرکز Chunk برای پارک خالی می‌ماند و فقط
     * ساختمان‌های گوشه‌ای حفظ می‌شوند.
     */
    return slots.filter(
      (slot) =>
        Math.abs(
          slot.x
        ) >= 40 &&
        Math.abs(
          slot.z
        ) >= 40
    );
  }

  return slots;
}

export function getVehicleSlots(
  specialType: SpecialChunkType
): Placement[] {
  const slots: Placement[] = [
    {
      x: -44,
      z: -34,
      rotationY: 0,
    },
    {
      x: 5,
      z: -26,
      rotationY:
        Math.PI,
    },
    {
      x: 44,
      z: 26,
      rotationY: 0,
    },
    {
      x: -5,
      z: 34,
      rotationY:
        Math.PI,
    },

    {
      x: -34,
      z: -44,
      rotationY:
        Math.PI / 2,
    },
    {
      x: -26,
      z: 5,
      rotationY:
        -Math.PI / 2,
    },
    {
      x: 26,
      z: 44,
      rotationY:
        Math.PI / 2,
    },
    {
      x: 34,
      z: -5,
      rotationY:
        -Math.PI / 2,
    },
  ];

  if (
    specialType ===
      "river-horizontal" ||
    specialType ===
      "bridge-horizontal"
  ) {
    return slots.filter(
      (slot) =>
        Math.abs(
          slot.z
        ) > 24
    );
  }

  if (
    specialType ===
      "river-vertical" ||
    specialType ===
      "bridge-vertical"
  ) {
    return slots.filter(
      (slot) =>
        Math.abs(
          slot.x
        ) > 24
    );
  }

  if (
    specialType ===
    "tunnel-north"
  ) {
    return slots.filter(
      (slot) =>
        !(
          slot.z < -24 &&
          Math.abs(
            slot.x
          ) < 22
        )
    );
  }

  if (
    specialType ===
    "tunnel-east"
  ) {
    return slots.filter(
      (slot) =>
        !(
          slot.x > 24 &&
          Math.abs(
            slot.z
          ) < 22
        )
    );
  }

  if (
    specialType === "park"
  ) {
    /*
     * خودروها از فضای مرکزی پارک و مسیرهای
     * پیاده‌روی آن دور نگه داشته می‌شوند.
     */
    return slots.filter(
      (slot) =>
        Math.abs(
          slot.x
        ) > 30 ||
        Math.abs(
          slot.z
        ) > 30
    );
  }

  return slots;
}

export function isPointInsideMainRoad(
  x: number,
  z: number,
  padding = 0
): boolean {
  const halfWidth =
    MAIN_ROAD_WIDTH / 2 +
    padding;

  return (
    Math.abs(x) <=
      halfWidth ||
    Math.abs(z) <=
      halfWidth
  );
}

export function isPointInsideRiver(
  x: number,
  z: number,
  specialType: SpecialChunkType,
  padding = 0
): boolean {
  const halfWidth =
    RIVER_WIDTH / 2 +
    padding;

  if (
    specialType ===
      "river-horizontal" ||
    specialType ===
      "bridge-horizontal"
  ) {
    return (
      Math.abs(z) <=
      halfWidth
    );
  }

  if (
    specialType ===
      "river-vertical" ||
    specialType ===
      "bridge-vertical"
  ) {
    return (
      Math.abs(x) <=
      halfWidth
    );
  }

  return false;
}

export function isPointInsideBridge(
  x: number,
  z: number,
  specialType: SpecialChunkType,
  padding = 0
): boolean {
  const halfBridgeWidth =
    BRIDGE_WIDTH / 2 +
    padding;

  const halfBridgeLength =
    CITY_CHUNK_SIZE / 2 +
    padding;

  if (
    specialType ===
    "bridge-horizontal"
  ) {
    return (
      Math.abs(x) <=
        halfBridgeLength &&
      Math.abs(z) <=
        halfBridgeWidth
    );
  }

  if (
    specialType ===
    "bridge-vertical"
  ) {
    return (
      Math.abs(z) <=
        halfBridgeLength &&
      Math.abs(x) <=
        halfBridgeWidth
    );
  }

  return false;
}

export function isPointInsideTunnel(
  x: number,
  z: number,
  specialType: SpecialChunkType,
  padding = 0
): boolean {
  const halfWidth =
    TUNNEL_WIDTH / 2 +
    padding;

  const halfLength =
    TUNNEL_LENGTH / 2 +
    padding;

  if (
    specialType ===
    "tunnel-north"
  ) {
    return (
      Math.abs(x) <=
        halfWidth &&
      z <=
        -CITY_CHUNK_SIZE /
          2 +
          TUNNEL_LENGTH &&
      z >=
        -CITY_CHUNK_SIZE /
          2 -
          padding
    );
  }

  if (
    specialType ===
    "tunnel-east"
  ) {
    return (
      Math.abs(z) <=
        halfWidth &&
      x >=
        CITY_CHUNK_SIZE /
          2 -
          TUNNEL_LENGTH &&
      x <=
        CITY_CHUNK_SIZE /
          2 +
          padding
    );
  }

  return false;
}

export function isPointInsidePark(
  x: number,
  z: number,
  specialType: SpecialChunkType,
  padding = 0
): boolean {
  if (
    specialType !== "park"
  ) {
    return false;
  }

  const halfSize =
    PARK_SIZE / 2 +
    padding;

  return (
    Math.abs(x) <=
      halfSize &&
    Math.abs(z) <=
      halfSize
  );
}
