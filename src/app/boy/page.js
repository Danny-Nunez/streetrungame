'use client';
import GameCanvas from '../components/GameCanvas';

export default function Page() {
  return (
    <div>
      <GameCanvas key={Date.now()} />
    </div>
  );
}
