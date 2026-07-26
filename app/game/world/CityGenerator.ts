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

type CityGenerationTask = {
  name: string;
  run: () => Promise<void>;
};

function isChunkDestroyed(
  chunk: THREE.Group
): boolean {
  return (
    chunk.userData.destroyed ===
    true
  );
}

function prepareChunkMetadata(
  chunk: THREE.Group,
  chunkX: number,
  chunkZ: number,
  specialType: ReturnType<
    typeof getSpecialChunkType
  >
): void {
  chunk.userData.chunkX =
    chunkX;

  chunk.userData.chunkZ =
    chunkZ;

  chunk.userData.specialType =
    specialType;

  chunk.userData.cityGenerated =
    false;

  chunk.userData.cityGenerating =
    true;
}

function finishChunkMetadata(
  chunk: THREE.Group,
  success: boolean
): void {
  chunk.userData.cityGenerating =
    false;

  chunk.userData.cityGenerated =
    success;
}

function removeDetachedResults(
  colliders: THREE.Box3[],
  occluders: THREE.Mesh[]
): void {
  colliders.length = 0;

  for (
    let index =
      occluders.length - 1;
    index >= 0;
    index--
  ) {
    const mesh =
      occluders[index];

    if (!mesh.parent) {
      occluders.splice(
        index,
        1
      );
    }
  }
}

async function runGenerationTasks(
  chunk: THREE.Group,
  tasks: CityGenerationTask[]
): Promise<void> {
  const results =
    await Promise.allSettled(
      tasks.map(
        async ({
          run,
        }) => {
          if (
            isChunkDestroyed(
              chunk
            )
          ) {
            return;
          }

          await run();
        }
      )
    );

  for (
    let index = 0;
    index < results.length;
    index++
  ) {
    const result =
      results[index];

    if (
      result.status ===
      "fulfilled"
    ) {
      continue;
    }

    console.error(
      `Failed to generate city section "${tasks[index].name}":`,
      result.reason
    );
  }
}

export async function generateCity(
  chunk: THREE.Group,
  chunkX: number,
  chunkZ: number
): Promise<CityGenerationResult> {
  const colliders:
    THREE.Box3[] = [];

  const occluders:
    THREE.Mesh[] = [];

  if (
    isChunkDestroyed(chunk)
  ) {
    return {
      colliders,
      occluders,
    };
  }

  const specialType =
    getSpecialChunkType(
      chunkX,
      chunkZ
    );

  prepareChunkMetadata(
    chunk,
    chunkX,
    chunkZ,
    specialType
  );

  /*
   * هر بخش شهر Random جداگانه دارد تا تغییر تعداد
   * آبجکت‌های یک سیستم، چیدمان سیستم‌های دیگر را
   * تغییر ندهد.
   */
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

  try {
    /*
     * ابتدا سطح پایه شهر ساخته می‌شود تا خیابان‌ها،
     * کوچه‌ها، پیاده‌روها، پارک‌ها و اطلاعات سطوح
     * قابل‌راه‌رفتن پیش از مدل‌های سه‌بعدی آماده باشند.
     *
     * مدل‌های URBAN_STREETS و URBAN_ALLEYS در این بخش
     * استفاده نمی‌شوند و سطح خیابان‌ها با Geometry
     * ساخته می‌شود.
     */
    createCitySurface(
      chunk,
      surfaceRandom,
      specialType
    );

    if (
      isChunkDestroyed(chunk)
    ) {
      finishChunkMetadata(
        chunk,
        false
      );

      return {
        colliders: [],
        occluders: [],
      };
    }

    /*
     * منطقه‌های ویژه ابتدا ساخته می‌شوند تا پل، رودخانه،
     * رمپ، تونل و دیواره‌های تونل پیش از سایر مدل‌ها
     * داخل Chunk قرار بگیرند.
     */
    await runGenerationTasks(
      chunk,
      [
        {
          name:
            "river-and-bridges",

          run: () =>
            spawnRiverAndBridges(
              chunk,
              chunkX,
              chunkZ,
              specialType,
              colliders,
              occluders
            ),
        },

        {
          name: "tunnel",

          run: () =>
            spawnTunnel(
              chunk,
              specialType,
              colliders,
              occluders
            ),
        },
      ]
    );

    if (
      isChunkDestroyed(chunk)
    ) {
      finishChunkMetadata(
        chunk,
        false
      );

      return {
        colliders: [],
        occluders: [],
      };
    }

    /*
     * ساختمان‌ها، وسایل نقلیه و پوشش گیاهی می‌توانند
     * هم‌زمان بارگذاری شوند. هر سیستم Seed مستقل دارد
     * و Collider و Occluderهای خود را در آرایه‌های
     * مشترک ثبت می‌کند.
     */
    await runGenerationTasks(
      chunk,
      [
        {
          name: "buildings",

          run: () =>
            spawnCityBuildings(
              chunk,
              chunkX,
              chunkZ,
              specialType,
              colliders,
              occluders
            ),
        },

        {
          name: "vehicles",

          run: () =>
            spawnCityVehicles(
              chunk,
              chunkX,
              chunkZ,
              specialType,
              colliders,
              occluders
            ),
        },

        {
          name: "vegetation",

          run: () =>
            spawnCityVegetation(
              chunk,
              chunkX,
              chunkZ,
              vegetationRandom,
              specialType,
              colliders,
              occluders
            ),
        },
      ]
    );

    if (
      isChunkDestroyed(chunk)
    ) {
      finishChunkMetadata(
        chunk,
        false
      );

      return {
        colliders: [],
        occluders: [],
      };
    }

    /*
     * اگر مدلی هنگام بارگذاری حذف شده باشد، Meshهای
     * جداشده نباید در فهرست Occlusion باقی بمانند.
     */
    removeDetachedResults(
      colliders,
      occluders
    );

    chunk.updateMatrixWorld(
      true
    );

    finishChunkMetadata(
      chunk,
      true
    );

    return {
      colliders,
      occluders,
    };
  } catch (error) {
    finishChunkMetadata(
      chunk,
      false
    );

    console.error(
      `Failed to generate city chunk ${chunkX},${chunkZ}:`,
      error
    );

    /*
     * بخش‌هایی که تا قبل از خطا ساخته شده‌اند حفظ
     * می‌شوند تا کل Chunk به‌خاطر خطای یک قسمت از
     * بین نرود.
     */
    removeDetachedResults(
      colliders,
      occluders
    );

    return {
      colliders,
      occluders,
    };
  }
    }
