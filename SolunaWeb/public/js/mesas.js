// public/js/mesas.js

document.addEventListener('DOMContentLoaded', () => {
    cargarMesas();
    cargarProductosMenu(); // Pre-cargar productos para el modal de nuevo pedido
    
    // Polling background silence updates cada 15 segundos
    setInterval(() => cargarMesas(true), 15000);
});

let mesasCache = [];
let productosCache = [];
let carritoPedido = [];

// Cargar estado de las mesas
async function cargarMesas(isPolling = false) {
    const grid = document.getElementById('gridMesas');
    
    if (!isPolling) {
        grid.innerHTML = '<div class="col-12 text-center"><i class="fas fa-spinner fa-spin"></i> Cargando mesas...</div>';
    }

    try {
        const response = await fetch('/api/mesas');
        if (!response.ok) throw new Error('API Mesas no disponible o error HTTP');
        
        let mesas = await response.json();
        
        if (mesas.length === 0) {
            grid.innerHTML = '<div class="col-12 text-center text-muted">No hay mesas registradas en la base de datos</div>';
            return;
        }

        mesasCache = mesas;
        renderizarMesas(mesas);
        actualizarContadoresMesas(mesas);

    } catch (error) {
        console.error('Error al cargar mesas:', error);
        grid.innerHTML = '<div class="col-12 text-danger">Error al cargar mesas (' + error.message + ')</div>';
    }
}

function renderizarMesas(mesas) {
    const grid = document.getElementById('gridMesas');
    if (!grid) return;
    grid.innerHTML = '';

    const filtroEstado = document.getElementById('filtroEstado') ? document.getElementById('filtroEstado').value : '';

    const mesasFiltradas = mesas.filter(m => {
        if (filtroEstado && m.estado.toLowerCase() !== filtroEstado) return false;
        return true;
    });

    mesasFiltradas.forEach(mesa => {
        const estadoClass = mesa.estado.toLowerCase(); // libre, ocupada, reservada

        const card = document.createElement('div');
        card.className = 'col-xl-3 col-md-4 col-sm-6 mb-4';
        card.innerHTML = `
            <div class="mesa-card ${estadoClass}" onclick="abrirDetalleMesa(${mesa.id_mesa})">
                <div class="mesa-numero">${mesa.numero_mesa}</div>
                <div class="mesa-capacidad"><i class="fas fa-users"></i> ${mesa.capacidad} pers.</div>
                <div class="mesa-estado font-weight-bold mt-2">${mesa.estado}</div>
                ${mesa.estado === 'Ocupada' ? '<div class="mesa-tiempo"><i class="far fa-clock"></i> 12 min</div>' : ''}
            </div>
        `;
        grid.appendChild(card);
    });
}

// Detalle de Mesa
function abrirDetalleMesa(idMesa) {
    const mesa = mesasCache.find(m => m.id_mesa === idMesa);
    if (!mesa) return;

    const modalTitle = document.getElementById('detalleMesaLabel');
    const modalBody = document.getElementById('detalleMesaContent');
    const btnOcupar = document.getElementById('btnOcuparMesa');
    const btnPedido = document.getElementById('btnNuevoPedido');
    const btnLiberar = document.getElementById('btnLiberarMesa');

    modalTitle.innerText = `Mesa ${mesa.numero_mesa}`;

    let html = `
        <div class="text-center mb-4">
            <h1 class="display-4 text-gray-800">${mesa.numero_mesa}</h1>
            <span class="badge badge-${getBadgeClass(mesa.estado)} px-3 py-2">${mesa.estado}</span>
        </div>
        <div class="row text-center border-top pt-3">
            <div class="col-12">
                <strong>Capacidad:</strong> ${mesa.capacidad} personas
            </div>
        </div>
    `;

    // Lógica de botones
    btnOcupar.style.display = 'none';
    btnPedido.style.display = 'none';
    btnLiberar.style.display = 'none';

    if (mesa.estado === 'Libre') {
        btnOcupar.style.display = 'block';
        btnOcupar.onclick = () => mostrarModalOcupar(idMesa);
    } else if (mesa.estado === 'Ocupada') {
        html += `
            <hr>
            <div class="alert alert-info">
                <strong>Cliente:</strong> Juan Pérez (Simulado)<br>
                <strong>Mesero:</strong> ${document.getElementById('userName').innerText}
            </div>
        `;
        btnPedido.style.display = 'block';
        btnPedido.onclick = () => abrirModalNuevoPedido(idMesa);

        btnLiberar.style.display = 'block';
        btnLiberar.onclick = () => liberarMesa(idMesa);
    }

    modalBody.innerHTML = html;
    $('#detalleMesaModal').modal('show');
}

