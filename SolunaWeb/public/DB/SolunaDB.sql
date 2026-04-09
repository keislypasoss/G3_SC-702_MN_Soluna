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



ALTER TABLE Facturas DROP CONSTRAINT UQ__Facturas__6FF014880DE876FC;
GO

-- 2. Verificar que se eliminó
SELECT name FROM sys.key_constraints WHERE parent_object_id = OBJECT_ID('Facturas');
GO

INSERT INTO dbo.Insumos (nombre_insumo, stock_actual, unidad_medida, stock_minimo, id_proveedor) VALUES (N'Harina', 50.00, N'Kg', 10.00, NULL), (N'Azúcar', 30.00, N'Kg', 5.00, NULL), (N'Sal', 20.00, N'Kg', 2.00, NULL), (N'Aceite Vegetal', 25.00, N'Litro', 5.00, NULL), (N'Tomate', 100.00, N'Kg', 10.00, NULL), (N'Queso Mozzarella', 40.00, N'Kg', 5.00, NULL), (N'Leche', 200.00, N'Litro', 20.00, NULL), (N'Huevos', 500.00, N'Unidad', 50.00, NULL), (N'Arroz', 80.00, N'Kg', 10.00, NULL), (N'Pollo Entero', 60.00, N'Kg', 10.00, NULL), (N'Carne Res', 45.00, N'Kg', 8.00, NULL), (N'Cebolla', 70.00, N'Kg', 10.00, NULL), (N'Ajo', 15.00, N'Kg', 2.00, NULL), (N'Pimiento', 25.00, N'Kg', 5.00, NULL), (N'Aceitunas', 10.00, N'Kg', 2.00, NULL), (N'Jamón', 22.00, N'Kg', 3.00, NULL), (N'Bacon', 18.00, N'Kg', 3.00, NULL), (N'Levadura', 8.00, N'Kg', 1.00, NULL), (N'Agua Mineral', 1000.00, N'Unidad', 100.00, NULL), (N'Mantequilla', 12.00, N'Kg', 2.00, NULL), (N'Yogur', 60.00, N'Unidad', 10.00, NULL), (N'Crema', 30.00, N'Litro', 5.00, NULL), (N'Limón', 40.00, N'Kg', 5.00, NULL), (N'Cilantro', 10.00, N'Kg', 1.00, NULL), (N'Perejil', 10.00, N'Kg', 1.00, NULL), (N'Papas', 120.00, N'Kg', 15.00, NULL), (N'Zanahoria', 60.00, N'Kg', 8.00, NULL), (N'Lechuga', 35.00, N'Unidad', 5.00, NULL), (N'Espinaca', 20.00, N'Kg', 3.00, NULL), (N'Albahaca', 5.00, N'Kg', 1.00, NULL);

