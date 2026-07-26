import * as THREE from "three";

import {
  URBAN_BRIDGES,
  URBAN_RIVER,
  URBAN_TUNNEL,
} from "../../assets/Models";

import {
  spawnModel,
  type SpawnedModel,
} from "../AssetLoader";

import {
  CITY_CHUNK_SIZE,
  type SpecialChunkType,
  collectSpawnedModels,
  positiveModulo,
} from "./CityConfig";

export async function spawnRiverAndBridges(
  chunk: THREE.Group,
  chunkX: number,
  chunkZ: number,
  specialType: SpecialChunkType,
  colliders: THREE.Box3[],
  occluders: THREE.Mesh[]
): Promise<void> {
  if (
    specialType !== "river-horizontal" &&
    specialType !== "river-vertical"
  ) {
    return;
  }

  const horizontal =
    specialType === "river-horizontal";

  const river =
    URBAN_RIVER[0];

  const bridgeStartIndex =
    positiveModulo(
      chunkX * 5 + chunkZ * 7,
      URBAN_BRIDGES.length
    );

  const riverJob =
    spawnModel(
      river,
      chunk,
      {
        x: 0,
        y: 0.025,
        z: 0,

        rotationY:
          horizontal
            ? Math.PI / 2
            : 0,

        targetFootprint:
          CITY_CHUNK_SIZE,

        maxHeight: 5,

        verticalMode:
          "center-surface",

        colliderMode: "none",

        castShadow: false,
        receiveShadow: true,
        cameraOccluder: false,
      }
    );

  const positions = horizontal
    ? [
        {
          x: -30,
          z: 0,
          rotationY: 0,
        },
        {
          x: 30,
          z: 0,
          rotationY: 0,
        },
      ]
    : [
        {
          x: 0,
          z: -30,
          rotationY: Math.PI / 2,
        },
        {
          x: 0,
          z: 30,
          rotationY: Math.PI / 2,
        },
      ];

  const bridgeJobs: Promise<
    SpawnedModel | null
  >[] = positions.map(
    (position, index) =>
      spawnModel(
        URBAN_BRIDGES[
          positiveModulo(
            bridgeStartIndex + index,
            URBAN_BRIDGES.length
          )
        ],
        chunk,
        {
          x: position.x,
          y: 0.09,
          z: position.z,

          rotationY:
            position.rotationY,

          targetFootprint: 19,
          maxHeight: 8,

          verticalMode: "ground",

          /*
           * Collider کامل پل ممکن است مسیر عبور را
           * مسدود کند.
           */
          colliderMode: "none",

          castShadow: true,
          receiveShadow: true,
          cameraOccluder: true,
        }
      )
  );

  const [
    riverResults,
    bridgeResults,
  ] = await Promise.all([
    Promise.allSettled([
      riverJob,
    ]),
    Promise.allSettled(
      bridgeJobs
    ),
  ]);

  collectSpawnedModels(
    riverResults,
    colliders,
    occluders
  );

  collectSpawnedModels(
    bridgeResults,
    colliders,
    occluders
  );
}

export async function spawnTunnel(
  chunk: THREE.Group,
  specialType: SpecialChunkType,
  colliders: THREE.Box3[],
  occluders: THREE.Mesh[]
): Promise<void> {
  if (
    specialType !== "tunnel-north" &&
    specialType !== "tunnel-east"
  ) {
    return;
  }

  const horizontal =
    specialType === "tunnel-east";

  const tunnelX =
    horizontal ? 48 : 0;

  const tunnelZ =
    horizontal ? 0 : -48;

  const rotationY =
    horizontal
      ? Math.PI / 2
      : 0;

  const jobs: Promise<
    SpawnedModel | null
  >[] = URBAN_TUNNEL.map(
    (part, index) => {
      const mainTunnel =
        index === 0;

      let offsetX = 0;
      let offsetZ = 0;

      if (!mainTunnel) {
        const wallOffset =
          (index - 2.5) * 7;

        if (horizontal) {
          offsetX = wallOffset;
        } else {
          offsetZ = wallOffset;
        }
      }

      return spawnModel(
        part,
        chunk,
        {
          x: tunnelX + offsetX,
          y: 0.08,
          z: tunnelZ + offsetZ,

          rotationY,

          targetFootprint:
            mainTunnel ? 26 : 15,

          maxHeight:
            mainTunnel ? 15 : 12,

          verticalMode: "ground",

          /*
           * خود ورودی تونل Collider ندارد تا ورودی
           * مسدود نشود. دیواره‌ها Collider دارند.
           */
          colliderMode:
            mainTunnel
              ? "none"
              : "mesh",

          colliderPadding: 0.06,

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
