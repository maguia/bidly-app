const nodemailer = require('nodemailer');
require('dotenv').config();

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Email que se envía cuando la solicitud es recibida
const enviarEmailSolicitudRecibida = async (email, nombre) => {
  await transporter.sendMail({
    from: `"Bidly Subastas" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Solicitud de registro recibida — Bidly',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1A2E4A; padding: 30px; text-align: center;">
          <h1 style="color: #C9973A; margin: 0;">Bidly</h1>
        </div>
        <div style="padding: 30px; background-color: #f5f5f5;">
          <h2 style="color: #1A2E4A;">Hola ${nombre},</h2>
          <p style="color: #444;">Tu solicitud de registro fue recibida correctamente.</p>
          <p style="color: #444;">La empresa verificará tus datos y te notificará cuando tu cuenta esté habilitada.</p>
          <p style="color: #444;">Este proceso puede demorar algunos días hábiles.</p>
        </div>
        <div style="background-color: #1A2E4A; padding: 20px; text-align: center;">
          <p style="color: #aaa; margin: 0; font-size: 12px;">© 2026 Bidly Subastas</p>
        </div>
      </div>
    `,
  });
};

// Email que se envía cuando la empresa aprueba al usuario (paso 2)
const enviarEmailAprobacion = async (email, nombre, categoria, tokenActivacion) => {
  const linkActivacion = `bidly://completar-registro?token=${tokenActivacion}`;
  
  await transporter.sendMail({
    from: `"Bidly Subastas" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Tu cuenta fue aprobada — Completá tu registro en Bidly',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1A2E4A; padding: 30px; text-align: center;">
          <h1 style="color: #C9973A; margin: 0;">Bidly</h1>
        </div>
        <div style="padding: 30px; background-color: #f5f5f5;">
          <h2 style="color: #1A2E4A;">¡Felicitaciones ${nombre}!</h2>
          <p style="color: #444;">Tu solicitud fue aprobada. Se te asignó la categoría:</p>
          <div style="background-color: #1A2E4A; padding: 16px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <span style="color: #C9973A; font-size: 24px; font-weight: bold;">${categoria.toUpperCase()}</span>
          </div>
          <p style="color: #444;">Para completar tu registro y crear tu clave personal, ingresá a la app Bidly y usá el siguiente código:</p>
          <div style="background-color: #1A2E4A; padding: 16px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <span style="color: #C9973A; font-size: 32px; font-weight: bold; letter-spacing: 8px;">${tokenActivacion}</span>
          </div>
          <p style="color: #666; font-size: 12px;">Este código expira en 48 horas.</p>
        </div>
        <div style="background-color: #1A2E4A; padding: 20px; text-align: center;">
          <p style="color: #aaa; margin: 0; font-size: 12px;">© 2026 Bidly Subastas</p>
        </div>
      </div>
    `,
  });
};

const enviarEmailRecuperacion = async (email, codigo) => {
  await transporter.sendMail({
    from: `"Bidly Subastas" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: 'Código de recuperación de contraseña — Bidly',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #1A2E4A; padding: 30px; text-align: center;">
          <h1 style="color: #C9973A; margin: 0;">Bidly</h1>
        </div>
        <div style="padding: 30px; background-color: #f5f5f5;">
          <h2 style="color: #1A2E4A;">Recuperación de contraseña</h2>
          <p style="color: #444;">Recibimos una solicitud para restablecer tu contraseña.</p>
          <p style="color: #444;">Tu código de verificación es:</p>
          <div style="background-color: #1A2E4A; padding: 16px; border-radius: 8px; text-align: center; margin: 20px 0;">
            <span style="color: #C9973A; font-size: 32px; font-weight: bold; letter-spacing: 8px;">${codigo}</span>
          </div>
          <p style="color: #666; font-size: 12px;">Este código expira en 15 minutos.</p>
          <p style="color: #666; font-size: 12px;">Si no solicitaste este cambio, ignorá este email.</p>
        </div>
        <div style="background-color: #1A2E4A; padding: 20px; text-align: center;">
          <p style="color: #aaa; margin: 0; font-size: 12px;">© 2026 Bidly Subastas</p>
        </div>
      </div>
    `,
  });
};

module.exports = { enviarEmailSolicitudRecibida, enviarEmailAprobacion, enviarEmailRecuperacion };