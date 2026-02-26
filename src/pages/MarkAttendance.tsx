/**
 * Mark Attendance Page
 * Real-time face scanning with auto-recognition.
 * Extracts 128D embedding client-side, sends to backend for matching.
 * NO AI API calls — pure mathematical cosine similarity.
 */
import { useState, useCallback, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import FaceScanner from '@/components/FaceScanner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface AttendanceResult {
  name: string;
  roll_number: string;
  class: string;
  section: string;
  confidence: number;
}

export default function MarkAttendance() {
  const [scanning, setScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<AttendanceResult | null>(null);
  const [showDialog, setShowDialog] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const cooldownRef = useRef(false);
  const { toast } = useToast();

  const handleEmbeddingCaptured = useCallback(
    async (embedding: number[]) => {
      // Prevent rapid-fire requests
      if (loading || cooldownRef.current) return;
      cooldownRef.current = true;
      setLoading(true);
      setStatusMessage('Matching face...');

      try {
        // Send ONLY the embedding vector to backend — no images
        const { data, error } = await supabase.functions.invoke('mark-attendance', {
          body: { embedding },
        });

        if (error) {
          // Parse edge function error
          let msg = 'Face not recognized';
          try {
            const body = typeof error.context?.body === 'string'
              ? JSON.parse(error.context.body)
              : error.context?.body;
            msg = body?.error || msg;
          } catch { /* use default */ }

          if (msg.includes('already marked')) {
            setStatusMessage('Already marked recently');
            toast({ title: '⚠️ Already Marked', description: msg });
          } else {
            setStatusMessage('Not recognized');
            toast({ title: 'Not Recognized', description: msg, variant: 'destructive' });
          }
        } else if (data?.success) {
          setSuccessData(data);
          setShowDialog(true);
          setStatusMessage(`Recognized: ${data.name}`);
          toast({ title: '✅ Attendance Marked', description: `${data.name} — ${data.confidence}% confidence` });
        }
      } catch (err: any) {
        setStatusMessage('Error occurred');
        toast({ title: 'Error', description: err.message || 'Unknown error', variant: 'destructive' });
      } finally {
        setLoading(false);
        // 3-second cooldown before next scan
        setTimeout(() => {
          cooldownRef.current = false;
          setStatusMessage('');
        }, 3000);
      }
    },
    [loading, toast]
  );

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
          Mark Attendance
        </h1>

        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Face Scanner</span>
              {loading && (
                <span className="text-sm font-normal text-muted-foreground animate-pulse">
                  Processing...
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!scanning ? (
              <div className="space-y-4">
                <div className="aspect-video bg-muted rounded-lg flex items-center justify-center">
                  <div className="text-center space-y-2">
                    <p className="text-muted-foreground">Click below to start scanning</p>
                    <p className="text-xs text-muted-foreground">
                      Face detection runs in your browser — no images are uploaded
                    </p>
                  </div>
                </div>
                <Button onClick={() => setScanning(true)} className="w-full" size="lg">
                  Start Scanner
                </Button>
              </div>
            ) : (
              <>
                <FaceScanner
                  onEmbeddingCaptured={handleEmbeddingCaptured}
                  autoCapture={true}
                  enabled={scanning}
                  captureDelay={3000}
                />
                {statusMessage && (
                  <div className="text-center text-sm font-medium text-muted-foreground">
                    {statusMessage}
                  </div>
                )}
                <Button
                  onClick={() => setScanning(false)}
                  variant="outline"
                  className="w-full"
                >
                  Stop Scanner
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-green-600">✅ Attendance Marked Successfully</DialogTitle>
            <DialogDescription>
              <div className="mt-4 space-y-2">
                <p><strong>Name:</strong> {successData?.name}</p>
                <p><strong>Roll Number:</strong> {successData?.roll_number}</p>
                <p><strong>Class:</strong> {successData?.class} - {successData?.section}</p>
                <p><strong>Confidence:</strong> {successData?.confidence}%</p>
                <p><strong>Time:</strong> {new Date().toLocaleString()}</p>
              </div>
            </DialogDescription>
          </DialogHeader>
        </DialogContent>
      </Dialog>
    </div>
  );
}
