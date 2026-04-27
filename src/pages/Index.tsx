import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Link } from 'react-router-dom';

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-gradient-primary">
        <div className="absolute inset-0 bg-black/20"></div>
        <div className="relative z-10 max-w-4xl mx-auto px-6 py-20 text-center">
          <h1 className="text-6xl font-bold text-white mb-6">
            Type<span className="text-gaming-orange">Race</span>
          </h1>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Challenge your friends in the ultimate typing competition. Test your speed, accuracy, and endurance in head-to-head typing battles.
          </p>
        </div>
      </div>

      {/* Features Section */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        <h2 className="text-3xl font-bold text-center mb-8 text-foreground">
          Game Features
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="p-6 bg-gradient-card border-border text-center">
            <div className="w-16 h-16 bg-gaming-blue/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🏠</span>
            </div>
            <h3 className="text-xl font-semibold mb-3 text-foreground">Room System</h3>
            <p className="text-muted-foreground">
              Create or join rooms with up to 5 players for multiplayer typing battles.
            </p>
          </Card>

          <Card className="p-6 bg-gradient-card border-border text-center">
            <div className="w-16 h-16 bg-gaming-green/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">⚡</span>
            </div>
            <h3 className="text-xl font-semibold mb-3 text-foreground">Real-time Competition</h3>
            <p className="text-muted-foreground">
              Race against opponents in real-time with live WPM and accuracy tracking.
            </p>
          </Card>

          <Card className="p-6 bg-gradient-card border-border text-center">
            <div className="w-16 h-16 bg-gaming-purple/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🔒</span>
            </div>
            <h3 className="text-xl font-semibold mb-3 text-foreground">Private Rooms</h3>
            <p className="text-muted-foreground">
              Create password-protected rooms for private competitions with friends.
            </p>
          </Card>

          <Card className="p-6 bg-gradient-card border-border text-center">
            <div className="w-16 h-16 bg-gaming-orange/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl">🎯</span>
            </div>
            <h3 className="text-xl font-semibold mb-3 text-foreground">Multiple Difficulties</h3>
            <p className="text-muted-foreground">
              Choose from easy, medium, or hard passages to match your skill level.
            </p>
          </Card>
        </div>

        {/* Call to Action */}
        <div className="text-center mt-8">
          <h2 className="text-3xl font-bold mb-4 text-foreground">
            Ready to Race?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Test your typing skills against a friend and see who's the fastest!
          </p>
          <Link to="/lobby">
            <Button size="lg" className="bg-gradient-primary text-white text-lg px-8 py-4 shadow-intense">
              Enter the Arena
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Index;