function getBadgeClass(estado) {
    switch (estado.toLowerCase()) {
        case 'libre': return 'success';
        case 'ocupada': return 'warning';
        case 'reservada': return 'primary';
        default: return 'secondary';
    }
}

// Ocupar Mesa
function mostrarModalOcupar(idMesa) {
    $('#detalleMesaModal').modal('hide');
    $('#mesaIdOcupar').val(idMesa);
    $('#ocuparMesaModal').modal('show');
}

document.getElementById('btnConfirmarOcupar').addEventListener('click', async () => {
    const idMesa = $('#mesaIdOcupar').val();

    try {
        // Actualizar estado en la base de datos
        const response = await fetch(`/api/mesas/${idMesa}/estado`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: 'Ocupada' })
        });

        if (response.ok) {
            $('#ocuparMesaModal').modal('hide');
            cargarMesas(); // Recargar mesas desde la API
            alert('Mesa ocupada correctamente');
        } else {
            alert('Error al ocupar mesa');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión al ocupar mesa');
    }
});

function liberarMesa(idMesa) {
    Swal.fire({
        title: '¿Liberar esta mesa?',
        text: 'Asegúrese de que el pago se haya procesado.',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonColor: '#e74a3b',
        cancelButtonColor: '#858796',
        confirmButtonText: 'Sí, liberar',
        cancelButtonText: 'Cancelar'
    }).then(async (result) => {
        if (result.isConfirmed) {
            try {
                const response = await fetch(`/api/mesas/${idMesa}/estado`, {
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ estado: 'Libre' })
                });

                if (response.ok) {
                    $('#detalleMesaModal').modal('hide');
                    cargarMesas(); // Recargar desde API
                } else {
                    alert('Error al liberar mesa');
                }
            } catch (error) {
                console.error('Error:', error);
                alert('Error de conexión al liberar mesa');
            }
        }
    });
}


// --- NUEVO PEDIDO ---

async function cargarProductosMenu() {
    try {
        const response = await fetch('/api/productos/disponibles');
        if (response.ok) {
            productosCache = await response.json();
            console.log('Menú cargado:', productosCache.length, 'productos');
        }
    } catch (e) {
        console.error('Error cargando menú:', e);
    }
}

let mesaActualPedido = null;

function abrirModalNuevoPedido(idMesa) {
    mesaActualPedido = idMesa;
    carritoPedido = [];
    $('#detalleMesaModal').modal('hide');

    // Crear modal de pedido dinámicamente si no existe, o reusar uno
    // Vamos a inyectar un modal de selección de productos
    if (!document.getElementById('modalSeleccionProductos')) {
        crearModalSeleccionProductos();
    }

    renderizarSeleccionProductos();
    actualizarCarritoVisual();
    $('#modalSeleccionProductos').modal('show');
}

