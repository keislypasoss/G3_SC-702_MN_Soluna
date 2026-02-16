// public/js/cocina.js

document.addEventListener('DOMContentLoaded', () => {

    // Inicializar
    cargarPedidosCocina();

    // Polling cada 30 segundos
    setInterval(cargarPedidosCocina, 30000);
});

let pedidosCache = [];

async function cargarPedidosCocina() {
    try {
        const response = await fetch('/api/cocina/pedidos');
        if (!response.ok) throw new Error('Error al cargar pedidos');

        const pedidos = await response.json();
        pedidosCache = pedidos;
        renderizarPedidos(pedidos);
        actualizarContadores(pedidos);

    } catch (error) {
        console.error('Error:', error);
        alert('Error al actualizar la lista de pedidos');
    }
}

function actualizarPedidos() {
    cargarPedidosCocina();
}

function filtrarPorEstado(filtro) {
    // Actualizar botones activos
    document.querySelectorAll('.btn-group .btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    if (filtro === 'todos') {
        renderizarPedidos(pedidosCache);
    } else {
        const pedidosFiltrados = pedidosCache.filter(p => {
            if (filtro === 'pendiente') return p.estado_pedido === 'Pendiente';
            if (filtro === 'en_preparacion') return p.estado_pedido === 'En Cocina';
            if (filtro === 'listo') return p.estado_pedido === 'Listo'; // Aunque la API filtras
            return true;
        });
        renderizarPedidos(pedidosFiltrados);
    }
}

function renderizarPedidos(pedidos) {
    const pendientesContainer = document.getElementById('pedidosPendientesContainer');
    const preparacionContainer = document.getElementById('pedidosPreparacionContainer');
    const listosContainer = document.getElementById('pedidosListosContainer');

    pendientesContainer.innerHTML = '';
    preparacionContainer.innerHTML = '';
    listosContainer.innerHTML = '';

    let hayPendientes = false;
    let hayPreparacion = false;
    let hayListos = false;

    pedidos.forEach(pedido => {
        const card = crearTarjetaPedido(pedido);

        if (pedido.estado_pedido === 'Pendiente') {
            pendientesContainer.appendChild(card);
            hayPendientes = true;
        } else if (pedido.estado_pedido === 'En Cocina') {
            preparacionContainer.appendChild(card);
            hayPreparacion = true;
        } else if (pedido.estado_pedido === 'Listo') {
            listosContainer.appendChild(card);
            hayListos = true;
        }
    });

    if (!hayPendientes) pendientesContainer.innerHTML = '<div class="col-12"><p class="text-muted text-center">No hay pedidos pendientes</p></div>';
    if (!hayPreparacion) preparacionContainer.innerHTML = '<div class="col-12"><p class="text-muted text-center">No hay pedidos en preparación</p></div>';
    if (!hayListos) listosContainer.innerHTML = '<div class="col-12"><p class="text-muted text-center">No hay pedidos listos</p></div>';
}

