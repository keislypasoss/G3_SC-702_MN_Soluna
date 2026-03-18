-- =============================================
-- SISTEMA DE PEDIDOS RESTAURANTE SOLUNA
-- =============================================

--Creacion DB
CREATE DATABASE SolunaDB;

USE SolunaDB;

-- 1. SEGURIDAD Y USUARIOS (RRHH)
-- Soporta: [SOL-06-001] Acceso, [SOL-06-002] Roles, [SOL-06-004] Registro
CREATE TABLE Roles (
    id_rol INT PRIMARY KEY IDENTITY(1,1),
    nombre_rol NVARCHAR(50) NOT NULL, -- Ej: Admin, Mesero, Cajero, Cocinero, Repartidor
    descripcion NVARCHAR(200)
);

CREATE TABLE Usuarios (
    id_usuario INT PRIMARY KEY IDENTITY(1,1),
    nombre_completo NVARCHAR(100) NOT NULL,
    correo NVARCHAR(100) UNIQUE NOT NULL,
    contrasena NVARCHAR(255) NOT NULL,
    id_rol INT NOT NULL,
    estado BIT DEFAULT 1, -- 1: Activo, 0: Inactivo
    fecha_registro DATETIME DEFAULT GETDATE(),
    CONSTRAINT FK_Usuarios_Roles FOREIGN KEY (id_rol) REFERENCES Roles(id_rol)
);

-- 2. CLIENTES Y FIDELIZACIÓN (CRM)
-- Soporta: [SOL-10-001] Gestión de Clientes y Puntos
CREATE TABLE Clientes (
    id_cliente INT PRIMARY KEY IDENTITY(1,1),
    nombre_completo NVARCHAR(100) NOT NULL,
    telefono NVARCHAR(20),
    correo NVARCHAR(100),
    puntos_acumulados INT DEFAULT 0, -- Para sistema de lealtad
    nivel_fidelidad NVARCHAR(20) DEFAULT 'Bronce' -- Bronce, Plata, Oro
);

-- 3. INVENTARIO Y PROVEEDORES
-- Soporta: [SOL-11-001] Compras/Proveedores, [SOL-08-001] Inventario
CREATE TABLE Proveedores (
    id_proveedor INT PRIMARY KEY IDENTITY(1,1),
    nombre_empresa NVARCHAR(100) NOT NULL,
    contacto NVARCHAR(100),
    telefono NVARCHAR(20)
);

CREATE TABLE Insumos (
    id_insumo INT PRIMARY KEY IDENTITY(1,1),
    nombre_insumo NVARCHAR(100) NOT NULL, -- Ej: Harina, Tomate, Queso
    stock_actual DECIMAL(10, 2) DEFAULT 0,
    unidad_medida NVARCHAR(20) NOT NULL, -- Kg, Litro, Unidad
    stock_minimo DECIMAL(10, 2) DEFAULT 5, -- Alerta de stock bajo
    id_proveedor INT,
    CONSTRAINT FK_Insumos_Proveedores FOREIGN KEY (id_proveedor) REFERENCES Proveedores(id_proveedor)
);

-- 4. MENÚ Y RECETAS
-- Soporta: [SOL-02-001] Menú, [SOL-12-001] Recetas y Costeo
CREATE TABLE Categorias (
    id_categoria INT PRIMARY KEY IDENTITY(1,1),
    nombre NVARCHAR(50) NOT NULL -- Ej: Pizzas, Pastas, Bebidas
);

CREATE TABLE Productos (
    id_producto INT PRIMARY KEY IDENTITY(1,1),
    nombre_producto NVARCHAR(100) NOT NULL,
    descripcion NVARCHAR(255),
    precio DECIMAL(10, 2) NOT NULL,
    id_categoria INT,
    es_disponible BIT DEFAULT 1, -- [SOL-02-003] Control disponibilidad
    imagen_url NVARCHAR(MAX),
    CONSTRAINT FK_Productos_Categorias FOREIGN KEY (id_categoria) REFERENCES Categorias(id_categoria)
);

-- Tabla intermedia para descontar inventario al vender un plato (Receta)
CREATE TABLE Recetas (
    id_receta INT PRIMARY KEY IDENTITY(1,1),
    id_producto INT NOT NULL,
    id_insumo INT NOT NULL,
    cantidad_requerida DECIMAL(10, 2) NOT NULL, -- Cuánto ingrediente gasta 1 plato
    CONSTRAINT FK_Recetas_Prod FOREIGN KEY (id_producto) REFERENCES Productos(id_producto),
    CONSTRAINT FK_Recetas_Insum FOREIGN KEY (id_insumo) REFERENCES Insumos(id_insumo)
);

