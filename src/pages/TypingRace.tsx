import { useSearchParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import MultiplayerGame from '@/components/MultiplayerGame';

const TypingRace = () => {
  const [searchParams] = useSearchParams();
  const roomId = searchParams.get('room');
  const playerName = searchParams.get('player');

  // Sample passage for the game
  const passage = "The quick brown fox jumps over the lazy dog. This is a sample passage for the typing race game. Type as fast and accurately as you can to win the race against other players in real-time!";

  if (!roomId || !playerName) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">Invalid Room</h1>
          <p className="text-muted-foreground mb-4">Room ID and player name are required.</p>
          <Link to="/lobby">
            <Button>Back to Lobby</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <MultiplayerGame 
      roomId={roomId} 
      playerName={playerName} 
      passage={passage}
    />
  );
};

export default TypingRace;