--============================================================
--Insert Usuarios
--============================================================
INSERT INTO dbo.Usuarios (id_usuario, nombre_completo, correo, contrasena, id_rol, estado, fecha_registro) VALUES
(1,  'Cecilia Cordero', 'cecilia.cordero@soluna.com', 'cecilia1234', 1, 1, '2026-04-01'),
(2,  'Laura Arce', 'laura.arce@soluna.com', 'laura1234', 2, 1, '2026-04-02'),
(3,  'Pedro Vargas', 'pedro.vargas@soluna.com', 'pedro1234', 3, 1, '2026-04-03'),
(4,  'Mónica Vargas', 'monica.vargas@soluna.com', 'monica1234', 4, 1, '2026-04-04'),
(5,  'Mariana Morales', 'mariana.morales@soluna.com', 'mariana1234', 5, 1, '2026-04-05'),
(6,  'Maria Vargas', 'maria.vargas@soluna.com', 'maria1234', 3, 1, '2026-04-06'),
(7,  'José Peralta', 'jose.peralta@soluna.com', 'jose1234', 3, 1, '2026-04-07'),
(8,  'Sofía Nuñez', 'sofia.nuñez@soluna.com', 'sofia1234', 2, 1, '2026-04-08'),
(9,  'Diego Cordero', 'diego.cordero@soluna.com', 'diego1234', 4, 1, '2026-04-09'),
(10, 'Valentina Ramos', 'valentina.ramos@soluna.com', 'valentina1234', 6, 1, '2026-04-10'),
(11, 'Andrés Solís', 'andres.solis@soluna.com', 'andres1234', 3, 1, '2026-04-11'),
(12, 'Camila Herrera', 'camila.herrera@soluna.com', 'camila1234', 4, 1, '2026-04-12'),
(13, 'Adhjeri Vega', 'adjheri.vega@soluna.com', 'adhjeri1234', 7, 1, '2026-04-13'),
(14, 'Fernando Aguilar', 'fernando.aguilar@soluna.com', 'fernando1234', 3, 1, '2026-04-14'),
(15, 'Miguel Mora', 'miguel.mora@soluna.com', 'miguel1234', 8, 1, '2026-04-15'),
(16, 'Paola Vega', 'paola.vega@soluna.com', 'paola1234', 3, 1, '2026-04-16'),
(17, 'Esteban Villalobos', 'esteban.villalobos@soluna.com', 'esteban1234', 4, 1, '2026-04-17'),
(18, 'Natalia Araya', 'natalia.araya@soluna.com', 'natalia1234', 2, 1, '2026-04-18'),
(19, 'Fabián Blando', 'fabian.blando@soluna.com', 'fabian1234', 9, 1, '2026-04-19'),
(20, 'Daniel Picado', 'daniel.picado@soluna.com', 'daniel1234', 10,1, '2026-04-20'),
(21, 'Alejandro Leon', 'alejandro.leon@soluna.com', 'alejandro1234', 3, 1, '2026-04-21'),
(22, 'Isabella Fallas', 'isabella.fallas@soluna.com', 'isabella1234', 3, 1, '2026-04-22'),
(23, 'Mauricio Vindas', 'mauricio.vindas@soluna.com', 'mauricio1234', 4, 1, '2026-04-23'),
(24, 'Priscila Montero', 'priscila.montero@soluna.com', 'priscila1234', 6, 1, '2026-04-24'),
(25, 'Sebastián Rojas', 'sebastian.rojas@soluna.com', 'sebastian1234', 7, 1, '2026-04-25'),
(26, 'Gabriel Campos', 'gabriel.campos@soluna.com', 'gabriel1234', 3, 1, '2026-04-26'),
(27, 'Alejandro Ugalde', 'alejandro.ugalde@soluna.com', 'alejandro1234', 4, 1, '2026-04-27'),
(28, 'Tatiana Castro', 'tatiana.castro@soluna.com', 'tatiana1234', 2, 1, '2026-04-28'),
(29, 'Alonso Brenes', 'alonso.brenes@soluna.com', 'alonso1234', 3, 1, '2026-04-29'),
(30, 'Karina Chavarria', 'karina.chavarria@soluna.com', 'karina1234', 5, 1, '2026-04-30'),
(31, 'Jonathan Leiva', 'jonathan.leiva@soluna.com', 'jonathan1234', 3, 1, '2026-05-01'),
(32, 'Melissa Salas', 'melissa.salas@soluna.com', 'melissa1234', 4, 1, '2026-05-02'),
(33, 'Bryan Corrales', 'bryan.corrales@soluna.com', 'bryan1234', 9, 1, '2026-05-03'),
(34, 'Adriana Quirós', 'adriana.quiros@soluna.com', 'adriana1234', 3, 1, '2026-05-04'),
(35, 'Randall Céspedes', 'randall.cespedes@soluna.com', 'randall1234', 7, 1, '2026-05-05'),
(36, 'Viviana Alfaro', 'viviana.alfaro@soluna.com', 'viviana1234', 3, 1, '2026-05-06'),
(37, 'Cristian Peña', 'cristian.pena@soluna.com', 'cristian1234', 4, 1, '2026-05-07'),
(38, 'Yesenia Mata', 'yesenia.mata@soluna.com', 'yesenia1234', 2, 1, '2026-05-08'),
(39, 'Marco Badilla', 'marco.badilla@soluna.com', 'marco1234', 10,1, '2026-05-09'),
(40, 'Silvia Porras', 'silvia.porras@soluna.com', 'silvia1234', 6, 1, '2026-05-10'),
(41, 'Kenneth Zúñiga', 'kenneth.zuniga@soluna.com', 'kenneth1234', 3, 1, '2026-05-11'),
(42, 'Rebeca Valverde', 'rebeca.valverde@soluna.com', 'rebeca1234', 3, 1, '2026-05-12'),
(43, 'Edwin Chacón', 'edwin.chacon@soluna.com', 'edwin1234', 4, 1, '2026-05-13'),
(44, 'Lorena Zamora', 'lorena.zamora@soluna.com', 'lorena1234', 3, 1, '2026-05-14'),
(45, 'Wilbert Arias', 'wilbert.arias@soluna.com', 'wilbert1234', 7, 1, '2026-05-15'),
(46, 'Angélica Duarte', 'angelica.duarte@soluna.com', 'angelica1234', 2, 1, '2026-05-16'),
(47, 'Norman Gutiérrez', 'norman.gutierrez@soluna.com', 'norman1234', 3, 1, '2026-05-17'),
(48, 'Lizbeth Obando', 'lizbeth.obando@soluna.com', 'lizbeth1234', 4, 1, '2026-05-18'),
(49, 'Rolando Espinoza', 'rolando.espinoza@soluna.com', 'rolando1234', 9, 1, '2026-05-19'),
(50, 'Patricia Navarro', 'patricia.navarro@soluna.com', 'patricia1234', 5, 1, '2026-05-20'),
(51, 'Javier Sánchez', 'javier.sanchez@soluna.com', 'javier1234', 3, 1, '2026-05-21'),
(52, 'Stephanie Bolaños', 'stephanie.bolanos@soluna.com','stephanie1234', 3, 1, '2026-05-22'),
(53, 'Alberto Fonseca', 'alberto.fonseca@soluna.com', 'alberto1234', 4, 1, '2026-05-23'),
(54, 'Marcela Rivera', 'marcela.rivera@soluna.com', 'marcela1234', 6, 1, '2026-05-24'),
(55, 'Ronald Guzmán', 'ronald.guzman@soluna.com', 'ronald1234', 7, 1, '2026-05-25'),
(56, 'Flor Sibaja', 'flor.sibaja@soluna.com', 'flor1234', 3, 1, '2026-05-26'),
(57, 'Gerardo Acosta', 'gerardo.acosta@soluna.com', 'gerardo1234', 4, 1, '2026-05-27'),
(58, 'Roxana Murillo', 'roxana.murillo@soluna.com', 'roxana1234', 2, 1, '2026-05-28'),
(59, 'Alexis Jiménez', 'alexis.jimenez@soluna.com', 'alexis1234', 3, 1, '2026-05-29'),
(60, 'Iliana Bonilla', 'iliana.bonilla@soluna.com', 'iliana1234', 10,1, '2026-05-30'),
(61, 'Rodrigo Barrantes', 'rodrigo.barrantes@soluna.com','rodrigo1234', 3, 1, '2026-05-31'),
(62, 'Vanessa Lobo', 'vanessa.lobo@soluna.com', 'vanessa1234', 3, 1, '2026-06-01'),
(63, 'Armando Mora', 'armando.mora@soluna.com', 'armando1234', 4, 1, '2026-06-02'),
(64, 'Cynthia Chaves', 'cynthia.chaves@soluna.com', 'cynthia1234', 3, 1, '2026-06-03'),
(65, 'Hamilton Solís', 'hamilton.solis@soluna.com', 'hamilton1234', 7, 1, '2026-06-04'),
(66, 'Xiomara Vásquez', 'xiomara.vasquez@soluna.com', 'xiomara1234', 2, 1, '2026-06-05'),
(67, 'Gustavo Retana', 'gustavo.retana@soluna.com', 'gustavo1234', 3, 1, '2026-06-06'),
(68, 'Wendy Alvarado', 'wendy.alvarado@soluna.com', 'wendy1234', 4, 1, '2026-06-07'),
(69, 'Álvaro Madrigal', 'alvaro.madrigal@soluna.com', 'alvaro1234', 9, 1, '2026-06-08'),
(70, 'Jenny Portuguez', 'jenny.portuguez@soluna.com', 'jenny1234', 5, 1, '2026-06-09'),
(71, 'Marvin Segura', 'marvin.segura@soluna.com', 'marvin1234', 3, 1, '2026-06-10'),
(72, 'Greivin Ugarte', 'greivin.ugarte@soluna.com', 'greivin1234', 3, 1, '2026-06-11'),
(73, 'Keily Cascante', 'keily.cascante@soluna.com', 'keily1234', 4, 1, '2026-06-12'),
(74, 'Arnoldo Pereira', 'arnoldo.pereira@soluna.com', 'arnoldo1234', 6, 1, '2026-06-13'),
(75, 'Yorleny Jiménez', 'yorleny.jimenez@soluna.com', 'yorleny1234', 3, 1, '2026-06-14'),
(76, 'Freddy Salas', 'freddy.salas@soluna.com', 'freddy1234', 7, 1, '2026-06-15'),
(77, 'Gloriana Mena', 'gloriana.mena@soluna.com', 'gloriana1234', 3, 1, '2026-06-16'),
(78, 'Hazel Fuentes', 'hazel.fuentes@soluna.com', 'hazel1234', 2, 1, '2026-06-17'),
(79, 'Josué Varela', 'josue.varela@soluna.com', 'josue1234', 4, 1, '2026-06-18'),
(80, 'Raquel Herrera', 'raquel.herrera@soluna.com', 'raquel1234', 10,1, '2026-06-19'),
(81, 'Danilo Picado', 'danilo.picado@soluna.com', 'danilo1234', 3, 1, '2026-06-20'),
(82, 'Maribel Ulate', 'maribel.ulate@soluna.com', 'maribel1234', 3, 1, '2026-06-21'),
(83, 'Erick Arroyo', 'erick.arroyo@soluna.com', 'erick1234', 4, 1, '2026-06-22'),
(84, 'Geovanny Castro', 'geovanny.castro@soluna.com', 'geovanny1234', 3, 1, '2026-06-23'),
(85, 'Luz Marina Solano', 'luzma.solano@soluna.com', 'luz1234', 7, 1, '2026-06-24'),
(86, 'Néstor Orozco', 'nestor.orozco@soluna.com', 'nestor1234', 2, 1, '2026-06-25'),
(87, 'Pamela Sandoval', 'pamela.sandoval@soluna.com', 'pamela1234', 3, 1, '2026-06-26'),
(88, 'Didier Morera', 'didier.morera@soluna.com', 'didier1234', 4, 1, '2026-06-27'),
(89, 'Wanda Chavarría', 'wanda.chavarria@soluna.com', 'wanda1234', 9, 1, '2026-06-28'),
(90, 'Fredy Cordero', 'fredy.cordero@soluna.com', 'fredy1234', 5, 1, '2026-06-29'),
(91, 'Yerlan Bogantes', 'yerlan.bogantes@soluna.com', 'yerlan1234', 3, 1, '2026-06-30'),
(92, 'Marta Gutiérrez', 'marta.gutierrez@soluna.com', 'marta1234', 3, 1, '2026-07-01'),
(93, 'Óscar Mejías', 'oscar.mejias@soluna.com', 'oscar1234', 4, 1, '2026-07-02'),
(94, 'Shirley Alpízar', 'shirley.alpizar@soluna.com', 'shirley1234', 6, 1, '2026-07-03'),
(95, 'Isidro Murillo', 'isidro.murillo@soluna.com', 'isidro1234', 3, 1, '2026-07-04'),
(96, 'Nathalie Saenz', 'nathalie.saenz@soluna.com', 'nathalie1234', 7, 1, '2026-07-05'),
(97, 'Aurelio Obregón', 'aurelio.obregon@soluna.com', 'aurelio1234', 3, 1, '2026-07-06'),
(98, 'Karla Ureña', 'karla.urena@soluna.com', 'karla1234', 2, 1, '2026-07-07'),
(99, 'Tomás Jiménez', 'tomas.jimenez@soluna.com', 'tomas1234', 4, 1, '2026-07-08'),
(100,'Zulema Pérez', 'zulema.perez@soluna.com', 'zulema1234', 10,1, '2026-07-09');

