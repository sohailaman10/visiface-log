import { useState, useRef, useCallback } from "react";
import Webcam from "react-webcam";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Play, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const MarkAttendance = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [loading, setLoading] = useState(false);
  const [successData, setSuccessData] = useState<any>(null);
  const [showDialog, setShowDialog] = useState(false);
  const webcamRef = useRef<Webcam>(null);
  const { toast } = useToast();

  const scanFace = useCallback(async () => {
    if (!webcamRef.current) return;

    const imageSrc = webcamRef.current.getScreenshot();
    if (!imageSrc) {
      toast({
        title: "Error",
        description: "Failed to capture image",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('mark-attendance', {
        body: { image: imageSrc },
      });

      if (error) throw error;

      setSuccessData(data);
      setShowDialog(true);
      toast({
        title: "✅ Success",
        description: `Attendance marked for ${data.name}`,
      });
    } catch (error: any) {
      // Parse edge function error responses
      let errorMessage = "Face not recognized";
      let variant: "destructive" | "default" = "destructive";
      try {
        if (error?.context?.body) {
          const body = typeof error.context.body === 'string' ? JSON.parse(error.context.body) : error.context.body;
          errorMessage = body?.error || errorMessage;
        } else if (error?.message) {
          errorMessage = error.message;
        }
      } catch { /* use default */ }

      // Handle duplicate attendance (409)
      if (errorMessage.includes('already marked')) {
        variant = "default";
      }

      toast({
        title: variant === "destructive" ? "Recognition Failed" : "⚠️ Already Marked",
        description: errorMessage,
        variant,
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

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
            <CardTitle>Face Scanner</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative aspect-video bg-muted rounded-lg overflow-hidden">
              {isScanning ? (
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">Click "Start Scanner" to begin</p>
                </div>
              )}
            </div>

            <div className="flex gap-4">
              <Button
                onClick={() => setIsScanning(!isScanning)}
                variant={isScanning ? "outline" : "default"}
                className="flex-1"
              >
                {isScanning ? "Stop Scanner" : (
                  <>
                    <Play className="mr-2 h-4 w-4" />
                    Start Scanner
                  </>
                )}
              </Button>
              <Button
                onClick={scanFace}
                disabled={!isScanning || loading}
                className="flex-1"
              >
                <Camera className="mr-2 h-4 w-4" />
                {loading ? "Scanning..." : "Scan Face"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-success">✅ Attendance Marked Successfully</DialogTitle>
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
};

export default MarkAttendance;