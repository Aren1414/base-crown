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

export type RandomFunction = () => number;

export type Placement = {
  x: number;
  z: number;
  rotationY: number;
};

export type SpecialChunkType =
  | "normal"
  | "river-horizontal"
  | "river-vertical"
  | "tunnel-north"
  | "tunnel-east";

export type CityGenerationResult = {
  colliders: THREE.Box3[];
  occluders: THREE.Mesh[];
};

export function positiveModulo(
  value: number,
  divisor: number
): number {
  return ((value % divisor) + divisor) % divisor;
}

export function createRandom(
  chunkX: number,
  chunkZ: number,
  salt = 0
): RandomFunction {
  let seed =
    Math.imul(chunkX + 10000 + salt, 374761393) ^
    Math.imul(chunkZ + 20000 - salt, 668265263);

  seed >>>= 0;

  return () => {
    seed += 0x6d2b79f5;

    let value = seed;

    value = Math.imul(
      value ^ (value >>> 15),
      value | 1
    );

    value ^=
      value +
      Math.imul(
        value ^ (value >>> 7),
        value | 61
      );

    return (
      ((value ^ (value >>> 14)) >>> 0) /
      4294967296
    );
  };
}

export function randomRange(
  random: RandomFunction,
  min: number,
  max: number
): number {
  return min + random() * (max - min);
}

export function pick<T>(
  items: T[],
  random: RandomFunction
): T {
  return items[
    Math.floor(random() * items.length)
  ];
}

export function getCycledItem<T>(
  items: T[],
  chunkX: number,
  chunkZ: number,
  slotIndex: number
): T {
  const offset = positiveModulo(
    chunkX * 11 +
      chunkZ * 17 +
      chunkX * chunkZ * 3,
    items.length
  );

  return items[
    positiveModulo(
      offset + slotIndex,
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
    .includes("motorcycle");
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
      result.status !== "fulfilled" ||
      !result.value
    ) {
      continue;
    }

    colliders.push(
      ...result.value.colliders
    );

    occluders.push(
      ...result.value.occluders
    );
  }
}

export function getSpecialChunkType(
  chunkX: number,
  chunkZ: number
): SpecialChunkType {
  if (
    chunkX === 0 &&
    chunkZ === 0
  ) {
    return "normal";
  }

  /*
   * رودخانه‌ها به‌صورت مسیرهای متصل میان Chunkها
   * تولید می‌شوند و در مرز Chunk قطع نمی‌شوند.
   */
  if (
    positiveModulo(chunkZ, 9) === 4
  ) {
    return "river-horizontal";
  }

  if (
    positiveModulo(chunkX, 11) === 5
  ) {
    return "river-vertical";
  }

  const tunnelValue =
    positiveModulo(
      chunkX * 7 + chunkZ * 13,
      17
    );

  if (tunnelValue === 3) {
    return "tunnel-north";
  }

  if (tunnelValue === 10) {
    return "tunnel-east";
  }

  return "normal";
}

export function getBuildingSlots(
  specialType: SpecialChunkType
): Placement[] {
  const slots: Placement[] = [
    {
      x: -49,
      z: -49,
      rotationY: Math.PI,
    },
    {
      x: 0,
      z: -49,
      rotationY: Math.PI,
    },
    {
      x: 49,
      z: -49,
      rotationY: Math.PI,
    },

    {
      x: -49,
      z: 0,
      rotationY: -Math.PI / 2,
    },
    {
      x: 49,
      z: 0,
      rotationY: Math.PI / 2,
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
    specialType === "river-horizontal"
  ) {
    return slots.filter(
      (slot) => Math.abs(slot.z) >= 40
    );
  }

  if (
    specialType === "river-vertical"
  ) {
    return slots.filter(
      (slot) => Math.abs(slot.x) >= 40
    );
  }

  if (
    specialType === "tunnel-north"
  ) {
    return slots.filter(
      (slot) =>
        !(
          slot.z < -40 &&
          Math.abs(slot.x) < 18
        )
    );
  }

  if (
    specialType === "tunnel-east"
  ) {
    return slots.filter(
      (slot) =>
        !(
          slot.x > 40 &&
          Math.abs(slot.z) < 18
        )
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
      rotationY: Math.PI,
    },
    {
      x: 44,
      z: 26,
      rotationY: 0,
    },
    {
      x: -5,
      z: 34,
      rotationY: Math.PI,
    },

    {
      x: -34,
      z: -44,
      rotationY: Math.PI / 2,
    },
    {
      x: -26,
      z: 5,
      rotationY: -Math.PI / 2,
    },
    {
      x: 26,
      z: 44,
      rotationY: Math.PI / 2,
    },
    {
      x: 34,
      z: -5,
      rotationY: -Math.PI / 2,
    },
  ];

  if (
    specialType === "river-horizontal"
  ) {
    return slots.filter(
      (slot) => Math.abs(slot.z) > 20
    );
  }

  if (
    specialType === "river-vertical"
  ) {
    return slots.filter(
      (slot) => Math.abs(slot.x) > 20
    );
  }

  return slots;
}