-- Soporta: [SOL-05-002] Promociones y Descuentos
CREATE TABLE Promociones (
    id_promocion INT PRIMARY KEY IDENTITY(1,1),
    nombre_promo NVARCHAR(100),
    porcentaje_descuento DECIMAL(5, 2),
    fecha_inicio DATE,
    fecha_fin DATE,
    activo BIT DEFAULT 1
);

-- 5. SALÓN Y RESERVAS
-- Soporta: [SOL-07-001] Control Mesas, [SOL-07-002] Reservas
CREATE TABLE Mesas (
    id_mesa INT PRIMARY KEY IDENTITY(1,1),
    numero_mesa INT UNIQUE NOT NULL,
    capacidad INT NOT NULL,
    estado NVARCHAR(20) DEFAULT 'Libre' -- Libre, Ocupada, Reservada, Mantenimiento
);

CREATE TABLE Reservas (
    id_reserva INT PRIMARY KEY IDENTITY(1,1),
    id_cliente INT,
    id_mesa INT,
    fecha_reserva DATETIME NOT NULL,
    cantidad_personas INT,
    estado NVARCHAR(20) DEFAULT 'Confirmada', -- Confirmada, Cancelada, Completada
    CONSTRAINT FK_Reservas_Cli FOREIGN KEY (id_cliente) REFERENCES Clientes(id_cliente),
    CONSTRAINT FK_Reservas_Mesa FOREIGN KEY (id_mesa) REFERENCES Mesas(id_mesa)
);

-- 6. CAJA (Control Financiero)
-- Soporta: [SOL-04-001] Apertura y Cierre de Caja
CREATE TABLE Cajas_Sesiones (
    id_sesion INT PRIMARY KEY IDENTITY(1,1),
    id_usuario INT NOT NULL, -- Cajero responsable
    fecha_apertura DATETIME DEFAULT GETDATE(),
    fecha_cierre DATETIME NULL,
    monto_inicial DECIMAL(10, 2) NOT NULL,
    monto_final DECIMAL(10, 2) NULL,
    total_ventas_sistema DECIMAL(10, 2) NULL, -- Calculado por el sistema al cerrar
    estado NVARCHAR(20) DEFAULT 'Abierta', -- Abierta, Cerrada
    CONSTRAINT FK_Caja_Usuario FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuario)
);

-- 7. PEDIDOS Y FACTURACIÓN (Core del Negocio)
-- Soporta: [SOL-01-003] Órdenes, [SOL-09-001] Entregas
CREATE TABLE Pedidos (
    id_pedido INT PRIMARY KEY IDENTITY(1,1),
    id_mesa INT NULL, -- Null si es para llevar
    id_cliente INT NULL, 
    id_usuario INT NOT NULL, -- Mesero que atiende
    fecha_pedido DATETIME DEFAULT GETDATE(),
    tipo_pedido NVARCHAR(20) DEFAULT 'Salon', -- Salon, Express/Delivery
    estado NVARCHAR(20) DEFAULT 'Pendiente', -- Pendiente, En Cocina, Listo, Entregado, Pagado
    total DECIMAL(10, 2) DEFAULT 0,
    CONSTRAINT FK_Pedidos_Mesa FOREIGN KEY (id_mesa) REFERENCES Mesas(id_mesa),
    CONSTRAINT FK_Pedidos_Cliente FOREIGN KEY (id_cliente) REFERENCES Clientes(id_cliente),
    CONSTRAINT FK_Pedidos_Usuario FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuario)
);

-- Detalle del pedido (Platos específicos)
-- Soporta: [SOL-01-005] División por tiempos (Entrada/Plato Fuerte)
CREATE TABLE Detalle_Pedidos (
    id_detalle INT PRIMARY KEY IDENTITY(1,1),
    id_pedido INT NOT NULL,
    id_producto INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10, 2) NOT NULL,
    notas NVARCHAR(200), -- "Sin cebolla", "Extra queso" [SOL-02-002]
    tiempo_plato NVARCHAR(20) DEFAULT 'Principal', -- Entrada, Principal, Postre (Para orden en cocina)
    subtotal AS (cantidad * precio_unitario),
    CONSTRAINT FK_Detalle_Ped FOREIGN KEY (id_pedido) REFERENCES Pedidos(id_pedido),
    CONSTRAINT FK_Detalle_Prod FOREIGN KEY (id_producto) REFERENCES Productos(id_producto)
);

