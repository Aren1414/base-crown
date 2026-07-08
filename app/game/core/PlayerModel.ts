import * as THREE from "three";
import { GLTFLoader } from "@/app/lib/GLTFLoader";

export const MODEL_URL = "/models/org_models.glb";

export async function loadPlayerModel(scene: THREE.Scene) {
  const loader = new GLTFLoader();
  const playerGroup = new THREE.Group();
  scene.add(playerGroup);

  // Mixer فقط برای سازگاری با کد اصلی
  const mixer = new THREE.AnimationMixer(playerGroup);

  // اکشن خنثی چون انیمیشن نداریم
  const playAction = () => {};

  // Load main model (local file)
  const gltf = await new Promise<any>((resolve, reject) => {
    loader.load(MODEL_URL, resolve, undefined, reject);
  });

  const model = gltf.scene;

  // Scale / Position / Rotation
  model.scale.set(0.02, 0.02, 0.02);
  model.position.set(0, 0, 0);
  model.rotation.y = Math.PI;

  // Shadows
  model.traverse((obj: any) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  playerGroup.add(model);

  return { playerGroup, mixer, playAction };
}
