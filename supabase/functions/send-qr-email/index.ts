const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type"
};
const handler = async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response(null, {
      headers: corsHeaders
    });
  }
  try {
    const { email, fullName, qrCodeDataUrl } = await req.json();
    console.log("Enviando correo con código QR a:", email, "para el participante:", fullName);
    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "Registro de Evento <noreply@notifications.atfcorp.net>",
        to: [
          email
        ],
        subject: "Tu Código QR para el Día Mundial de la Seguridad del Paciente",
        html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <h1 style="color: #2563eb; text-align: center;">¡Gracias por registrarte a Cuidados seguros para todos los recien nacidos y todos los niños!</h1>
          
          <p>Estimado/a ${fullName},</p>
          
          <p>Gracias por registrarte. ¡Tu registro ha sido confirmado!</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <h2 style="color: #1f2937; margin-bottom: 15px;">Tu Código QR</h2>
            <img src="${qrCodeDataUrl}" alt="Tu Código QR" style="border: 2px solid #e5e7eb; padding: 20px; border-radius: 8px; background: white;" />
          </div>
          
          <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #374151;">Instrucciones Importantes:</h3>
            <ul style="color: #6b7280; line-height: 1.6;">
              <li>Guarda este código QR en tu celular o imprímelo</li>
              <li>Lleva este código QR contigo al evento</li>
              <li>Preséntalo en el registro para agilizar tu entrada</li>
              <li>Conserva este correo para futuras referencias</li>
            </ul>
          </div>
          
          <p style="color: #6b7280; text-align: center; margin-top: 30px;">
            ¡Esperamos verte el 17 de Septiembre!<br>
            <strong>Departamento de Calidad y Auditoría Médica del CHMH</strong>
          </p>

          <hr style="margin: 40px 0; border: none; border-top: 1px solid #ddd;" />

          <p style="font-size: 12px; color: #9ca3af; text-align: center;">
            Este correo fue enviado automáticamente, por favor no respondas ya que nadie revisa este buzón.<br>
            Si tienes dudas o necesitas ayuda, contacta directamente al equipo organizador.<br>
            Gracias por tu comprensión.
          </p>
        </div>
        `
      })
    });
    const result = await emailResponse.json();
    console.log("Correo enviado con éxito:", result);
    return new Response(JSON.stringify({
      success: true,
      emailResponse: result
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error("Error en la función send-qr-email:", error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
};
Deno.serve(handler);
