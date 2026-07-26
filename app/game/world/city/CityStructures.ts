import * as THREE from "three";

import {
  URBAN_BUILDINGS,
  URBAN_VEHICLES,
} from "../../assets/Models";

import {
  spawnModel,
  type SpawnedModel,
} from "../AssetLoader";

import {
  BUILDING_SIZE,
  CAR_SIZE,
  MOTORCYCLE_SIZE,
  VILLA_SIZE,
  type SpecialChunkType,
  collectSpawnedModels,
  getBuildingSlots,
  getCycledItem,
  getVehicleSlots,
  isMotorcycle,
  isVilla,
} from "./CityConfig";

export async function spawnCityBuildings(
  chunk: THREE.Group,
  chunkX: number,
  chunkZ: number,
  specialType: SpecialChunkType,
  colliders: THREE.Box3[],
  occluders: THREE.Mesh[]
): Promise<void> {
  const slots =
    getBuildingSlots(specialType);

  const jobs: Promise<
    SpawnedModel | null
  >[] = slots.map(
    (slot, slotIndex) => {
      const building =
        getCycledItem(
          URBAN_BUILDINGS,
          chunkX,
          chunkZ,
          slotIndex
        );

      const villa =
        isVilla(building);

      return spawnModel(
        building,
        chunk,
        {
          x: slot.x,
          y: 0.08,
          z: slot.z,

          rotationY:
            slot.rotationY,

          targetFootprint:
            villa
              ? VILLA_SIZE
              : BUILDING_SIZE,

          maxHeight:
            villa ? 15 : 32,

          verticalMode: "ground",

          colliderMode: "mesh",

          colliderPadding:
            villa ? 0.14 : 0.18,

          castShadow: true,
          receiveShadow: true,
          cameraOccluder: true,
        }
      );
    }
  );

  const results =
    await Promise.allSettled(jobs);

  collectSpawnedModels(
    results,
    colliders,
    occluders
  );
}

export async function spawnCityVehicles(
  chunk: THREE.Group,
  chunkX: number,
  chunkZ: number,
  specialType: SpecialChunkType,
  colliders: THREE.Box3[],
  occluders: THREE.Mesh[]
): Promise<void> {
  /*
   * چهار خودرو در هر Chunk کافی است.
   * انتخاب چرخشی باعث می‌شود تمام مدل‌های خودرو
   * در Chunkهای مختلف استفاده شوند.
   */
  const slots =
    getVehicleSlots(specialType)
      .slice(0, 4);

  const jobs: Promise<
    SpawnedModel | null
  >[] = slots.map(
    (slot, slotIndex) => {
      const vehicle =
        getCycledItem(
          URBAN_VEHICLES,
          chunkX,
          chunkZ,
          slotIndex
        );

      const motorcycle =
        isMotorcycle(vehicle);

      return spawnModel(
        vehicle,
        chunk,
        {
          x: slot.x,

          y: motorcycle
            ? 0.12
            : 0.08,

          z: slot.z,

          rotationY:
            slot.rotationY,

          rotationZ:
            motorcycle
              ? Math.PI / 2
              : 0,

          targetFootprint:
            motorcycle
              ? MOTORCYCLE_SIZE
              : CAR_SIZE,

          maxHeight:
            motorcycle ? 2 : 3.5,

          verticalMode: "ground",

          colliderMode: "mesh",

          colliderPadding: 0.08,

          castShadow: true,
          receiveShadow: true,
          cameraOccluder: true,
        }
      );
    }
  );

  const results =
    await Promise.allSettled(jobs);

  collectSpawnedModels(
    results,
    colliders,
    occluders
  );
          }
