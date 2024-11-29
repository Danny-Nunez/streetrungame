import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Global coin array
export const coins = [];
let coinSound;

if (typeof window !== 'undefined') {
  // Initialize coinSound on the client side
  coinSound = new Audio('/coin.mp3'); // Ensure the sound file is in the public folder
}

/**
 * Initializes coins in the scene using the `coin.glb` model.
 * @param {THREE.Scene} scene - The Three.js scene object.
 * @param {number} maxCoins - Maximum number of coins.
 */
export function initCoins(scene, maxCoins = 5) {
  const loader = new GLTFLoader();

  for (let i = 0; i < maxCoins; i++) {
    loader.load(
      '/items//coin.glb', // Path to your GLTF/GLB coin file
      (gltf) => {
        const coin = gltf.scene;
        coin.scale.set(0.05, 0.05, 0.05); // Adjust coin size as needed
        coin.position.set(
          (Math.floor(Math.random() * 3) - 1) * 4, // Random lane (-1, 0, 1)
          1.2,                                    // Coin height
          -i * 15 - Math.random() * 10           // Spread coins along the Z-axis
        );
        coin.castShadow = true;
        coin.receiveShadow = true;

        // Add animation mixer for spinning coins if the model has animations
        if (gltf.animations && gltf.animations.length > 0) {
          const mixer = new THREE.AnimationMixer(coin);
          const action = mixer.clipAction(gltf.animations[0]);
          action.play();

          coin.userData.mixer = mixer; // Store mixer for updates
        }

        scene.add(coin);
        coins.push(coin);
      },
      undefined,
      (error) => {
        console.error('Error loading coin model:', error);
      }
    );
  }
}

/**
 * Updates coins' positions, animations, and handles collection logic.
 * @param {THREE.Scene} scene - The Three.js scene object.
 * @param {THREE.Object3D} player - The player object.
 * @param {Object} gameState - The current game state.
 * @param {Function} updateUI - Function to update the game UI.
 * @param {number} delta - Time delta for smooth animations.
 */
export function updateCoins(scene, player, gameState, updateUI, delta) {
  if (!player) {
    // If player is not yet initialized, skip the update
    return;
  }

  coins.forEach((coin) => {
    // Update coin animation if it has a mixer
    if (coin.userData.mixer) {
      coin.userData.mixer.update(delta);
    }

    // Move coins forward
    coin.position.z += gameState.speed * 2;

    // Recycle coins that move out of view
    if (coin.position.z > 10) {
      coin.position.set(
        (Math.floor(Math.random() * 3) - 1) * 4, // Random lane
        1.2,                                    // Reset height
        -50 - Math.random() * 50               // Recycle position far ahead
      );
      coin.visible = true; // Ensure coin is visible
    }

    // Collision detection
    const playerBox = new THREE.Box3().setFromObject(player);
    const coinBox = new THREE.Box3().setFromObject(coin);

    if (playerBox.intersectsBox(coinBox)) {
      // Play coin sound if available
      if (coinSound) {
        coinSound.currentTime = 0; // Reset sound playback
        coinSound.play().catch((error) => {
          console.warn('Error playing coin sound:', error);
        });
      }

      // Increment game state
      gameState.coinCount++;
     

      // Update UI
      updateUI();

      // Recycle coin to a new position ahead of the player
      coin.position.set(
        (Math.floor(Math.random() * 3) - 1) * 4, // Random lane
        1.2,                                    // Reset height
        -50 - Math.random() * 50               // Recycle position far ahead
      );
    }
  });
}
