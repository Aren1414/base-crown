import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export const MODEL_URL = "/models/modeling1.glb";

export async function loadPlayerModel(scene: THREE.Scene) {
  const loader = new GLTFLoader();

  const glbModel = await loader.loadAsync(MODEL_URL);
  const player = glbModel.scene;

  player.scale.set(1.6, 1.6, 1.6);
  player.position.set(0, -0.3, 0);

  // 🔥 حذف کامل Root Motion
  player.traverse(obj => {
    if (obj.isBone && obj.name.toLowerCase().includes("root")) {
      obj.position.set(0, 0, 0);
    }
  });

  scene.add(player);

  const mixer = new THREE.AnimationMixer(player);

  const idleAnim = await loader.loadAsync("/models/Breathing Idle.glb");
  const idleAction = mixer.clipAction(idleAnim.animations[0]);
  idleAction.setLoop(THREE.LoopRepeat, Infinity);
  idleAction.enabled = true;
  idleAction.play();

  const walkAnim = await loader.loadAsync("/models/Walk.glb");
  const walkAction = mixer.clipAction(walkAnim.animations[0]);
  walkAction.setLoop(THREE.LoopRepeat, Infinity);
  walkAction.enabled = true;

  const runAnim = await loader.loadAsync("/models/Running.glb");
  const runAction = mixer.clipAction(runAnim.animations[0]);
  runAction.setLoop(THREE.LoopRepeat, Infinity);
  runAction.enabled = true;

  let currentAction: THREE.AnimationAction = idleAction;

  const setMoveBySpeed = (movementSpeed: number) => {
    let targetAction = idleAction;

    if (movementSpeed > 0.1 && movementSpeed < 0.6) {
      targetAction = walkAction;
    } else if (movementSpeed >= 0.6) {
      targetAction = runAction;
    }

    if (targetAction !== currentAction) {
      currentAction.crossFadeTo(targetAction, 0.2, false);
      targetAction.reset();
      targetAction.play();
      currentAction = targetAction;
    }
  };

  const playAnimOnce = async (file: string) => {
    const anim = await loader.loadAsync(`/models/${file}`);
    const temp = mixer.clipAction(anim.animations[0]);
    temp.setLoop(THREE.LoopOnce, 1);
    temp.clampWhenFinished = true;
    temp.enabled = true;

    currentAction.crossFadeTo(temp, 0.15, false);
    temp.reset();
    temp.play();

    const duration = anim.animations[0].duration * 1000;

    setTimeout(() => {
      temp.crossFadeTo(currentAction, 0.15, false);
      currentAction.reset();
      currentAction.play();
    }, Math.min(duration, 2500));
  };

  return { player, mixer, setMoveBySpeed, playAnimOnce };
}