function crearModalSeleccionProductos() {
    const modalHtml = `
    <div class="modal fade" id="modalSeleccionProductos" tabindex="-1" role="dialog" aria-hidden="true">
        <div class="modal-dialog modal-xl" role="document">
            <div class="modal-content">
                <div class="modal-header">
                    <h5 class="modal-title">Nuevo Pedido - Mesa <span id="lblMesaPedido"></span></h5>
                    <button class="close" type="button" data-dismiss="modal" aria-label="Close">
                        <span aria-hidden="true">×</span>
                    </button>
                </div>
                <div class="modal-body">
                    <div class="row">
                        <!-- Columna Productos -->
                        <div class="col-md-7">
                            <input type="text" class="form-control mb-3" id="buscarProducto" placeholder="Buscar producto...">
                            
                            <ul class="nav nav-pills mb-3" id="pills-tab" role="tablist">
                                <li class="nav-item"><a class="nav-link active" data-toggle="pill" href="#pills-todos" onclick="filtrarProductosCategoria('todos')">Todos</a></li>
                                <li class="nav-item"><a class="nav-link" data-toggle="pill" href="#pills-entradas" onclick="filtrarProductosCategoria('Entradas')">Entradas</a></li>
                                <li class="nav-item"><a class="nav-link" data-toggle="pill" href="#pills-platos" onclick="filtrarProductosCategoria('Platos Fuertes')">Platos Fuertes</a></li>
                                <li class="nav-item"><a class="nav-link" data-toggle="pill" href="#pills-bebidas" onclick="filtrarProductosCategoria('Bebidas')">Bebidas</a></li>
                            </ul>
                            
                            <div style="height: 400px; overflow-y: auto;">
                                <div class="row" id="gridProductos">
                                    <!-- Productos aquí -->
                                </div>
                            </div>
                        </div>
                        
                        <!-- Columna Carrito -->
                        <div class="col-md-5 border-left">
                            <h5 class="mb-3">Resumen de Pedido</h5>
                            <div class="table-responsive" style="height: 350px; overflow-y: auto;">
                                <table class="table table-sm" id="tablaCarrito">
                                    <thead><tr><th>Producto</th><th>Cant</th><th>Tiempo</th><th>Subtotal</th><th></th></tr></thead>
                                    <tbody></tbody>
                                </table>
                            </div>
                            <div class="d-flex justify-content-between h4 mt-3">
                                <span>Total:</span>
                                <span id="totalCarrito">₡0</span>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
                    <button class="btn btn-primary" onclick="enviarPedidoCocina()">
                        <i class="fas fa-paper-plane"></i> Enviar a Cocina
                    </button>
                </div>
            </div>
        </div>
    </div>`;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Evento búsqueda
    document.getElementById('buscarProducto').addEventListener('keyup', (e) => {
        renderizarSeleccionProductos(e.target.value);
    });
}

function filtrarProductosCategoria(categoria) {
    renderizarSeleccionProductos(document.getElementById('buscarProducto').value, categoria);
}

function renderizarSeleccionProductos(busqueda = '', categoriaFiltro = 'todos') {
    const grid = document.getElementById('gridProductos');
    grid.innerHTML = '';

    let docs = productosCache;

    if (busqueda) {
        docs = docs.filter(p => p.nombre_producto.toLowerCase().includes(busqueda.toLowerCase()));
    }

    if (categoriaFiltro !== 'todos') {
        docs = docs.filter(p => p.categoria === categoriaFiltro || (categoriaFiltro === 'Entradas' && p.categoria === 'Entrada'));
    }

    docs.forEach(p => {
        const col = document.createElement('div');
        col.className = 'col-sm-6 col-lg-4 mb-3';
        col.innerHTML = `
            <div class="card h-100 shadow-sm producto-card" onclick="agregarAlCarrito(${p.id_producto})">
                <div class="card-body p-2 text-center">
                    <h6 class="font-weight-bold mb-1" style="font-size: 0.9rem;">${p.nombre_producto}</h6>
                    <span class="badge badge-info">${p.categoria || 'General'}</span>
                    <div class="mt-2 text-primary font-weight-bold">₡${p.precio}</div>
                </div>
            </div>
        `;
        grid.appendChild(col);
    });
}

