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


// recibir todos los productos
app.get('/api/productos', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request().query(`
            SELECT p.*, c.nombre AS categoria
            FROM Productos p
            LEFT JOIN Categorias c ON p.id_categoria = c.id_categoria
            ORDER BY p.nombre_producto
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// conseguir solo productos DISPONIBLES para los pedidos
app.get('/api/productos/disponibles', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request().query(`
            SELECT p.*, c.nombre AS categoria
            FROM Productos p
            LEFT JOIN Categorias c ON p.id_categoria = c.id_categoria
            WHERE p.es_disponible = 1
            ORDER BY p.nombre_producto
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// TOGGLE DISPONIBILIDAD DE PRODUCTO 
app.post('/api/productos/:id/toggle-disponibilidad', async (req, res) => {
    const { id } = req.params;

    try {
        const pool = await getConnection();

        // Obtener estado actual
        const result = await pool.request()
            .input('id', sql.Int, id)
            .query(`
                SELECT es_disponible 
                FROM Productos 
                WHERE id_producto = @id
            `);

        if (result.recordset.length === 0) {
            return res.json({ success: false, error: 'Producto no existe' });
        }

        const estadoActual = result.recordset[0].es_disponible;
        const nuevoEstado = estadoActual ? 0 : 1;

        // Actualizar
        await pool.request()
            .input('id', sql.Int, id)
            .input('estado', sql.Bit, nuevoEstado)
            .query(`
                UPDATE Productos 
                SET es_disponible = @estado 
                WHERE id_producto = @id
            `);

        res.json({
            success: true,
            nuevoEstado: nuevoEstado
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, error: err.message });
    }
});


// obtener el detalle de un pedido específico
app.get('/api/pedidos/:id/detalle', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query(`
                SELECT d.*, p.nombre_producto
                FROM Detalle_Pedidos d
                INNER JOIN Productos p ON d.id_producto = p.id_producto
                WHERE d.id_pedido = @id
                ORDER BY d.id_detalle
            `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Actualizar las notas de un producto en el pedido 
app.put('/api/detalle-pedido/:id/notas', async (req, res) => {
    const { notas } = req.body;

    try {
        const pool = await getConnection();
        await pool.request()
            .input('id', sql.Int, req.params.id)
            .input('notas', sql.NVarChar, notas)
            .query(`
                UPDATE Detalle_Pedidos
                SET notas = @notas
                WHERE id_detalle = @id
            `);

        res.json({ message: 'Notas actualizadas correctamente' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// modificacion total de producto en pedido 
app.put('/api/detalle-pedido/:id', async (req, res) => {
    const { id } = req.params;
    const { cantidad, notas, precio_unitario } = req.body;

    try {
        const pool = await getConnection();
        
        // primero conseguimos el detalle actual
        const detalleActual = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT * FROM Detalle_Pedidos WHERE id_detalle = @id');
        
        if (detalleActual.recordset.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado en el pedido' });
        }
        
        // actualizamos el producto
        await pool.request()
            .input('id', sql.Int, id)
            .input('cantidad', sql.Int, cantidad || detalleActual.recordset[0].cantidad)
            .input('notas', sql.NVarChar, notas || detalleActual.recordset[0].notas)
            .input('precio_unitario', sql.Decimal(10, 2), 
                   precio_unitario || detalleActual.recordset[0].precio_unitario)
            .query(`
                UPDATE Detalle_Pedidos
                SET cantidad = @cantidad,
                    notas = @notas,
                    precio_unitario = @precio_unitario
                WHERE id_detalle = @id
            `);
        
        // actualizamos el total del pedido
        const idPedido = detalleActual.recordset[0].id_pedido;
        await pool.request()
            .input('id_pedido', sql.Int, idPedido)
            .query(`
                UPDATE Pedidos
                SET total = (
                    SELECT SUM(cantidad * precio_unitario)
                    FROM Detalle_Pedidos
                    WHERE id_pedido = @id_pedido
                )
                WHERE id_pedido = @id_pedido
            `);

        res.json({ 
            message: 'Producto modificado correctamente',
            success: true 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// agregar extra a un producto del pedido
app.post('/api/detalle-pedido/:id/extra', async (req, res) => {
    const { id } = req.params;
    const { descripcion_extra, costo_extra } = req.body;

    try {
        const pool = await getConnection();
        
        // obtenemos el detalle actual
        const detalleResult = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT * FROM Detalle_Pedidos WHERE id_detalle = @id');
        
        if (detalleResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado en el pedido' });
        }
        
        const detalle = detalleResult.recordset[0];
        
        // formateamos las nuevas notas
        const nuevasNotas = detalle.notas 
            ? `${detalle.notas} | Extra: ${descripcion_extra} (+₡${costo_extra})`
            : `Extra: ${descripcion_extra} (+₡${costo_extra})`;
        
        // calculamos nuevo precio
        const nuevoPrecio = parseFloat(detalle.precio_unitario) + parseFloat(costo_extra);
        
        await pool.request()
            .input('id', sql.Int, id)
            .input('notas', sql.NVarChar, nuevasNotas)
            .input('precio_unitario', sql.Decimal(10, 2), nuevoPrecio)
            .query(`
                UPDATE Detalle_Pedidos
                SET notas = @notas,
                    precio_unitario = @precio_unitario
                WHERE id_detalle = @id
            `);
        
        // actualizar total del pedido
        await pool.request()
            .input('id_pedido', sql.Int, detalle.id_pedido)
            .query(`
                UPDATE Pedidos
                SET total = (
                    SELECT SUM(cantidad * precio_unitario)
                    FROM Detalle_Pedidos
                    WHERE id_pedido = @id_pedido
                )
                WHERE id_pedido = @id_pedido
            `);

        res.json({ 
            message: 'Extra agregado correctamente',
            success: true 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// eliminar producto del pedido
app.delete('/api/detalle-pedido/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const pool = await getConnection();
        
        // primero obtenemos el id_pedido para luego actualizar el total 
        const detalleResult = await pool.request()
            .input('id', sql.Int, id)
            .query('SELECT id_pedido FROM Detalle_Pedidos WHERE id_detalle = @id');
        
        if (detalleResult.recordset.length === 0) {
            return res.status(404).json({ error: 'Producto no encontrado' });
        }
        
        const idPedido = detalleResult.recordset[0].id_pedido;
        
        // eliminamos el producto
        await pool.request()
            .input('id', sql.Int, id)
            .query('DELETE FROM Detalle_Pedidos WHERE id_detalle = @id');
        
        // actualizamos el total del pedido
        await pool.request()
            .input('id_pedido', sql.Int, idPedido)
            .query(`
                UPDATE Pedidos
                SET total = ISNULL((
                    SELECT SUM(cantidad * precio_unitario)
                    FROM Detalle_Pedidos
                    WHERE id_pedido = @id_pedido
                ), 0)
                WHERE id_pedido = @id_pedido
            `);

        res.json({ 
            message: 'Producto eliminado del pedido',
            success: true 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Obtener todos los pedidos
app.get('/api/pedidos', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request().query(`
            SELECT 
                p.*,
                m.numero_mesa,
                c.nombre_completo as nombre_cliente,
                u.nombre_completo as nombre_mesero,
                (SELECT COUNT(*) FROM Detalle_Pedidos dp WHERE dp.id_pedido = p.id_pedido) as cantidad_productos
            FROM Pedidos p
            LEFT JOIN Mesas m ON p.id_mesa = m.id_mesa
            LEFT JOIN Clientes c ON p.id_cliente = c.id_cliente
            LEFT JOIN Usuarios u ON p.id_usuario = u.id_usuario
            WHERE p.estado NOT IN ('Pagado', 'Cancelado')
            ORDER BY p.fecha_pedido DESC
        `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Obtener pedidos por estado
app.get('/api/pedidos/estado/:estado', async (req, res) => {
    try {
        const { estado } = req.params;
        const pool = await getConnection();
        const result = await pool.request()
            .input('estado', sql.NVarChar, estado)
            .query(`
                SELECT p.*, m.numero_mesa, c.nombre_completo
                FROM Pedidos p
                LEFT JOIN Mesas m ON p.id_mesa = m.id_mesa
                LEFT JOIN Clientes c ON p.id_cliente = c.id_cliente
                WHERE p.estado = @estado
                ORDER BY p.fecha_pedido
            `);
        res.json(result.recordset);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put('/api/pedidos/:id/estado', async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.body;
        const pool = await getConnection();
        
        await pool.request()
            .input('id', sql.Int, id)
            .input('estado', sql.NVarChar, estado)
            .query('UPDATE Pedidos SET estado = @estado WHERE id_pedido = @id');
            
        res.json({ success: true, message: 'Estado actualizado' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Estadísticas de pedidos
app.get('/api/pedidos/estadisticas/hoy', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request().query(`
            SELECT 
                COUNT(*) as total_hoy,
                SUM(CASE WHEN estado = 'Pendiente' THEN 1 ELSE 0 END) as pendientes,
                SUM(CASE WHEN estado = 'En Cocina' THEN 1 ELSE 0 END) as en_cocina,
                SUM(CASE WHEN estado = 'Listo' THEN 1 ELSE 0 END) as listos,
                SUM(CASE WHEN estado = 'Entregado' THEN 1 ELSE 0 END) as entregados,
                SUM(total) as ventas_hoy
            FROM Pedidos 
            WHERE CAST(fecha_pedido AS DATE) = CAST(GETDATE() AS DATE)
        `);
        res.json(result.recordset[0] || {});
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


app.get('/productos', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/productos.html'));
});

app.get('/pedidos', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/pedidos.html'));
});

// Ruta para el dashboard
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'views/index.html'));
});

// Fallback to index.html for any other requests (SPA behavior if needed, or just 404)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, async () => {
    console.log(`✅ Servidor ejecutándose en http://localhost:${PORT}`);
    
    try {
        await getConnection();
        console.log(' Conexión a la base de datos establecida');
    } catch (err) {
        console.error(' Error al conectar con la base de datos:', err.message);
    }
});