import * as THREE from "three";

import {
  ALLEY_WIDTH,
  CITY_CHUNK_SIZE,
  MAIN_ROAD_WIDTH,
  type RandomFunction,
  type SpecialChunkType,
  randomRange,
  pick,
} from "./CityConfig";

type SurfaceMaterials = {
  ground: THREE.MeshStandardMaterial;
  road: THREE.MeshStandardMaterial;
  alley: THREE.MeshStandardMaterial;
};

function clampColor(value: number): number {
  return Math.max(
    0,
    Math.min(255, Math.round(value))
  );
}

function createProceduralTexture(
  random: RandomFunction,
  type: "ground" | "road" | "alley"
): THREE.CanvasTexture {
  const size = 256;

  const canvas =
    document.createElement("canvas");

  canvas.width = size;
  canvas.height = size;

  const context =
    canvas.getContext("2d");

  if (!context) {
    throw new Error(
      "Unable to create city surface texture."
    );
  }

  const imageData =
    context.createImageData(size, size);

  let baseR = 64;
  let baseG = 65;
  let baseB = 54;

  if (type === "road") {
    baseR = 47;
    baseG = 49;
    baseB = 46;
  }

  if (type === "alley") {
    baseR = 56;
    baseG = 57;
    baseB = 50;
  }

  for (
    let index = 0;
    index < imageData.data.length;
    index += 4
  ) {
    const noise =
      randomRange(random, -10, 10);

    const warmNoise =
      randomRange(random, -4, 4);

    imageData.data[index] =
      clampColor(
        baseR + noise + warmNoise
      );

    imageData.data[index + 1] =
      clampColor(
        baseG + noise
      );

    imageData.data[index + 2] =
      clampColor(
        baseB +
          noise -
          warmNoise * 0.5
      );

    imageData.data[index + 3] = 255;
  }

  context.putImageData(
    imageData,
    0,
    0
  );

  /*
   * لکه‌های خاک، رطوبت و گیاه روی بافت
   * رسم می‌شوند و دیگر Polygonهای بزرگ و سبز
   * روی زمین دیده نمی‌شوند.
   */
  const patchCount =
    type === "ground" ? 42 : 26;

  for (
    let index = 0;
    index < patchCount;
    index++
  ) {
    const x = random() * size;
    const y = random() * size;

    const radiusX =
      randomRange(random, 5, 24);

    const radiusY =
      randomRange(random, 3, 16);

    const greenPatch =
      random() < 0.52;

    context.save();

    context.translate(x, y);

    context.rotate(
      random() * Math.PI * 2
    );

    if (greenPatch) {
      context.fillStyle =
        type === "road"
          ? "rgba(55, 69, 45, 0.09)"
          : "rgba(58, 76, 46, 0.15)";
    } else {
      context.fillStyle =
        type === "road"
          ? "rgba(76, 65, 49, 0.09)"
          : "rgba(82, 68, 48, 0.14)";
    }

    context.beginPath();

    context.ellipse(
      0,
      0,
      radiusX,
      radiusY,
      0,
      0,
      Math.PI * 2
    );

    context.fill();
    context.restore();
  }

  /*
   * ترک‌های ظریف داخل خود Texture قرار می‌گیرند.
   * در نتیجه دیگر خطوط سیاه بزرگ و مصنوعی نداریم.
   */
  const crackCount =
    type === "ground" ? 18 : 32;

  context.lineCap = "round";
  context.lineJoin = "round";

  for (
    let index = 0;
    index < crackCount;
    index++
  ) {
    let x = random() * size;
    let y = random() * size;

    context.beginPath();
    context.moveTo(x, y);

    const segmentCount =
      2 + Math.floor(random() * 5);

    for (
      let segment = 0;
      segment < segmentCount;
      segment++
    ) {
      x += randomRange(
        random,
        -8,
        8
      );

      y += randomRange(
        random,
        -8,
        8
      );

      context.lineTo(x, y);
    }

    context.strokeStyle =
      type === "road"
        ? "rgba(15, 17, 14, 0.42)"
        : "rgba(21, 23, 18, 0.3)";

    context.lineWidth =
      randomRange(random, 0.35, 1.1);

    context.stroke();

    if (
      type === "road" &&
      random() < 0.35
    ) {
      context.strokeStyle =
        "rgba(95, 92, 75, 0.12)";

      context.lineWidth = 0.4;
      context.stroke();
    }
  }

  /*
   * دانه‌های ریز برای جلوگیری از سطح صاف و پلاستیکی.
   */
  for (
    let index = 0;
    index < 1400;
    index++
  ) {
    const alpha =
      randomRange(random, 0.015, 0.07);

    context.fillStyle =
      random() < 0.5
        ? `rgba(10, 12, 9, ${alpha})`
        : `rgba(140, 130, 102, ${alpha})`;

    context.fillRect(
      random() * size,
      random() * size,
      randomRange(random, 0.4, 1.4),
      randomRange(random, 0.4, 1.4)
    );
  }

  const texture =
    new THREE.CanvasTexture(canvas);

  texture.wrapS =
    THREE.RepeatWrapping;

  texture.wrapT =
    THREE.RepeatWrapping;

  texture.colorSpace =
    THREE.SRGBColorSpace;

  texture.anisotropy = 2;

  texture.needsUpdate = true;

  texture.userData.chunkOwned = true;

  return texture;
}