--============================================================
--Insert Categorias
--============================================================
INSERT INTO dbo.Categorias (id_categoria, nombre) VALUES
(1,  'Entradas'),
(2,  'Sopas y Cremas'),
(3,  'Platos Fuertes'),
(4,  'Mariscos'),
(5,  'Carnes'),
(6,  'Aves'),
(7,  'Vegetariano'),
(8,  'Pastas'),
(9,  'Pizzas'),
(10, 'Ensaladas'),
(11, 'Postres'),
(12, 'Bebidas Frías'),
(13, 'Bebidas Calientes'),
(14, 'Cocteles'),
(15, 'Vinos'),
(16, 'Cervezas'),
(17, 'Jugos Naturales'),
(18, 'Batidos'),
(19, 'Desayunos'),
(20, 'Brunch'),
(21, 'Sándwiches'),
(22, 'Hamburguesas'),
(23, 'Wraps'),
(24, 'Tacos'),
(25, 'Sushi'),
(26, 'Wok'),
(27, 'Arroz'),
(28, 'Legumbres'),
(29, 'Parrilladas'),
(30, 'Fondue'),
(31, 'Tapas'),
(32, 'Bocadillos'),
(33, 'Niños'),
(34, 'Combo Almuerzo'),
(35, 'Combo Cena'),
(36, 'Menú Ejecutivo'),
(37, 'Especiales del Día'),
(38, 'Temporada'),
(39, 'Sin Gluten'),
(40, 'Vegano'),
(41, 'Bajo en Calorías'),
(42, 'Alto en Proteína'),
(43, 'Keto'),
(44, 'Sin Lactosa'),
(45, 'Picantes'),
(46, 'Fusion'),
(47, 'Tradicional CR'),
(48, 'Internacional'),
(49, 'Italiana'),
(50, 'Mexicana'),
(51, 'Asiática'),
(52, 'Americana'),
(53, 'Española'),
(54, 'Francesa'),
(55, 'Griega'),
(56, 'Peruana'),
(57, 'Árabe'),
(58, 'India'),
(59, 'Japonesa'),
(60, 'Tailandesa'),
(61, 'Caribeña'),
(62, 'Mediterránea'),
(63, 'Andina'),
(64, 'Centroamericana'),
(65, 'Smoothies'),
(66, 'Agua Saborizada'),
(67, 'Infusiones'),
(68, 'Licores'),
(69, 'Shots'),
(70, 'Mocktails'),
(71, 'Fondue de Queso'),
(72, 'Fondues Dulce'),
(73, 'Crêpes'),
(74, 'Waffles'),
(75, 'Pancakes'),
(76, 'Omelettes'),
(77, 'Fruta'),
(78, 'Yogurt'),
(79, 'Granola'),
(80, 'Acaí Bowl'),
(81, 'Ceviche'),
(82, 'Comida Callejera'),
(83, 'Street Food Gourmet'),
(84, 'Caldo'),
(85, 'Ramen'),
(86, 'Comida Vietnamita'),
(87, 'Comida India'),
(88, 'Comida Medio Oriente'),
(89, 'Comida Vegana Proteica'),
(90, 'Comida Árabe'),
(91, 'Gyros'),
(92, 'Paella'),
(93, 'Risotto'),
(94, 'Gnocchi'),
(95, 'Lasagna'),
(96, 'Ravioli'),
(97, 'Tiramisú'),
(98, 'Cheesecake'),
(99, 'Brownie'),
(100,'Helado');

