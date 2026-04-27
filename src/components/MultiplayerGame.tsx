import { useState, useEffect, useCallback } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { useSupabasePlayers } from '@/hooks/useSupabasePlayers';
import { useRandomSentences } from '@/hooks/useRandomSentences';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Trophy, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import RaceResultsOverlay from './RaceResultsOverlay';
import type { Tables } from '@/integrations/supabase/types';

type Room = Tables<'rooms'>;

interface MultiplayerGameProps {
  roomId: string;
  playerName: string;
  passage: string; // This will be overridden by room passage
}

const MultiplayerGame = ({ roomId, playerName }: MultiplayerGameProps) => {
  const { toast } = useToast();
  const [playerId, setPlayerId] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [gameStarted, setGameStarted] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);
  const [startTime, setStartTime] = useState<Date | null>(null);
  const [currentPassage, setCurrentPassage] = useState('');
  const [room, setRoom] = useState<Room | null>(null);
  const [showResults, setShowResults] = useState(false);
  const [roomNotFound, setRoomNotFound] = useState(false);
  const [hasShownRoomError, setHasShownRoomError] = useState(false);

  const { players, currentPlayer, updatePlayerStats, leaveRoom, roomDeleted } = useSupabasePlayers(roomId, playerId);
  const { getRandomSentence } = useRandomSentences();

  // Calculate stats
  const calculateStats = useCallback(() => {
    if (!gameStarted || !startTime || !input.trim() || !currentPassage) return { wpm: 0, accuracy: 100, progress: 0 };

    const timeElapsed = (Date.now() - startTime.getTime()) / 1000 / 60; // minutes
    const wordsTyped = input.trim().split(' ').length;
    const wpm = Math.round(wordsTyped / Math.max(timeElapsed, 0.1));

    // Calculate accuracy
    let correctChars = 0;
    for (let i = 0; i < Math.min(input.length, currentPassage.length); i++) {
      if (input[i] === currentPassage[i]) correctChars++;
    }
    const accuracy = input.length > 0 ? Math.round((correctChars / input.length) * 100) : 100;

    // Calculate progress
    const progress = Math.min((input.length / currentPassage.length) * 100, 100);

    return { wpm, accuracy, progress };
  }, [input, currentPassage, gameStarted, startTime]);

  // Update player stats in real-time
  useEffect(() => {
    if (!gameStarted || !playerId || roomDeleted || roomNotFound) return;

    const stats = calculateStats();
    updatePlayerStats({
      input_text: input,
      wpm: stats.wpm,
      accuracy: stats.accuracy,
      progress: stats.progress
    });

    // Check for completion - require 100% accuracy and 100% progress
    if (stats.progress >= 100 && stats.accuracy === 100 && !gameFinished) {
      setGameFinished(true);
      
      // Update completion time
      supabase
        .from('players')
        .update({ 
          completion_time: new Date().toISOString(),
          rounds_completed: (currentPlayer?.rounds_completed || 0) + 1
        })
        .eq('id', playerId);

      toast({
        title: "Race Complete!",
        description: `You finished with ${stats.wpm} WPM and ${stats.accuracy}% accuracy!`,
      });
    }
  }, [input, playerId, gameStarted, calculateStats, updatePlayerStats, gameFinished, currentPlayer, toast, roomDeleted, roomNotFound]);

  // Check for round/race completion and show results
  useEffect(() => {
    if (!room || !gameFinished || roomDeleted || roomNotFound) return;

    const completedPlayers = players.filter(p => (p.progress || 0) >= 100 && (p.accuracy || 0) === 100);
    const allPlayersFinished = players.every(p => (p.progress || 0) >= 100 && (p.accuracy || 0) === 100);

    if (allPlayersFinished || completedPlayers.length > 0) {
      setTimeout(() => {
        setShowResults(true);
      }, 2000); // Show results after 2 seconds
    }
  }, [players, gameFinished, room, roomDeleted, roomNotFound]);

  // Fetch room data and set up the shared passage
  useEffect(() => {
    const fetchRoomAndSetPassage = async () => {
      if (!roomId || roomDeleted || roomNotFound) {
        return;
      }

      try {
        console.log('🏠 Fetching room data for:', roomId);

        const { data, error } = await supabase
          .from('rooms')
          .select('*')
          .eq('id', roomId)
          .maybeSingle();

        if (error) {
          console.error('❌ Error fetching room:', error);
          if (!hasShownRoomError) {
            setHasShownRoomError(true);
            toast({
              title: "Database Connection Error",
              description: "Failed to load room data. Please check your connection.",
              variant: "destructive",
            });
          }
          return;
        }
        
        if (!data) {
          console.log('❌ Room not found:', roomId);
          setRoomNotFound(true);
          if (!hasShownRoomError) {
            setHasShownRoomError(true);
            toast({
              title: "Room Not Found",
              description: "This room has been closed or deleted. Redirecting to lobby...",
              variant: "destructive",
            });
            setTimeout(() => {
              window.location.href = '/lobby';
            }, 3000);
          }
          return;
        }
        
        console.log('✅ Room data loaded:', data.name);
        setRoom(data);

        // If room already has a passage, use it; otherwise set a new one
        if (data.passage) {
          setCurrentPassage(data.passage);
          console.log('📝 Using existing room passage');
        } else {
          // Only the host should set the passage for the room
          if (currentPlayer?.is_host) {
            const sentence = getRandomSentence(data.difficulty || 'medium');
            if (sentence) {
              // Update the room with the selected passage so all players get the same one
              const { error: updateError } = await supabase
                .from('rooms')
                .update({ passage: sentence.content })
                .eq('id', roomId);

              if (updateError) {
                console.error('❌ Error setting room passage:', updateError);
              } else {
                setCurrentPassage(sentence.content);
                console.log('📝 Host set new passage for room');
              }
            }
          }
          // Non-host players will get the passage when the room is updated
        }
      } catch (error) {
        console.error('❌ Critical error fetching room:', error);
        if (!hasShownRoomError) {
          setHasShownRoomError(true);
          toast({
            title: "Connection Error",
            description: "Unable to connect to the game server. Please try again later.",
            variant: "destructive",
          });
        }
      }
    };

    fetchRoomAndSetPassage();
  }, [roomId, getRandomSentence, toast, roomDeleted, roomNotFound, currentPlayer?.is_host, hasShownRoomError]);

  // Subscribe to room changes to get the passage when it's set
  useEffect(() => {
    if (!roomId || roomDeleted || roomNotFound) return;

    const roomChannel = supabase
      .channel(`room_passage_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${roomId}`
        },
        (payload) => {
          console.log('🏠 Room updated');
          if (payload.new && typeof payload.new === 'object' && 'passage' in payload.new) {
            const newPassage = (payload.new as any).passage;
            if (newPassage && newPassage !== currentPassage) {
              setCurrentPassage(newPassage);
              console.log('📝 Updated passage from room');
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roomChannel);
    };
  }, [roomId, currentPassage, roomDeleted, roomNotFound]);

  // Initialize player
  useEffect(() => {
    const initializePlayer = async () => {
      if (!roomId || !playerName || roomDeleted || roomNotFound) {
        return;
      }

      try {
        console.log('👤 Initializing player:', playerName, 'in room:', roomId);

        // Check if player already exists (reconnection)
        const { data: existingPlayer, error: existingError } = await supabase
          .from('players')
          .select('*')
          .eq('room_id', roomId)
          .eq('name', playerName)
          .maybeSingle();

        if (existingError) {
          console.error('❌ Error checking existing player:', existingError);
          throw existingError;
        }

        if (existingPlayer) {
          console.log('✅ Existing player found, reconnecting:', existingPlayer.id);
          setPlayerId(existingPlayer.id);
          return;
        }

        // Create new player
        console.log('➕ Creating new player');
        const { data: player, error } = await supabase
          .from('players')
          .insert({
            room_id: roomId,
            name: playerName,
            is_host: false
          })
          .select()
          .single();

        if (error) {
          console.error('❌ Error creating player:', error);
          throw error;
        }
        
        console.log('✅ New player created:', player.id);
        setPlayerId(player.id);
      } catch (error) {
        console.error('❌ Critical error initializing player:', error);
        if (!hasShownRoomError && !roomNotFound) {
          setHasShownRoomError(true);
          toast({
            title: "Failed to Join Room",
            description: "Unable to join the room. Please try again or return to lobby.",
            variant: "destructive",
          });
        }
      }
    };

    initializePlayer();
  }, [roomId, playerName, toast, roomDeleted, roomNotFound, hasShownRoomError]);

  const handleInputChange = (value: string) => {
    if (!gameStarted) {
      setGameStarted(true);
      setStartTime(new Date());
    }

    // Prevent typing beyond the passage
    if (value.length <= currentPassage.length) {
      setInput(value);
    }
  };

  const startGame = () => {
    setGameStarted(true);
    setStartTime(new Date());
    toast({
      title: "Race Started!",
      description: "Type the passage as quickly and accurately as possible!",
    });
  };

  const handleRematch = async () => {
    if (!room) return;

    try {
      // Reset all player stats for new round
      await supabase
        .from('players')
        .update({
          input_text: '',
          wpm: 0,
          accuracy: 100,
          progress: 0,
          completion_time: null
        })
        .eq('room_id', roomId);

      // Host sets new passage for the room
      if (currentPlayer?.is_host) {
        const sentence = getRandomSentence(room.difficulty || 'medium');
        if (sentence) {
          await supabase
            .from('rooms')
            .update({ passage: sentence.content })
            .eq('id', roomId);
          
          setCurrentPassage(sentence.content);
        }
      }

      // Reset local state
      setInput('');
      setGameStarted(false);
      setGameFinished(false);
      setStartTime(null);
      setShowResults(false);

      toast({
        title: "New Race Started!",
        description: "Get ready for the next round!",
      });
    } catch (error) {
      console.error('Error starting rematch:', error);
      toast({
        title: "Error",
        description: "Failed to start rematch",
        variant: "destructive",
      });
    }
  };

  const handleLeaveRoom = async () => {
    try {
      await leaveRoom();
      // Host will trigger room deletion which will redirect everyone
      // Non-host players will be removed and redirected manually
      if (!currentPlayer?.is_host) {
        window.location.href = '/lobby';
      }
    } catch (error) {
      console.error('Error leaving room:', error);
      // Still redirect even if there's an error
      window.location.href = '/lobby';
    }
  };

  const stats = calculateStats();

  const renderPassage = () => {
    if (!currentPassage) return (
      <div className="font-mono text-sm text-muted-foreground p-4 bg-secondary rounded-lg">
        Waiting for passage to load...
      </div>
    );
    
    return (
      <div className="font-mono text-xs sm:text-sm md:text-base lg:text-lg leading-relaxed p-2 sm:p-3 lg:p-4 bg-secondary rounded-lg overflow-auto">
        {currentPassage.split('').map((char, index) => {
          let className = 'text-muted-foreground';
          
          if (index < input.length) {
            className = input[index] === char 
              ? 'text-gaming-green bg-gaming-green/20' 
              : 'text-gaming-orange bg-gaming-orange/20';
          } else if (index === input.length) {
            className = 'text-foreground bg-gaming-purple/30 animate-pulse';
          }

          return (
            <span key={index} className={className}>
              {char}
            </span>
          );
        })}
      </div>
    );
  };

  // Show loading or redirect if room is deleted or not found
  if (roomDeleted || roomNotFound) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-xl font-bold mb-2">
            {roomDeleted ? "Room Closed" : "Room Not Found"}
          </h2>
          <p className="text-muted-foreground mb-4">
            {roomDeleted 
              ? "The room has been closed. Redirecting to lobby..." 
              : "This room doesn't exist or has been deleted. Redirecting to lobby..."
            }
          </p>
          <Link to="/lobby">
            <Button>Return to Lobby</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <>
      {showResults && room && (
        <RaceResultsOverlay 
          players={players}
          currentPlayerName={playerName}
          onRematch={handleRematch}
          onLeaveRoom={handleLeaveRoom}
          currentRound={room.current_round || 1}
          totalRounds={room.rounds || 1}
        />
      )}
      
      <div className="min-h-screen bg-background p-2 sm:p-4 lg:p-6">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 sm:mb-6 lg:mb-8">
            <div className="flex items-center gap-2 sm:gap-4">
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleLeaveRoom}
                className="text-xs sm:text-sm px-2 py-1 sm:px-3 sm:py-2"
              >
                <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                Leave Room
              </Button>
              <div>
                <h1 className="text-lg sm:text-xl lg:text-2xl xl:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  <span className="hidden sm:inline">Typing Race - </span>Room {roomId.slice(0, 8)}
                </h1>
                {room && (
                  <div className="text-xs sm:text-sm text-muted-foreground mt-1">
                    Round {room.current_round || 1} of {room.rounds || 1} • {room.difficulty} difficulty
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center gap-1 sm:gap-2">
              <Users className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="text-muted-foreground text-xs sm:text-sm">{players.length} players</span>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-4 gap-3 sm:gap-4 lg:gap-6">
            {/* Main Game Area */}
            <div className="xl:col-span-3 space-y-3 sm:space-y-4 lg:space-y-6">
              {/* Passage Display */}
              <Card className="p-3 sm:p-4 lg:p-6 bg-gradient-card border-border">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3 sm:mb-4">
                  <h3 className="text-base sm:text-lg lg:text-xl font-bold text-foreground">Passage</h3>
                  <div className="text-xs sm:text-sm text-muted-foreground">
                    {stats.accuracy < 100 && (
                      <span className="text-gaming-orange">100% accuracy required to complete</span>
                    )}
                  </div>
                </div>
                {renderPassage()}
              </Card>

              {/* Your Typing Area */}
              <Card className="p-3 sm:p-4 lg:p-6 bg-gradient-card border-border">
                <h3 className="text-base sm:text-lg lg:text-xl font-bold mb-3 sm:mb-4 text-gaming-blue">Your Typing Area</h3>
                
                {/* Your Stats */}
                <div className="grid grid-cols-3 gap-2 sm:gap-4 mb-4 text-xs sm:text-sm lg:text-base">
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">WPM</div>
                    <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gaming-blue">{stats.wpm}</div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">Accuracy</div>
                    <div className={`text-lg sm:text-xl lg:text-2xl font-bold ${
                      stats.accuracy === 100 ? 'text-gaming-green' : 'text-gaming-orange'
                    }`}>
                      {stats.accuracy}%
                    </div>
                  </div>
                  <div className="text-center">
                    <div className="text-xs text-muted-foreground">Progress</div>
                    <div className="text-lg sm:text-xl lg:text-2xl font-bold text-gaming-purple">
                      {Math.round(stats.progress)}%
                    </div>
                  </div>
                </div>

                <Progress value={stats.progress} className="mb-4" />

                {!gameStarted ? (
                  <div className="text-center">
                    <Button 
                      onClick={startGame}
                      disabled={!currentPassage}
                      className="bg-gradient-primary text-white text-sm sm:text-base lg:text-lg px-4 sm:px-6 lg:px-8 py-2 sm:py-3 lg:py-4"
                    >
                      Start Typing Race!
                    </Button>
                  </div>
                ) : (
                  <textarea
                    value={input}
                    onChange={(e) => handleInputChange(e.target.value)}
                    placeholder="Start typing here..."
                    className="w-full h-20 sm:h-24 lg:h-32 p-2 sm:p-3 bg-secondary border border-border rounded-md text-foreground font-mono resize-none focus:ring-2 focus:ring-gaming-blue focus:border-transparent text-xs sm:text-sm lg:text-base"
                    disabled={gameFinished}
                  />
                )}

                {gameFinished && stats.accuracy === 100 && (
                  <div className="mt-4 text-center">
                    <Badge variant="outline" className="text-sm sm:text-base lg:text-lg p-2 bg-gaming-green/20 text-gaming-green border-gaming-green">
                      <Trophy className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                      Race Complete!
                    </Badge>
                  </div>
                )}
              </Card>
            </div>

            {/* Players List */}
            <div className="xl:col-span-1 space-y-2 sm:space-y-3 lg:space-y-4">
              <h3 className="text-base sm:text-lg lg:text-xl font-bold text-foreground">Players</h3>
              
              <div className="space-y-2 max-h-96 sm:max-h-[500px] lg:max-h-[600px] overflow-y-auto">
                {players.map((player) => (
                  <Card key={player.id} className="p-2 sm:p-3 lg:p-4 bg-gradient-card border-border">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-foreground text-xs sm:text-sm lg:text-base truncate">
                        {player.name}
                        {player.is_host && (
                          <Badge variant="outline" className="ml-1 sm:ml-2 text-xs">Host</Badge>
                        )}
                        {player.name === playerName && (
                          <Badge variant="outline" className="ml-1 sm:ml-2 text-xs bg-gaming-blue/20 text-gaming-blue">
                            You
                          </Badge>
                        )}
                      </h4>
                    </div>
                    
                    <div className="space-y-1 sm:space-y-2">
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground">WPM:</span>
                        <span className="text-gaming-blue font-semibold">{player.wpm || 0}</span>
                      </div>
                      <div className="flex justify-between text-xs sm:text-sm">
                        <span className="text-muted-foreground">Accuracy:</span>
                        <span className={`font-semibold ${
                          (player.accuracy || 100) === 100 ? 'text-gaming-green' : 'text-gaming-orange'
                        }`}>
                          {player.accuracy || 100}%
                        </span>
                      </div>
                      <Progress value={player.progress || 0} className="h-1 sm:h-2" />
                      <div className="text-center text-xs text-muted-foreground">
                        {Math.round(player.progress || 0)}% Complete
                      </div>
                      {player.completion_time && (
                        <div className="text-center text-xs text-gaming-green font-semibold">
                          ✓ Completed
                        </div>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default MultiplayerGame;
