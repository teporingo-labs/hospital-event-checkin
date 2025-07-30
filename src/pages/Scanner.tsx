import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Link } from 'react-router-dom';
import { ArrowLeft, Camera, CameraOff, CheckCircle } from 'lucide-react';
import QrScanner from 'qr-scanner';

const Scanner = () => {
  const { toast } = useToast();
  const [isScanning, setIsScanning] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [scanSuccess, setScanSuccess] = useState(false);
  const [lastScanTime, setLastScanTime] = useState<number>(0);
  const [lastParticipantScanTime, setLastParticipantScanTime] = useState<Record<string, number>>({});
  const videoRef = useRef<HTMLVideoElement>(null);
  const qrScannerRef = useRef<QrScanner | null>(null);

  useEffect(() => {
      return () => {
        if (qrScannerRef.current) {
          qrScannerRef.current.stop();
          qrScannerRef.current.destroy();
        }
      };
    }, []);

  const startScanning = async () => {
    if (!videoRef.current) return;

    try{
       await scanQRCode(); // Add await here
       setIsScanning(true); // Move this here from scanQRCode

      toast({
        title: "Escaner Activado",
        description: "Apunta tu cámara al código QR para registrar a los participantes",
      });
    } catch (error) {
      console.error('Error starting scanner:', error);
      setHasPermission(false);
      toast({
        title: "Camera Access Required",
        description: "Please allow camera access to scan QR codes",
        variant: "destructive",
      });
    }
  };

  const stopScanning = () => {
    if (qrScannerRef.current) {
      qrScannerRef.current.stop()
      qrScannerRef.current.destroy();
      qrScannerRef.current = null;
      setIsScanning(false)
      toast({
        title: "Escaner Detenido",
        description: "El escaneo del código QR se ha detenido.",
      });
    }
  };

  const scanQRCode = async () => {
    try {
        await navigator.mediaDevices.getUserMedia({ 
            video: {
                facingMode: 'environment' // Fix typo from 'enviroment'
            }
        });
        setHasPermission(true);

        const qrScanner = new QrScanner(
            videoRef.current,
            (result) => handleScannedUUID(result.data),
            {
                onDecodeError: () => {
                    // Silently handle decode errors - normal when QR code is not in view
                },
                highlightScanRegion: true,
                highlightCodeOutline: true,
                preferredCamera: 'environment',
            }
        );

        qrScannerRef.current = qrScanner;
        await qrScanner.start();
        // setIsScanning(true); // Moved to startScanning
    } catch (error) {
        setHasPermission(false);
        setIsScanning(false);
        throw error;
    }
  };

  const handleScannedUUID = async (uuid: string) => {
    if (isProcessing) return; // Prevent multiple concurrent scans
    setIsProcessing(true);
    
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
        title: "Escaneo Reciente",
        description: "Este participante ha sido escaneado recientemente. Por favor espere 30 segundos.",
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
          title: "Código QR Inválido",
          description: "Este código QR no es válido para este evento.",
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
          description: "Problema al registrar la asistencia. Por favor inténtelo de nuevo.",
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
        title: "¡Registro exitoso!",
        description: `${participant.full_name} ha sido registrado.`,
      });

      setIsProcessing(false);

    } catch (error) {
      console.error('Scan handling error:', error);
      toast({
        title: "Error",
        description: "Un error ocurrio al procesar el escaneo.",
        variant: "destructive",
      });
      setIsProcessing(false);
    }
  };

  // Continuous scanning when camera is active
  
  // Cleanup camera on unmount
  useEffect(() => {
    return () => {
      stopScanning();
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
          <h1 className="text-3xl font-bold text-primary">Escáner de Código QR</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Camera className="h-6 w-6" />
              Escáner de Asistencia
            </CardTitle>
            <CardDescription>
              Escanea los códigos QR de los participantes para registrar la asistencia.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="relative aspect-video bg-gray-100 rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />
              {!isScanning && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-50">
                  <div className="text-center">
                    <Camera className="w-16 h-16 mx-auto text-gray-400 mb-4" />
                    <p className="text-gray-600">La vista previa de la cámara aparecerá aquí</p>
                  </div>
                </div>
              )}
              {scanSuccess && (
                <div className="absolute inset-0 bg-green-500/30 animate-pulse rounded-lg pointer-events-none" />
              )}
            </div>

            <div className="flex gap-4 justify-center">
              {!isScanning ? (
                <Button
                  onClick={startScanning}
                  className="bg-gradient-to-r from-success to-success/90 hover:from-success/90 hover:to-success"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Iniciar Escaneo
                </Button>
              ) : (
                <Button
                  onClick={stopScanning}
                  variant="destructive"
                >
                  <CameraOff className="w-4 h-4 mr-2" />
                  Detener Escaneo
                </Button>
              )}
            </div>

            {hasPermission === false && (
              <div className="text-center p-4 bg-warning/10 rounded-lg">
                <p className="text-warning-foreground">
                  Se necesita acceso a la cámara para escanear códigos QR. Por favor permita el acceso a la cámara e intente de nuevo.
                </p>
              </div>
            )}

            <div className="text-sm text-center text-muted-foreground">
              <CheckCircle className="w-4 h-4 inline mr-1" />
              Apunte la cámara al código QR del participante para registrar su asistencia.
            </div>

          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Scanner;