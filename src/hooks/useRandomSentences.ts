import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Sentence = Tables<'sentences'>;

export const useRandomSentences = () => {
  const [sentences, setSentences] = useState<Sentence[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSentences = async () => {
    try {
      const { data, error } = await supabase
        .from('sentences')
        .select('*')
        .order('created_at');

      if (error) throw error;
      setSentences(data || []);
    } catch (error) {
      console.error('Error fetching sentences:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRandomSentence = (difficulty: 'easy' | 'medium' | 'hard', excludeIds: string[] = []): Sentence | null => {
    const filtered = sentences.filter(s => 
      s.difficulty === difficulty && !excludeIds.includes(s.id)
    );
    
    if (filtered.length === 0) return null;
    
    const randomIndex = Math.floor(Math.random() * filtered.length);
    return filtered[randomIndex];
  };

  useEffect(() => {
    fetchSentences();
  }, []);

  return {
    sentences,
    loading,
    getRandomSentence,
    refetch: fetchSentences
  };
};