function agregarAlCarrito(idProducto) {
    const prod = productosCache.find(p => p.id_producto === idProducto);
    const item = carritoPedido.find(i => i.id_producto === idProducto);

    if (item) {
        item.cantidad++;
    } else {
        carritoPedido.push({
            id_producto: idProducto,
            nombre: prod.nombre_producto,
            precio: prod.precio,
            cantidad: 1,
            categoria: prod.categoria,
            tiempo_plato: 'Principal' // Default: Entrada, Principal, Postre
        });
    }
    actualizarCarritoVisual();
}

function actualizarCarritoVisual() {
    const tbody = document.querySelector('#tablaCarrito tbody');
    tbody.innerHTML = '';
    let total = 0;

    carritoPedido.forEach((item, index) => {
        const subtotal = item.cantidad * item.precio;
        total += subtotal;

        tbody.innerHTML += `
            <tr>
                <td>
                    <small><strong>${item.nombre}</strong><br>
                    <span class="text-muted">${item.categoria}</span></small>
                </td>
                <td>
                    <input type="number" class="form-control form-control-sm p-1" 
                           value="${item.cantidad}" min="1" 
                           onchange="cambiarCantidad(${index}, this.value)" style="width: 50px">
                </td>
                <td>
                    <select class="form-control form-control-sm" onchange="cambiarTiempo(${index}, this.value)">
                        <option value="Entrada" ${item.tiempo_plato === 'Entrada' ? 'selected' : ''}>Entrada</option>
                        <option value="Principal" ${item.tiempo_plato === 'Principal' ? 'selected' : ''}>Principal</option>
                        <option value="Postre" ${item.tiempo_plato === 'Postre' ? 'selected' : ''}>Postre</option>
                    </select>
                </td>
                <td>₡${subtotal}</td>
                <td><button class="btn btn-sm btn-danger py-0 px-1" onclick="eliminarDelCarrito(${index})">&times;</button></td>
            </tr>
        `;
    });

    document.getElementById('totalCarrito').innerText = '₡' + total;
}

window.cambiarCantidad = (index, val) => {
    if (val < 1) val = 1;
    carritoPedido[index].cantidad = parseInt(val);
    actualizarCarritoVisual();
}

window.cambiarTiempo = (index, tiempo) => {
    carritoPedido[index].tiempo_plato = tiempo;
    actualizarCarritoVisual();
}

window.eliminarDelCarrito = (index) => {
    carritoPedido.splice(index, 1);
    actualizarCarritoVisual();
}

async function enviarPedidoCocina() {
    if (carritoPedido.length === 0) {
        alert('El pedido está vacío');
        return;
    }

    const usuario = JSON.parse(sessionStorage.getItem('usuario'));

    const pedidoData = {
        id_mesa: mesaActualPedido,
        id_usuario: usuario ? usuario.id : 1, // Fallback si no hay usuario en session
        productos: carritoPedido.map(p => ({
            id_producto: p.id_producto,
            cantidad: p.cantidad,
            notas: '',
            tiempo_plato: p.tiempo_plato
        }))
    };

    try {
        const response = await fetch('/api/pedidos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pedidoData)
        });

        const result = await response.json();

        if (result.success) {
            alert('¡Pedido enviado a cocina!');
            $('#modalSeleccionProductos').modal('hide');
        } else {
            alert('Error: ' + result.error);
        }
    } catch (e) {
        console.error(e);
        alert('Error de conexión al enviar pedido');
    }
}

function actualizarContadoresMesas(mesas) {
    const libres = mesas.filter(m => m.estado.toLowerCase() === 'libre').length;
    const ocupadas = mesas.filter(m => m.estado.toLowerCase() === 'ocupada').length;

    document.getElementById('mesasLibres').innerText = libres;
    document.getElementById('mesasOcupadas').innerText = ocupadas;
}

window.actualizarMesas = cargarMesas; // Exponer para el botón actualizar
