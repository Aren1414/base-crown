export type ModelDef = {
  url: string;
  scale: number;
  radius: number;
};

const BASE_URL = "https://pub-15ed8100c073408287949c0bebad27a6.r2.dev";

/* ---------------- Streets ---------------- */

export const URBAN_STREETS: ModelDef[] = [
  {
    url: `${BASE_URL}/streets/Street1.glb`,
    scale: 7.5,
    radius: 15,
  },
  {
    url: `${BASE_URL}/streets/Street2.glb`,
    scale: 7.5,
    radius: 15,
  },
  {
    url: `${BASE_URL}/streets/Street3.glb`,
    scale: 7.5,
    radius: 15,
  },
];

/* ---------------- Alleys ---------------- */

export const URBAN_ALLEYS: ModelDef[] = [
  {
    url: `${BASE_URL}/alleys/Alley1.glb`,
    scale: 7.5,
    radius: 12,
  },
  {
    url: `${BASE_URL}/alleys/Alley2.glb`,
    scale: 7.5,
    radius: 12,
  },
  {
    url: `${BASE_URL}/alleys/Alley3.glb`,
    scale: 7.5,
    radius: 12,
  },
  {
    url: `${BASE_URL}/Connecting_alley_and_street/Connecting_alley_and_street.glb`,
    scale: 7.5,
    radius: 12,
  },
];

/* ---------------- Buildings ---------------- */

export const URBAN_BUILDINGS: ModelDef[] = [

  {
    url: `${BASE_URL}/Buildings/Urban_building1.glb`,
    scale: 4.8,
    radius: 10,
  },

  {
    url: `${BASE_URL}/Buildings/Urban_building2.glb`,
    scale: 5.1,
    radius: 10,
  },

  {
    url: `${BASE_URL}/Buildings/Urban_building3.glb`,
    scale: 5.4,
    radius: 11,
  },

  {
    url: `${BASE_URL}/Buildings/Urban_building4.glb`,
    scale: 5.8,
    radius: 11,
  },

  {
    url: `${BASE_URL}/Buildings/Urban_building5.glb`,
    scale: 6.0,
    radius: 12,
  },

  {
    url: `${BASE_URL}/Buildings/Urban_building6.glb`,
    scale: 6.2,
    radius: 12,
  },

  {
    url: `${BASE_URL}/Buildings/Urban_building7.glb`,
    scale: 6.5,
    radius: 13,
  },

  {
    url: `${BASE_URL}/Buildings/Urban_building8.glb`,
    scale: 6.8,
    radius: 13,
  },

  {
    url: `${BASE_URL}/Buildings/Urban_building9.glb`,
    scale: 7.0,
    radius: 14,
  },

  {
    url: `${BASE_URL}/Buildings/Urban_building10.glb`,
    scale: 7.2,
    radius: 14,
  },

  {
    url: `${BASE_URL}/Buildings/Urban_building11.glb`,
    scale: 7.4,
    radius: 15,
  },

  {
    url: `${BASE_URL}/Buildings/Villa_house1.glb`,
    scale: 3.6,
    radius: 8,
  },

  {
    url: `${BASE_URL}/Buildings/Villa_house2.glb`,
    scale: 3.8,
    radius: 8,
  },

  {
    url: `${BASE_URL}/Buildings/Villa_house3.glb`,
    scale: 4.0,
    radius: 8,
  },

];

/* ---------------- Vehicles ---------------- */

export const URBAN_VEHICLES: ModelDef[] = [

  {
    url: `${BASE_URL}/vehicles/Ambulance_car.glb`,
    scale: 3,
    radius: 2,
  },

  {
    url: `${BASE_URL}/vehicles/Motorcycle.glb`,
    scale: 2,
    radius: 1,
  },

  {
    url: `${BASE_URL}/vehicles/Pickup_truck.glb`,
    scale: 3,
    radius: 2,
  },

  {
    url: `${BASE_URL}/vehicles/Police_car.glb`,
    scale: 3,
    radius: 2,
  },

  {
    url: `${BASE_URL}/vehicles/Sports_car1.glb`,
    scale: 3,
    radius: 2,
  },

  {
    url: `${BASE_URL}/vehicles/Sports_car2.glb`,
    scale: 3,
    radius: 2,
  },

  {
    url: `${BASE_URL}/vehicles/Sports_car3.glb`,
    scale: 3,
    radius: 2,
  },

  {
    url: `${BASE_URL}/vehicles/Van_car.glb`,
    scale: 3.3,
    radius: 2.2,
  },

];

/* ---------------- Tunnel ---------------- */

