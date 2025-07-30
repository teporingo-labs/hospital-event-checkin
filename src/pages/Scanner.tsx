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
  const [isProcessing, setIsProcessing] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<number>(0);
  const [lastParticipantScanTime, setLastParticipantScanTime] = useState<Record<string, number>>({});
  const videoRef = useRef<HTMLVideoElement>(null);
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
    if (!videoRef.current || isProcessing) return;

    const video = videoRef.current;
    
    if (video.videoWidth === 0 || video.videoHeight === 0) return;
    
    try {
      // Import QR scanner library dynamically
      const QrScanner = (await import('qr-scanner')).default;
      
      // Scan directly from video element
      const result = await QrScanner.scanImage(video);
      setIsProcessing(true);
      await handleScannedUUID(result);
    } catch (error) {
      // QR code not found or not readable - this is normal, continue scanning
      console.debug('QR scan attempt:', error);
    }
  };

  const handleScannedUUID = async (uuid: string) => {
    // Reset success animation
    setScanSuccess(false);
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
        setIsProcessing(false);
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
        setIsProcessing(false);
        return;
      }

      // Update scan times
      setLastScanTime(now);
      setLastParticipantScanTime(prev => ({
        ...prev,
        [uuid]: now
      }));

      // Show success animation
      setScanSuccess(true);
      setTimeout(() => setScanSuccess(false), 2000);
      
      toast({
        title: "Check-in Successful!",
        description: `${participant.full_name} has been checked in.`,
      });
      
      setIsProcessing(false);

    } catch (error) {
      console.error('Scan handling error:', error);
      toast({
        title: "Error",
        description: "An error occurred while processing the scan.",
        variant: "destructive",
      });
      setIsProcessing(false);
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
                  
                  {/* Scanning overlay with animated targeting frame */}
                  <div className="absolute inset-0 pointer-events-none">
                    {/* Dark overlay with cutout */}
                    <div className="absolute inset-0 bg-black/40">
                      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64">
                        <div className="w-full h-full bg-transparent border-2 border-white rounded-2xl relative">
                          {/* Corner indicators */}
                          <div className="absolute top-0 left-0 w-8 h-8 border-l-4 border-t-4 border-primary rounded-tl-lg"></div>
                          <div className="absolute top-0 right-0 w-8 h-8 border-r-4 border-t-4 border-primary rounded-tr-lg"></div>
                          <div className="absolute bottom-0 left-0 w-8 h-8 border-l-4 border-b-4 border-primary rounded-bl-lg"></div>
                          <div className="absolute bottom-0 right-0 w-8 h-8 border-r-4 border-b-4 border-primary rounded-br-lg"></div>
                          
                          {/* Scanning line animation */}
                          <div className={`absolute inset-x-0 top-0 h-1 bg-primary/80 rounded-full animate-pulse ${isProcessing ? 'animate-bounce' : ''}`}></div>
                          
                          {/* Success animation */}
                          {scanSuccess && (
                            <div className="absolute inset-0 bg-green-500/30 rounded-2xl animate-pulse border-4 border-green-500">
                              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-green-500">
                                <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              </div>
                            </div>
                          )}
                          
                          {/* Processing indicator */}
                          {isProcessing && !scanSuccess && (
                            <div className="absolute inset-0 bg-primary/20 rounded-2xl">
                              <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Status indicator */}
                  <div className="absolute top-4 left-4 flex items-center gap-2 bg-black/70 text-white px-3 py-2 rounded-lg">
                    <div className={`w-2 h-2 rounded-full ${isProcessing ? 'bg-yellow-500 animate-pulse' : 'bg-green-500'}`}></div>
                    <span className="text-sm font-medium">
                      {isProcessing ? 'Processing...' : 'Ready to scan'}
                    </span>
                  </div>
                </div>
                
                <div className="flex justify-center">
                  <Button onClick={stopCamera} variant="outline">
                    Stop Camera
                  </Button>
                </div>

                <div className="bg-muted p-4 rounded-lg">
                  <h4 className="font-semibold text-sm mb-2">How to scan:</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Hold QR code steady within the white frame</li>
                    <li>• Wait for the green checkmark confirmation</li>
                    <li>• Same participant: 30 second cooldown</li>
                    <li>• General scanning: 3 second intervals</li>
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