-- Facturación
-- Soporta: [SOL-03-001] Facturación y Métodos de pago
CREATE TABLE Facturas (
    id_factura INT PRIMARY KEY IDENTITY(1,1),
    id_pedido INT UNIQUE NOT NULL,
    id_sesion_caja INT NOT NULL, -- Vincula la venta a la sesión de caja actual
    fecha_emision DATETIME DEFAULT GETDATE(),
    metodo_pago NVARCHAR(50), -- Efectivo, Tarjeta, SINPE/Transferencia
    subtotal DECIMAL(10, 2),
    impuesto DECIMAL(10, 2), -- IVA
    descuento DECIMAL(10, 2) DEFAULT 0,
    total_pagar DECIMAL(10, 2),
    CONSTRAINT FK_Facturas_Ped FOREIGN KEY (id_pedido) REFERENCES Pedidos(id_pedido),
    CONSTRAINT FK_Facturas_Caja FOREIGN KEY (id_sesion_caja) REFERENCES Cajas_Sesiones(id_sesion)
);

CREATE TABLE Tokens_Recuperacion (
    id_token INT PRIMARY KEY IDENTITY(1,1),
    id_usuario INT NOT NULL,
    token NVARCHAR(255) UNIQUE NOT NULL,
    fecha_creacion DATETIME DEFAULT GETDATE(),
    fecha_expiracion DATETIME NOT NULL,
    usado BIT DEFAULT 0,
    CONSTRAINT FK_Tokens_Usuario FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuario)
);

-- Insertar roles del sistema
INSERT INTO Roles (nombre_rol, descripcion)
VALUES 
('Administrador', 'Acceso completo al sistema'),
('Mesero', 'Atención de mesas y pedidos'),
('Cocinero', 'Gestión de cocina y preparación'),
('Cajero', 'Operaciones de caja y facturación');
GO

INSERT INTO Usuarios (nombre_completo, correo, contrasena, id_rol, estado) VALUES
('Meseroprueba', 'mese@soluna.com', 'test123!', 2, 1);

INSERT INTO Usuarios (nombre_completo, correo, contrasena, id_rol, estado) VALUES
('Meseroprueba3', 'mese3@soluna.com', 'test123!', 3, 1);

INSERT INTO Usuarios (nombre_completo, correo, contrasena, id_rol, estado) VALUES
('Meseroprueba4', 'mese4@soluna.com', 'test123!', 4, 1);

Select * from Roles

INSERT INTO Usuarios (nombre_completo, correo, contrasena, id_rol, estado) VALUES
('Meseroprueba2', 'mese2@soluna.com', 'test123!', 1, 1);

INSERT INTO Categorias (nombre) VALUES
('Entradas'),
('Platos Fuertes'),
('Pastas'),
('Pizzas'),
('Ensaladas'),
('Postres'),
('Bebidas Sin Alcohol'),
('Bebidas Alcohólicas'),
('Especiales del Chef');

-- PRODUCTOS BÁSICOS PARA PRUEBAS
INSERT INTO Productos (nombre_producto, descripcion, precio, id_categoria, es_disponible) VALUES
-- Pastas
('Spaghetti Bolognesa', 'Pasta con salsa de carne', 8500.00, 3, 1),
('Lasagna', 'Lasagna tradicional con carne y queso', 10500.00, 3, 1),

-- Pizzas
('Pizza Pepperoni', 'Pizza con pepperoni y queso', 10500.00, 4, 1),
('Pizza Hawaiana', 'Pizza con jamón y piña', 10000.00, 4, 1),

-- Platos Fuertes
('Lomo Saltado', 'Lomo salteado con vegetales', 12500.00, 2, 1),
('Pechuga a la Plancha', 'Pechuga de pollo con guarnición', 9500.00, 2, 1),

-- Bebidas
('Coca Cola 500ml', 'Refresco de cola', 2000.00, 7, 1),
('Agua Mineral', 'Agua mineral 500ml', 1500.00, 7, 1),

-- Postres
('Tiramisú', 'Postre italiano', 5500.00, 6, 1),
('Helado', 'Helado de vainilla o chocolate', 3000.00, 6, 1);

