'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import Link from 'next/link';

function Character({
  modelPath,
  position,
  scale = [2.1, 2.1, 2.1],
  idleAnimationName = 'idle',
  jumpAnimationName = 'jump',
  customMaterial = null,
  customLights = [],
  onLoad, // Callback to notify when loading is complete
}) {
  const containerRef = useRef();
  const mixerRef = useRef();
  const idleActionRef = useRef();
  const jumpActionRef = useRef();
  const [loadingProgress, setLoadingProgress] = useState(0); // Loading progress state

  useEffect(() => {
    let scene, camera, renderer, mixer;
    let animationFrameId;
    const addedLights = [];
    const clock = new THREE.Clock();

    const onWindowResize = () => {
      if (camera && containerRef.current) {
        camera.aspect = containerRef.current.clientWidth / containerRef.current.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      }
    };

    const init = () => {
      scene = new THREE.Scene();
      scene.background = null;

      camera = new THREE.PerspectiveCamera(
        75,
        containerRef.current.clientWidth / containerRef.current.clientHeight,
        0.1,
        1000
      );
      camera.position.set(0, 2, 5);

      renderer = new THREE.WebGLRenderer({ alpha: true });
      renderer.setSize(containerRef.current.clientWidth, containerRef.current.clientHeight);
      renderer.setPixelRatio(window.devicePixelRatio);
      containerRef.current.appendChild(renderer.domElement);

      const ambientLight = new THREE.AmbientLight(0xffffff, 1.0);
      scene.add(ambientLight);

      customLights.forEach((lightConfig) => {
        let light;
        switch (lightConfig.type) {
          case 'AmbientLight':
            light = new THREE.AmbientLight(lightConfig.color || 0xffffff, lightConfig.intensity || 1.0);
            break;
          case 'SpotLight':
            light = new THREE.SpotLight(
              lightConfig.color || 0xffffff,
              lightConfig.intensity || 1.5
            );
            light.position.set(
              lightConfig.position?.x || 10,
              lightConfig.position?.y || 10,
              lightConfig.position?.z || 10
            );
            break;
          case 'DirectionalLight':
            light = new THREE.DirectionalLight(
              lightConfig.color || 0xffffff,
              lightConfig.intensity || 1.0
            );
            light.position.set(
              lightConfig.position?.x || 5,
              lightConfig.position?.y || 10,
              lightConfig.position?.z || 7.5
            );
            break;
          default:
            console.warn(`Unsupported light type: ${lightConfig.type}`);
            return;
        }
        scene.add(light);
        addedLights.push(light);
      });

      const loader = new GLTFLoader();
      loader.load(
        modelPath,
        (gltf) => {
          console.log("Model loaded:", modelPath);
          const model = gltf.scene;
          model.position.set(...position);
          model.scale.set(...scale);

          if (customMaterial) {
            model.traverse((child) => {
              if (child.isMesh) {
                Object.keys(customMaterial).forEach((key) => {
                  if (child.material[key] !== undefined) {
                    child.material[key] = customMaterial[key];
                  }
                });
              }
            });
          }

          scene.add(model);

          if (gltf.animations.length > 0) {
            mixer = new THREE.AnimationMixer(model);
            mixerRef.current = mixer;

            const idleClip = gltf.animations.find(
              (clip) => clip.name.toLowerCase() === idleAnimationName.toLowerCase()
            );
            if (idleClip) {
              const idleAction = mixer.clipAction(idleClip);
              idleAction.play();
              idleActionRef.current = idleAction;
            }

            const jumpClip = gltf.animations.find(
              (clip) => clip.name.toLowerCase() === jumpAnimationName.toLowerCase()
            );
            if (jumpClip) {
              const jumpAction = mixer.clipAction(jumpClip);
              jumpAction.loop = THREE.LoopRepeat;
              jumpActionRef.current = jumpAction;
            }
          }

          setLoadingProgress(100); // Finish loading
          if (onLoad) onLoad();
        },
        (xhr) => {
          console.log(`Loaded: ${xhr.loaded}, Total: ${xhr.total}`);
          setLoadingProgress((xhr.loaded / xhr.total) * 100); // Update loading progress
        },
        (error) => {
          console.error('Error loading GLTF model:', error);
          setLoadingProgress(100); // Prevent loader from hanging
        }
      );

      window.addEventListener('resize', onWindowResize);

      const animate = () => {
        animationFrameId = requestAnimationFrame(animate);
        const delta = clock.getDelta();
        if (mixer) mixer.update(delta);
        renderer.render(scene, camera);
      };
      animate();
    };

    init();

    return () => {
      cancelAnimationFrame(animationFrameId);
      if (renderer) renderer.dispose();
      if (containerRef.current) {
        containerRef.current.removeChild(renderer.domElement);
      }
      window.removeEventListener('resize', onWindowResize);
    };
  }, [modelPath, position, scale, idleAnimationName, jumpAnimationName, customMaterial, customLights, onLoad]);

  const handleMouseEnter = () => {
    if (jumpActionRef.current && idleActionRef.current) {
      idleActionRef.current.stop();
      jumpActionRef.current.reset().play();
    }
  };

  const handleMouseLeave = () => {
    if (idleActionRef.current && jumpActionRef.current) {
      jumpActionRef.current.stop();
      idleActionRef.current.reset().play();
    }
  };

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {loadingProgress < 100 && (
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-black bg-opacity-70 text-white px-5 py-2.5 rounded-xl text-center">
      Loading... {Math.round(loadingProgress)}%
    </div>    
      )}
    </div>
  );
}