--============================================================
--Insert Clientes
--============================================================

INSERT INTO dbo.Clientes (id_cliente, nombre_completo, telefono, correo, puntos_acumulados, nivel_fidelidad) VALUES
(1,  'Marco Ulate',          '8818-0001', 'marco.ulate@gmail.com',      150,  'Bronce'),
(2,  'Silvia Trejos',        '8818-0002', 'silvia.trejos@gmail.com',    320,  'Plata'),
(3,  'Andrés Mora',          '8818-0003', 'andres.mora@gmail.com',      50,   'Bronce'),
(4,  'Carolina Salas',       '8818-0004', 'carolina.salas@gmail.com',   780,  'Oro'),
(5,  'Roberto Chacón',       '8818-0005', 'roberto.chacon@gmail.com',   210,  'Plata'),
(6,  'Lucía Badilla',        '8818-0006', 'lucia.badilla@gmail.com',    90,   'Bronce'),
(7,  'Fernando Vega',        '8818-0007', 'fernando.vega@gmail.com',    430,  'Plata'),
(8,  'Patricia Quesada',     '8818-0008', 'patricia.quesada@gmail.com', 1200, 'Oro'),
(9,  'Mauricio Ríos',        '8818-0009', 'mauricio.rios@gmail.com',    60,   'Bronce'),
(10, 'Alejandra Solís',      '8818-0010', 'alejandra.solis@gmail.com',  540,  'Oro'),
(11, 'Henry Vargas',         '8818-0011', 'henry.vargas@gmail.com',     180,  'Bronce'),
(12, 'Xiomara Pérez',        '8818-0012', 'xiomara.perez@gmail.com',    290,  'Plata'),
(13, 'David Castro',         '8818-0013', 'david.castro@gmail.com',     410,  'Plata'),
(14, 'Génesis Herrera',      '8818-0014', 'genesis.herrera@gmail.com',  70,   'Bronce'),
(15, 'Esteban Jiménez',      '8818-0015', 'esteban.jimenez@gmail.com',  920,  'Oro'),
(16, 'Natalia Lobo',         '8818-0016', 'natalia.lobo@gmail.com',     130,  'Bronce'),
(17, 'Diego Arroyo',         '8818-0017', 'diego.arroyo@gmail.com',     360,  'Plata'),
(18, 'Valeria Barrantes',    '8818-0018', 'valeria.barrantes@gmail.com',85,   'Bronce'),
(19, 'Kevin Mejías',         '8818-0019', 'kevin.mejias@gmail.com',     650,  'Oro'),
(20, 'Daniela Espinoza',     '8818-0020', 'daniela.espinoza@gmail.com', 200,  'Plata'),
(21, 'Francisco Peña',       '8818-0021', 'francisco.pena@gmail.com',   40,   'Bronce'),
(22, 'Melissa Corrales',     '8818-0022', 'melissa.corrales@gmail.com', 470,  'Plata'),
(23, 'Jonathan Araya',       '8818-0023', 'jonathan.araya@gmail.com',   310,  'Plata'),
(24, 'Yessenia Alfaro',      '8818-0024', 'yessenia.alfaro@gmail.com',  100,  'Bronce'),
(25, 'Cristian Rivera',      '8818-0025', 'cristian.rivera@gmail.com',  840,  'Oro'),
(26, 'Priscila Gutiérrez',   '8818-0026', 'priscila.gutierrez@gmail.com',175, 'Bronce'),
(27, 'Sebastián Mata',       '8818-0027', 'sebastian.mata@gmail.com',   500,  'Plata'),
(28, 'Andrea Obando',        '8818-0028', 'andrea.obando@gmail.com',    245,  'Plata'),
(29, 'Álvaro Segura',        '8818-0029', 'alvaro.segura@gmail.com',    30,   'Bronce'),
(30, 'Karina Bogantes',      '8818-0030', 'karina.bogantes@gmail.com',  1100, 'Oro'),
(31, 'Norman Porras',        '8818-0031', 'norman.porras@gmail.com',    160,  'Bronce'),
(32, 'Rebeca Alpízar',       '8818-0032', 'rebeca.alpizar@gmail.com',   380,  'Plata'),
(33, 'Edwin Navarro',        '8818-0033', 'edwin.navarro@gmail.com',    225,  'Plata'),
(34, 'Lorena Morales',       '8818-0034', 'lorena.morales@gmail.com',   75,   'Bronce'),
(35, 'Wilbert Céspedes',     '8818-0035', 'wilbert.cespedes@gmail.com', 590,  'Oro'),
(36, 'Angélica Blanco',      '8818-0036', 'angelica.blanco@gmail.com',  140,  'Bronce'),
(37, 'Randall Fonseca',      '8818-0037', 'randall.fonseca@gmail.com',  450,  'Plata'),
(38, 'Viviana Acosta',       '8818-0038', 'viviana.acosta@gmail.com',   110,  'Bronce'),
(39, 'Javier Guzmán',        '8818-0039', 'javier.guzman@gmail.com',    720,  'Oro'),
(40, 'Stephanie Mena',       '8818-0040', 'stephanie.mena@gmail.com',   280,  'Plata'),
(41, 'Alberto Orozco',       '8818-0041', 'alberto.orozco@gmail.com',   55,   'Bronce'),
(42, 'Marcela Sandoval',     '8818-0042', 'marcela.sandoval@gmail.com', 490,  'Plata'),
(43, 'Ronald Fuentes',       '8818-0043', 'ronald.fuentes@gmail.com',   330,  'Plata'),
(44, 'Flor Varela',          '8818-0044', 'flor.varela@gmail.com',      95,   'Bronce'),
(45, 'Gerardo Ulate',        '8818-0045', 'gerardo.ulate@gmail.com',    870,  'Oro'),
(46, 'Roxana Madrigal',      '8818-0046', 'roxana.madrigal@gmail.com',  195,  'Bronce'),
(47, 'Alexis Portuguez',     '8818-0047', 'alexis.portuguez@gmail.com', 415,  'Plata'),
(48, 'Iliana Obregón',       '8818-0048', 'iliana.obregon@gmail.com',   260,  'Plata'),
(49, 'Rodrigo Chavarría',    '8818-0049', 'rodrigo.chavarria@gmail.com',45,   'Bronce'),
(50, 'Vanessa Sibaja',       '8818-0050', 'vanessa.sibaja@gmail.com',   1050, 'Oro'),
(51, 'Armando Murillo',      '8818-0051', 'armando.murillo@gmail.com',  170,  'Bronce'),
(52, 'Cynthia Espinoza',     '8818-0052', 'cynthia.espinoza@gmail.com', 340,  'Plata'),
(53, 'Hamilton Corrales',    '8818-0053', 'hamilton.corrales@gmail.com',210,  'Plata'),
(54, 'Xiomara Araya',        '8818-0054', 'xiomara2.araya@gmail.com',   80,   'Bronce'),
(55, 'Gustavo Alfaro',       '8818-0055', 'gustavo.alfaro@gmail.com',   610,  'Oro'),
(56, 'Wendy Rivera',         '8818-0056', 'wendy.rivera@gmail.com',     145,  'Bronce'),
(57, 'Álvaro Gutiérrez',     '8818-0057', 'alvaro.gutierrez@gmail.com', 390,  'Plata'),
(58, 'Jenny Mata',           '8818-0058', 'jenny.mata@gmail.com',       235,  'Plata'),
(59, 'Marvin Obando',        '8818-0059', 'marvin.obando@gmail.com',    35,   'Bronce'),
(60, 'Greivin Segura',       '8818-0060', 'greivin.segura@gmail.com',   960,  'Oro'),
(61, 'Keily Bogantes',       '8818-0061', 'keily.bogantes@gmail.com',   155,  'Bronce'),
(62, 'Arnoldo Porras',       '8818-0062', 'arnoldo.porras@gmail.com',   370,  'Plata'),
(63, 'Yorleny Alpízar',      '8818-0063', 'yorleny.alpizar@gmail.com',  220,  'Plata'),
(64, 'Freddy Navarro',       '8818-0064', 'freddy.navarro@gmail.com',   65,   'Bronce'),
(65, 'Gloriana Morales',     '8818-0065', 'gloriana.morales@gmail.com', 740,  'Oro'),
(66, 'Hazel Céspedes',       '8818-0066', 'hazel.cespedes@gmail.com',   185,  'Bronce'),
(67, 'Josué Blanco',         '8818-0067', 'josue.blanco@gmail.com',     430,  'Plata'),
(68, 'Raquel Fonseca',       '8818-0068', 'raquel.fonseca@gmail.com',   115,  'Bronce'),
(69, 'Danilo Acosta',        '8818-0069', 'danilo.acosta@gmail.com',    680,  'Oro'),
(70, 'Maribel Guzmán',       '8818-0070', 'maribel.guzman@gmail.com',   255,  'Plata'),
(71, 'Erick Mena',           '8818-0071', 'erick.mena@gmail.com',       50,   'Bronce'),
(72, 'Geovanny Orozco',      '8818-0072', 'geovanny.orozco@gmail.com',  480,  'Plata'),
(73, 'Luz Marina Sandoval',  '8818-0073', 'luzma.sandoval@gmail.com',   300,  'Plata'),
(74, 'Néstor Fuentes',       '8818-0074', 'nestor.fuentes@gmail.com',   88,   'Bronce'),
(75, 'Pamela Varela',        '8818-0075', 'pamela.varela@gmail.com',    810,  'Oro'),
(76, 'Didier Ulate',         '8818-0076', 'didier.ulate@gmail.com',     165,  'Bronce'),
(77, 'Wanda Madrigal',       '8818-0077', 'wanda.madrigal@gmail.com',   355,  'Plata'),
(78, 'Fredy Portuguez',      '8818-0078', 'fredy.portuguez@gmail.com',  205,  'Plata'),
(79, 'Yerlan Obregón',       '8818-0079', 'yerlan.obregon@gmail.com',   40,   'Bronce'),
(80, 'Marta Chavarría',      '8818-0080', 'marta.chavarria@gmail.com',  1030, 'Oro'),
(81, 'Óscar Sibaja',         '8818-0081', 'oscar.sibaja@gmail.com',     175,  'Bronce'),
(82, 'Shirley Murillo',      '8818-0082', 'shirley.murillo@gmail.com',  345,  'Plata'),
(83, 'Isidro Espinoza',      '8818-0083', 'isidro.espinoza@gmail.com',  215,  'Plata'),
(84, 'Nathalie Corrales',    '8818-0084', 'nathalie.corrales@gmail.com',72,   'Bronce'),
(85, 'Aurelio Araya',        '8818-0085', 'aurelio.araya@gmail.com',    560,  'Oro'),
(86, 'Karla Alfaro',         '8818-0086', 'karla.alfaro@gmail.com',     135,  'Bronce'),
(87, 'Tomás Rivera',         '8818-0087', 'tomas.rivera@gmail.com',     405,  'Plata'),
(88, 'Zulema Gutiérrez',     '8818-0088', 'zulema.gutierrez@gmail.com', 240,  'Plata'),
(89, 'Yeremy Mata',          '8818-0089', 'yeremy.mata@gmail.com',      28,   'Bronce'),
(90, 'Carla Obando',         '8818-0090', 'carla.obando@gmail.com',     890,  'Oro'),
(91, 'Minor Segura',         '8818-0091', 'minor.segura@gmail.com',     148,  'Bronce'),
(92, 'Génesis Bogantes',     '8818-0092', 'genesis2.bogantes@gmail.com',360,  'Plata'),
(93, 'Gerson Porras',        '8818-0093', 'gerson.porras@gmail.com',    195,  'Bronce'),
(94, 'Rosaura Alpízar',      '8818-0094', 'rosaura.alpizar@gmail.com',  440,  'Plata'),
(95, 'Bernal Navarro',       '8818-0095', 'bernal.navarro@gmail.com',   65,   'Bronce'),
(96, 'Tatiana Morales',      '8818-0096', 'tatiana.morales@gmail.com',  770,  'Oro'),
(97, 'Ivannia Céspedes',     '8818-0097', 'ivannia.cespedes@gmail.com', 120,  'Bronce'),
(98, 'Mainor Blanco',        '8818-0098', 'mainor.blanco@gmail.com',    395,  'Plata'),
(99, 'Shirli Fonseca',       '8818-0099', 'shirli.fonseca@gmail.com',   270,  'Plata'),
(100,'Tatiana Acosta',       '8818-0100', 'tatiana.acosta@gmail.com',   55,   'Bronce');

