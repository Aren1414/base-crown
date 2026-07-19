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

    if (targetAction !== currentAction) {
      targetAction.reset();
      targetAction.enabled = true;
      currentAction.crossFadeTo(targetAction, 0.2, false);
      targetAction.play();
      currentAction = targetAction;
    }
  };

  // 🔥 مشت/لگد بدون قطع شدن راه رفتن/دویدن
  const playAnimOnce = async (file: string) => {
    const anim = await loader.loadAsync(`/models/${file}`);
    const clip = removeRootMotion(anim.animations[0]);

    // فقط استخوان‌های دست را نگه می‌داریم
    clip.tracks = clip.tracks.filter(track => {
      const name = track.name.toLowerCase();
      return (
        name.includes("arm") ||
        name.includes("hand") ||
        name.includes("shoulder")
      );
    });

    const temp = mixer.clipAction(clip);

    temp.setLoop(THREE.LoopOnce, 1);
    temp.clampWhenFinished = true;
    temp.enabled = true;

    // اجرای مشت روی لایهٔ بالاتر
    temp.weight = 1.0;
    temp.play();

    const duration = clip.duration * 1000;

    setTimeout(() => {
      temp.stop();
      temp.enabled = false;
    }, Math.min(duration, 2500));
  };

  return { player, mixer, setMoveBySpeed, playAnimOnce };
}
