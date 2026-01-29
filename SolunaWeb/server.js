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
