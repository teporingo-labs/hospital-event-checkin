import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import QRCode from 'qrcode';

interface RegistrationForm {
  fullName: string;
  email: string;
  phone?: string;
  organization?: string;
}

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
        throw new Error('Failed to save registration data');
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
          title: "Registration Successful",
          description: "Registration completed, but there was an issue sending the email. Your QR code is shown below.",
          variant: "default",
        });
      } else {
        toast({
          title: "Registration Successful!",
          description: "Your QR code has been generated and sent to your email.",
        });
      }

      setQrCodeUrl(qrCodeDataUrl);
      setParticipantData(participant);
      reset();

    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: "Registration Failed",
        description: error.message || "An error occurred during registration.",
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
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-primary">Registration Complete!</CardTitle>
            <CardDescription>
              Welcome to the Hospital Academic Event, {participantData.full_name}
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
                Your unique QR code for event check-in
              </p>
            </div>
            
            <div className="space-y-4">
              <Button onClick={downloadQRCode} className="w-full">
                Download QR Code
              </Button>
              <Button onClick={startNewRegistration} variant="outline" className="w-full">
                Register Another Participant
              </Button>
            </div>

            <div className="bg-muted p-4 rounded-lg">
              <h4 className="font-semibold text-sm mb-2">Important Instructions:</h4>
              <ul className="text-xs text-muted-foreground space-y-1">
                <li>• Save this QR code to your phone or print it</li>
                <li>• Bring it with you to the event</li>
                <li>• Present it at check-in for quick registration</li>
                <li>• Check your email for a copy</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl text-center text-primary">Event Registration</CardTitle>
          <CardDescription className="text-center">
            Register for the Hospital Academic Event
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="fullName">Full Name *</Label>
              <Input
                id="fullName"
                {...register('fullName', { required: 'Full name is required' })}
                placeholder="Enter your full name"
              />
              {errors.fullName && (
                <p className="text-sm text-destructive">{errors.fullName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input
                id="email"
                type="email"
                {...register('email', { 
                  required: 'Email is required',
                  pattern: {
                    value: /\S+@\S+\.\S+/,
                    message: 'Please enter a valid email address'
                  }
                })}
                placeholder="Enter your email"
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone (optional)</Label>
              <Input
                id="phone"
                {...register('phone')}
                placeholder="Enter your phone number"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="organization">Organization (optional)</Label>
              <Input
                id="organization"
                {...register('organization')}
                placeholder="Enter your organization"
              />
            </div>

            <Button type="submit" disabled={isLoading} className="w-full">
              {isLoading ? 'Registering...' : 'Register for Event'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default Registration;