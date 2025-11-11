import { useState, useRef, useCallback } from "react";
import Webcam from "react-webcam";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Camera, StopCircle, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

const Register = () => {
  const [name, setName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [studentClass, setStudentClass] = useState("");
  const [section, setSection] = useState("");
  const [capturedImages, setCapturedImages] = useState<string[]>([]);
  const [isCapturing, setIsCapturing] = useState(false);
  const [loading, setLoading] = useState(false);
  const webcamRef = useRef<Webcam>(null);
  const { toast } = useToast();
  const navigate = useNavigate();

  const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:5000";

  const captureImage = useCallback(() => {
    if (webcamRef.current && capturedImages.length < 20) {
      const imageSrc = webcamRef.current.getScreenshot();
      if (imageSrc) {
        setCapturedImages((prev) => [...prev, imageSrc]);
        toast({
          title: "Image Captured",
          description: `Captured ${capturedImages.length + 1}/20 images`,
        });
      }
    }
  }, [capturedImages.length, toast]);

  const handleRegister = async () => {
    if (!name || !rollNumber || !studentClass || !section) {
      toast({
        title: "Error",
        description: "Please fill all fields",
        variant: "destructive",
      });
      return;
    }

    if (capturedImages.length < 20) {
      toast({
        title: "Error",
        description: "Please capture 20 images for registration",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API_BASE_URL}/register_user`, {
        name,
        roll_number: rollNumber,
        class: studentClass,
        section,
        images: capturedImages,
      });

      toast({
        title: "✅ Registered Successfully",
        description: "Your face has been registered in the system",
      });

      setTimeout(() => navigate("/"), 2000);
    } catch (error: any) {
      toast({
        title: "Registration Failed",
        description: error.response?.data?.error || "Failed to register. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4">
        <div className="mb-6">
          <Link to="/">
            <Button variant="outline" size="sm">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </Link>
        </div>

        <h1 className="text-4xl font-bold text-center mb-8 bg-gradient-primary bg-clip-text text-transparent">
          Register New User
        </h1>

        <div className="grid md:grid-cols-2 gap-8 max-w-6xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle>User Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter full name"
                />
              </div>
              <div>
                <Label htmlFor="rollNumber">Roll Number</Label>
                <Input
                  id="rollNumber"
                  value={rollNumber}
                  onChange={(e) => setRollNumber(e.target.value)}
                  placeholder="Enter roll number"
                />
              </div>
              <div>
                <Label htmlFor="class">Class</Label>
                <Input
                  id="class"
                  value={studentClass}
                  onChange={(e) => setStudentClass(e.target.value)}
                  placeholder="Enter class"
                />
              </div>
              <div>
                <Label htmlFor="section">Section</Label>
                <Input
                  id="section"
                  value={section}
                  onChange={(e) => setSection(e.target.value)}
                  placeholder="Enter section"
                />
              </div>
              <Button
                onClick={handleRegister}
                disabled={loading || capturedImages.length < 20}
                className="w-full"
                size="lg"
              >
                {loading ? "Registering..." : "Register User"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Face Capture ({capturedImages.length}/20)</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
                {isCapturing ? (
                  <Webcam
                    ref={webcamRef}
                    audio={false}
                    screenshotFormat="image/jpeg"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground">Camera is off</p>
                  </div>
                )}
              </div>

              <div className="flex gap-4">
                <Button
                  onClick={() => setIsCapturing(!isCapturing)}
                  variant={isCapturing ? "destructive" : "default"}
                  className="flex-1"
                >
                  {isCapturing ? (
                    <>
                      <StopCircle className="mr-2 h-4 w-4" />
                      Stop Camera
                    </>
                  ) : (
                    "Start Camera"
                  )}
                </Button>
                <Button
                  onClick={captureImage}
                  disabled={!isCapturing || capturedImages.length >= 20}
                  className="flex-1"
                >
                  <Camera className="mr-2 h-4 w-4" />
                  Capture ({capturedImages.length}/20)
                </Button>
              </div>

              {capturedImages.length > 0 && (
                <div className="grid grid-cols-5 gap-2 max-h-48 overflow-y-auto">
                  {capturedImages.map((img, idx) => (
                    <img
                      key={idx}
                      src={img}
                      alt={`Capture ${idx + 1}`}
                      className="w-full aspect-square object-cover rounded border"
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Register;