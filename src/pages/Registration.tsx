import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import QRCode from 'qrcode';
import seguridad from '@/assets/DiaMundialSeguridadPaciente.jpg';
import chmh from '@/assets/CHMHGigante2025.png'
import { Select, SelectContent, SelectItem, SelectValue } from '@radix-ui/react-select';
import { SelectTrigger } from '@/components/ui/select';

interface RegistrationForm {
  fullName: string;
  email: string;
  phone: string;
  organization: string;
  category: string;
}

const categories = [
  "Médico",
  "Enfermera",
  "Estudiante Enfermería",
  "Residente o Interno",
  "Pasante Enfermería",
  "Apoyo Administrativo"
]

const Registration = () => {
  const { register, handleSubmit, formState: { errors }, reset } = useForm<RegistrationForm>();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [participantData, setParticipantData] = useState<any>(null);

  const onSubmit = async (data: RegistrationForm) => {
    setIsLoading(true);
    try {
      // Generate unique ID for participant
      const participantId = crypto.randomUUID();
      
      // Generate QR code containing the UUID
      const qrCodeDataUrl = await QRCode.toDataURL(participantId, {
        width: 256,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Store participant data in Supabase
      const { data: participant, error } = await supabase
        .from('participants')
        .insert([
          {
            id: participantId,
            full_name: data.fullName,
            email: data.email,
            phone: data.phone || null,
            organization: data.organization || null,
            qr_code: qrCodeDataUrl,
          }
        ])
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        throw new Error('Error al guardar los datos de registro.');
      }

      // Send QR code via email
      const emailResponse = await supabase.functions.invoke('send-qr-email', {
        body: {
          email: data.email,
          fullName: data.fullName,
          qrCodeDataUrl: qrCodeDataUrl,
        }
      });

      if (emailResponse.error) {
        console.error('Email error:', emailResponse.error);
        // Don't fail the registration if email fails
        toast({
          title: "Registro Exitoso",
          description: "Se completó el registro, pero hubo un problema envíando el email. Tu código QR se muestra en la pantalla.",
          variant: "default",
        });
      } else {
        toast({
          title: "¡Registro Exitoso!",
          description: "Tu código QR se ha generado y se ha enviado a tu email.",
        });
      }

      setQrCodeUrl(qrCodeDataUrl);
      setParticipantData(participant);
      reset();

    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: "Registro Fallido",
        description: error.message || "Ocurrio un error durante el registro.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const downloadQRCode = () => {
    if (qrCodeUrl) {
      const link = document.createElement('a');
      link.href = qrCodeUrl;
      link.download = `event-qr-${participantData?.full_name?.replace(/\s+/g, '-')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const startNewRegistration = () => {
    setQrCodeUrl(null);
    setParticipantData(null);
  };

  if (qrCodeUrl && participantData) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
        <img src={chmh} alt="Centenario Hospital Miguel Hidalgo" className="h-16 mb-4" />
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">            
            <CardTitle className="text-2xl text-primary">¡Registro Completo!</CardTitle>
            <CardDescription>
              Te esperamos el 17 de Septiembre, {participantData.full_name}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="text-center">
              <img 
                src={qrCodeUrl} 
                alt="Your QR Code" 
                className="mx-auto border-2 border-border rounded-lg p-4 bg-white"
              />
              <p className="text-sm text-muted-foreground mt-2">
                Tu código QR único para el registro de asistencia en el evento
              </p>
            </div>
            
            <div className="space-y-4">
              <Button onClick={downloadQRCode} className="w-full">
                Descargar Código QR
              </Button>
              <Button onClick={startNewRegistration} variant="outline" className="w-full">
                Registrar otro participante
              </Button>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold text-sm mb-2">Instrucciones Importantes:</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Guarda este código QR en tu teléfono o imprímelo</li>
                <li>• Llévalo contigo al evento</li>
                <li>• Preséntalo al momento del registro para una entrada rápida</li>
                <li>• Revisa tu correo electrónico para una copia</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <img src={chmh} alt="Centenario Hospital Miguel Hidalgo" className="h-16 mb-4" />
      <Card className="w-full max-w-md" style={{ backgroundColor: '#f7f7f7' }}>
        <CardHeader className='items-center'>          
          <img src={seguridad} alt="Centenario Hospital Miguel Hidalgo" className="w-[254px] h-auto" />
          <CardTitle className="text-2xl text-center text-primary">Cuidados seguros para todos los recien nacidos y todos los niños</CardTitle>
          <CardDescription className="text-center">
            Formulario de Registro <br/><small>Todos los campos son obligatorios</small>
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Nombre completo <small>(Sin abreviaturas)</small></Label>
              <Input
                id="fullName"
                {...register('fullName', { required: 'El campo Nombre completo es obligatorio' })}
                placeholder="Ingresa tu nombre completo"
              />
              {errors.fullName && (
                <p className="text-sm text-destructive">{errors.fullName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...register('email', { 
                  required: 'El Email es obligatorio',
                  pattern: {
                    value: /\S+@\S+\.\S+/,
                    message: 'Por favor ingrese una dirección de correo válida.'
                  }
                })}
                placeholder="Ingresa tu Email"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Teléfono</Label>
              <Input
                id="phone"
                {...register('phone')}
                placeholder="Ingresa tu número de teléfono"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="organization">Institución</Label>
              <Input
                id="organization"
                {...register('organization')}
                placeholder="Ingresa tu institución de procedencia"
              />
            </div>

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Registrando...' : 'Regístrame'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Registration;