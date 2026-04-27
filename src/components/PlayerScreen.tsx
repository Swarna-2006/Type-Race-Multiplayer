import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';

interface PlayerScreenProps {
  playerName: string;
  playerNumber: number;
  input: string;
  onInputChange: (value: string) => void;
  wpm: number;
  accuracy: number;
  progress: number;
  passage: string;
  gameActive: boolean;
  isWinner: boolean;
  characterCount: number;
  totalCharacters: number;
}

const PlayerScreen = ({
  playerName,
  playerNumber,
  input,
  onInputChange,
  wpm,
  accuracy,
  progress,
  passage,
  gameActive,
  isWinner,
  characterCount,
  totalCharacters,
}: PlayerScreenProps) => {
  const playerColors = {
    1: 'player-1',
    2: 'player-2',
    3: 'gaming-green',
    4: 'gaming-orange',
    5: 'gaming-purple',
  };

  const playerColor = playerColors[playerNumber as keyof typeof playerColors] || 'gaming-blue';

  return (
    <Card className={`p-6 bg-gradient-card border-border ${isWinner ? 'animate-winner-glow' : ''}`}>
      <div className="mb-4">
        <h3 className={`text-xl font-bold mb-2 text-${playerColor}`}>
          {playerName} (Player {playerNumber})
        </h3>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div>
            <div className="text-muted-foreground">WPM</div>
            <div className="text-2xl font-bold text-gaming-blue">{wpm}</div>
          </div>
          <div>
            <div className="text-muted-foreground">Accuracy</div>
            <div className="text-2xl font-bold text-gaming-green">{accuracy}%</div>
          </div>
          <div>
            <div className="text-muted-foreground">Progress</div>
            <div className="text-2xl font-bold text-gaming-purple">{Math.round(progress)}%</div>
          </div>
        </div>
        <Progress value={progress} className="mt-2" />
      </div>
      
      <textarea
        value={input}
        onChange={(e) => onInputChange(e.target.value)}
        placeholder="Start typing here..."
        className={`w-full h-32 p-3 bg-secondary border border-border rounded-md text-foreground font-mono resize-none focus:ring-2 focus:ring-${playerColor} focus:border-transparent`}
        disabled={!gameActive}
      />
      
      <div className="mt-2 text-sm text-muted-foreground">
        Typed: {characterCount} / {totalCharacters} characters
      </div>
    </Card>
  );
};

export default PlayerScreen;