function createSurfaceMaterials(
  random: RandomFunction
): SurfaceMaterials {
  const groundTexture =
    createProceduralTexture(
      random,
      "ground"
    );

  groundTexture.repeat.set(5, 5);

  const roadTexture =
    createProceduralTexture(
      random,
      "road"
    );

  roadTexture.repeat.set(5, 1);

  const alleyTexture =
    createProceduralTexture(
      random,
      "alley"
    );

  alleyTexture.repeat.set(4, 1);

  const ground =
    new THREE.MeshStandardMaterial({
      color: 0xb8b3a0,
      map: groundTexture,
      roughness: 1,
      metalness: 0,
    });

  const road =
    new THREE.MeshStandardMaterial({
      color: 0xaaa99d,
      map: roadTexture,
      roughness: 0.96,
      metalness: 0,
    });

  const alley =
    new THREE.MeshStandardMaterial({
      color: 0xaaa89b,
      map: alleyTexture,
      roughness: 1,
      metalness: 0,
    });

  ground.userData.chunkOwned = true;
  road.userData.chunkOwned = true;
  alley.userData.chunkOwned = true;

  return {
    ground,
    road,
    alley,
  };
}

function createSurface(
  width: number,
  depth: number,
  material: THREE.Material,
  x: number,
  z: number,
  y: number
): THREE.Mesh {
  const geometry =
    new THREE.PlaneGeometry(
      width,
      depth
    );

  geometry.userData.chunkOwned = true;

  const mesh =
    new THREE.Mesh(
      geometry,
      material
    );

  mesh.rotation.x =
    -Math.PI / 2;

  mesh.position.set(x, y, z);

  mesh.receiveShadow = true;

  return mesh;
}

function addGround(
  chunk: THREE.Group,
  material: THREE.Material
): void {
  const ground =
    createSurface(
      CITY_CHUNK_SIZE,
      CITY_CHUNK_SIZE,
      material,
      0,
      0,
      0
    );

  ground.name =
    "ProceduralCityGround";

  chunk.add(ground);
}

function addNormalRoads(
  chunk: THREE.Group,
  material: THREE.Material
): void {
  for (const z of [-30, 30]) {
    const road =
      createSurface(
        CITY_CHUNK_SIZE,
        MAIN_ROAD_WIDTH,
        material,
        0,
        z,
        0.035
      );

    road.name =
      "ProceduralMainRoad";

    chunk.add(road);
  }

  for (const x of [-30, 30]) {
    const road =
      createSurface(
        MAIN_ROAD_WIDTH,
        CITY_CHUNK_SIZE,
        material,
        x,
        0,
        0.04
      );

    road.name =
      "ProceduralMainRoad";

    chunk.add(road);
  }
}

function addRiverRoads(
  chunk: THREE.Group,
  material: THREE.Material,
  specialType: SpecialChunkType
): void {
  if (
    specialType === "river-horizontal"
  ) {
    for (const x of [-30, 30]) {
      chunk.add(
        createSurface(
          MAIN_ROAD_WIDTH,
          CITY_CHUNK_SIZE,
          material,
          x,
          0,
          0.04
        )
      );
    }

    for (const z of [-38, 38]) {
      chunk.add(
        createSurface(
          CITY_CHUNK_SIZE,
          MAIN_ROAD_WIDTH,
          material,
          0,
          z,
          0.035
        )
      );
    }

    return;
  }

  for (const z of [-30, 30]) {
    chunk.add(
      createSurface(
        CITY_CHUNK_SIZE,
        MAIN_ROAD_WIDTH,
        material,
        0,
        z,
        0.035
      )
    );
  }

  for (const x of [-38, 38]) {
    chunk.add(
      createSurface(
        MAIN_ROAD_WIDTH,
        CITY_CHUNK_SIZE,
        material,
        x,
        0,
        0.04
      )
    );
  }
}

function addRoads(
  chunk: THREE.Group,
  material: THREE.Material,
  specialType: SpecialChunkType
): void {
  if (
    specialType === "river-horizontal" ||
    specialType === "river-vertical"
  ) {
    addRiverRoads(
      chunk,
      material,
      specialType
    );

    return;
  }

  addNormalRoads(
    chunk,
    material
  );
}

