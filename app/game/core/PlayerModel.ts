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
  const removeRootMotion = (clip: THREE.AnimationClip): THREE.AnimationClip => {
    clip.tracks = clip.tracks.filter(
      (track: THREE.KeyframeTrack) => !track.name.endsWith(".position")
    );
    return clip;
  };

  // Idle
  const idleAnim = await loader.loadAsync("/models/Breathing Idle.glb");
  const idleAction = mixer.clipAction(removeRootMotion(idleAnim.animations[0]));
  idleAction.setLoop(THREE.LoopRepeat, Infinity);
  idleAction.enabled = true;
  idleAction.play();

  // Walk
  const walkAnim = await loader.loadAsync("/models/Walk.glb");
  const walkAction = mixer.clipAction(removeRootMotion(walkAnim.animations[0]));
  walkAction.setLoop(THREE.LoopRepeat, Infinity);

  // Run
  const runAnim = await loader.loadAsync("/models/Running.glb");
  const runAction = mixer.clipAction(removeRootMotion(runAnim.animations[0]));
  runAction.setLoop(THREE.LoopRepeat, Infinity);

  let currentAction: THREE.AnimationAction = idleAction;

  // تغییر انیمیشن حرکت
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

  // فیلتر استخوان‌ها برای مشت
  const filterPunchTracks = (clip: THREE.AnimationClip): THREE.AnimationClip => {
    clip.tracks = clip.tracks.filter((track: THREE.KeyframeTrack) => {
      const name = track.name.toLowerCase();
      return (
        name.includes("arm") ||
        name.includes("forearm") ||
        name.includes("hand") ||
        name.includes("shoulder") ||
        name.includes("spine") ||
        name.includes("chest")
      );
    });
    return clip;
  };

  // فیلتر استخوان‌ها برای لگد
  const filterKickTracks = (clip: THREE.AnimationClip): THREE.AnimationClip => {
    clip.tracks = clip.tracks.filter((track: THREE.KeyframeTrack) => {
      const name = track.name.toLowerCase();
      return (
        name.includes("leg") ||
        name.includes("upleg") ||
        name.includes("foot") ||
        name.includes("toe") ||
        name.includes("hips") ||
        name.includes("spine")
      );
    });
    return clip;
  };

  // فیلتر استخوان‌ها برای پرش
  const filterJumpTracks = (clip: THREE.AnimationClip): THREE.AnimationClip => {
    clip.tracks = clip.tracks.filter((track: THREE.KeyframeTrack) => {
      const name = track.name.toLowerCase();
      return (
        name.includes("leg") ||
        name.includes("upleg") ||
        name.includes("foot") ||
        name.includes("hips") ||
        name.includes("spine") ||
        name.includes("chest")
      );
    });
    return clip;
  };

  // اجرای مشت/لگد/پرش بدون قطع شدن حرکت
  const playAnimOnce = async (
    file: string,
    type: "punch" | "kick" | "jump" = "punch"
  ) => {
    const anim = await loader.loadAsync(`/models/${file}`);
    let clip: THREE.AnimationClip = removeRootMotion(anim.animations[0]);

    if (type === "punch") clip = filterPunchTracks(clip);
    if (type === "kick") clip = filterKickTracks(clip);
    if (type === "jump") clip = filterJumpTracks(clip);

    const temp = mixer.clipAction(clip);

    temp.setLoop(THREE.LoopOnce, 1);
    temp.clampWhenFinished = true;
    temp.enabled = true;

    // وزن‌ها
    temp.setEffectiveWeight(1.0);
    currentAction.setEffectiveWeight(0.7);

    temp.reset();
    temp.play();

    const duration = clip.duration * 1000;

    setTimeout(() => {
      temp.stop();
      temp.enabled = false;
      currentAction.setEffectiveWeight(1.0);
    }, Math.min(duration, 2500));
  };

  return { player, mixer, setMoveBySpeed, playAnimOnce };
                                      }
