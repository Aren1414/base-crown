import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export const MODEL_URL = "/models/modeling1.glb";

export async function loadPlayerModel(scene: THREE.Scene) {
  const loader = new GLTFLoader();

  const glbModel = await loader.loadAsync(MODEL_URL);
  const player = glbModel.scene;

  player.traverse((obj) => {
    if (obj instanceof THREE.Mesh && (obj.material as any)?.map) {
      const mat = obj.material as any;
      const map = mat.map as THREE.Texture;
      map.generateMipmaps = true;
      map.minFilter = THREE.LinearMipmapLinearFilter;
      map.magFilter = THREE.LinearFilter;
      map.needsUpdate = true;
    }
  });

  player.scale.set(1.6, 1.6, 1.6);
  player.position.set(0, -0.3, 0);
  player.rotation.y = 0;
  scene.add(player);

  const mixer = new THREE.AnimationMixer(player);

  const idleAnim = await loader.loadAsync("/models/Breathing Idle.glb");
  const idleAction = mixer.clipAction(idleAnim.animations[0]);
  idleAction.setLoop(THREE.LoopRepeat, Infinity);
  idleAction.play();

  const walkAnim = await loader.loadAsync(
    "/models/Catwalk Walk Forward Arc 90L.glb"
  );
  const walkAction = mixer.clipAction(walkAnim.animations[0]);
  walkAction.setLoop(THREE.LoopRepeat, Infinity);

  const runAnim = await loader.loadAsync("/models/Running.glb");
  const runAction = mixer.clipAction(runAnim.animations[0]);
  runAction.setLoop(THREE.LoopRepeat, Infinity);

  let currentAction: THREE.AnimationAction | null = idleAction;

  const setMoveBySpeed = (movementSpeed: number) => {
    let targetAction: THREE.AnimationAction | null = idleAction;
    if (movementSpeed > 0.1 && movementSpeed < 0.6) {
      targetAction = walkAction;
    } else if (movementSpeed >= 0.6) {
      targetAction = runAction;
    }

    if (targetAction && targetAction !== currentAction) {
      currentAction?.crossFadeTo(targetAction, 0.2, false);
      targetAction.play();
      currentAction = targetAction;
    }
  };

  const playAnimOnce = async (file: string) => {
    if (!mixer || !currentAction) return;
    const anim = await loader.loadAsync(`/models/${file}`);
    const temp = mixer.clipAction(anim.animations[0]);
    temp.setLoop(THREE.LoopOnce, 1);
    temp.clampWhenFinished = true;
    currentAction.crossFadeTo(temp, 0.15, false);
    temp.play();
    const duration = anim.animations[0].duration * 1000;
    setTimeout(() => {
      temp.crossFadeTo(currentAction!, 0.15, false);
      currentAction!.play();
    }, Math.min(duration, 2500));
  };

  return { player, mixer, setMoveBySpeed, playAnimOnce };
}
