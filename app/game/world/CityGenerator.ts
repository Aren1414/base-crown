import * as THREE from "three";

import {
  CITY_CHUNK_SIZE,
  type CityGenerationResult,
  createRandom,
  getSpecialChunkType,
} from "./city/CityConfig";

import {
  createCitySurface,
} from "./city/CitySurface";

import {
  spawnCityBuildings,
  spawnCityVehicles,
} from "./city/CityStructures";

import {
  spawnRiverAndBridges,
  spawnTunnel,
} from "./city/CitySpecialZones";

import {
  spawnCityVegetation,
} from "./city/CityVegetation";

export {
  CITY_CHUNK_SIZE,
};

export async function generateCity(
  chunk: THREE.Group,
  chunkX: number,
  chunkZ: number
): Promise<CityGenerationResult> {
  const surfaceRandom =
    createRandom(
      chunkX,
      chunkZ,
      11
    );

  const vegetationRandom =
    createRandom(
      chunkX,
      chunkZ,
      29
    );

  const specialType =
    getSpecialChunkType(
      chunkX,
      chunkZ
    );

  const colliders:
    THREE.Box3[] = [];

  const occluders:
    THREE.Mesh[] = [];

  /*
   * خیابان، کوچه و اتصال آن‌ها با کد ساخته می‌شود.
   * مدل‌های URBAN_STREETS و URBAN_ALLEYS استفاده
   * نمی‌شوند.
   */
  createCitySurface(
    chunk,
    surfaceRandom,
    specialType
  );

  await Promise.all([
    spawnCityBuildings(
      chunk,
      chunkX,
      chunkZ,
      specialType,
      colliders,
      occluders
    ),

    spawnCityVehicles(
      chunk,
      chunkX,
      chunkZ,
      specialType,
      colliders,
      occluders
    ),

    spawnRiverAndBridges(
      chunk,
      chunkX,
      chunkZ,
      specialType,
      colliders,
      occluders
    ),

    spawnTunnel(
      chunk,
      specialType,
      colliders,
      occluders
    ),

    spawnCityVegetation(
      chunk,
      chunkX,
      chunkZ,
      vegetationRandom,
      specialType,
      colliders,
      occluders
    ),
  ]);

  return {
    colliders,
    occluders,
  };
}
