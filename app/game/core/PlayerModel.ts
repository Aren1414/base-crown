import * as THREE from "three";
import { GLTFLoader } from "@/app/lib/GLTFLoader";
import { animations } from "./Animations";

export const MODEL_URL =
  "https://github.com/Aren1414/base-crown/releases/download/game/Meshy_AI_Frosted_Aurora_biped_Character_output.glb";

export async function loadPlayerModel(scene: THREE.Scene) {
  const loader = new GLTFLoader();
  const playerGroup = new THREE.Group();
  scene.add(playerGroup);

  const mixer = new THREE.AnimationMixer(playerGroup);

  // TS-safe action map
  const actions: Record<keyof typeof animations | string, THREE.AnimationAction | undefined> = {};
  let currentAction: THREE.AnimationAction | null = null;

  const playAction = (key: keyof typeof animations | string) => {
    const action = actions[key];
    if (!action) return;
    if (currentAction) currentAction.fadeOut(0.1);
    action.reset().fadeIn(0.1).play();
    currentAction = action;
  };

  const loadAnim = (url: string) =>
    new Promise<THREE.AnimationClip | null>((resolve) => {
      loader.load(
        url,
        (gltf: any) => resolve(gltf.animations?.[0] ?? null),
        undefined,
        () => resolve(null)
      );
    });

  // Load main model
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

  // Load animations (TS-safe)
  const animKeys = Object.keys(animations) as (keyof typeof animations)[];

  const clips = await Promise.all(
    animKeys.map((k) => loadAnim(animations[k]))
  );

  clips.forEach((clip, i) => {
    if (!clip) return;
    const key = animKeys[i];
    actions[key] = mixer.clipAction(clip);
  });

  playAction("idle");

  return { playerGroup, mixer, playAction };
}
