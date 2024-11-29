'use client'; // Enables client-side rendering for Next.js
import React, { useEffect, useState } from 'react';
import { ArrowLeftIcon } from '@heroicons/react/24/solid';


export default function UI({ gameState, onRestart, onExit }) {
  const [fps, setFps] = useState(0);
  const [score, setScore] = useState(0);
  const [coins, setCoins] = useState(0);
  const [multiplier, setMultiplier] = useState(1);
  const [gameOver, setGameOver] = useState(false);

  let lastFrameTime = performance.now();

  // Update FPS in real-time
  useEffect(() => {
    const updateFPS = () => {
      const currentTime = performance.now();
      const deltaTime = currentTime - lastFrameTime;
      setFps(Math.round(1000 / deltaTime));
      lastFrameTime = currentTime;
      requestAnimationFrame(updateFPS);
    };
    updateFPS();
  }, []);

  // Update game UI based on props
  useEffect(() => {
    setScore(gameState.score);
    setCoins(gameState.coinCount);
    setMultiplier(gameState.multiplier);
    setGameOver(!gameState.active); // Show Game Over screen when game stops
  }, [gameState]);

  return (
    <div className="absolute inset-0 flex flex-col justify-between">
      {/* Game Stats */}
      <div className="absolute top-4 left-4 bg-green-600 border-4 border-white py-2 px-4 opacity-90 rounded-full pointer-events-auto">
        <div className="text-xl text-white">Coins: {coins}</div>
      </div>

      {/* Game Over Screen */}
      {gameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 text-white pointer-events-auto">
          
          <div className="p-4 bg-gray-800 rounded-lg shadow-lg">
            
            <button onClick={onExit} className="inline-flex rounded-xl hover:bg-gray-700 p-2"><ArrowLeftIcon className="w-4 h-4 mt-1 mr-2" /> Exit Game</button>
          <div className="text-center p-4">
            <h1 className="text-4xl font-superkind mb-4">Game Over</h1>
            <p className="text-lg mb-6">Total Coins: {coins}</p>
            <button
              onClick={onRestart}
              className="mt-4 px-6 py-3 bg-blue-500 text-white font-bold rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-75"
            >
              Restart Game
            </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}