export default function GameHome() {

  
  return (
    <div className="bg-gradient-to-b from-blue-500 to-black min-h-screen flex flex-col gap-0">
      {/* Header */}
      <div className="flex justify-center mt-4">
      <div
          className="
            relative
            bg-[url('/items/signback.png')]
            bg-contain
            block
            bg-center
            bg-no-repeat
            items-center
            justify-center
            max-w-md
            px-4
            py-2
            text-center
            w-full
            h-56
            mb-[-110px]
          "
          
        >
          <h1 className="text-6xl font-bold text-center text-white p-4 mt-14">Street Run</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex justify-around items-center max-w-screen-lg mx-auto w-full mt-[-40px]">
        {/* First Character */}
        <div className="w-1/2 h-[700px] p-2 cursor-pointer">
          <Character
            modelPath="/items/cartoonboyanimated.glb"
            position={[0, 0, 0]}
            scale={[2.1, 2.1, 2.1]} // Default scale for boy
            idleAnimationName="Idle"    // Adjust based on actual clip name
            jumpAnimationName="Jump"    // Adjust based on actual clip name
            customMaterial={{
              // Example: Adjust material properties for better texture visibility
              roughness: 0.5,     // Adjust as needed
              metalness: 0.0,     // Adjust as needed
              emissive: new THREE.Color(0x000000), // No emissive color
              // Add more material properties as needed
            }}
            customLights={[
              {
                type: 'DirectionalLight',
                color: 0xffffff,
                intensity: 1.2,
                position: { x: 5, y: 10, z: 7.5 },
              },
              {
                type: 'SpotLight',
                color: 0xffffff,
                intensity: 0.8,
                position: { x: -10, y: 15, z: -10 },
              },
              // Add more lights if necessary
            ]}
          />
          <Link href="/boy">
            <p className="text-center mt-[-140px] text-2xl text-white hover:text-green-400">
              Boy
            </p>
          </Link>
        </div>

        {/* Second Character */}
        <div className="w-1/2 h-[700px] p-2 cursor-pointer">
          <Character
            modelPath="/items/girlidle.glb"
            position={[0, 0, 0]}
            scale={[0.47, 0.47, 0.47]} // Smaller scale for girl
            idleAnimationName="Armature|mixamo.com|Layer0" // Girl's idle animation name
            // jumpAnimationName="GirlJump" // Provide if the girl has a jump animation
            customMaterial={{
              // Example: Adjust material properties for better texture visibility
              roughness: 0.5,     // Adjust as needed
              metalness: 0.0,     // Adjust as needed
              emissive: new THREE.Color(0x000000), // No emissive color
              // Add more material properties as needed
            }}
            customLights={[
              {
                type: 'DirectionalLight',
                color: 0xffffff,
                intensity: 1.2,
                position: { x: 5, y: 10, z: 7.5 },
              },
              {
                type: 'SpotLight',
                color: 0xffffff,
                intensity: 0.8,
                position: { x: -10, y: 15, z: -10 },
              },
              // Add more lights if necessary
            ]}
          />
          <Link href="/girl"> {/* Add Link if you have a girl route */}
            <p className="text-center mt-[-140px] text-2xl text-white hover:text-pink-400">
              Girl
            </p>
          </Link>
        </div>
      </div>
      <p className="text-center p-8">Credits: Music by Adrien Nunez</p>
    </div>
  );
}