INSERT INTO Mesas (numero_mesa, capacidad, estado) VALUES 
(4, 4, 'Ocupada'),
(2, 2, 'Ocupada');

INSERT INTO Clientes (nombre_completo, telefono, nivel_fidelidad) VALUES 
('Sebastian Vargas', '1111-3333', 'Plata');

INSERT INTO Clientes (nombre_completo, telefono, correo, puntos_acumulados, nivel_fidelidad)
VALUES 
('Sebastian Vargas', '1111-2222', 'sebastian@email.com', 0, 'Bronce'),
('Ana Gómez', '3333-4444', 'ana@email.com', 0, 'Bronce'),
('Carlos López', '5555-6666', 'carlos@email.com', 0, 'Bronce');

-- Pedido 1: Sebastian Vargas, Mesa 4, En Cocina
INSERT INTO Pedidos (id_mesa, id_cliente, id_usuario, tipo_pedido, estado, total, fecha_pedido) 
VALUES (1, 1, 2, 'Salon', 'En Cocina', 10000.00, '2026-01-31 21:51:56');


SELECT TOP 5 id_producto, nombre_producto, precio FROM Productos 
WHERE es_disponible = 1 
ORDER BY id_producto;

INSERT INTO Detalle_Pedidos (id_pedido, id_producto, cantidad, precio_unitario, notas) VALUES
(12, 6, 1, 9500.00, 'Extra queso, bien cocida'),    
(12, 1, 2, 2500.00, 'Con salsa de la casa'),        
(12, 5, 1, 5500.00, 'Sin mayonesa');

INSERT INTO Mesas (numero_mesa, capacidad, estado) VALUES
(3, 4, 'Libre'),
(1, 4, 'Ocupada'),
(5, 2, 'Libre'),
(6, 6, 'Libre'),
(7, 4, 'Libre'),
(8, 2, 'Libre'),
(9, 4, 'Libre'),
(10, 6, 'Libre'),
(11, 4, 'Libre'),
(12, 8, 'Libre');

SELECT * FROM Mesas ORDER BY numero_mesa;

ALTER TABLE Pedidos
ADD fecha_entrega DATETIME NULL;

CREATE TABLE Divisiones_Cuenta (
    id_division INT PRIMARY KEY IDENTITY(1,1),
    id_pedido INT NOT NULL,
    id_usuario INT NOT NULL, -- Cajero que divide
    fecha_division DATETIME DEFAULT GETDATE(),
    tipo_division NVARCHAR(20), -- 'Igual', 'PorProductos', 'Personalizado'
    numero_personas INT NOT NULL,
    CONSTRAINT FK_Divisiones_Pedido FOREIGN KEY (id_pedido) REFERENCES Pedidos(id_pedido),
    CONSTRAINT FK_Divisiones_Usuario FOREIGN KEY (id_usuario) REFERENCES Usuarios(id_usuario)
);

CREATE TABLE Detalle_Division (
    id_detalle_division INT PRIMARY KEY IDENTITY(1,1),
    id_division INT NOT NULL,
    persona_numero INT NOT NULL, -- 1, 2, 3...
    id_detalle_pedido INT NOT NULL,
    cantidad_asignada INT NOT NULL,
    monto_asignado DECIMAL(10,2) NOT NULL,
    CONSTRAINT FK_DetalleDivision_Division FOREIGN KEY (id_division) REFERENCES Divisiones_Cuenta(id_division),
    CONSTRAINT FK_DetalleDivision_Detalle FOREIGN KEY (id_detalle_pedido) REFERENCES Detalle_Pedidos(id_detalle)
);

CREATE TABLE Tickets_Divididos (
    id_ticket INT PRIMARY KEY IDENTITY(1,1),
    id_division INT NOT NULL,
    persona_numero INT NOT NULL,
    subtotal DECIMAL(10,2) NOT NULL,
    impuesto DECIMAL(10,2) NOT NULL,
    total DECIMAL(10,2) NOT NULL,
    pagado BIT DEFAULT 0,
    id_factura INT NULL, -- Cuando se genera la factura
    CONSTRAINT FK_Tickets_Division FOREIGN KEY (id_division) REFERENCES Divisiones_Cuenta(id_division),
    CONSTRAINT FK_Tickets_Factura FOREIGN KEY (id_factura) REFERENCES Facturas(id_factura)
);


ALTER TABLE Facturas DROP CONSTRAINT UQ__Facturas__6FF01488F84BB87C;