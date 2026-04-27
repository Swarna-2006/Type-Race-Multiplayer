
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import type { Tables } from '@/integrations/supabase/types';

type Player = Tables<'players'>;

export const useSupabasePlayers = (roomId: string | null, playerId: string | null) => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [loading, setLoading] = useState(true);
  const [roomDeleted, setRoomDeleted] = useState(false);
  const [hasRedirected, setHasRedirected] = useState(false);
  const [hasShownError, setHasShownError] = useState(false);
  const { toast } = useToast();

  const testConnection = async () => {
    try {
      const { error } = await supabase.from('players').select('count').limit(1);
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

  const fetchPlayers = async () => {
    if (!roomId) {
      console.log('⚠️ No roomId provided for fetchPlayers');
      setLoading(false);
      return;
    }

    try {
      console.log('👥 Fetching players for room:', roomId);

      // Test connection before fetching
      await testConnection();

      const { data, error } = await supabase
        .from('players')
        .select('*')
        .eq('room_id', roomId)
        .order('joined_at');

      if (error) {
        console.error('❌ Error fetching players:', error);
        throw error;
      }

      console.log('✅ Fetched players:', data?.length || 0);
      setPlayers(data || []);

      if (playerId) {
        const player = data?.find(p => p.id === playerId);
        setCurrentPlayer(player || null);
        console.log('👤 Current player found:', player?.name || 'Not found');
      }
    } catch (error) {
      console.error('❌ Critical error in fetchPlayers:', error);
      // Only show error toast once and if room is not deleted
      if (!roomDeleted && !hasShownError) {
        setHasShownError(true);
        toast({
          title: "Connection Error",
          description: "Failed to load player data. Please refresh the page.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const updatePlayerStats = async (stats: {
    input_text: string;
    wpm: number;
    accuracy: number;
    progress: number;
  }) => {
    if (!playerId || roomDeleted) {
      return;
    }

    try {
      const { error } = await supabase
        .from('players')
        .update({
          ...stats,
          updated_at: new Date().toISOString()
        })
        .eq('id', playerId);

      if (error) {
        console.error('❌ Error updating player stats:', error);
        throw error;
      }
    } catch (error) {
      console.error('❌ Critical error in updatePlayerStats:', error);
    }
  };

  const leaveRoom = async () => {
    if (!playerId || !currentPlayer || !roomId || roomDeleted) {
      console.log('⚠️ Missing required data for leaveRoom or room already deleted');
      return;
    }

    try {
      console.log('🚪 Player leaving room:', currentPlayer.name, 'Is host:', currentPlayer.is_host);
      
      // If this is the host leaving, delete the entire room
      if (currentPlayer.is_host) {
        console.log('👑 Host is leaving, deleting room');
        
        // Delete the room (players will be cascaded)
        const { error: roomDeleteError } = await supabase
          .from('rooms')
          .delete()
          .eq('id', roomId);
        
        if (roomDeleteError) {
          console.error('❌ Error deleting room:', roomDeleteError);
          throw roomDeleteError;
        }
        
        console.log('✅ Room deleted successfully by host');
      } else {
        // If it's a regular player, just remove them
        console.log('👤 Regular player leaving');
        const { error: playerDeleteError } = await supabase
          .from('players')
          .delete()
          .eq('id', playerId);
        
        if (playerDeleteError) {
          console.error('❌ Error removing player:', playerDeleteError);
          throw playerDeleteError;
        }
        
        console.log('✅ Player removed successfully');
      }
    } catch (error) {
      console.error('❌ Critical error in leaveRoom:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (!roomId) return;

    console.log('🔄 Setting up player subscriptions for room:', roomId);
    
    fetchPlayers();

    // Subscribe to player changes
    const channel = supabase
      .channel(`players_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'players',
          filter: `room_id=eq.${roomId}`
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
          fetchPlayers();
        }
      )
      .subscribe((status) => {
        console.log('📡 Players subscription status:', status);
        if (status === 'CHANNEL_ERROR' && !roomDeleted && !hasShownError) {
          console.error('❌ Player subscription failed');
          setHasShownError(true);
          toast({
            title: "Connection Error",
            description: "Lost connection to player updates. Please refresh the page.",
            variant: "destructive",
          });
        }
      });

    // Subscribe to room deletions to redirect players
    const roomChannel = supabase
      .channel(`room_${roomId}`)
      .on(
        'postgres_changes',
        {
          event: 'DELETE',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${roomId}`
        },
        () => {
          console.log('🏠 Room deleted, handling redirect');
          
          if (!hasRedirected) {
            setRoomDeleted(true);
            setHasRedirected(true);
            
            toast({
              title: "Room Closed",
              description: "The room has been closed by the host. Redirecting to lobby...",
              variant: "destructive",
            });
            
            // Redirect after a short delay to allow the toast to be seen
            setTimeout(() => {
              window.location.href = '/lobby';
            }, 2000);
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Room deletion subscription status:', status);
        if (status === 'CHANNEL_ERROR' && !roomDeleted && !hasShownError) {
          console.error('❌ Room deletion subscription failed');
        }
      });

    return () => {
      console.log('🧹 Cleaning up player subscriptions');
      supabase.removeChannel(channel);
      supabase.removeChannel(roomChannel);
    };
  }, [roomId, playerId, hasRedirected]);

  // Clean shutdown handling - no automatic leaving to prevent accidental room deletion
  useEffect(() => {
    const handleBeforeUnload = () => {
      // Only cleanup non-host players automatically
      if (playerId && currentPlayer && !currentPlayer.is_host && !roomDeleted) {
        console.log('🧹 Auto-cleanup for non-host player on page unload');
        // Use sendBeacon for reliable cleanup
        const payload = JSON.stringify({ 
          action: 'cleanup_player', 
          playerId: playerId,
          roomId: roomId 
        });
        navigator.sendBeacon('/api/cleanup', payload);
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      // Explicitly NOT calling leaveRoom here to prevent accidental deletions
    };
  }, [playerId, roomId, currentPlayer, roomDeleted]);

  return {
    players,
    currentPlayer,
    loading,
    updatePlayerStats,
    leaveRoom,
    refetch: fetchPlayers,
    roomDeleted
  };
};
