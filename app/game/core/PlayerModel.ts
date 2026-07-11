import * as THREE from "three";
import { GLTFLoader } from "@/app/lib/GLTFLoader";

export const MODEL_URL = "/models/modeling1.glb";

export async function loadPlayerModel(scene: THREE.Scene) {
  const loader = new GLTFLoader();
  const playerGroup = new THREE.Group();
  scene.add(playerGroup);

  const mixer = new THREE.AnimationMixer(playerGroup);
  const actions: Record<string, THREE.AnimationAction> = {};

  const gltf = await new Promise<any>((resolve, reject) => {
    loader.load(MODEL_URL, resolve, undefined, reject);
  });

  const model = gltf.scene;
  model.scale.set(1.6, 1.6, 1.6);
  model.position.set(0, -0.3, 0);
  model.rotation.y = Math.PI;

  model.traverse((obj: any) => {
    if (obj.isMesh) {
      obj.castShadow = true;
      obj.receiveShadow = true;
    }
  });

  playerGroup.add(model);

  const loadAnim = async (file: string, name: string, once = false) => {
    const animGltf = await new Promise<any>((resolve, reject) => {
      loader.load(`/models/${file}`, resolve, undefined, reject);
    });
    const clip = animGltf.animations[0];
    const action = mixer.clipAction(clip);
    action.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, once ? 1 : Infinity);
    action.clampWhenFinished = once;
    actions[name] = action;
  };

  await loadAnim("Breathing Idle.glb", "idle");
  await loadAnim("Catwalk Walk Forward Arc 90L.glb", "walk");
  await loadAnim("Running.glb", "run");
  await loadAnim("Combo Punch.glb", "punch", true);
  await loadAnim("Mma Kick.glb", "kick", true);
  await loadAnim("Jumping.glb", "jump", true);
  await loadAnim("Death.glb", "death", true);
  await loadAnim("Landing.glb", "landing", true);

  let current = actions["idle"];
  current.play();

  const playAction = (key: string) => {
    const next = actions[key] || actions["idle"];
    if (current === next) return;
    current.crossFadeTo(next, 0.2, false);
    next.reset().play();
    current = next;
  };

  const setMoveBySpeed = (speed: number) => {
    let target = actions["idle"];
    if (speed > 0.1 && speed < 0.6) target = actions["walk"];
    else if (speed >= 0.6) target = actions["run"];
    if (current === target) return;
    current.crossFadeTo(target, 0.2, false);
    target.play();
    current = target;
  };

  return { playerGroup, mixer, playAction, setMoveBySpeed };
}