function addAlleys(
  chunk: THREE.Group,
  material: THREE.Material,
  specialType: SpecialChunkType
): void {
  const horizontalAlleys = [
    {
      x: 0,
      z: -49,
      width: CITY_CHUNK_SIZE,
      depth: ALLEY_WIDTH,
    },
    {
      x: 0,
      z: 49,
      width: CITY_CHUNK_SIZE,
      depth: ALLEY_WIDTH,
    },
    {
      x: 0,
      z: 0,
      width: CITY_CHUNK_SIZE,
      depth: ALLEY_WIDTH,
    },
  ];

  const verticalAlleys = [
    {
      x: -49,
      z: 0,
      width: ALLEY_WIDTH,
      depth: CITY_CHUNK_SIZE,
    },
    {
      x: 49,
      z: 0,
      width: ALLEY_WIDTH,
      depth: CITY_CHUNK_SIZE,
    },
    {
      x: 0,
      z: 0,
      width: ALLEY_WIDTH,
      depth: CITY_CHUNK_SIZE,
    },
  ];

  for (const alley of horizontalAlleys) {
    if (
      specialType === "river-horizontal" &&
      Math.abs(alley.z) < 10
    ) {
      continue;
    }

    chunk.add(
      createSurface(
        alley.width,
        alley.depth,
        material,
        alley.x,
        alley.z,
        0.052
      )
    );
  }

  for (const alley of verticalAlleys) {
    if (
      specialType === "river-vertical" &&
      Math.abs(alley.x) < 10
    ) {
      continue;
    }

    chunk.add(
      createSurface(
        alley.width,
        alley.depth,
        material,
        alley.x,
        alley.z,
        0.055
      )
    );
  }
}

function addRoadMarkings(
  chunk: THREE.Group,
  random: RandomFunction,
  specialType: SpecialChunkType
): void {
  const geometry =
    new THREE.PlaneGeometry(
      4.8,
      0.18
    );

  geometry.userData.chunkOwned = true;

  const material =
    new THREE.MeshBasicMaterial({
      color: 0xa59d72,
      transparent: true,
      opacity: 0.3,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    });

  material.userData.chunkOwned = true;

  const horizontalRoads =
    specialType === "river-horizontal"
      ? [-38, 38]
      : [-30, 30];

  const verticalRoads =
    specialType === "river-vertical"
      ? [-38, 38]
      : [-30, 30];

  for (const roadZ of horizontalRoads) {
    for (
      let x = -54;
      x <= 54;
      x += 10
    ) {
      if (random() < 0.3) {
        continue;
      }

      const marking =
        new THREE.Mesh(
          geometry,
          material
        );

      marking.rotation.x =
        -Math.PI / 2;

      marking.rotation.z =
        randomRange(
          random,
          -0.025,
          0.025
        );

      marking.position.set(
        x,
        0.073,
        roadZ
      );

      chunk.add(marking);
    }
  }

  for (const roadX of verticalRoads) {
    for (
      let z = -54;
      z <= 54;
      z += 10
    ) {
      if (random() < 0.3) {
        continue;
      }

      const marking =
        new THREE.Mesh(
          geometry,
          material
        );

      marking.rotation.x =
        -Math.PI / 2;

      marking.rotation.z =
        Math.PI / 2 +
        randomRange(
          random,
          -0.025,
          0.025
        );

      marking.position.set(
        roadX,
        0.074,
        z
      );

      chunk.add(marking);
    }
  }
}

function addSmallDebris(
  chunk: THREE.Group,
  random: RandomFunction
): void {
  const geometry =
    new THREE.PlaneGeometry(1, 1);

  geometry.userData.chunkOwned = true;

  const materials = [
    new THREE.MeshBasicMaterial({
      color: 0x463f32,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
    }),
    new THREE.MeshBasicMaterial({
      color: 0x384434,
      transparent: true,
      opacity: 0.2,
      depthWrite: false,
    }),
  ];

  for (const material of materials) {
    material.userData.chunkOwned = true;
  }

  for (
    let index = 0;
    index < 18;
    index++
  ) {
    const debris =
      new THREE.Mesh(
        geometry,
        pick(materials, random)
      );

    debris.rotation.x =
      -Math.PI / 2;

    debris.rotation.z =
      random() * Math.PI * 2;

    debris.scale.set(
      randomRange(random, 0.25, 1.2),
      randomRange(random, 0.15, 0.7),
      1
    );

    debris.position.set(
      randomRange(random, -58, 58),
      0.077,
      randomRange(random, -58, 58)
    );

    chunk.add(debris);
  }
}

export function createCitySurface(
  chunk: THREE.Group,
  random: RandomFunction,
  specialType: SpecialChunkType
): void {
  const materials =
    createSurfaceMaterials(random);

  addGround(
    chunk,
    materials.ground
  );

  addRoads(
    chunk,
    materials.road,
    specialType
  );

  addAlleys(
    chunk,
    materials.alley,
    specialType
  );

  addRoadMarkings(
    chunk,
    random,
    specialType
  );

  addSmallDebris(
    chunk,
    random
  );
    }
