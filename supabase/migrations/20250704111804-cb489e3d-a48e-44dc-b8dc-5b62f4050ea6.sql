-- Enable realtime for players table
ALTER TABLE public.players REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.players;

-- Enable realtime for rooms table  
ALTER TABLE public.rooms REPLICA IDENTITY FULL;
ALTER publication supabase_realtime ADD TABLE public.rooms;