export const URBAN_TUNNEL: ModelDef[] = [

  {
    url: `${BASE_URL}/Tunnel/Tunnel.glb`,
    scale: 6,
    radius: 18,
  },

  {
    url: `${BASE_URL}/Tunnel/Tunnel_wall1.glb`,
    scale: 6,
    radius: 18,
  },

  {
    url: `${BASE_URL}/Tunnel/Tunnel_wall2.glb`,
    scale: 6,
    radius: 18,
  },

  {
    url: `${BASE_URL}/Tunnel/Tunnel_wall3.glb`,
    scale: 6,
    radius: 18,
  },

  {
    url: `${BASE_URL}/Tunnel/Tunnel_wall4.glb`,
    scale: 6,
    radius: 18,
  },

];

/* ---------------- Bridges ---------------- */

export const URBAN_BRIDGES: ModelDef[] = [

  {
    url: `${BASE_URL}/Bridges/Crescent_Bridge.glb`,
    scale: 6.5,
    radius: 20,
  },

  {
    url: `${BASE_URL}/Bridges/Stone_bridge.glb`,
    scale: 6.5,
    radius: 20,
  },

  {
    url: `${BASE_URL}/Bridges/Urban_bridge1.glb`,
    scale: 6.5,
    radius: 20,
  },

  {
    url: `${BASE_URL}/Bridges/Urban_bridge2.glb`,
    scale: 6.5,
    radius: 20,
  },

];

/* ---------------- River ---------------- */

export const URBAN_RIVER: ModelDef[] = [

  {
    url: `${BASE_URL}/river/River.glb`,
    scale: 6.5,
    radius: 25,
  },

];

/* ---------------- Forest ---------------- */

export const FOREST_TREES = [
`${BASE_URL}/Plants_and_trees/glTF/BirchTree_1.gltf`,
`${BASE_URL}/Plants_and_trees/glTF/BirchTree_2.gltf`,
`${BASE_URL}/Plants_and_trees/glTF/BirchTree_3.gltf`,
`${BASE_URL}/Plants_and_trees/glTF/BirchTree_4.gltf`,
`${BASE_URL}/Plants_and_trees/glTF/BirchTree_5.gltf`,
`${BASE_URL}/Plants_and_trees/glTF/MapleTree_1.gltf`,
`${BASE_URL}/Plants_and_trees/glTF/MapleTree_2.gltf`,
`${BASE_URL}/Plants_and_trees/glTF/MapleTree_3.gltf`,
`${BASE_URL}/Plants_and_trees/glTF/MapleTree_4.gltf`,
`${BASE_URL}/Plants_and_trees/glTF/MapleTree_5.gltf`,
`${BASE_URL}/Plants_and_trees/glTF/DeadTree_1.gltf`,
`${BASE_URL}/Plants_and_trees/glTF/DeadTree_2.gltf`,
`${BASE_URL}/Plants_and_trees/glTF/DeadTree_3.gltf`,
`${BASE_URL}/Plants_and_trees/glTF/DeadTree_4.gltf`,
`${BASE_URL}/Plants_and_trees/glTF/DeadTree_5.gltf`,
`${BASE_URL}/Plants_and_trees/glTF/DeadTree_6.gltf`,
`${BASE_URL}/Plants_and_trees/glTF/DeadTree_7.gltf`,
`${BASE_URL}/Plants_and_trees/glTF/DeadTree_8.gltf`,
`${BASE_URL}/Plants_and_trees/glTF/DeadTree_9.gltf`,
`${BASE_URL}/Plants_and_trees/glTF/DeadTree_10.gltf`,
];

export const FOREST_BUSHES = [
`${BASE_URL}/Plants_and_trees/glTF/Bush.gltf`,
`${BASE_URL}/Plants_and_trees/glTF/Bush_Small.gltf`,
`${BASE_URL}/Plants_and_trees/glTF/Bush_Large.gltf`,
`${BASE_URL}/Plants_and_trees/glTF/Bush_Flowers.gltf`,
`${BASE_URL}/Plants_and_trees/glTF/Bush_Large_Flowers.gltf`,
`${BASE_URL}/Plants_and_trees/glTF/Bush_Small_Flowers.gltf`,
];

export const FOREST_GRASS = [
`${BASE_URL}/Plants_and_trees/glTF/Grass_Large.gltf`,
`${BASE_URL}/Plants_and_trees/glTF/Grass_Large_Extruded.gltf`,
`${BASE_URL}/Plants_and_trees/glTF/Grass_Small.gltf`,
];

export const FOREST_FLOWERS = [
`${BASE_URL}/Plants_and_trees/glTF/Flower_1.gltf`,
`${BASE_URL}/Plants_and_trees/glTF/Flower_1_Clump.gltf`,
`${BASE_URL}/Plants_and_trees/glTF/Flower_2.gltf`,
`${BASE_URL}/Plants_and_trees/glTF/Flower_2_Clump.gltf`,
`${BASE_URL}/Plants_and_trees/glTF/Flower_3_Clump.gltf`,
`${BASE_URL}/Plants_and_trees/glTF/Flower_4_Clump.gltf`,
`${BASE_URL}/Plants_and_trees/glTF/Flower_5_Clump.gltf`,
];
