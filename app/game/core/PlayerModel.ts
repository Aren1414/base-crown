import * as THREE from "three";
import { GLTFLoader } from "@/app/lib/GLTFLoader";

export const MODEL_URL = "/models/org_models.glb";

type ActionsMap = {
  [key: string]: THREE.AnimationAction;
};

export async function loadPlayerModel(scene: THREE.Scene) {
  const loader = new GLTFLoader();
  const playerGroup = new THREE.Group();
  scene.add(playerGroup);

  const mixer = new THREE.AnimationMixer(playerGroup);
  const actions: ActionsMap = {};

  const gltf = await new Promise<any>((resolve, reject) => {
    loader.load(MODEL_URL, resolve, undefined, reject);
  });

  const model = gltf.scene;
  model.scale.set(0.02, 0.02, 0.02);
  model.position.set(0, 0, 0);
  model.rotation.y = Math.PI;

  model.traverse((obj: any) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  playerGroup.add(model);

  const loadAnim = async (file: string, name: string) => {
    const animGltf = await new Promise<any>((resolve, reject) => {
      loader.load(`/models/${file}`, resolve, undefined, reject);
    });
    const clip = animGltf.animations[0];
    const action = mixer.clipAction(clip);
    action.setLoop(THREE.LoopRepeat, Infinity);
    actions[name] = action;
  };

  await loadAnim("Breathing Idle.glb", "idle");
  await loadAnim("Catwalk Walk Forward Arc 90L.glb", "walk");
  await loadAnim("Running.glb", "run");
  await loadAnim("Combo Punch.glb", "punch");
  await loadAnim("Mma Kick.glb", "kick");
  await loadAnim("Jumping.glb", "jump");
  await loadAnim("Death.glb", "death");
  await loadAnim("Landing.glb", "landing");

  let current: THREE.AnimationAction | null = actions["idle"];
  if (current) current.play();

  const playAction = (key: string) => {
    const next = actions[key] || actions["idle"];
    if (!next) return;
    if (current === next) return;
    if (current) {
      current.crossFadeTo(next, 0.2, false);
    }
    next.play();
    current = next;
  };

  return { playerGroup, mixer, playAction };
}
