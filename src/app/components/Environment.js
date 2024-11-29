import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

// Arrays to store road segments and buildings for recycling
let roadSegments = [];
let leftBuildings = [];
let rightBuildings = [];

export function initEnvironment(scene) {
    const loader = new GLTFLoader();
  
    // Create the road
    createRoad(scene, loader);
  
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);
  
    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = false;
    directionalLight.shadow.mapSize.width = 1024;
    directionalLight.shadow.mapSize.height = 1024;
    scene.add(directionalLight);
  
    // Add buildings
    createBuildings(scene, loader);
    createClouds(scene, loader);
  }
  
  function createClouds(scene, loader) {
    const cloudCount = 10; // Number of clouds
    const cloudSpacing = 200; // Distance between clouds along the Z-axis
    const cloudHeight = 30; // Height of the clouds
    const cloudDepth = -200; // Clouds appear behind buildings
  
    for (let i = 0; i < cloudCount; i++) {
      loader.load(
        '/items/cloud.glb', // Path to your cloud model
        (gltf) => {
          const cloud = gltf.scene;
          cloud.scale.set(5, 5, 5); // Scale the cloud
          cloud.position.set(
            (Math.random() - 0.5) * 150, // Random X position within range (wider than buildings)
            cloudHeight + Math.random() * 10, // Random Y position for variation
            cloudDepth - i * cloudSpacing // Position along Z-axis
          );
          cloud.traverse((node) => {
            if (node.isMesh) {
              node.castShadow = false; // Clouds generally do not cast shadows
              node.receiveShadow = false;
            }
          });
          cloud.name = `cloud-${i}`; // Assign a unique name for easy identification
          scene.add(cloud);
        },
        undefined,
        (error) => console.error('Error loading cloud model:', error)
      );
    }
  }
  
  

  function createRoad(scene, loader) {
    const roadSpacing = 800; // Length of one road segment
    const roadCount = 3; // Number of road segments to preload
    const planeWidth = 50; // Width of the gray areas
    const planeLength = roadSpacing; // Match the road length
  
    for (let i = 0; i < roadCount; i++) {
      // Load road model
      loader.load(
        '/items/street_road.glb', // Adjust path as necessary
        (gltf) => {
          const road = gltf.scene;
          road.scale.set(2, 2, 2); // Adjust scale to fit your environment
          road.position.set(-8.8, 0, -i * roadSpacing); // Position roads in sequence
          road.traverse((node) => {
            if (node.isMesh) {
              node.castShadow = false;
              node.receiveShadow = true;
            }
          });
          scene.add(road);
          roadSegments.push(road); // Add to road segments for recycling
        },
        undefined,
        (error) => {
          console.error('Error loading road model:', error);
        }
      );
  
      // Add dark gray left plane
      const leftPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(planeWidth, planeLength),
        new THREE.MeshStandardMaterial({ color: 0xAFAFB3 }) // Dark gray color
      );
      leftPlane.rotation.x = -Math.PI / 2; // Make it horizontal
      leftPlane.position.set(-45, 0.01, -i * roadSpacing); // Adjust position
      scene.add(leftPlane);
  
      // Add dark gray right plane
      const rightPlane = new THREE.Mesh(
        new THREE.PlaneGeometry(planeWidth, planeLength),
        new THREE.MeshStandardMaterial({ color: 0xAFAFB3 }) // Dark gray color
      );
      rightPlane.rotation.x = -Math.PI / 2; // Make it horizontal
      rightPlane.position.set(45, 0.01, -i * roadSpacing); // Adjust position
      scene.add(rightPlane);
    }
  }
  
  
  

  function createBuildings(scene, loader) {
    const buildingSpacing = 80; // Distance between buildings
    const startZ = -100; // Adjust the starting Z position
    const buildingCount = 10; // Number of buildings on each side
  
    for (let i = 0; i < buildingCount; i++) {
      loader.load(
        '/items/old_building.glb',
        (gltf) => {
          // Create left building
          const buildingLeft = gltf.scene.clone();
          buildingLeft.scale.set(4, 4, 4);
          buildingLeft.position.set(-20, 0, startZ - i * buildingSpacing);
          buildingLeft.traverse((node) => {
            if (node.isMesh) {
              node.castShadow = true;
            }
          });
          scene.add(buildingLeft);
          leftBuildings.push(buildingLeft);
  
          // Create right building
          const buildingRight = gltf.scene.clone();
          buildingRight.scale.set(4, 4, 4);
          buildingRight.position.set(57, 0, startZ - i * buildingSpacing);
          buildingRight.traverse((node) => {
            if (node.isMesh) {
              node.castShadow = true;
            }
          });
          scene.add(buildingRight);
          rightBuildings.push(buildingRight);
        },
        undefined,
        (error) => console.error('Error loading building model:', error)
      );
    }
  }

  export function updateEnvironment(scene, gameState) {
    const speed = gameState.speed * 2;
  
    // Update road segments
    roadSegments.forEach((road) => {
      road.position.z += speed;
  
      if (road.position.z > 50) {
        road.position.z -= 800 * roadSegments.length; // Recycle road segment
      }
    });
  
    // Update buildings
    const updateBuildings = (buildingArray) => {
      buildingArray.forEach((building) => {
        building.position.z += speed;
  
        if (building.position.z > 50) {
          building.position.z -= 800; // Recycle building
        }
      });
    };
  
    updateBuildings(leftBuildings);
    updateBuildings(rightBuildings);
  
    // Update clouds
    scene.children.forEach((object) => {
      if (object.name && object.name.startsWith('cloud')) { // Identify cloud objects
        object.position.z += speed / 4; // Clouds move slower than roads
  
        if (object.position.z > 50) {
          object.position.z -= 800; // Recycle clouds to the back
          object.position.x = (Math.random() - 0.5) * 150; // Randomize X position again
        }
      }
    });
  }
  
  