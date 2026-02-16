// public/js/caja.js

document.addEventListener('DOMContentLoaded', () => {

    inicializarCaja();

    // Event Listeners
    document.getElementById('buscarPedido').addEventListener('input', (e) => filtrarPedidos(e.target.value));
    document.getElementById('btnFacturar').addEventListener('click', abrirModalFactura);
    document.getElementById('metodoPago').addEventListener('change', actualizarCambio);
    document.getElementById('pagoCon').addEventListener('input', actualizarCambio);
    document.getElementById('btnGenerarFactura').addEventListener('click', procesarPago);
    document.getElementById('btnConfirmarCierreCaja').addEventListener('click', cerrarCaja);

    // Configurar Modal de Apertura (si es necesario)
    // Se hace dinámicamente en verificarEstadoCaja
});

let sesionActual = null;
let pedidoSeleccionado = null;
let pedidosPendientes = [];

async function inicializarCaja() {
    await verificarEstadoCaja();
    if (sesionActual) {
        cargarPedidosPendientesPago();
        cargarFacturasDia();
    }
}

async function verificarEstadoCaja() {
    try {
        const response = await fetch('/api/caja/estado');
        const data = await response.json();

        if (data.abierta) {
            sesionActual = data.sesion;
            mostrarDashboard(data);
        } else {
            solicitarAperturaCaja();
        }
    } catch (error) {
        console.error('Error al verificar caja:', error);
    }
}

function mostrarDashboard(data) {
    document.getElementById('estadoCaja').className = 'badge badge-success';
    document.getElementById('estadoCaja').innerText = 'Caja Abierta';

    document.getElementById('montoInicial').innerText = formatearMoneda(data.sesion.monto_inicial);
    document.getElementById('ventasDia').innerText = formatearMoneda(data.ventas);
    document.getElementById('numFacturas').innerText = data.cantidad_facturas;

    const total = parseFloat(data.sesion.monto_inicial) + parseFloat(data.ventas);
    document.getElementById('totalCaja').innerText = formatearMoneda(total);

    // Preparar datos para cierre
    document.getElementById('cierreMontoInicial').innerText = formatearMoneda(data.sesion.monto_inicial);
    document.getElementById('cierreVentas').innerText = formatearMoneda(data.ventas);
    document.getElementById('cierreTotalFacturas').innerText = data.cantidad_facturas;
    document.getElementById('cierreMontoFinal').innerText = formatearMoneda(total);
}

function solicitarAperturaCaja() {
    document.getElementById('estadoCaja').className = 'badge badge-danger';
    document.getElementById('estadoCaja').innerText = 'Caja Cerrada';

    // Crear modal de apertura dinámicamente si no existe o usar uno existente
    // Por simplicidad, usaremos un prompt o un modal simple inyectado
    const monto = prompt("LA CAJA ESTÁ CERRADA.\n\nIngrese el Monto Inicial para abrir caja:");

    if (monto !== null && monto.trim() !== "") {
        abrirCaja(parseFloat(monto));
    } else {
        alert("Debe abrir la caja para operar.");
        window.location.reload();
    }
}

async function abrirCaja(monto) {
    try {
        // Try sessionStorage first (used by auth-guard.js), then localStorage
        let usuario = sessionStorage.getItem('usuario');
        if (!usuario) usuario = localStorage.getItem('user');

        if (!usuario) {
            alert('Error: No se encontr\u00f3 informaci\u00f3n del usuario. Por favor inicie sesi\u00f3n nuevamente.');
            window.location.href = 'login.html';
            return;
        }

        const usuarioData = JSON.parse(usuario);
        const id_usuario = usuarioData.id || usuarioData.id_usuario;

        if (!id_usuario) {
            alert('Error: ID de usuario inv\u00e1lido');
            return;
        }

        const response = await fetch('/api/caja/abrir', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                monto_inicial: monto,
                id_usuario: id_usuario
            })
        });

        if (response.ok) {
            alert('Caja abierta correctamente');
            window.location.reload();
        } else {
            const err = await response.json();
            alert('Error: ' + (err.error || 'Desconocido'));
        }
    } catch (error) {
        console.error('Error completo:', error);
        alert('Error al abrir caja: ' + error.message);
    }
}

