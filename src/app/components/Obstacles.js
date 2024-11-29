import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Export global barriers array
export const barriers = [];
export const LANE_OFFSETS = [-3, 1, 5]; // Lane positions for alignment
export const MAX_BARRIERS = 10;
export const MIN_BARRIER_SPACING = 25; // Minimum Z spacing between barriers

// Use an object to track lastBarrierZ
export const barrierState = {
  lastBarrierZ: -40, // Track the last Z position for proper spacing
};

/**
 * Initializes barriers in the scene.
 * @param {THREE.Scene} scene - The Three.js scene object.
 */
export function initObstacles(scene) {
  const loader = new GLTFLoader();

  for (let i = 0; i < MAX_BARRIERS; i++) {
    loader.load(
      '/items/barrier.glb',
      (gltf) => {
        const barrier = gltf.scene;

        // Assign barrier to a random lane
        const laneIndex = Math.floor(Math.random() * LANE_OFFSETS.length);
        const laneX = LANE_OFFSETS[laneIndex];

        // Set initial position and scale
        barrier.position.set(
          laneX, 
          0.5, 
          barrierState.lastBarrierZ
        );
        barrier.scale.set(2, 2, 2);

        // Enable shadows
        barrier.traverse((node) => {
          if (node.isMesh) {
            node.castShadow = true;
            node.receiveShadow = true;
          }
        });

        // Add to the scene and array
        scene.add(barrier);
        barriers.push(barrier);

        // Update Z position for the next barrier
        barrierState.lastBarrierZ -= MIN_BARRIER_SPACING;
      },
      undefined,
      (error) => {
        console.error('Error loading barrier model:', error);
      }
    );
  }
}

/**
 * Updates barriers' positions and handles recycling logic.
 * @param {THREE.Scene} scene - The Three.js scene object.
 * @param {THREE.Object3D} player - The player object.
 * @param {Object} gameState - The current game state.
 * @param {Function} onCollision - Callback for collision detection.
 */
export function updateObstacles(scene, player, gameState, onCollision) {
  if (!player) {
    console.warn('Player is not initialized. Skipping obstacles update.');
    return;
  }

  const speed = gameState.speed * 2;

  barriers.forEach((barrier) => {
    // Move barriers forward
    barrier.position.z += speed;

    // Recycle barriers that move out of view
    if (barrier.position.z > 10) {
      const laneIndex = Math.floor(Math.random() * LANE_OFFSETS.length);
      barrier.position.x = LANE_OFFSETS[laneIndex];
      barrier.position.z = barrierState.lastBarrierZ - MIN_BARRIER_SPACING;
      barrierState.lastBarrierZ -= MIN_BARRIER_SPACING; // Update within the barrierState object
    }

    // Collision detection with properly scaled bounding boxes
    try {
      // Adjusted player bounding box
      const playerHeight = 1.5; // Player height
      const playerBox = new THREE.Box3(
        new THREE.Vector3(
          player.position.x - 0.5, // Adjust width
          player.position.y, // Bottom of player
          player.position.z - 0.5 // Depth
        ),
        new THREE.Vector3(
          player.position.x + 0.5, // Adjust width
          player.position.y + playerHeight, // Top of player
          player.position.z + 0.5 // Depth
        )
      );

      // Adjusted barrier bounding box
      const barrierHeight = 0.5; // Barrier height
      const barrierBox = new THREE.Box3(
        new THREE.Vector3(
          barrier.position.x - 1, // Slightly larger width for alignment
          barrier.position.y, // Bottom of barrier
          barrier.position.z - 1 // Depth
        ),
        new THREE.Vector3(
          barrier.position.x + 0.5, // Slightly larger width for alignment
          barrier.position.y + barrierHeight, // Top of barrier
          barrier.position.z + 0.7 // Depth
        )
      );

      // Check if bounding boxes intersect
      if (playerBox.intersectsBox(barrierBox)) {
        console.log('Collision detected!');
        onCollision(); // Trigger collision callback
      }
    } catch (error) {
      console.error('Error during collision detection:', error);
    }
  });
}
