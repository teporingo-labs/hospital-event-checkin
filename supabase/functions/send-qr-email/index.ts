import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface QREmailRequest {
  email: string;
  fullName: string;
  qrCodeDataUrl: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, fullName, qrCodeDataUrl }: QREmailRequest = await req.json();

    console.log("Sending QR code email to:", email, "for participant:", fullName);

    const emailResponse = await resend.emails.send({
      from: "Event Registration <onboarding@resend.dev>",
      to: [email],
      subject: "Your Event QR Code - Hospital Academic Event",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb; text-align: center;">Welcome to the Hospital Academic Event!</h1>
          
          <p>Dear ${fullName},</p>
          
          <p>Thank you for registering for our academic event. Your registration has been confirmed!</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <h2 style="color: #1f2937; margin-bottom: 15px;">Your QR Code</h2>
            <img src="${qrCodeDataUrl}" alt="Your QR Code" style="border: 2px solid #e5e7eb; padding: 20px; border-radius: 8px; background: white;" />
          </div>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #374151;">Important Instructions:</h3>
            <ul style="color: #6b7280; line-height: 1.6;">
              <li>Please save this QR code to your phone or print it out</li>
              <li>Bring this QR code with you to the event</li>
              <li>Present it at check-in for quick registration</li>
              <li>Keep this email for your records</li>
            </ul>
          </div>
          
          <p style="color: #6b7280; text-align: center; margin-top: 30px;">
            We look forward to seeing you at the event!<br>
            <strong>Hospital Academic Event Team</strong>
          </p>
        </div>
      `,
    });

    console.log("Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, emailResponse }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders,
      },
    });
  } catch (error: any) {
    console.error("Error in send-qr-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);