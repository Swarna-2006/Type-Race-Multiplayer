
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables, TablesInsert } from '@/integrations/supabase/types';

type Room = Tables<'rooms'>;
type Player = Tables<'players'>;

export const useSupabaseRooms = () => {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const testConnection = async () => {
    try {
      const { error } = await supabase.from('rooms').select('count').limit(1);
      if (error) {
        console.error('❌ Connection test failed:', error);
        throw new Error(`Database connection failed: ${error.message}`);
      }
      return true;
    } catch (error) {
      console.error('❌ Connection test exception:', error);
      throw error;
    }
  };

  const fetchRooms = async () => {
    try {
      console.log('🔍 Fetching rooms...');
      
      // Test Supabase connection first
      await testConnection();

      const { data: roomsData, error } = await supabase
        .from('rooms')
        .select('*')
        .eq('status', 'waiting')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching rooms:', error);
        throw error;
      }

      console.log('📊 Fetched rooms:', roomsData?.length || 0);

      // Get player counts for each room with error handling
      const roomsWithCounts = await Promise.all(
        (roomsData || []).map(async (room) => {
          try {
            const { count, error: countError } = await supabase
              .from('players')
              .select('*', { count: 'exact', head: true })
              .eq('room_id', room.id);

            if (countError) {
              console.warn(`⚠️ Failed to get player count for room ${room.id}:`, countError);
              return { ...room, current_players: 0 };
            }

            return {
              ...room,
              current_players: count || 0
            };
          } catch (countError) {
            console.warn(`⚠️ Exception getting player count for room ${room.id}:`, countError);
            return { ...room, current_players: 0 };
          }
        })
      );

      setRooms(roomsWithCounts);
      console.log('✅ Rooms updated successfully');
    } catch (error) {
      console.error('❌ Critical error in fetchRooms:', error);
      toast({
        title: "Database Connection Error",
        description: "Failed to connect to the database. Please refresh the page and try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createRoom = async (roomData: {
    name: string;
    difficulty: 'easy' | 'medium' | 'hard';
    isPrivate: boolean;
    password?: string;
    playerName: string;
    rounds?: number;
  }) => {
    try {
      console.log('🏗️ Creating room:', roomData.name);

      // Test connection first
      await testConnection();

      // Create room with transaction-like approach
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .insert({
          name: roomData.name,
          difficulty: roomData.difficulty,
          is_private: roomData.isPrivate,
          password: roomData.password,
          rounds: roomData.rounds || 1,
          status: 'waiting'
        })
        .select()
        .single();

      if (roomError) {
        console.error('❌ Room creation failed:', roomError);
        throw roomError;
      }

      console.log('✅ Room created successfully:', room.id);

      // Add the creator as the first player and host
      const { data: player, error: playerError } = await supabase
        .from('players')
        .insert({
          room_id: room.id,
          name: roomData.playerName,
          is_host: true
        })
        .select()
        .single();

      if (playerError) {
        console.error('❌ Host player creation failed:', playerError);
        // Cleanup: delete the room if player creation fails
        await supabase.from('rooms').delete().eq('id', room.id);
        throw playerError;
      }

      console.log('✅ Host player created:', player.id);

      // Update room with host player id
      const { error: updateError } = await supabase
        .from('rooms')
        .update({ host_player_id: player.id })
        .eq('id', room.id);

      if (updateError) {
        console.warn('⚠️ Failed to update room with host_player_id:', updateError);
        // This is not critical, continue
      }

      toast({
        title: "Room Created!",
        description: `Room "${roomData.name}" created successfully`,
      });

      return room.id;
    } catch (error) {
      console.error('❌ Critical error in createRoom:', error);
      toast({
        title: "Database Error",
        description: error instanceof Error ? error.message : "Failed to create room due to database connection issues",
        variant: "destructive",
      });
      throw error;
    }
  };

  const joinRoom = async (roomId: string, playerName: string, password?: string) => {
    try {
      console.log('🚪 Attempting to join room:', roomId, 'as player:', playerName);
      
      // Test connection first
      await testConnection();
      
      // Validate room exists and get room data
      const { data: room, error: roomError } = await supabase
        .from('rooms')
        .select('*')
        .eq('id', roomId)
        .eq('status', 'waiting')
        .maybeSingle();

      if (roomError) {
        console.error('❌ Room validation failed:', roomError);
        throw roomError;
      }
      
      if (!room) {
        console.error('❌ Room not found or no longer available:', roomId);
        throw new Error('Room not found or no longer available');
      }

      console.log('✅ Room found:', room.name);

      // Validate password for private rooms
      if (room.is_private && room.password !== password) {
        console.error('❌ Invalid password for private room');
        throw new Error('Invalid password');
      }

      // Check if player already exists in room
      const { data: existingPlayer, error: existingPlayerError } = await supabase
        .from('players')
        .select('id, name')
        .eq('room_id', roomId)
        .eq('name', playerName)
        .maybeSingle();

      if (existingPlayerError) {
        console.error('❌ Error checking existing player:', existingPlayerError);
        throw existingPlayerError;
      }

      if (existingPlayer) {
        console.log('✅ Player already exists in room, rejoining:', existingPlayer);
        toast({
          title: "Rejoined Room!",
          description: `Welcome back to ${room.name}`,
        });
        return roomId;
      }

      // Check current player count
      const { count: playerCount, error: countError } = await supabase
        .from('players')
        .select('*', { count: 'exact', head: true })
        .eq('room_id', roomId);

      if (countError) {
        console.error('❌ Error checking player count:', countError);
        throw countError;
      }

      console.log('📊 Current player count:', playerCount);

      if ((playerCount || 0) >= (room.max_players || 5)) {
        console.error('❌ Room is full');
        throw new Error('Room is full');
      }

      // Add player to room
      console.log('➕ Adding new player to room');
      const { data: newPlayer, error: playerError } = await supabase
        .from('players')
        .insert({
          room_id: roomId,
          name: playerName,
          is_host: false
        })
        .select()
        .single();

      if (playerError) {
        console.error('❌ Failed to add player:', playerError);
        throw playerError;
      }
      
      console.log('✅ Successfully added player:', newPlayer);

      toast({
        title: "Joined Room!",
        description: `Successfully joined ${room.name}`,
      });

      return roomId;
    } catch (error) {
      console.error('❌ Critical error in joinRoom:', error);
      const errorMessage = error instanceof Error ? error.message : "Failed to join room due to database connection issues";
      toast({
        title: "Database Error",
        description: errorMessage,
        variant: "destructive",
      });
      throw error;
    }
  };

  useEffect(() => {
    console.log('🔄 Initializing room subscriptions...');
    
    fetchRooms();

    // Subscribe to room changes only
    const roomsChannel = supabase
      .channel('rooms_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms'
        },
        (payload) => {
          console.log('🔄 Room change detected:', payload.eventType);
          
          // Safe access to payload properties with type guards
          const roomId = payload.new && typeof payload.new === 'object' && 'id' in payload.new 
            ? (payload.new as any).id 
            : payload.old && typeof payload.old === 'object' && 'id' in payload.old 
              ? (payload.old as any).id 
              : 'Unknown';
          
          console.log('🔄 Room affected:', roomId);
          fetchRooms();
        }
      )
      .subscribe((status) => {
        console.log('📡 Rooms channel status:', status);
        if (status === 'CHANNEL_ERROR') {
          console.error('❌ Room subscription failed');
          toast({
            title: "Connection Error",
            description: "Lost connection to the database. Please refresh the page.",
            variant: "destructive",
          });
        }
      });

    // Separate channel for player changes to update room counts
    const playersChannel = supabase
      .channel('players_channel')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players'
        },
        (payload) => {
          console.log('👥 Player change detected:', payload.eventType);
          
          // Safe access to payload properties with type guards
          const playerName = payload.new && typeof payload.new === 'object' && 'name' in payload.new 
            ? (payload.new as any).name 
            : payload.old && typeof payload.old === 'object' && 'name' in payload.old 
              ? (payload.old as any).name 
              : 'Unknown';
          
          console.log('👥 Player affected:', playerName);
          
          // Only refetch rooms when players are added/removed to update counts
          if (payload.eventType === 'INSERT' || payload.eventType === 'DELETE') {
            fetchRooms();
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Players channel status:', status);
        if (status === 'CHANNEL_ERROR') {
          console.error('❌ Player subscription failed');
        }
      });

    return () => {
      console.log('🧹 Cleaning up room subscriptions');
      supabase.removeChannel(roomsChannel);
      supabase.removeChannel(playersChannel);
    };
  }, []);

  return {
    rooms,
    loading,
    createRoom,
    joinRoom,
    refetch: fetchRooms
  };
};
