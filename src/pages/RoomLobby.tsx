import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { ArrowLeft, Plus, Lock, Users, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useSupabaseRooms } from '@/hooks/useSupabaseRooms';
import type { Tables } from '@/integrations/supabase/types';

type Room = Tables<'rooms'>;

const RoomLobby = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { rooms, loading, createRoom, joinRoom } = useSupabaseRooms();
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState('');
  const [joinPassword, setJoinPassword] = useState('');
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  
  // Create room form
  const [roomName, setRoomName] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [password, setPassword] = useState('');
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [rounds, setRounds] = useState(1);

  const handleCreateRoom = async () => {
    if (!roomName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a room name",
        variant: "destructive",
      });
      return;
    }

    if (!playerName.trim()) {
      toast({
        title: "Error",
        description: "Please enter your player name",
        variant: "destructive",
      });
      return;
    }

    try {
      const roomId = await createRoom({
        name: roomName,
        difficulty,
        isPrivate,
        password: isPrivate ? password : undefined,
        playerName,
        rounds
      });

      navigate(`/race?room=${roomId}&player=${playerName}`);
    } catch (error) {
      // Error is handled in the hook
    }
  };

  const handleJoinRoom = (room: Room) => {
    if (room.is_private) {
      setSelectedRoom(room);
      setShowJoinModal(true);
    } else {
      if (!playerName.trim()) {
        toast({
          title: "Error",
          description: "Please enter your player name first",
          variant: "destructive",
        });
        return;
      }
      
      joinRoom(room.id, playerName).then(() => {
        navigate(`/race?room=${room.id}&player=${playerName}`);
      }).catch(() => {
        // Error handled in hook
      });
    }
  };

  const handleJoinPrivateRoom = async () => {
    if (!joinPassword.trim()) {
      toast({
        title: "Error",
        description: "Please enter the room password",
        variant: "destructive",
      });
      return;
    }

    if (!playerName.trim()) {
      toast({
        title: "Error", 
        description: "Please enter your player name",
        variant: "destructive",
      });
      return;
    }

    if (!selectedRoom) return;

    try {
      await joinRoom(selectedRoom.id, playerName, joinPassword);
      setShowJoinModal(false);
      navigate(`/race?room=${selectedRoom.id}&player=${playerName}`);
    } catch (error) {
      // Error handled in hook
    }
  };

  const handleJoinByRoomId = async () => {
    if (!joinRoomId.trim()) {
      toast({
        title: "Error",
        description: "Please enter a room code",
        variant: "destructive",
      });
      return;
    }

    if (!playerName.trim()) {
      toast({
        title: "Error",
        description: "Please enter your player name",
        variant: "destructive",
      });
      return;
    }

    try {
      await joinRoom(joinRoomId, playerName);

      navigate(`/race?room=${joinRoomId}&player=${playerName}`);
    } catch (error: any) {
      console.log("Join error:", error);

      // 🔥 HANDLE PROPER ERROR MESSAGE
      toast({
        title: "Join Failed",
        description:
          error?.message || "Room not found or invalid code",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background p-3 sm:p-4 lg:p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6 lg:mb-8">
          <div className="flex items-center gap-2 sm:gap-4">
            <Link to="/">
              <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                <ArrowLeft className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Back to Home</span>
                <span className="sm:hidden">Back</span>
              </Button>
            </Link>
            <div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Typing Arena
              </h1>
            </div>
          </div>
          
          <Button 
            onClick={() => setShowCreateRoom(!showCreateRoom)}
            className="bg-gaming-purple hover:bg-gaming-purple/80 text-sm sm:text-base w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 mr-2" />
            {showCreateRoom ? 'Hide Form' : 'Create Room'}
          </Button>
        </div>

        {/* Mobile-first layout */}
        <div className="space-y-4 lg:space-y-0 lg:grid lg:grid-cols-3 lg:gap-8">
          {/* Player Name Input - Show first on mobile */}
          <div className="lg:order-2 lg:col-span-1">
            <div className="space-y-4">
              {/* Player Name Card */}
              <Card className="p-4 sm:p-6 bg-gradient-card border-border">
                <h3 className="text-lg sm:text-xl font-bold mb-4 text-foreground">Your Display Name</h3>
                
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="playerNameGlobal" className="text-sm sm:text-base">Display Name</Label>
                    <Input
                      id="playerNameGlobal"
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="Enter your display name"
                      className="mt-1 text-sm sm:text-base"
                    />
                  </div>
                </div>
              </Card>

              {/* Create Room Form */}
              {showCreateRoom && (
                <Card className="p-4 sm:p-6 bg-gradient-card border-border">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg sm:text-xl font-bold text-foreground">Create New Room</h3>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => setShowCreateRoom(false)}
                      className="lg:hidden"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="roomName" className="text-sm sm:text-base">Room Name</Label>
                      <Input
                        id="roomName"
                        value={roomName}
                        onChange={(e) => setRoomName(e.target.value)}
                        placeholder="Enter room name"
                        className="mt-1 text-sm sm:text-base"
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="difficulty" className="text-sm sm:text-base">Difficulty</Label>
                        <select
                          id="difficulty"
                          value={difficulty}
                          onChange={(e) => setDifficulty(e.target.value as 'easy' | 'medium' | 'hard')}
                          className="w-full mt-1 px-3 py-2 bg-secondary border border-border rounded-md text-foreground text-sm sm:text-base"
                        >
                          <option value="easy">Easy</option>
                          <option value="medium">Medium</option>
                          <option value="hard">Hard</option>
                        </select>
                      </div>
                      
                      <div>
                        <Label htmlFor="rounds" className="text-sm sm:text-base">Rounds</Label>
                        <select
                          id="rounds"
                          value={rounds}
                          onChange={(e) => setRounds(parseInt(e.target.value))}
                          className="w-full mt-1 px-3 py-2 bg-secondary border border-border rounded-md text-foreground text-sm sm:text-base"
                        >
                          <option value={1}>1 Round</option>
                          <option value={3}>3 Rounds</option>
                          <option value={5}>5 Rounds</option>
                          <option value={10}>10 Rounds</option>
                        </select>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="private"
                        checked={isPrivate}
                        onChange={(e) => setIsPrivate(e.target.checked)}
                        className="rounded"
                      />
                      <Label htmlFor="private" className="text-sm sm:text-base">Private Room</Label>
                    </div>
                    
                    {isPrivate && (
                      <div>
                        <Label htmlFor="password" className="text-sm sm:text-base">Password</Label>
                        <Input
                          id="password"
                          type="password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="Enter password"
                          className="mt-1 text-sm sm:text-base"
                        />
                      </div>
                    )}
                    
                    <Button 
                      onClick={handleCreateRoom}
                      className="w-full bg-gaming-purple hover:bg-gaming-purple/80 text-sm sm:text-base"
                      disabled={!playerName.trim()}
                    >
                      Create Room
                    </Button>
                  </div>
                </Card>
              )}
            </div>
          </div>

          {/* Room List */}
          <div className="lg:order-1 lg:col-span-2">
            <h2 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-6 text-foreground">Available Rooms</h2>

            
            {loading ? (
              <div className="text-center py-8">
                <div className="text-muted-foreground text-sm sm:text-base">Loading rooms...</div>
              </div>
            ) : rooms.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-muted-foreground text-sm sm:text-base">No rooms available. Create one to get started!</div>
              </div>
            ) : (
              <div className="space-y-3 sm:space-y-4">
                {rooms.map((room) => (
                  <Card key={room.id} className="p-3 sm:p-4 lg:p-6 bg-gradient-card border-border hover:border-gaming-purple/50 transition-colors">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <h3 className="text-base sm:text-lg lg:text-xl font-semibold text-foreground truncate">
                            {room.name}
                          </h3>
                          {room.is_private && <Lock className="w-3 h-3 sm:w-4 sm:h-4 text-gaming-orange flex-shrink-0" />}
                          <Badge variant="outline" className="text-gaming-purple border-gaming-purple text-xs sm:text-sm">
                            {room.difficulty}
                          </Badge>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <Users className="w-3 h-3 sm:w-4 sm:h-4" />
                            {(room as any).current_players || 0}/{room.max_players}
                          </div>
                          <div>Rounds: {room.rounds}</div>
                          <div className="break-all">ID: {room.id.slice(0, 8)}</div>
                        </div>
                      </div>
                      
                      <Button 
                        onClick={() => handleJoinRoom(room)}
                        className="bg-gaming-green hover:bg-gaming-green/80 text-sm sm:text-base w-full sm:w-auto sm:min-w-[80px]"
                        disabled={!playerName.trim()}
                      >
                        Join
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Private Room Join Modal */}
        {showJoinModal && selectedRoom && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <Card className="p-4 sm:p-6 bg-gradient-card border-border w-full max-w-md mx-4">
              <h3 className="text-lg sm:text-xl font-bold mb-4 text-foreground">
                Join Private Room: {selectedRoom.name}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="joinPassword" className="text-sm sm:text-base">Password</Label>
                  <Input
                    id="joinPassword"
                    type="password"
                    value={joinPassword}
                    onChange={(e) => setJoinPassword(e.target.value)}
                    placeholder="Enter room password"
                    className="mt-1 text-sm sm:text-base"
                  />
                </div>
                
                <div className="flex flex-col sm:flex-row gap-2">
                  <Button 
                    onClick={handleJoinPrivateRoom}
                    className="flex-1 bg-gaming-green hover:bg-gaming-green/80 text-sm sm:text-base"
                    disabled={!playerName.trim()}
                  >
                    Join
                  </Button>
                  <Button 
                    onClick={() => {
                      setShowJoinModal(false);
                      setJoinPassword('');
                    }}
                    variant="outline"
                    className="flex-1 text-sm sm:text-base"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default RoomLobby;
