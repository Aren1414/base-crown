import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export const MODEL_URL = "/models/modeling1.glb";

type ActionType = "punch" | "kick" | "jump";

const IDLE_URL = "/models/Breathing Idle.glb";
const WALK_URL = "/models/Walk.glb";
const RUN_URL = "/models/Running.glb";
const VISUAL_ROOT_NAME = "PlayerVisualRoot";
const JUMP_HEIGHT = 1.05;

export async function loadPlayerModel(scene: THREE.Scene) {
  const loader = new GLTFLoader();

  const [modelResult, idleResult, walkResult, runResult] = await Promise.all([
    loader.loadAsync(MODEL_URL),
    loader.loadAsync(IDLE_URL),
    loader.loadAsync(WALK_URL),
    loader.loadAsync(RUN_URL),
  ]);

  const player = new THREE.Group();
  const visualRoot = new THREE.Group();
  const model = modelResult.scene;

  player.name = "Player";
  visualRoot.name = VISUAL_ROOT_NAME;
  model.position.set(0, 0, 0);
  visualRoot.add(model);
  player.add(visualRoot);
  player.scale.setScalar(1.6);
  scene.add(player);

  const mixer = new THREE.AnimationMixer(player);
  const availableTargets = new Set<string>();

  player.traverse((object) => {
    if (object.name) availableTargets.add(object.name);
  });

  const getTargetName = (trackName: string) => {
    const separatorIndex = trackName.indexOf(".");
    return separatorIndex === -1
      ? trackName
      : trackName.slice(0, separatorIndex);
  };

  const prepareClip = (
    source: THREE.AnimationClip,
    type?: ActionType
  ): THREE.AnimationClip => {
    const clip = source.clone();

    clip.tracks = clip.tracks
      .filter((track) => {
        const targetName = getTargetName(track.name);
        return !targetName || availableTargets.has(targetName);
      })
      .map((track) => {
        if (
          !(track instanceof THREE.VectorKeyframeTrack) ||
          !track.name.endsWith(".position")
        ) {
          return track;
        }

        const targetName = getTargetName(track.name);

        if (!/(hips|root|pelvis)/i.test(targetName)) {
          return track;
        }

        const cleanedTrack = track.clone();
        const values = cleanedTrack.values;

        if (values.length < 3) return cleanedTrack;

        const initialX = values[0];
        const initialZ = values[2];

        for (let index = 0; index < values.length; index += 3) {
          values[index] = initialX;
          values[index + 2] = initialZ;
        }

        return cleanedTrack;
      });

    if (type === "jump") {
      const duration = Math.max(clip.duration, 0.6);

      clip.tracks.push(
        new THREE.NumberKeyframeTrack(
          `${VISUAL_ROOT_NAME}.position[y]`,
          [0, duration * 0.42, duration],
          [0, JUMP_HEIGHT, 0],
          THREE.InterpolateSmooth
        )
      );
    }

    clip.resetDuration();
    return clip;
  };

  const getClip = (
    result: typeof idleResult,
    url: string,
    type?: ActionType
  ) => {
    const sourceClip = result.animations[0];

    if (!sourceClip) {
      throw new Error(`No animation found in ${url}`);
    }

    return prepareClip(sourceClip, type);
  };

  const idleAction = mixer.clipAction(getClip(idleResult, IDLE_URL));
  const walkAction = mixer.clipAction(getClip(walkResult, WALK_URL));
  const runAction = mixer.clipAction(getClip(runResult, RUN_URL));

  idleAction.setLoop(THREE.LoopRepeat, Infinity);
  walkAction.setLoop(THREE.LoopRepeat, Infinity);
  runAction.setLoop(THREE.LoopRepeat, Infinity);

  idleAction
    .setEffectiveWeight(1)
    .setEffectiveTimeScale(1)
    .play();

  walkAction.setEffectiveTimeScale(1);
  runAction.setEffectiveTimeScale(1.12);

  let currentAction = idleAction;
  let activeOneShot: THREE.AnimationAction | null = null;
  let latestRequestId = 0;

  const oneShotCache = new Map<
    string,
    Promise<THREE.AnimationAction>
  >();

  const detectActionType = (
    file: string,
    providedType?: ActionType
  ): ActionType => {
    if (providedType) return providedType;

    const normalizedFile = file.toLowerCase();

    if (normalizedFile.includes("jump")) return "jump";

    if (
      normalizedFile.includes("kick") ||
      normalizedFile.includes("leg")
    ) {
      return "kick";
    }

    return "punch";
  };

  const loadOneShotAction = (
    file: string,
    type: ActionType
  ): Promise<THREE.AnimationAction> => {
    const cacheKey = `${type}:${file}`;
    const cachedAction = oneShotCache.get(cacheKey);

    if (cachedAction) return cachedAction;

    const actionPromise = loader
      .loadAsync(`/models/${file}`)
      .then((result) => {
        const clip = getClip(result, `/models/${file}`, type);
        const action = mixer.clipAction(clip);

        action.setLoop(THREE.LoopOnce, 1);
        action.clampWhenFinished = true;
        action.enabled = true;

        return action;
      })
      .catch((error) => {
        oneShotCache.delete(cacheKey);
        throw error;
      });

    oneShotCache.set(cacheKey, actionPromise);
    return actionPromise;
  };

  const setMoveBySpeed = (movementSpeed: number) => {
    let targetAction = idleAction;

    if (movementSpeed >= 0.6) {
      targetAction = runAction;
    } else if (movementSpeed > 0.1) {
      targetAction = walkAction;
    }

    if (targetAction === currentAction) return;

    targetAction
      .reset()
      .setEffectiveWeight(1)
      .setEffectiveTimeScale(
        targetAction === runAction ? 1.12 : 1
      )
      .play();

    currentAction.crossFadeTo(targetAction, 0.18, true);
    currentAction = targetAction;
  };

  const restoreMovementAnimation = () => {
    currentAction.setEffectiveWeight(1);
    visualRoot.position.y = 0;
    activeOneShot = null;
  };

  mixer.addEventListener("finished", (event) => {
    const finishedAction = (
      event as { action: THREE.AnimationAction }
    ).action;

    if (finishedAction !== activeOneShot) return;

    finishedAction.stop();
    restoreMovementAnimation();
  });

  const playAnimOnce = async (
    file: string,
    providedType?: ActionType
  ) => {
    const requestId = ++latestRequestId;
    const type = detectActionType(file, providedType);

    try {
      const action = await loadOneShotAction(file, type);

      if (requestId !== latestRequestId) return;

      if (activeOneShot && activeOneShot !== action) {
        activeOneShot.stop();
      }

      visualRoot.position.y = 0;
      activeOneShot = action;
      currentAction.setEffectiveWeight(
        type === "jump" ? 0.35 : 0.55
      );

      action
        .reset()
        .setEffectiveWeight(1)
        .setEffectiveTimeScale(1)
        .play();
    } catch (error) {
      console.error(`Failed to load animation ${file}:`, error);
      restoreMovementAnimation();
    }
  };

  return {
    player,
    mixer,
    setMoveBySpeed,
    playAnimOnce,
  };
}
