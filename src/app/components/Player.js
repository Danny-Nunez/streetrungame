// Player.js
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

let mixer = null;
let animations = {};
let currentAnimation = null;
let player = null;

/**
 * Initializes the player with a GLB model.
 * @param {THREE.Scene} scene - The scene to add the player to.
 * @returns {Promise<Object>} - A promise that resolves to the player object, its update function, mixer, and playAnimation function.
 */
export function initPlayer(scene) {
  const loader = new GLTFLoader();

  return new Promise((resolve, reject) => {
    loader.load(
      '/items/cartoonboyanimated.glb',
      (gltf) => {
        player = gltf.scene;

        // Set player properties
        player.position.set(0, 0, 0);
        player.scale.set(2, 2, 2);
        player.rotation.y = Math.PI;

        // Add shadows
        player.traverse((node) => {
          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
          }
        });

        // Initialize `userData`
        player.userData = {
          velocity: { x: 0, y: 0, z: 0 },
          isJumping: false,
          isSliding: false,
        };

        // Initialize animation mixer and load animations
        mixer = new THREE.AnimationMixer(player);
        gltf.animations.forEach((clip) => {
          animations[clip.name.toLowerCase()] = mixer.clipAction(clip);
          console.log(`Loaded animation: ${clip.name}`);
        });

        // Define playAnimation function inside initPlayer
        const playAnimationFunc = (name) => {
          if (!animations[name]) {
            console.warn(`Animation "${name}" not found.`);
            return;
          }

          if (currentAnimation) {
            console.log(`Stopping animation: ${currentAnimation._clip.name}`);
            currentAnimation.stop();
          }

          currentAnimation = animations[name];
          currentAnimation.reset().play();
          console.log(`Playing animation: ${name}`);
        };

        // Start with running animation
        playAnimationFunc('run'); // ✅ Called after definition

        // Add player to scene
        scene.add(player);
        console.log('Player added with animations.');

        // Define playerUpdate function
        const playerUpdate = (delta, gameState) => {
          if (!player) return;

          // Lane movement
          const targetX = gameState.currentLane * gameState.laneDistance;
          player.position.x += (targetX - player.position.x) * 0.1;

          // Gravity and jumping logic
          if (gameState.isJumping) {
            player.userData.velocity.y += gameState.gravity;
            player.position.y += player.userData.velocity.y;

            if (player.position.y <= 0) {
              player.position.y = 0;
              gameState.isJumping = false;
              player.userData.velocity.y = 0;
              playAnimationFunc('run');
            }
          }

          // Update animation mixer
          if (mixer) mixer.update(delta);
        };

        // Resolve the promise with necessary references
        resolve({ playerUpdate, player, mixer, playAnimation: playAnimationFunc });
      },
      undefined,
      (error) => {
        console.error('Error loading player model:', error);
        reject(error);
      }
    );
  });
}


