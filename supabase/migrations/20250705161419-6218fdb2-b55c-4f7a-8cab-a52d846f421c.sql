-- Add sample sentences for typing races
INSERT INTO public.sentences (content, difficulty, length) VALUES
  ('The quick brown fox jumps over the lazy dog.', 'easy', 43),
  ('Pack my box with five dozen liquor jugs.', 'easy', 38),
  ('How vexingly quick daft zebras jump!', 'easy', 35),
  ('Bright vixens jump; dozy fowl quack.', 'easy', 34),
  ('Sphinx of black quartz, judge my vow.', 'easy', 35),
  
  ('The five boxing wizards jump quickly and gracefully across the stage.', 'medium', 68),
  ('Programming is like solving a puzzle where every piece must fit perfectly together.', 'medium', 84),
  ('Efficient algorithms require careful analysis of time and space complexity.', 'medium', 74),
  ('Modern web development involves JavaScript, CSS, HTML, and various frameworks.', 'medium', 79),
  ('Database optimization can significantly improve application performance and user experience.', 'medium', 92),
  
  ('Asynchronous programming paradigms enable developers to write non-blocking, concurrent applications.', 'hard', 98),
  ('Machine learning algorithms utilize statistical methods to identify patterns in large datasets.', 'hard', 94),
  ('Quantum computing represents a fundamental shift in computational methodologies and possibilities.', 'hard', 96),
  ('Cybersecurity professionals must constantly adapt to evolving threats and vulnerabilities.', 'hard', 90),
  ('Distributed systems architecture requires consideration of network latency, fault tolerance, and scalability.', 'hard', 107);