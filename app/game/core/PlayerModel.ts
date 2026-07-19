import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export const MODEL_URL = "/models/modeling1.glb";

export async function loadPlayerModel(scene: THREE.Scene) {
  const loader = new GLTFLoader();

  const glbModel = await loader.loadAsync(MODEL_URL);
  const player = glbModel.scene;

  player.scale.set(1.6, 1.6, 1.6);
  player.position.set(0, -0.3, 0);

  scene.add(player);

  const mixer = new THREE.AnimationMixer(player);

  // حذف Root Motion
  const removeRootMotion = (clip: THREE.AnimationClip) => {
    clip.tracks = clip.tracks.filter(track => {
      return !track.name.endsWith(".position");
    });
    return clip;
  };

  // Idle
  const idleAnim = await loader.loadAsync("/models/Breathing Idle.glb");
  const idleClip = removeRootMotion(idleAnim.animations[0]);
  const idleAction = mixer.clipAction(idleClip);
  idleAction.setLoop(THREE.LoopRepeat, Infinity);
  idleAction.enabled = true;
  idleAction.play();

  // Walk
  const walkAnim = await loader.loadAsync("/models/Walk.glb");
  const walkClip = removeRootMotion(walkAnim.animations[0]);
  const walkAction = mixer.clipAction(walkClip);
  walkAction.setLoop(THREE.LoopRepeat, Infinity);
  walkAction.enabled = true;

  // Run
  const runAnim = await loader.loadAsync("/models/Running.glb");
  const runClip = removeRootMotion(runAnim.animations[0]);
  const runAction = mixer.clipAction(runClip);
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

    // 🔥 همیشه reset کن تا از فریم ۰ شروع بشه
    if (targetAction !== currentAction) {
      targetAction.reset();
      currentAction.crossFadeTo(targetAction, 0.2, false);
      targetAction.play();
      currentAction = targetAction;
    }

    // 🔥 اگر دوباره همون اکشن انتخاب شد، باید دوباره فعال بشه
    if (!currentAction.isRunning()) {
      currentAction.reset();
      currentAction.play();
    }
  };

  const playAnimOnce = async (file: string) => {
    const anim = await loader.loadAsync(`/models/${file}`);
    const clip = removeRootMotion(anim.animations[0]);

    const temp = mixer.clipAction(clip);
    temp.setLoop(THREE.LoopOnce, 1);
    temp.clampWhenFinished = true;
    temp.enabled = true;

    currentAction.crossFadeTo(temp, 0.15, false);
    temp.reset();
    temp.play();

    const duration = clip.duration * 1000;

    setTimeout(() => {
      currentAction.reset();
      currentAction.play();
    }, Math.min(duration, 2500));
  };

  return { player, mixer, setMoveBySpeed, playAnimOnce };
}