async function cargarPedidosPendientesPago() {
    try {
        // Asumimos que los pedidos "Entregado" o "Listo" son los que se pagan
        // O tal vez todos los que no son "Pagado" ni "Cancelado"
        const response = await fetch('/api/pedidos');
        const pedidos = await response.json();

        // Filtramos solo los que están listos para pagar (ej. Entregado)
        // O en este modelo simple, cualquiera que no esté pagado.
        pedidosPendientes = pedidos.filter(p => p.estado !== 'Pagado' && p.estado !== 'Cancelado');

        renderizarListaPedidos(pedidosPendientes);

    } catch (error) {
        console.error(error);
    }
}

function renderizarListaPedidos(pedidos) {
    const contenedor = document.getElementById('listaPedidosPendientes');
    contenedor.innerHTML = '';

    if (pedidos.length === 0) {
        contenedor.innerHTML = '<p class="text-muted text-center">No hay pedidos pendientes de pago</p>';
        return;
    }

    pedidos.forEach(p => {
        const item = document.createElement('div');
        item.className = 'card mb-2 border-left-primary';
        item.style.cursor = 'pointer';
        item.onclick = () => seleccionarPedido(p.id_pedido);

        item.innerHTML = `
            <div class="card-body py-2">
                <div class="d-flex justify-content-between align-items-center">
                    <div>
                        <div class="h6 font-weight-bold text-primary mb-0">Mesa ${p.numero_mesa || 'Barra'}</div>
                        <div class="small text-gray-800">Cliente: ${p.nombre_cliente || 'General'}</div>
                    </div>
                    <div class="text-right">
                        <div class="h6 font-weight-bold text-gray-800 mb-0">₡${p.total || 0}</div>
                        <span class="badge badge-${getColorEstado(p.estado)}">${p.estado}</span>
                    </div>
                </div>
            </div>
        `;
        contenedor.appendChild(item);
    });
}

function getColorEstado(estado) {
    switch (estado) {
        case 'Pendiente': return 'warning';
        case 'En Cocina': return 'info';
        case 'Listo': return 'success';
        case 'Entregado': return 'primary';
        default: return 'secondary';
    }
}

async function seleccionarPedido(idPedido) {
    try {
        const response = await fetch(`/api/pedidos/${idPedido}/detalle`);
        const detalles = await response.json();

        // Buscar el pedido completo en la lista cacheada
        pedidoSeleccionado = pedidosPendientes.find(p => p.id_pedido === idPedido);
        pedidoSeleccionado.detalles = detalles;

        mostrarDetallePedido(pedidoSeleccionado);
        document.getElementById('btnFacturar').disabled = false;

    } catch (error) {
        console.error(error);
    }
}

function mostrarDetallePedido(pedido) {
    const contenedor = document.getElementById('detallePedido');

    let html = `
        <h5 class="font-weight-bold text-center mb-3">Pedido #${pedido.id_pedido} - Mesa ${pedido.numero_mesa}</h5>
        <div class="table-responsive">
            <table class="table table-sm table-bordered">
                <thead class="thead-light">
                    <tr>
                        <th>Cant</th>
                        <th>Producto</th>
                        <th>Precio</th>
                        <th>Total</th>
                    </tr>
                </thead>
                <tbody>
    `;

    let total = 0;
    pedido.detalles.forEach(d => {
        const subtotal = d.cantidad * d.precio_unitario;
        total += subtotal;
        html += `
            <tr>
                <td>${d.cantidad}</td>
                <td>${d.nombre_producto}</td>
                <td>₡${d.precio_unitario}</td>
                <td>₡${subtotal}</td>
            </tr>
        `;
    });

    html += `
                </tbody>
                <tfoot>
                    <tr>
                        <th colspan="3" class="text-right">Total:</th>
                        <th>₡${total}</th>
                    </tr>
                </tfoot>
            </table>
        </div>
        <div class="text-center mt-3">
            <small class="text-muted">Estado: ${pedido.estado}</small>
        </div>
    `;

    contenedor.innerHTML = html;
}

