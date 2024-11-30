// ./src/app/components/GameCanvas.js

'use client'; // Enable client-side rendering for Next.js

import * as THREE from 'three';
import { useRouter } from 'next/navigation'; // Correct import for App Router
import { useEffect, useRef, useState } from 'react';
import { initPlayer } from './Player'; // Note: initPlayer is now async
import { initEnvironment, updateEnvironment } from './Environment';
import { useGesture } from '@use-gesture/react';

import { 
  initObstacles, 
  updateObstacles, 
  barriers, 
  MIN_BARRIER_SPACING, 
  barrierState, 
  LANE_OFFSETS 
} from './Obstacles'; // Import obstacles
import { initCoins, updateCoins, coins } from './Coins'; // Import coins
import UI from './UI';

// Helper function to dispose of meshes
function disposeObject(obj) {
  obj.traverse((child) => {
    if (child.isMesh) {
      if (child.geometry) child.geometry.dispose();

      if (child.material) {
        if (Array.isArray(child.material)) {
          child.material.forEach((material) => material.dispose());
        } else {
          child.material.dispose();
        }
      }
    }
  });
}

export default function GameCanvas() {
  const canvasRef = useRef();
  const playerRef = useRef(null); // Reference to player object
  const playerUpdateRef = useRef(null); // Reference to player update function
  const playAnimationRef = useRef(null); // Reference to playAnimation function
  const gameStateRef = useRef(null);
  const gameActiveRef = useRef(true); // UseRef to track gameActive state
  const isRollingRef = useRef(false); // Define isRollingRef
  const audioRef = useRef(null);
  const router = useRouter(); // Use Next.js router from 'next/navigation'

  // Define the default game state
  const defaultGameState = {
    speed: 0.3,
    maxSpeed: 0.5,
    gravity: -20, // Adjusted gravity for higher jump
    score: 0,
    coinCount: 0,
    multiplier: 1,
    currentLane: 0, // Add lane state for player movement
    laneDistance: 4,
    active: true,
    maxCoins: 5,
    isSliding: false, // Initialize isSliding
  };

  // Initialize gameState with defaultGameState
  const [gameState, setGameState] = useState(defaultGameState);

  // Loading state for the preloader
  const [loading, setLoading] = useState(true);

  // Refs for jump mechanics
  const isJumpingRef = useRef(false);
  const jumpVelocityRef = useRef(0);

  // Animation Queue Refs
  const animationQueueRef = useRef([]);
  const isAnimatingRef = useRef(false);

  // Local references to obstacles and coins
  const obstaclesRef = useRef([]);
  const coinsRef = useRef([]);

  // Ref to store the scene instance
  const sceneRef = useRef(null);
  let camera, renderer; // Moved to outer scope to access in handleResize

  const handleResize = () => {
    if (camera && renderer) {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }
  };

  // Update gameStateRef and manage audio playback based on gameState
  useEffect(() => {
    gameStateRef.current = gameState;
    if (audioRef.current && gameState.active) {
      audioRef.current.play().catch((err) => console.warn('Audio play prevented:', err));
    }
  }, [gameState]);

  // Handle exit game functionality
  const handleExitGame = () => {
    // Clear game-related storage
    localStorage.clear();
    sessionStorage.clear();

    // Reset game state to default
    setGameState(defaultGameState);

    // Navigate to the main page
    router.push('/'); // Navigate to the main page
  };

  // Handle game restart functionality
  const restartGame = () => {
    // Reset gameActiveRef to true
    gameActiveRef.current = true;

    // Reset game state to default
    setGameState(defaultGameState);

    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(err => console.warn('Audio play prevented:', err));
    }

    // Clear the animation queue
    animationQueueRef.current = [];
    isAnimatingRef.current = false;

    // Reset player position and state
    const player = playerRef.current;
    const playAnimation = playAnimationRef.current;
    if (player) {
      player.position.set(0, 0, 0);
      player.userData.isJumping = false;
      player.userData.isSliding = false;
      player.userData.velocity = { y: 0 };
      isJumpingRef.current = false;
      isRollingRef.current = false; // Reset isRollingRef
      jumpVelocityRef.current = 0;
      if (playAnimation) {
        playAnimation('run'); // Reset to running animation
      }
    }

    // Reset obstacles
    barrierState.lastBarrierZ = -40; // Reset to initial position

    // Remove and dispose of all existing barriers
    obstaclesRef.current.forEach((barrier) => {
      if (sceneRef.current) {
        sceneRef.current.remove(barrier);
        disposeObject(barrier); // Dispose of geometries and materials
      }
    });
    obstaclesRef.current = [];

    // Remove and dispose of all existing coins
    coinsRef.current.forEach((coin) => {
      if (sceneRef.current) {
        sceneRef.current.remove(coin);
        disposeObject(coin); // Dispose of geometries and materials
      }
    });
    coinsRef.current = [];

    // Clear global arrays
    barriers.length = 0; // Clear global barriers array
    coins.length = 0; // Clear global coins array

    // Reinitialize obstacles and coins with the current scene
    if (sceneRef.current) {
      initObstacles(sceneRef.current);
      obstaclesRef.current = barriers; // Assign global barriers to local ref
      barrierState.lastBarrierZ = -40 - barriers.length * MIN_BARRIER_SPACING; // Reset barrierState based on barriers length

      initCoins(sceneRef.current, 5);
      coinsRef.current = coins; // Assign global coins to local ref
    }
  };

  // Update UI based on game events
  const updateUI = () => {
    setGameState((prevState) => ({
      ...prevState,
    }));
  };

  // Shared animation handler with queue
  const playAndResetAnimation = (animationName, duration, onComplete) => {
    // Push the animation request to the queue
    animationQueueRef.current.push({ animationName, duration, onComplete });
    processQueue();
  };

  // Process the animation queue
  const processQueue = () => {
    if (isAnimatingRef.current || animationQueueRef.current.length === 0) {
      return; // Either already animating or queue is empty
    }

    // Dequeue the next animation
    const { animationName, duration, onComplete } = animationQueueRef.current.shift();
    isAnimatingRef.current = true;

    const playAnimation = playAnimationRef.current;
    if (playAnimation) playAnimation(animationName); // Trigger the animation

    // Reset to "run" animation after the specified duration
    setTimeout(() => {
      if (onComplete) onComplete(); // Execute optional callback
      if (playAnimation) playAnimation('run'); // Return to running animation
      isAnimatingRef.current = false;
      processQueue(); // Process the next animation in the queue
    }, duration);
  };

  const bind = useGesture(
    {
      onDrag: ({ movement: [mx, my], direction: [dx, dy], velocity }) => {
        console.log("Gesture detected:", { mx, my, dx, dy, velocity });
  
        const threshold = 10; // Minimum movement in pixels to detect a swipe
  
        // Check if it's a horizontal swipe
        if (Math.abs(mx) > threshold && Math.abs(mx) > Math.abs(my)) {
          if (dx > 0) {
            console.log("Swipe Right");
            setGameState((prev) => ({
              ...prev,
              currentLane: Math.min(prev.currentLane + 1, 1), // Move right, max lane = 1
            }));
          } else if (dx < 0) {
            console.log("Swipe Left");
            setGameState((prev) => ({
              ...prev,
              currentLane: Math.max(prev.currentLane - 1, -1), // Move left, min lane = -1
            }));
          }
        }
  
        // Check if it's a vertical swipe
        if (Math.abs(my) > threshold && Math.abs(my) > Math.abs(mx)) {
          if (dy < 0) {
            console.log("Swipe Up - Jump");
            if (!isJumpingRef.current && !isRollingRef.current) {
              isJumpingRef.current = true;
              playAndResetAnimation('jump', 800); // Jump animation
              jumpVelocityRef.current = 8; // Adjust for jump height
            }
          } else if (dy > 0) {
            console.log("Swipe Down - Slide");
            if (!isRollingRef.current && !isJumpingRef.current) {
              isRollingRef.current = true;
              playAndResetAnimation('roll', 1190, () => {
                setGameState((prev) => ({ ...prev, isSliding: false }));
                isRollingRef.current = false;
              });
              setGameState((prev) => ({ ...prev, isSliding: true })); // Update gameState
            }
          }
        }
      },
    },
    {
      drag: {
        threshold: 10, // Adjust sensitivity for swipe detection
        filterTaps: true, // Ignore tap gestures
        axis: undefined, // Allow free movement detection
      },
    }
  );
  

  // Handle keyboard inputs for game controls
  const handleKeyDown = (event) => {
    console.log(`Key pressed: ${event.key}`);
    if (!gameState.active) return;

    switch (event.key) {
      case 'ArrowLeft':
        setGameState((prev) => ({
          ...prev,
          currentLane: Math.max(prev.currentLane - 1, -1), // Move left, limit to leftmost lane
        }));
        break;

      case 'ArrowRight':
        setGameState((prev) => ({
          ...prev,
          currentLane: Math.min(prev.currentLane + 1, 1), // Move right, limit to rightmost lane
        }));
        break;

      case 'ArrowUp': // Jump action
        if (!isJumpingRef.current && !isRollingRef.current) {
          console.log('Jump initiated');
          isJumpingRef.current = true;

          // Push jump animation to the queue without altering isJumpingRef
          playAndResetAnimation('jump', 800);

          jumpVelocityRef.current = 8; // Increased jump velocity for higher jump
        }
        break;

      case 'ArrowDown': // Slide action
        if (!isRollingRef.current && !isJumpingRef.current) {
          console.log('Slide initiated');
          isRollingRef.current = true;

          // Push roll animation to the queue with onComplete callback
          playAndResetAnimation('roll', 1190, () => {
            setGameState((prev) => ({ ...prev, isSliding: false })); // Reset sliding state
            isRollingRef.current = false;
          });

          setGameState((prev) => ({
            ...prev,
            isSliding: true,
          }));
        }
        break;

      default:
        break;
    }
  };

  // Update player position and handle jump physics
  const updatePlayer = (delta) => {
    const player = playerRef.current;
    if (!player) return;

    if (isJumpingRef.current) {
      // Apply jump velocity to player's position
      player.position.y += jumpVelocityRef.current * delta; // delta in seconds

      // Update jump velocity with gravity
      jumpVelocityRef.current += gameState.gravity * delta; // gravity in units/s²

      // Check if player has landed
      if (player.position.y <= 0) {
        player.position.y = 0; // Reset to ground level
        isJumpingRef.current = false;
        jumpVelocityRef.current = 0;
        const playAnimation = playAnimationRef.current;
        if (playAnimation) playAnimation('run'); // Revert to running animation
      }
    }
  };

  const resizeCamera = () => {
    if (camera) {
      if (window.innerWidth <= 768) {
        // Mobile settings
        camera.position.set(0, 5, 15);
      } else {
        // Desktop settings
        camera.position.set(0, 5, 8);
      }
      camera.lookAt(0, 4, 0); // Ensure camera is looking at the player
    }
  };

  // Initialize the game scene, player, environment, obstacles, and coins
  useEffect(() => {
    let sceneInstance;
    const clock = new THREE.Clock();

    const init = async () => {
      // Scene setup
      sceneInstance = new THREE.Scene();
      sceneInstance.background = new THREE.Color(0x87ceeb);

      // Store scene in ref for later access
      sceneRef.current = sceneInstance;

      // Camera setup
      camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 1000);
      resizeCamera(); // Set initial camera position based on device size

      // Renderer setup
      renderer = new THREE.WebGLRenderer({ canvas: canvasRef.current, antialias: true });
      renderer.setSize(window.innerWidth, window.innerHeight);
      renderer.shadowMap.enabled = true;

      // Add Ambient Light
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.7); // Soft white light
      sceneInstance.add(ambientLight);

      // Add Directional Light
      const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0); // Bright directional light
      directionalLight.position.set(10, 20, 10); // Position the light above and to the side
      directionalLight.castShadow = true;

      // Configure shadow settings for the directional light
      directionalLight.shadow.mapSize.width = 2048; // Higher value for sharper shadows
      directionalLight.shadow.mapSize.height = 2048;
      directionalLight.shadow.camera.near = 0.1;
      directionalLight.shadow.camera.far = 50;
      directionalLight.shadow.camera.left = -20;
      directionalLight.shadow.camera.right = 20;
      directionalLight.shadow.camera.top = 20;
      directionalLight.shadow.camera.bottom = -20;

      sceneInstance.add(directionalLight);

      // Optional: Add a Point Light for extra brightness at a specific position
      const pointLight = new THREE.PointLight(0xffffff, 0.8);
      pointLight.position.set(0, 10, 0); // Above the player
      sceneInstance.add(pointLight);

      // Initialize player
      try {
        const { playerUpdate, player, playAnimation } = await initPlayer(sceneInstance);
        playerRef.current = player; // Assign player to the ref
        playerUpdateRef.current = playerUpdate;
        playAnimationRef.current = playAnimation; // Assign playAnimation to the ref
      } catch (error) {
        console.error('Failed to initialize player:', error);
      }

      // Initialize environment
      initEnvironment(sceneInstance);

      // Clear existing barriers and coins
      barriers.length = 0; // Clear global barriers array
      coins.length = 0; // Clear global coins array

      // Initialize obstacles and coins
      initObstacles(sceneInstance); // Pass the scene instance
      obstaclesRef.current = barriers; // Assign global barriers to local ref
      barrierState.lastBarrierZ = -40 - barriers.length * MIN_BARRIER_SPACING; // Reset barrierState based on barriers length

      initCoins(sceneInstance, 5); // Initialize 5 coins
      coinsRef.current = coins; // Assign global coins to local ref

      // Handle window resize
      window.addEventListener('resize', handleResize);

      // Add keyboard controls
      window.addEventListener('keydown', handleKeyDown);

      // Set loading to false after 1500ms
      setTimeout(() => {
        setLoading(false);
      }, 1200);

      // Game loop
      const animate = () => {
        const delta = clock.getDelta(); // Get the time delta for consistent movement

        if (gameActiveRef.current) {
          updatePlayer(delta); // Handle jump physics

          // Update the player (movement, etc.)
          if (playerUpdateRef.current) {
            playerUpdateRef.current(delta, gameStateRef.current); // Pass the latest state
          }

          // Update the environment
          updateEnvironment(sceneInstance, gameStateRef.current);

          // Update obstacles
          if (playerRef.current) {
            updateObstacles(sceneInstance, playerRef.current, gameStateRef.current, () => {
              gameActiveRef.current = false;
              setGameState((prev) => ({ ...prev, active: false })); // Set active to false
            });
          }

          // Update coins
          updateCoins(sceneInstance, playerRef.current, gameStateRef.current, updateUI, delta);
        }

        // Render the scene
        renderer.render(sceneInstance, camera);

        requestAnimationFrame(animate); // Recursively call the game loop
      };

      animate();
    };

    init();

    return () => {
      // Cleanup on unmount
      if (renderer) renderer.dispose();
      if (audioRef.current) audioRef.current.pause();
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);

      // Remove and dispose of all obstacles
      obstaclesRef.current.forEach((barrier) => {
        sceneInstance.remove(barrier);
        disposeObject(barrier); // Use the helper function
      });
      obstaclesRef.current = [];

      // Remove and dispose of all coins
      coinsRef.current.forEach((coin) => {
        sceneInstance.remove(coin);
        disposeObject(coin); // Use the helper function
      });
      coinsRef.current = [];
    };
  }, []); // Empty dependency array ensures this runs once on mount

  // Function to handle user interaction to start audio
  const handleStart = () => {
    setLoading(false); // Hide preloader
    if (audioRef.current) {
      audioRef.current.play().catch((err) => console.warn('Audio play prevented:', err));
    }
  };

  return (
    <>
      {/* Preloader Overlay */}
      {loading && (
        <div style={styles.preloaderContainer}>
          <div style={styles.preloaderContent}>
            <h1>Loading...</h1>
          </div>
        </div>
      )}
  
      {/* Game Canvas */}
      <audio ref={audioRef} loop>
        <source src="/keeprunning.mp3" type="audio/mpeg" />
        Your browser does not support the audio element.
      </audio>
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: '100%',
          height: '100vh',
          touchAction: 'none',
          backgroundColor: 'rgba(255, 0, 0, 0.1)', // Light red overlay for visibility
          position: 'fixed',
          top: 0,
          left: 0,
          zIndex: 1, // Below the gesture layer
        }}
      />
  
      {/* Gesture Layer */}
      <div
        {...bind()} // Attach gesture binding here
        style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          touchAction: 'none',
          zIndex: 30, // Above the canvas, below UI
        }}
      ></div>
  
      {/* Game Over or UI */}
      {!gameState.active && (
        <div style={styles.gameOverContainer}>
          <h1>Game Over</h1>
          <button onClick={restartGame} style={styles.restartButton}>
            Restart Game
          </button>
        </div>
      )}
  
      {/* UI Controls */}
      <UI gameState={gameState} onRestart={restartGame} onExit={handleExitGame} />
    </>
  );
}  

// Inline styles for the preloader and start button
const styles = {
  preloaderContainer: {
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    backgroundColor: '#000000cc', // Semi-transparent black background
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999, // Ensure it's on top
    flexDirection: 'column',
  },
  preloaderContent: {
    color: '#ffffff',
    fontSize: '2rem',
    textAlign: 'center',
    marginBottom: '20px',
  },
  startButton: {
    padding: '10px 20px',
    fontSize: '1rem',
    cursor: 'pointer',
    border: 'none',
    borderRadius: '5px',
    backgroundColor: '#ffffff',
    color: '#000000',
  },
};
