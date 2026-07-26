import * as THREE from "three";

import {
  FOREST_BUSHES,
  FOREST_FLOWERS,
  FOREST_GRASS,
  FOREST_TREES,
} from "../../assets/Models";

import {
  spawnModel,
  type SpawnedModel,
} from "../AssetLoader";

import {
  type RandomFunction,
  type SpecialChunkType,
  collectSpawnedModels,
  getCycledItem,
  modelFromUrl,
  pick,
  randomRange,
} from "./CityConfig";

function isInsideRiverArea(
  x: number,
  z: number,
  specialType: SpecialChunkType
): boolean {
  if (
    specialType === "river-horizontal"
  ) {
    return Math.abs(z) < 14;
  }

  if (
    specialType === "river-vertical"
  ) {
    return Math.abs(x) < 14;
  }

  return false;
}

function isInsideTunnelArea(
  x: number,
  z: number,
  specialType: SpecialChunkType
): boolean {
  if (
    specialType === "tunnel-north"
  ) {
    return (
      z < -34 &&
      Math.abs(x) < 20
    );
  }

  if (
    specialType === "tunnel-east"
  ) {
    return (
      x > 34 &&
      Math.abs(z) < 20
    );
  }

  return false;
}

function createVegetationPosition(
  random: RandomFunction,
  specialType: SpecialChunkType
): {
  x: number;
  z: number;
} {
  for (
    let attempt = 0;
    attempt < 24;
    attempt++
  ) {
    const zone =
      Math.floor(random() * 4);

    let x =
      randomRange(
        random,
        -57,
        57
      );

    let z =
      randomRange(
        random,
        -57,
        57
      );

    if (zone === 0) {
      x = pick(
        [-55, -42, 42, 55],
        random
      );
    } else if (zone === 1) {
      z = pick(
        [-55, -42, 42, 55],
        random
      );
    } else if (zone === 2) {
      x = pick(
        [-20, 20, -40, 40],
        random
      );
    } else {
      z = pick(
        [-20, 20, -40, 40],
        random
      );
    }

    if (
      isInsideRiverArea(
        x,
        z,
        specialType
      )
    ) {
      continue;
    }

    if (
      isInsideTunnelArea(
        x,
        z,
        specialType
      )
    ) {
      continue;
    }

    return {
      x,
      z,
    };
  }

  return {
    x: 53,
    z: 53,
  };
}

export async function spawnCityVegetation(
  chunk: THREE.Group,
  chunkX: number,
  chunkZ: number,
  random: RandomFunction,
  specialType: SpecialChunkType,
  colliders: THREE.Box3[],
  occluders: THREE.Mesh[]
): Promise<void> {
  const treeJobs: Promise<
    SpawnedModel | null
  >[] = [];

  for (
    let index = 0;
    index < 6;
    index++
  ) {
    const position =
      createVegetationPosition(
        random,
        specialType
      );

    treeJobs.push(
      spawnModel(
        modelFromUrl(
          getCycledItem(
            FOREST_TREES,
            chunkX,
            chunkZ,
            index
          )
        ),
        chunk,
        {
          x: position.x,
          y: 0.07,
          z: position.z,

          rotationY:
            random() *
            Math.PI *
            2,

          targetFootprint:
            randomRange(
              random,
              3.8,
              5.2
            ),

          maxHeight:
            randomRange(
              random,
              9,
              15
            ),

          verticalMode: "ground",
          colliderMode: "mesh",
          colliderPadding: 0.18,

          castShadow: true,
          receiveShadow: true,
          cameraOccluder: true,
        }
      )
    );
  }

  const bushJobs: Promise<
    SpawnedModel | null
  >[] = [];

  for (
    let index = 0;
    index < 4;
    index++
  ) {
    const position =
      createVegetationPosition(
        random,
        specialType
      );

    bushJobs.push(
      spawnModel(
        modelFromUrl(
          getCycledItem(
            FOREST_BUSHES,
            chunkX,
            chunkZ,
            index
          )
        ),
        chunk,
        {
          x: position.x,
          y: 0.065,
          z: position.z,

          rotationY:
            random() *
            Math.PI *
            2,

          targetFootprint:
            randomRange(
              random,
              1.3,
              2.4
            ),

          maxHeight: 3,

          verticalMode: "ground",
          colliderMode: "none",

          castShadow: true,
          receiveShadow: true,
          cameraOccluder: false,
        }
      )
    );
  }

  const decorationJobs: Promise<
    SpawnedModel | null
  >[] = [];

  const decorations = [
    ...FOREST_GRASS,
    ...FOREST_FLOWERS,
  ];

  for (
    let index = 0;
    index < 8;
    index++
  ) {
    const position =
      createVegetationPosition(
        random,
        specialType
      );

    decorationJobs.push(
      spawnModel(
        modelFromUrl(
          getCycledItem(
            decorations,
            chunkX,
            chunkZ,
            index
          )
        ),
        chunk,
        {
          x: position.x,
          y: 0.075,
          z: position.z,

          rotationY:
            random() *
            Math.PI *
            2,

          targetFootprint:
            randomRange(
              random,
              0.5,
              1.25
            ),

          maxHeight: 1.5,

          verticalMode: "ground",
          colliderMode: "none",

          castShadow: false,
          receiveShadow: true,
          cameraOccluder: false,
        }
      )
    );
  }

  const [
    treeResults,
    bushResults,
    decorationResults,
  ] = await Promise.all([
    Promise.allSettled(
      treeJobs
    ),
    Promise.allSettled(
      bushJobs
    ),
    Promise.allSettled(
      decorationJobs
    ),
  ]);

  collectSpawnedModels(
    treeResults,
    colliders,
    occluders
  );

  collectSpawnedModels(
    bushResults,
    colliders,
    occluders
  );

  collectSpawnedModels(
    decorationResults,
    colliders,
    occluders
  );
        }