function abrirModalFactura() {
    if (!pedidoSeleccionado) return;

    document.getElementById('nombreClienteFactura').value = pedidoSeleccionado.nombre_cliente || '';

    // Llenar resumen en modal
    const contenedor = document.getElementById('resumenPedidoFactura');
    // ... lógica simple de resumen ...
    contenedor.innerHTML = `<div class="alert alert-info">Total a Pagar: <strong>₡${pedidoSeleccionado.total}</strong></div>`;

    // Resetear campos
    document.getElementById('metodoPago').value = '';
    document.getElementById('pagoCon').value = '';
    document.getElementById('pagoConContainer').style.display = 'none';
    document.getElementById('vueltoContainer').style.display = 'none';
    document.getElementById('subtotalFactura').innerText = `₡${(pedidoSeleccionado.total / 1.13).toFixed(2)}`;
    document.getElementById('impuestoFactura').innerText = `₡${(pedidoSeleccionado.total - (pedidoSeleccionado.total / 1.13)).toFixed(2)}`;
    document.getElementById('totalFactura').innerText = `₡${pedidoSeleccionado.total}`;

    $('#facturarModal').modal('show');
}

function actualizarCambio() {
    const metodo = document.getElementById('metodoPago').value;
    const pagoConInput = document.getElementById('pagoCon');
    const pagoConContainer = document.getElementById('pagoConContainer');
    const vueltoContainer = document.getElementById('vueltoContainer');
    const vueltoTexto = document.getElementById('vueltoFactura');

    if (metodo === 'efectivo') {
        pagoConContainer.style.display = 'block';
        const pagoCon = parseFloat(pagoConInput.value) || 0;
        const total = parseFloat(pedidoSeleccionado.total);

        if (pagoCon >= total) {
            const vuelto = pagoCon - total;
            vueltoContainer.style.display = 'block';
            vueltoTexto.innerText = `₡${vuelto.toFixed(2)}`;
        } else {
            vueltoContainer.style.display = 'none';
        }
    } else {
        pagoConContainer.style.display = 'none';
        vueltoContainer.style.display = 'none';
    }
}

async function procesarPago() {
    if (!pedidoSeleccionado || !sesionActual) return;

    // Validaciones básicas
    const metodo = document.getElementById('metodoPago').value;
    if (!metodo) {
        alert('Seleccione un método de pago');
        return;
    }

    try {
        const total = parseFloat(pedidoSeleccionado.total);

        // Crear Factura (que a su vez marca el pedido como pagado)
        const response = await fetch('/api/facturas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_pedido: pedidoSeleccionado.id_pedido,
                id_sesion_caja: sesionActual.id_sesion,
                metodo_pago: metodo,
                total_pagar: total
            })
        });

        if (response.ok) {
            alert('Pago procesado y factura generada correctamente');
            $('#facturarModal').modal('hide');
            inicializarCaja(); // Recargar datos
            document.getElementById('detallePedido').innerHTML = '<p class="text-muted text-center">Seleccione un pedido para ver el detalle</p>';
            pedidoSeleccionado = null;
            document.getElementById('btnFacturar').disabled = true;
        } else {
            const err = await response.json();
            alert('Error al procesar el pago: ' + (err.error || 'Desconocido'));
        }

    } catch (error) {
        console.error(error);
        alert('Error de conexión');
    }
}

async function cargarFacturasDia() {
    // Implementar si hay API de facturas, por ahora simulación con pedidos pagados hoy
    // Opcional para MVP
}

async function cerrarCaja() {
    if (!sesionActual) return;

    // Calcular totales finales (re-fetch para asegurar)
    try {
        const response = await fetch('/api/caja/estado');
        const data = await response.json();

        const totalFinal = parseFloat(data.sesion.monto_inicial) + parseFloat(data.ventas);

        const cierreResponse = await fetch('/api/caja/cerrar', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id_sesion: sesionActual.id_sesion,
                monto_final: totalFinal, // Asumimos que cuadra perfecto la caja ("Efectivo teórico")
                total_ventas: data.ventas
            })
        });

        if (cierreResponse.ok) {
            alert('Caja cerrada correctamente. Se generó el reporte final.');
            window.location.reload();
        } else {
            alert('Error al cerrar caja');
        }

    } catch (error) {
        console.error(error);
    }
}

function formatearMoneda(monto) {
    return '₡' + parseFloat(monto || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function filtrarPedidos(texto) {
    if (!texto) {
        renderizarListaPedidos(pedidosPendientes);
        return;
    }
    const filtrados = pedidosPendientes.filter(p =>
        (p.numero_mesa && p.numero_mesa.toString().includes(texto)) ||
        (p.nombre_cliente && p.nombre_cliente.toLowerCase().includes(texto.toLowerCase()))
    );
    renderizarListaPedidos(filtrados);
}
