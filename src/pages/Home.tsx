import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { UserPlus, Camera } from "lucide-react";
import { Link } from "react-router-dom";

const Home = () => {
  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-12">
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
            Face Recognition Attendance System
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Automated attendance tracking using advanced face recognition technology
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          <Card className="border-2 hover:border-primary transition-all duration-300 hover:shadow-lg">
            <CardContent className="p-8">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center">
                  <UserPlus className="w-10 h-10 text-primary-foreground" />
                </div>
                <h2 className="text-2xl font-semibold">Register Face</h2>
                <p className="text-muted-foreground">
                  Register your face in the system by capturing multiple images for accurate recognition
                </p>
                <Link to="/register" className="w-full">
                  <Button className="w-full" size="lg">
                    Get Started
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 hover:border-primary transition-all duration-300 hover:shadow-lg">
            <CardContent className="p-8">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-20 h-20 rounded-full bg-gradient-primary flex items-center justify-center">
                  <Camera className="w-10 h-10 text-primary-foreground" />
                </div>
                <h2 className="text-2xl font-semibold">Mark Attendance</h2>
                <p className="text-muted-foreground">
                  Scan your face to mark your attendance quickly and securely
                </p>
                <Link to="/mark" className="w-full">
                  <Button className="w-full" size="lg">
                    Scan Now
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="text-center mt-12">
          <Link to="/admin/login">
            <Button variant="outline" size="lg">
              Admin Login
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Home;