--============================================================
--Insert Productos
--============================================================

INSERT INTO dbo.Productos (id_producto, nombre_producto, descripcion, precio, id_categoria, es_disponible) VALUES
(1,  'Bruschetta Clásica',           'Pan tostado con tomate y albahaca',              3500,  1,  1),
(2,  'Tabla de Quesos',              'Selección de quesos nacionales e importados',    5500,  1,  1),
(3,  'Ceviche de Camarón',           'Camarones frescos marinados en limón',           6000,  81, 1),
(4,  'Sopa Azteca',                  'Sopa de tortilla con crema y queso',             3800,  2,  1),
(5,  'Crema de Champiñones',         'Crema suave con champiñones salteados',          4200,  2,  1),
(6,  'Consomé de Res',               'Caldo claro de res con verduras',                3500,  84, 1),
(7,  'Filete de Res a la Parrilla',  'Lomo de res 250g con papas y ensalada',          14000, 5,  1),
(8,  'Pollo a la Naranja',           'Pechuga glaseada con reducción de naranja',      9500,  6,  1),
(9,  'Langostinos al Ajillo',        'Langostinos salteados con ajo y mantequilla',    12000, 4,  1),
(10, 'Tilapia al Limón',             'Filete de tilapia con salsa de limón y alcaparra',8500, 4,  1),
(11, 'Arroz con Mariscos',           'Arroz cremoso con mariscos variados',            11000, 27, 1),
(12, 'Pasta Carbonara',              'Spaghetti con tocino, huevo y parmesano',        8000,  8,  1),
(13, 'Pasta Bolognesa',              'Penne con ragú de carne molida',                 8500,  8,  1),
(14, 'Lasagna de Carne',             'Capas de pasta, carne y bechamel',               9000,  95, 1),
(15, 'Pizza Margherita',             'Tomate, mozarella y albahaca fresca',            7500,  9,  1),
(16, 'Pizza Pepperoni',              'Salsa de tomate, mozarella y pepperoni',         8500,  9,  1),
(17, 'Pizza Vegetariana',            'Verduras asadas sobre base de tomate',           8000,  9,  1),
(18, 'Ensalada César',               'Lechuga romana, crutones, parmesano y aderezo',  5000,  10, 1),
(19, 'Ensalada Caprese',             'Tomate, mozarella y albahaca con balsámico',     5500,  10, 1),
(20, 'Ensalada Griega',              'Pepino, aceitunas, queso feta y vinagreta',       5000,  10, 1),
(21, 'Costillas BBQ',                'Costillas de cerdo ahumadas con salsa BBQ',      13000, 5,  1),
(22, 'Hamburguesa Clásica',          'Carne de res, lechuga, tomate y cheddar',        7500,  22, 1),
(23, 'Hamburguesa Doble',            'Doble carne, tocino y queso especial',           9500,  22, 1),
(24, 'Hamburguesa Vegetariana',      'Base de garbanzo con verduras frescas',          7000,  22, 1),
(25, 'Tacos de Pollo',               '3 tacos con pollo, pico de gallo y guacamole',   7000,  24, 1),
(26, 'Tacos de Carne',               '3 tacos con carne asada y salsa roja',           8000,  24, 1),
(27, 'Wrap de Pollo y Verduras',     'Tortilla de harina con pollo y vegetales',       6500,  23, 1),
(28, 'Sushi Roll California',        '8 piezas con cangrejo, pepino y aguacate',       7500,  25, 1),
(29, 'Sushi Roll Spicy Tuna',        '8 piezas de atún con salsa picante',             8500,  25, 1),
(30, 'Arroz Frito Tailandés',        'Arroz wok con verduras y salsa de ostión',       7000,  60, 1),
(31, 'Pad Thai',                     'Noodles con camarones, maní y limón',             8000,  60, 1),
(32, 'Curry de Pollo',               'Pollo en salsa curry con arroz blanco',          9000,  87, 1),
(33, 'Falafel con Hummus',           'Croquetas de garbanzo con hummus y pita',        6500,  89, 1),
(34, 'Shawarma de Pollo',            'Pollo marinado en pan árabe con tahini',         7000,  90, 1),
(35, 'Paella Valenciana',            'Arroz con mariscos, pollo y azafrán',            15000, 92, 1),
(36, 'Risotto de Hongos',            'Arroz cremoso con champiñones y parmesano',      9500,  93, 1),
(37, 'Gnocchi al Pesto',             'Gnocchi de papa con pesto de albahaca',          8500,  94, 1),
(38, 'Fondue de Queso',              'Queso suizo fundido con pan y verduras',         10000, 71, 1),
(39, 'Parrillada Mixta Personal',    'Carnes y chorizos a la parrilla para 1',         16000, 29, 1),
(40, 'Parrillada Mixta para 2',      'Carnes, mariscos y chorizos para compartir',     28000, 29, 1),
(41, 'Plato de Pasta Niños',         'Pasta con salsa de tomate y queso',              4500,  33, 1),
(42, 'Nuggets de Pollo Niños',       '6 nuggets con papas y jugo',                     4000,  33, 1),
(43, 'Combo Almuerzo Ejecutivo',     'Sopa, plato fuerte y bebida',                    8500,  36, 1),
(44, 'Desayuno Americano',           'Huevos, tocino, pan tostado y jugo',             6000,  19, 1),
(45, 'Gallo Pinto Tico',             'Gallo pinto con huevo y natilla',                4500,  47, 1),
(46, 'Casado de Res',                'Arroz, frijoles, ensalada, maduros y carne',     7500,  47, 1),
(47, 'Casado de Pollo',              'Arroz, frijoles, ensalada, maduros y pollo',     7000,  47, 1),
(48, 'Sopa Negra',                   'Sopa típica de frijoles con huevo pochado',      4000,  47, 1),
(49, 'Olla de Carne',                'Guiso tradicional con carnes y verduras',        8000,  47, 1),
(50, 'Chifrijo',                     'Chicharrón, frijoles, pico de gallo y arroz',   6500,  47, 1),
(51, 'Tiramisú',                     'Postre italiano con café y mascarpone',          4500,  97, 1),
(52, 'Cheesecake de Fresa',          'Base de galleta, queso crema y fresa',          4000,  98, 1),
(53, 'Brownie con Helado',           'Brownie de chocolate con bola de helado',        3500,  99, 1),
(54, 'Tres Leches',                  'Bizcocho empapado en tres tipos de leche',       3800,  11, 1),
(55, 'Flan de Caramelo',             'Flan suave con caramelo líquido',                3500,  11, 1),
(56, 'Helado Artesanal 1 bola',      'Sabores: vainilla, chocolate o fresa',           2000, 100, 1),
(57, 'Helado Artesanal 3 bolas',     'Selección de 3 sabores con toppings',            4000, 100, 1),
(58, 'Café Americano',               'Café negro largo',                               1800,  13, 1),
(59, 'Cappuccino',                   'Espresso con leche espumada',                    2500,  13, 1),
(60, 'Latte de Vainilla',            'Espresso con leche y sirope de vainilla',        2800,  13, 1),
(61, 'Té de Hierbas',                'Selección de tés e infusiones',                  2000,  67, 1),
(62, 'Jugo Natural de Naranja',      'Naranja exprimida al momento',                   2500,  17, 1),
(63, 'Jugo Natural de Piña',         'Piña fresca licuada',                            2500,  17, 1),
(64, 'Batido de Mango',              'Mango, leche y hielo',                           3000,  18, 1),
(65, 'Batido de Fresa',              'Fresa, leche y hielo',                           3000,  18, 1),
(66, 'Agua Mineral 500ml',           'Agua mineral natural',                           1200,  12, 1),
(67, 'Refresco de Cola',             'Refresco gaseoso de cola 350ml',                 1500,  12, 1),
(68, 'Limonada Natural',             'Limón fresco, agua y azúcar',                    2000,  12, 1),
(69, 'Mojito Clásico',               'Ron, menta, limón y soda',                       5500,  14, 1),
(70, 'Margarita',                    'Tequila, triple sec y limón con sal',             6000,  14, 1),
(71, 'Pisco Sour',                   'Pisco, limón y clara de huevo',                  5500,  14, 1),
(72, 'Sangría de la Casa',           'Vino tinto, frutas y brandy',                    5000,  15, 1),
(73, 'Copa de Vino Tinto',           'Merlot de importación',                          4500,  15, 1),
(74, 'Copa de Vino Blanco',          'Chardonnay de importación',                      4500,  15, 1),
(75, 'Cerveza Artesanal IPA',        'IPA local, lupulada y aromática',                3500,  16, 1),
(76, 'Cerveza Artesanal Stout',      'Stout oscura con notas de café',                 3500,  16, 1),
(77, 'Mocktail de Frutas',           'Cóctel sin alcohol de frutas tropicales',        4000,  70, 1),
(78, 'Smoothie Verde',               'Espinaca, manzana, jengibre y limón',            3500,  65, 1),
(79, 'Acaí Bowl',                    'Acaí, granola, frutas y miel',                   5500,  80, 1),
(80, 'Waffle con Frutas',            'Waffle belga con fruta fresca y crema',          5000,  74, 1),
(81, 'Pancakes con Maple',           '3 pancakes con mantequilla y sirope maple',      4500,  75, 1),
(82, 'Omelette de Queso y Jamón',    'Huevos batidos con queso y jamón',               5000,  76, 1),
(83, 'Tostadas Francesas',           'Pan de molde en huevo y canela',                 4000,  19, 1),
(84, 'Granola con Yogurt',           'Yogurt natural con granola y miel',              4000,  79, 1),
(85, 'Sándwich Club',                'Pollo, tocino, lechuga, tomate y mayo',          6500,  21, 1),
(86, 'Sándwich Vegetal',             'Aguacate, espinaca, tomate y queso',             5500,  21, 1),
(87, 'Ramen de Pollo',               'Caldo de pollo con noodles y huevo pochado',     8500,  85, 1),
(88, 'Pho de Res',                   'Caldo de res con fideos de arroz y especias',    8000,  86, 1),
(89, 'Gyros de Cordero',             'Carne de cordero en pan pita con tzatziki',      9000,  91, 1),
(90, 'Crepe de Nutella y Fresa',     'Crepe fino relleno de Nutella y fresa',          4500,  73, 1),
(91, 'Carpaccio de Res',             'Láminas de res con rúcula y parmesano',          7500,  1,  1),
(92, 'Tempura de Verduras',          'Verduras rebozadas al estilo japonés',           6500,  59, 1),
(93, 'Edamame con Sal Marina',       'Vainas de soya cocidas con sal',                 3000,  59, 1),
(94, 'Gyozas al Vapor',              '6 dumplings de cerdo y vegetales',               5500,  51, 1),
(95, 'Bowl Proteico',                'Quinoa, pollo, aguacate y aderezo tahini',       9500,  42, 1),
(96, 'Bowl Vegano',                  'Garbanzos, kale, boniato y aderezo de limón',    8500,  40, 1),
(97, 'Plato Keto de Carne',          'Lomo, espárragos y mantequilla de hierbas',      13500, 43, 1),
(98, 'Ensalada Sin Gluten',          'Quinoa, betarraga, zanahoria y vinagreta',       7000,  39, 1),
(99, 'Especial del Chef',            'Plato sorpresa según ingredientes del día',      12000, 37, 1),
(100,'Tabla de Tapas',               'Selección de 5 tapas de la casa',                9500,  31, 1);