function crearTarjetaPedido(pedido) {
    const col = document.createElement('div');
    col.className = 'col-lg-4 col-md-6 mb-4';

    const fechaPedido = new Date(pedido.fecha_pedido);
    const tiempoTranscurrido = Math.floor((new Date() - fechaPedido) / 60000); // minutos

    let urgenciaClass = '';
    if (tiempoTranscurrido > 30) urgenciaClass = 'urgente alerta-tiempo';
    else if (pedido.estado_pedido === 'En Cocina') urgenciaClass = 'preparando';

    // Agrupar detalles por tiempo_plato (Entrada, Principal, Postre)
    const detallesPorTiempo = {};
    pedido.detalles.forEach(detalle => {
        const tiempo = detalle.tiempo_plato || 'Principal'; // Default si no está definido
        if (!detallesPorTiempo[tiempo]) detallesPorTiempo[tiempo] = [];
        detallesPorTiempo[tiempo].push(detalle);
    });

    // Definir orden de presentación
    const ordenTiempos = ['Entrada', 'Principal', 'Postre'];

    // Construir HTML de items agrupados por tiempo
    let itemsHtml = '';
    ordenTiempos.forEach(tiempo => {
        if (detallesPorTiempo[tiempo]) {
            // Color coding por tiempo
            let tiempoColor = 'text-success'; // Entrada
            if (tiempo === 'Principal') tiempoColor = 'text-primary';
            else if (tiempo === 'Postre') tiempoColor = 'text-warning';

            itemsHtml += `<div class="tiempo-grupo mb-3">
                <h6 class="font-weight-bold ${tiempoColor} border-bottom pb-1">
                    <i class="fas fa-clock"></i> ${tiempo}
                </h6>`;

            detallesPorTiempo[tiempo].forEach(item => {
                itemsHtml += `
                    <div class="producto-item pl-2">
                        <div class="d-flex justify-content-between align-items-start">
                            <div>
                                <span class="font-weight-bold">${item.cantidad}x ${item.nombre_producto}</span>
                                <br><small class="text-muted">${item.nombre_categoria || ''}</small>
                            </div>
                        </div>
                        ${item.notas ? `<small class="text-danger d-block"><i class="fas fa-sticky-note"></i> ${item.notas}</small>` : ''}
                    </div>
                `;
            });
            itemsHtml += '</div>';
        }
    });

    // Botones de acción según estado
    let botonesHtml = '';
    if (pedido.estado_pedido === 'Pendiente') {
        botonesHtml = `
            <button class="btn btn-warning btn-block" onclick="cambiarEstadoPedido(${pedido.id_pedido}, 'En Cocina')">
                <i class="fas fa-fire"></i> Empezar Preparación
            </button>
        `;
    } else if (pedido.estado_pedido === 'En Cocina') {
        botonesHtml = `
            <button class="btn btn-success btn-block" onclick="cambiarEstadoPedido(${pedido.id_pedido}, 'Listo')">
                <i class="fas fa-check"></i> Marcar como Listo
            </button>
        `;
    } else if (pedido.estado_pedido === 'Listo') {
        botonesHtml = `
            <button class="btn btn-info btn-block" onclick="cambiarEstadoPedido(${pedido.id_pedido}, 'Entregado')">
                <i class="fas fa-hand-holding"></i> Entregado a Mesero
            </button>
        `;
    }

    col.innerHTML = `
        <div class="card shadow h-100 pedido-card ${urgenciaClass}">
            <div class="card-header py-3 d-flex flex-row align-items-center justify-content-between">
                <h6 class="m-0 font-weight-bold text-primary">Mesa ${pedido.numero_mesa}</h6>
                <span class="badge badge-secondary">#${pedido.id_pedido}</span>
            </div>
            <div class="card-body">
                <div class="mb-2 text-center">
                    <span class="tiempo-pedido ${tiempoTranscurrido > 30 ? 'text-danger' : 'text-gray-800'}">
                        ${tiempoTranscurrido} min
                    </span>
                    <div class="small text-muted">Mesero: ${pedido.mesero}</div>
                </div>
                <div class="lista-productos">
                    ${itemsHtml}
                </div>
            </div>
            <div class="card-footer">
                ${botonesHtml}
            </div>
        </div>
    `;

    return col;
}

async function cambiarEstadoPedido(idPedido, nuevoEstado) {
    if (!confirm(`¿Cambiar estado del pedido #${idPedido} a "${nuevoEstado}"?`)) return;

    try {
        const response = await fetch(`/api/pedidos/${idPedido}/estado`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ estado: nuevoEstado })
        });

        if (response.ok) {
            cargarPedidosCocina(); // Recargar todo
        } else {
            alert('Error al actualizar estado');
        }
    } catch (error) {
        console.error('Error:', error);
        alert('Error de conexión');
    }
}

function actualizarContadores(pedidos) {
    const pendientes = pedidos.filter(p => p.estado_pedido === 'Pendiente').length;

    // Actualizar badge en navbar (si existe)
    const badge = document.getElementById('pedidosPendientes');
    if (badge) {
        badge.innerText = pendientes;
        if (pendientes > 0) badge.classList.remove('d-none');
    }
}
