
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trophy, Clock, Target, Zap } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Player = Tables<'players'>;

interface RaceResultsOverlayProps {
  players: Player[];
  currentPlayerName: string;
  onRematch: () => void;
  onLeaveRoom: () => void;
  currentRound: number;
  totalRounds: number;
}

const RaceResultsOverlay = ({ 
  players, 
  currentPlayerName, 
  onRematch, 
  onLeaveRoom,
  currentRound,
  totalRounds
}: RaceResultsOverlayProps) => {
  // Sort players by completion order: 
  // 1. Completed players first (sorted by completion time, then by WPM as tiebreaker)
  // 2. Non-completed players by progress percentage
  const sortedPlayers = [...players].sort((a, b) => {
    const aCompleted = a.completion_time && (a.progress || 0) >= 100 && (a.accuracy || 0) === 100;
    const bCompleted = b.completion_time && (b.progress || 0) >= 100 && (b.accuracy || 0) === 100;
    
    if (aCompleted && bCompleted) {
      // Both completed - sort by completion time first
      const aTime = new Date(a.completion_time!).getTime();
      const bTime = new Date(b.completion_time!).getTime();
      
      if (aTime !== bTime) {
        return aTime - bTime; // Earlier completion time wins
      }
      
      // If completion times are very close (within 1 second), use WPM as tiebreaker
      return (b.wpm || 0) - (a.wpm || 0); // Higher WPM wins
    }
    
    if (aCompleted && !bCompleted) return -1; // Completed players come first
    if (!aCompleted && bCompleted) return 1;
    
    // Neither completed - sort by progress, then by WPM
    const progressDiff = (b.progress || 0) - (a.progress || 0);
    if (progressDiff !== 0) return progressDiff;
    
    return (b.wpm || 0) - (a.wpm || 0); // Higher WPM for same progress
  });

  const isCurrentPlayer = (player: Player) => player.name === currentPlayerName;
  const isWinner = (index: number) => {
    const player = sortedPlayers[index];
    return index === 0 && player.completion_time && (player.progress || 0) >= 100 && (player.accuracy || 0) === 100;
  };

  const formatCompletionTime = (completionTime: string) => {
    const time = new Date(completionTime);
    const timeString = time.toLocaleTimeString([], { 
      hour12: false, 
      minute: '2-digit', 
      second: '2-digit'
    });
    const milliseconds = time.getMilliseconds().toString().padStart(3, '0');
    return `${timeString}.${milliseconds.charAt(0)}`;
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl bg-gradient-card border-border p-4 sm:p-6 lg:p-8">
        <div className="text-center mb-6">
          <h2 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
            Race Results
          </h2>
          <div className="text-sm sm:text-base text-muted-foreground">
            Round {currentRound} of {totalRounds}
          </div>
          <div className="text-xs text-muted-foreground mt-1">
            Ranked by completion time, then WPM
          </div>
        </div>

        <div className="space-y-3 mb-6 max-h-64 sm:max-h-80 overflow-y-auto">
          {sortedPlayers.map((player, index) => {
            const isCompleted = player.completion_time && (player.progress || 0) >= 100 && (player.accuracy || 0) === 100;
            
            return (
              <Card 
                key={player.id} 
                className={`p-3 sm:p-4 ${
                  isCurrentPlayer(player) 
                    ? 'bg-gaming-blue/20 border-gaming-blue' 
                    : 'bg-secondary/50'
                } ${isWinner(index) ? 'ring-2 ring-gaming-orange' : ''}`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 sm:gap-3">
                    <div className="flex items-center gap-2">
                      {isWinner(index) && (
                        <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-gaming-orange" />
                      )}
                      <span className={`text-lg sm:text-xl font-bold ${
                        isWinner(index) ? 'text-gaming-orange' : 'text-gaming-purple'
                      }`}>
                        #{index + 1}
                      </span>
                    </div>
                    <div>
                      <div className="font-semibold text-foreground text-sm sm:text-base">
                        {player.name}
                        {isCurrentPlayer(player) && (
                          <Badge variant="outline" className="ml-2 text-xs bg-gaming-blue/20 text-gaming-blue">
                            You
                          </Badge>
                        )}
                        {isCompleted && (
                          <Badge variant="outline" className="ml-2 text-xs bg-gaming-green/20 text-gaming-green">
                            Finished
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 sm:gap-4 text-xs sm:text-sm">
                    <div className="flex items-center gap-1">
                      <Zap className="w-3 h-3 sm:w-4 sm:h-4 text-gaming-blue" />
                      <span className="text-gaming-blue font-semibold">
                        {player.wpm || 0} WPM
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Target className="w-3 h-3 sm:w-4 sm:h-4 text-gaming-green" />
                      <span className="text-gaming-green font-semibold">
                        {player.accuracy || 0}%
                      </span>
                    </div>
                    {player.completion_time && (
                      <div className="flex items-center gap-1">
                        <Clock className="w-3 h-3 sm:w-4 sm:h-4 text-gaming-purple" />
                        <span className="text-gaming-purple font-semibold">
                          {formatCompletionTime(player.completion_time)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                <div className="mt-2">
                  <div className="w-full bg-secondary rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${
                        isCompleted ? 'bg-gaming-green' : 'bg-gaming-blue'
                      }`}
                      style={{ width: `${Math.min(player.progress || 0, 100)}%` }}
                    />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 text-center">
                    {Math.round(player.progress || 0)}% Complete
                  </div>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <Button 
            onClick={onRematch}
            className="flex-1 bg-gaming-green hover:bg-gaming-green/80 text-sm sm:text-base py-2 sm:py-3"
          >
            Request Rematch
          </Button>
          <Button 
            onClick={onLeaveRoom}
            variant="outline"
            className="flex-1 text-sm sm:text-base py-2 sm:py-3"
          >
            Leave Room
          </Button>
        </div>
      </Card>
    </div>
  );
};

export default RaceResultsOverlay;
