const nodemailer = require('nodemailer');

// transportador de email
// hay que cambiar estos valores por las credenciales reales
const transporter = nodemailer.createTransport({
    service: 'gmail', // Puedes usar: gmail, outlook, yahoo, etc.
    auth: {
        user: 'mdeeshbb.0330@gmail.com', // Tu correo
        pass: 'ryzxiahjxuryinba' // Contraseña de aplicación de Gmail
    }
});

// Función para enviar email de recuperación
async function enviarEmailRecuperacion(destinatario, token, nombreUsuario) {
    const enlaceRecuperacion = `http://localhost:3000/restablecer-password.html?token=${token}`;
    
    const mailOptions = {
        from: '"Restaurante Soluna" <mdeeshbb.0330@gmail.com>',
        to: destinatario,
        subject: 'Recuperación de Contraseña - Restaurante Soluna',
        html: `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
                    .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; }
                    .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
                    .footer { text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px; }
                    .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 10px; margin: 15px 0; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>🍽️ Restaurante Soluna</h1>
                        <p>Recuperación de Contraseña</p>
                    </div>
                    <div class="content">
                        <h2>Hola ${nombreUsuario},</h2>
                        <p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
                        <p>Haz clic en el siguiente botón para crear una nueva contraseña:</p>
                        <center>
                            <a href="${enlaceRecuperacion}" class="button">Restablecer Contraseña</a>
                        </center>
                        <p>O copia y pega este enlace en tu navegador:</p>
                        <p style="word-break: break-all; color: #667eea;">${enlaceRecuperacion}</p>
                        <div class="warning">
                            <strong>⚠️ Importante:</strong> Este enlace expirará en 1 hora por seguridad.
                        </div>
                        <p>Si no solicitaste restablecer tu contraseña, puedes ignorar este correo de forma segura.</p>
                    </div>
                    <div class="footer">
                        <p>© 2026 Restaurante Soluna. Todos los derechos reservados.</p>
                        <p>Este es un correo automático, por favor no respondas a este mensaje.</p>
                    </div>
                </div>
            </body>
            </html>
        `
    };

    try {
        await transporter.sendMail(mailOptions);
        return { success: true, message: 'Correo enviado correctamente' };
    } catch (error) {
        console.error('Error al enviar email:', error);
        throw new Error('No se pudo enviar el correo electrónico');
    }
}

module.exports = { enviarEmailRecuperacion };