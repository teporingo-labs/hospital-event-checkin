import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { ArrowLeft, Camera } from 'lucide-react';

const Scanner = () => {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<number>(0);
  const [lastParticipantScanTime, setLastParticipantScanTime] = useState<Record<string, number>>({});
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Use rear camera if available
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsScanning(true);
      }
    } catch (error) {
      console.error('Camera access error:', error);
      toast({
        title: "Camera Error",
        description: "Unable to access camera. Please check permissions.",
        variant: "destructive",
      });
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const scanQRCode = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const video = videoRef.current;
    const context = canvas.getContext('2d');
    
    if (!context || video.videoWidth === 0 || video.videoHeight === 0) return;

    // Set canvas size to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    try {
      // Import QR code scanner library dynamically
      const { BrowserQRCodeReader } = await import('@zxing/library');
      const codeReader = new BrowserQRCodeReader();
      
      // Create a data URL from canvas and decode
      const dataUrl = canvas.toDataURL('image/png');
      const img = new Image();
      img.onload = async () => {
        try {
          const result = await codeReader.decodeFromImageElement(img);
          const scannedUUID = result.getText();
          await handleScannedUUID(scannedUUID);
        } catch (error) {
          // QR code not found or not readable - this is normal, continue scanning
          console.debug('QR scan attempt:', error);
        }
      };
      img.src = dataUrl;
    } catch (error) {
      // Library import error or other issues
      console.error('Scanner library error:', error);
    }
  };

  const handleScannedUUID = async (uuid: string) => {
    const now = Date.now();
    
    // Check if at least 3 seconds have passed since last scan
    if (now - lastScanTime < 3000) {
      return;
    }
    
    // Check if this participant was scanned in the last 30 seconds
    if (lastParticipantScanTime[uuid] && now - lastParticipantScanTime[uuid] < 30000) {
      toast({
        title: "Recent Scan",
        description: "This participant was already scanned recently. Please wait 30 seconds.",
        variant: "destructive",
      });
      return;
    }

    try {
      // Check if participant exists
      const { data: participant, error: participantError } = await supabase
        .from('participants')
        .select('*')
        .eq('id', uuid)
        .single();

      if (participantError || !participant) {
        toast({
          title: "Invalid QR Code",
          description: "This QR code is not valid for this event.",
          variant: "destructive",
        });
        setLastScanTime(now);
        return;
      }

      // Record attendance
      const { error: attendanceError } = await supabase
        .from('attendance')
        .insert([
          {
            participant_id: uuid,
          }
        ]);

      if (attendanceError) {
        console.error('Attendance error:', attendanceError);
        toast({
          title: "Error",
          description: "Failed to record attendance. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Update scan times
      setLastScanTime(now);
      setLastParticipantScanTime(prev => ({
        ...prev,
        [uuid]: now
      }));

      toast({
        title: "Check-in Successful!",
        description: `${participant.full_name} has been checked in.`,
      });

    } catch (error) {
      console.error('Scan handling error:', error);
      toast({
        title: "Error",
        description: "An error occurred while processing the scan.",
        variant: "destructive",
      });
    }
  };

  // Continuous scanning when camera is active
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (isScanning && videoRef.current) {
      interval = setInterval(scanQRCode, 1000); // Scan every second
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isScanning]);

  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Link to="/control">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Control
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-primary">QR Code Scanner</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-5 w-5" />
              Event Check-in Scanner
            </CardTitle>
            <CardDescription>
              Scan participant QR codes to record attendance
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {!isScanning ? (
              <div className="text-center py-8">
                <Button onClick={startCamera} size="lg">
                  <Camera className="h-5 w-5 mr-2" />
                  Start Camera
                </Button>
                <p className="text-sm text-muted-foreground mt-4">
                  Click to activate the camera and start scanning QR codes
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="relative bg-black rounded-lg overflow-hidden">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    className="w-full h-96 object-cover"
                  />
                  <div className="absolute inset-0 border-4 border-primary/50 rounded-lg pointer-events-none">
                    <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 border-2 border-primary rounded-lg"></div>
                  </div>
                </div>
                
                <canvas ref={canvasRef} className="hidden" />
                
                <div className="flex justify-center">
                  <Button onClick={stopCamera} variant="outline">
                    Stop Camera
                  </Button>
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold text-sm mb-2">Scanning Rules:</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Same participant can only be scanned once every 30 seconds</li>
                    <li>• Minimum 3 seconds between any QR code scans</li>
                    <li>• Invalid QR codes will show an error message</li>
                    <li>• Point camera at QR code within the frame</li>
                  </ul>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Scanner;