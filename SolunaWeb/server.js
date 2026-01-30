const express = require('express');
const path = require('path');
const { getConnection, sql } = require('./db');
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, 'public')));

// --- API ROUTES ---

// Get all Roles
app.get('/api/roles', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request().query('SELECT * FROM Roles');
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get all Users (with Role name)
app.get('/api/usuarios', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request().query(`
            SELECT u.*, r.nombre_rol 
            FROM Usuarios u
            LEFT JOIN Roles r ON u.id_rol = r.id_rol
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create User
app.post('/api/usuarios', async (req, res) => {
    try {
        const { nombre, apellido, correo, password, id_rol } = req.body;
        const pool = await getConnection();
        await pool.request()
            .input('nombre_completo', sql.NVarChar, `${nombre} ${apellido}`)
            .input('correo', sql.NVarChar, correo)
            .input('contrasena', sql.NVarChar, password) // Note: In production, hash this!
            .input('id_rol', sql.Int, id_rol)
            .input('estado', sql.Bit, 1) // Default to Active (1)
            .input('fecha_registro', sql.DateTime, new Date())
            .query(`
                INSERT INTO Usuarios (nombre_completo, correo, contrasena, id_rol, estado, fecha_registro)
                VALUES (@nombre_completo, @correo, @contrasena, @id_rol, @estado, @fecha_registro)
            `);
        res.json({ success: true, message: 'Usuario creado correctamente' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update User
app.put('/api/usuarios/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre, apellido, correo, password, id_rol } = req.body;
        const pool = await getConnection();

        let query = `
            UPDATE Usuarios 
            SET nombre_completo = @nombre_completo, 
                correo = @correo, 
                id_rol = @id_rol
        `;

        const request = pool.request()
            .input('id', sql.Int, id)
            .input('nombre_completo', sql.NVarChar, `${nombre} ${apellido}`)
            .input('correo', sql.NVarChar, correo)
            .input('id_rol', sql.Int, id_rol);

        if (password && password.trim() !== '') {
            query += `, contrasena = @contrasena`;
            request.input('contrasena', sql.NVarChar, password);
        }

        query += ` WHERE id_usuario = @id`;

        await request.query(query);
        res.json({ success: true, message: 'Usuario actualizado correctamente' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Toggle User Status (Delete/Deactivate)
app.post('/api/usuarios/:id/toggle-status', async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body; // true or false
        const pool = await getConnection();
        await pool.request()
            .input('id', sql.Int, id)
            .input('estado', sql.Bit, (estado === 'true' || estado === true) ? 1 : 0)
            .query('UPDATE Usuarios SET estado = @estado WHERE id_usuario = @id');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete User
app.delete('/api/usuarios/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM Usuarios WHERE id_usuario = @id');
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Fallback to index.html for any other requests (SPA behavior if needed, or just 404)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server and connect to DB
app.listen(PORT, async () => {
    console.log(`Server is running on http://localhost:${PORT}`);
    try {
        await getConnection();
    } catch (err) {
        console.error('Failed to connect to DB on startup:', err.message);
    }
});

const crypto = require('crypto');
const { enviarEmailRecuperacion } = require('./emailService');

// Solicitar la recuperación de la contra
app.post('/api/recuperar-password', async (req, res) => {
    try {
        const { correo } = req.body;
        const pool = await getConnection();

        // revisar si el usuario si existe
        const userResult = await pool.request()
            .input('correo', sql.NVarChar, correo)
            .query('SELECT id_usuario, nombre_completo, estado FROM Usuarios WHERE correo = @correo');

        if (userResult.recordset.length === 0) {
            // no revelamos si el email existe por temas de segu
            return res.json({ 
                success: true, 
                message: 'Si tu correo existe, vas a recibir las instrucciones para recuperar tu contraseña.' 
            });
        }

        const usuario = userResult.recordset[0];

        // revisar que el usuario esté activo
        if (!usuario.estado) {
            return res.status(400).json({ 
                error: 'Esta cuenta está desactivada, Por favor ponte en contacto con el administrador.' 
            });
        }

        // crear el token en este caso unico 
        const token = crypto.randomBytes(32).toString('hex');
        const fechaExpiracion = new Date();
        fechaExpiracion.setHours(fechaExpiracion.getHours() + 1); // Expira en 1 hora de tiempo

        // guardar ese token en la base de datos 
        await pool.request()
            .input('id_usuario', sql.Int, usuario.id_usuario)
            .input('token', sql.NVarChar, token)
            .input('fecha_expiracion', sql.DateTime, fechaExpiracion)
            .query(`
                INSERT INTO Tokens_Recuperacion (id_usuario, token, fecha_expiracion, usado)
                VALUES (@id_usuario, @token, @fecha_expiracion, 0)
            `);

        // enviar el email
        await enviarEmailRecuperacion(correo, token, usuario.nombre_completo);

        res.json({ 
            success: true, 
            message: 'Se te envio un correo con las instrucciones para recuperar tu contraseña.' 
        });

    } catch (err) {
        console.error('Error en recuperación:', err);
        res.status(500).json({ error: 'Error al procesar la solicitud' });
    }
});

// verificacion del token de recuperacion 
app.get('/api/verificar-token/:token', async (req, res) => {
    try {
        const { token } = req.params;
        const pool = await getConnection();

        const result = await pool.request()
            .input('token', sql.NVarChar, token)
            .query(`
                SELECT t.*, u.nombre_completo, u.correo
                FROM Tokens_Recuperacion t
                INNER JOIN Usuarios u ON t.id_usuario = u.id_usuario
                WHERE t.token = @token 
                  AND t.usado = 0 
                  AND t.fecha_expiracion > GETDATE()
            `);

        if (result.recordset.length === 0) {
            return res.status(400).json({ 
                valid: false, 
                error: 'El enlace es inválido o ha expirado' 
            });
        }

        res.json({ 
            valid: true, 
            usuario: result.recordset[0].nombre_completo 
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// restablecimiento de la contra con el token
app.post('/api/restablecer-password', async (req, res) => {
    try {
        const { token, nuevaPassword } = req.body;
        const pool = await getConnection();

        // revisar otra vez el token
        const tokenResult = await pool.request()
            .input('token', sql.NVarChar, token)
            .query(`
                SELECT id_usuario 
                FROM Tokens_Recuperacion 
                WHERE token = @token 
                  AND usado = 0 
                  AND fecha_expiracion > GETDATE()
            `);

        if (tokenResult.recordset.length === 0) {
            return res.status(400).json({ 
                error: 'El enlace es inválido o ha expirado' 
            });
        }

        const idUsuario = tokenResult.recordset[0].id_usuario;

        // Actualizar la contra
        // tratar de hashear con bcrypt
        await pool.request()
            .input('id_usuario', sql.Int, idUsuario)
            .input('nueva_password', sql.NVarChar, nuevaPassword)
            .query('UPDATE Usuarios SET contrasena = @nueva_password WHERE id_usuario = @id_usuario');

        // marcar el token como ya usado
        await pool.request()
            .input('token', sql.NVarChar, token)
            .query('UPDATE Tokens_Recuperacion SET usado = 1 WHERE token = @token');

        res.json({ 
            success: true, 
            message: 'Contraseña restablecida correctamente' 
        });

    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});