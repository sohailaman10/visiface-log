/**
 * Registration Page
 * Auto-captures 3 face embeddings client-side using face-api.js.
 * Sends ONLY embeddings (not images) to the backend.
 */
import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';
import FaceScanner from '@/components/FaceScanner';

const REQUIRED_EMBEDDINGS = 3;

export default function Register() {
  const [name, setName] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [studentClass, setStudentClass] = useState('');
  const [section, setSection] = useState('');
  const [embeddings, setEmbeddings] = useState<number[][]>([]);
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  const captureCount = embeddings.length;
  const allCaptured = captureCount >= REQUIRED_EMBEDDINGS;

  // Called by FaceScanner when a valid embedding is extracted
  const handleEmbeddingCaptured = useCallback(
    (embedding: number[]) => {
      if (embeddings.length >= REQUIRED_EMBEDDINGS) return;

      setEmbeddings(prev => {
        if (prev.length >= REQUIRED_EMBEDDINGS) return prev;
        const next = [...prev, embedding];
        toast({
          title: `Face ${next.length}/${REQUIRED_EMBEDDINGS} captured`,
          description: `${REQUIRED_EMBEDDINGS - next.length} more needed`,
        });
        if (next.length >= REQUIRED_EMBEDDINGS) {
          setScanning(false); // Stop scanner
        }
        return next;
      });
    },
    [embeddings.length, toast]
  );

  const handleRegister = async () => {
    if (!name || !rollNumber || !studentClass || !section) {
      toast({ title: 'Error', description: 'Please fill all fields', variant: 'destructive' });
      return;
    }
    if (!allCaptured) {
      toast({ title: 'Error', description: `Capture ${REQUIRED_EMBEDDINGS} face samples first`, variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('register-user', {
        body: {
          name,
          roll_number: rollNumber,
          class: studentClass,
          section,
          embeddings, // Send ONLY embeddings, not images
        },
      });

      if (error) throw error;

      toast({
        title: '✅ Registered Successfully',
        description: `${name} registered with ${REQUIRED_EMBEDDINGS} face embeddings.`,
      });
      setTimeout(() => navigate('/'), 2000);
    } catch (error: any) {
      toast({
        title: 'Registration Failed',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const resetCaptures = () => {
    setEmbeddings([]);
    setScanning(true);
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
          {/* User Info Form */}
          <Card>
            <CardHeader>
              <CardTitle>User Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" value={name} onChange={e => setName(e.target.value)} placeholder="Enter full name" />
              </div>
              <div>
                <Label htmlFor="rollNumber">Roll Number</Label>
                <Input id="rollNumber" value={rollNumber} onChange={e => setRollNumber(e.target.value)} placeholder="Enter roll number" />
              </div>
              <div>
                <Label htmlFor="class">Class</Label>
                <Input id="class" value={studentClass} onChange={e => setStudentClass(e.target.value)} placeholder="Enter class" />
              </div>
              <div>
                <Label htmlFor="section">Section</Label>
                <Input id="section" value={section} onChange={e => setSection(e.target.value)} placeholder="Enter section" />
              </div>

              {/* Capture Progress */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Face Embeddings</span>
                  <span className="font-medium">{captureCount}/{REQUIRED_EMBEDDINGS}</span>
                </div>
                <Progress value={(captureCount / REQUIRED_EMBEDDINGS) * 100} />
                <div className="flex gap-2">
                  {Array.from({ length: REQUIRED_EMBEDDINGS }).map((_, i) => (
                    <div
                      key={i}
                      className={`flex-1 h-2 rounded-full ${
                        i < captureCount ? 'bg-green-500' : 'bg-muted'
                      }`}
                    />
                  ))}
                </div>
              </div>

              {allCaptured && (
                <div className="flex items-center gap-2 text-green-600 text-sm">
                  <CheckCircle2 className="h-4 w-4" />
                  All face samples captured!
                </div>
              )}

              <Button
                onClick={handleRegister}
                disabled={loading || !allCaptured}
                className="w-full"
                size="lg"
              >
                {loading ? 'Registering...' : 'Register User'}
              </Button>
            </CardContent>
          </Card>

          {/* Face Scanner */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Face Capture ({captureCount}/{REQUIRED_EMBEDDINGS})</span>
                {allCaptured && (
                  <Button variant="outline" size="sm" onClick={resetCaptures}>
                    Retake
                  </Button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Face detection runs automatically. Look at the camera and hold still —
                3 samples will be captured when your face is clearly detected and centered.
              </p>

              {!scanning && !allCaptured ? (
                <div className="space-y-4">
                  <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                    <p className="text-muted-foreground">Camera is off</p>
                  </div>
                  <Button onClick={() => setScanning(true)} className="w-full">
                    Start Face Capture
                  </Button>
                </div>
              ) : (
                <FaceScanner
                  onEmbeddingCaptured={handleEmbeddingCaptured}
                  autoCapture={!allCaptured}
                  enabled={scanning && !allCaptured}
                  captureDelay={2000}
                />
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
