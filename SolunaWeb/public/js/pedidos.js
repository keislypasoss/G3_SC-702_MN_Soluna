$(document).ready(function () {
    let pedidoActualId = null;

    function mostrarAlerta(mensaje, tipo = 'info') {
        const alerta = $(`<div class="alert alert-${tipo} alert-dismissible fade show" role="alert">${mensaje}<button type="button" class="close" data-dismiss="alert"><span>&times;</span></button></div>`);
        $('.container-fluid').first().prepend(alerta);
        setTimeout(() => alerta.alert('close'), 3000);
    }

    function cargarPedidos() {
        $.ajax({
            url: '/api/pedidos',
            method: 'GET',
            success: function (pedidos) {
                const tbody = $('#cuerpoPedidos');
                tbody.empty();
                if (!pedidos || pedidos.length === 0) {
                    tbody.html('<tr><td colspan="7" class="text-center">No hay pedidos activos</td></tr>');
                    return;
                }

                let html = '';
                let pendientes = 0, enCocina = 0, listos = 0, entregados = 0;
                const estadoClass = { 'Pendiente': 'secondary', 'En Cocina': 'warning', 'Listo': 'success', 'Entregado': 'info', 'Pagado': 'primary' };

                pedidos.forEach(p => {
                    if (p.estado === 'Pendiente') pendientes++;
                    if (p.estado === 'En Cocina') enCocina++;
                    if (p.estado === 'Listo') listos++;
                    if (p.estado === 'Entregado') entregados++;

                    let clienteInfo = p.nombre_cliente ? (p.numero_mesa ? `Mesa ${p.numero_mesa} - ${p.nombre_cliente}` : `Delivery - ${p.nombre_cliente}`) : (p.numero_mesa ? `Mesa ${p.numero_mesa}` : 'Sin información');
                    const hora = new Date(p.fecha_pedido).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                    let botones = '';
                    if (p.estado === 'Listo') botones = `<button class="btn btn-sm btn-success btn-entregar" data-id="${p.id_pedido}" data-cliente="${clienteInfo}"><i class="fas fa-check-circle"></i> Entregar</button>`;
                    else if (p.estado === 'Entregado') botones = `<button class="btn btn-sm btn-success btn-cobrar" data-id="${p.id_pedido}" data-total="${p.total}"><i class="fas fa-file-invoice-dollar"></i> Cobrar</button>`;
                    else botones = `<button class="btn btn-sm btn-primary btn-detalle" data-id="${p.id_pedido}"><i class="fas fa-edit"></i> Modificar</button>`;

                    html += `<tr data-estado="${p.estado}"><td>#${p.id_pedido}</td><td>${clienteInfo}</td><td>${p.cantidad_productos || 0} productos</td><td><strong>₡${parseFloat(p.total || 0).toFixed(2)}</strong></td><td><span class="badge badge-${estadoClass[p.estado] || 'secondary'}">${p.estado}</span></td><td>${hora}</td><td class="text-center">${botones}</td></tr>`;
                });

                tbody.html(html);
                $('#contadorPedidos, #pedidosHoy').text(pedidos.length);
                $('#pendientes').text(pendientes);
                $('#enCocina').text(enCocina);
                $('#listos').text(listos);
                $('#entregados').text(entregados);

                // EVENTO para botón Entregar
                $('.btn-entregar').off('click').on('click', function () {
                    const idPedido = $(this).data('id');
                    const clienteInfo = $(this).data('cliente');
                    mostrarModalConfirmarEntrega(idPedido, clienteInfo);
                });

                // EVENTO para botón Cobrar
                $('.btn-cobrar').off('click').on('click', function () {
                    const idPedido = $(this).data('id');
                    pedidoActualId = idPedido; // Rastrear el ID por si decide dividir cuenta
                    const total = parseFloat($(this).data('total'));
                    $('#modalCobro').data('pedido-id', idPedido);
                    $('#totalCobro').text(total.toFixed(2));
                    $('#montoRecibido, #vueltoInfo').val('').text('');
                    $('#modalCobro').modal('show');
                });

                // EVENTO para botón Modificar (Detalle)
                $('.btn-detalle').off('click').on('click', function () {
                    const idPedido = $(this).data('id');
                    cargarDetallePedido(idPedido);
                    $('#modalDetallePedido').modal('show');
                });
            },
            error: () => mostrarAlerta('Error al cargar pedidos', 'warning')
        });
    }

    function cargarDetallePedido(idPedido) {
        pedidoActualId = idPedido;
        $('#modalDetallePedido .modal-title').text(`Detalle del Pedido #${idPedido}`);

        $.ajax({
            url: `/api/pedidos/${idPedido}/detalle`,
            method: 'GET',
            success: function (detalles) {
                const tbody = $('#detallePedido tbody').empty();
                if (!detalles || detalles.length === 0) {
                    tbody.html('<tr><td colspan="5" class="text-center">No hay productos</td></tr>');
                    return;
                }

                let total = 0;
                detalles.forEach(d => {
                    total += d.cantidad * d.precio_unitario;
                    tbody.append(`<tr data-id="${d.id_detalle}"><td><strong>${d.nombre_producto}</strong>${d.notas ? `<br><small class="text-muted">${d.notas}</small>` : ''}</td><td><input type="number" class="form-control form-control-sm cantidad" value="${d.cantidad}" min="1" style="width:80px"></td><td><div class="input-group input-group-sm"><div class="input-group-prepend"><span class="input-group-text">₡</span></div><input type="number" class="form-control precio" value="${d.precio_unitario}" min="0" step="100"></div></td><td><textarea class="form-control form-control-sm notas" rows="2" placeholder="Ej: Sin cebolla...">${d.notas || ''}</textarea><button class="btn btn-sm btn-outline-primary btn-agregar-extra mt-1" data-id="${d.id_detalle}"><i class="fas fa-plus-circle"></i> Agregar Extra</button></td><td class="text-center"><button class="btn btn-sm btn-success btn-guardar"><i class="fas fa-save"></i></button> <button class="btn btn-sm btn-danger btn-eliminar"><i class="fas fa-trash"></i></button></td></tr>`);
                });
                tbody.append(`<tr class="table-primary font-weight-bold"><td colspan="3" class="text-right">TOTAL DEL PEDIDO:</td><td colspan="2">₡${total.toFixed(2)}</td></tr>`);

                configurarEventosDetalle();
                $('#modalDetallePedido .modal-footer').html(`<button type="button" class="btn btn-info" id="btnDividirCuenta"><i class="fas fa-cut"></i> Dividir Cuenta</button><button type="button" class="btn btn-secondary" data-dismiss="modal">Cerrar</button>`);
            },
            error: () => mostrarAlerta('Error al cargar detalle', 'danger')
        });
    }

    function configurarEventosDetalle() {
        $('.btn-guardar').off('click').click(function () {
            const fila = $(this).closest('tr');
            $.ajax({
                url: `/api/detalle-pedido/${fila.data('id')}`,
                method: 'PUT',
                data: { cantidad: fila.find('.cantidad').val(), precio_unitario: fila.find('.precio').val(), notas: fila.find('.notas').val() },
                success: () => { mostrarAlerta('Producto modificado', 'success'); cargarDetallePedido(pedidoActualId); },
                error: () => mostrarAlerta('Error al guardar', 'danger')
            });
        });

        $('.btn-eliminar').off('click').click(function () {
            if (confirm('¿Eliminar este producto?')) {
                $.ajax({
                    url: `/api/detalle-pedido/${$(this).closest('tr').data('id')}`,
                    method: 'DELETE',
                    success: () => { mostrarAlerta('Producto eliminado', 'success'); cargarDetallePedido(pedidoActualId); },
                    error: () => mostrarAlerta('Error al eliminar', 'danger')
                });
            }
        });

        $('.btn-agregar-extra').off('click').click(function () {
            $('#modalExtra').data('detalle-id', $(this).data('id')).modal('show');
        });
    }

    function mostrarModalConfirmarEntrega(idPedido, clienteInfo) {
        if ($('#modalConfirmarEntrega').length === 0) {
            $('body').append(`<div class="modal fade" id="modalConfirmarEntrega" tabindex="-1"><div class="modal-dialog"><div class="modal-content"><div class="modal-header"><h5 class="modal-title">Confirmar Entrega</h5><button type="button" class="close" data-dismiss="modal"><span>&times;</span></button></div><div class="modal-body"><p>¿Marcar pedido como <strong>Entregado</strong>?</p><p class="text-muted" id="modalInfoPedido"></p><div class="alert alert-info"><i class="fas fa-info-circle"></i> Se registrará la hora automáticamente.</div></div><div class="modal-footer"><button class="btn btn-secondary" data-dismiss="modal">Cancelar</button><button class="btn btn-success" id="btnConfirmarEntrega">Sí, Entregar</button></div></div></div></div>`);
        }
        $('#modalInfoPedido').text(`Pedido #${idPedido} - ${clienteInfo}`);
        $('#modalConfirmarEntrega').data('pedido-id', idPedido).modal('show');
    }

    $(document).on('click', '#btnConfirmarEntrega', function () {
        $.ajax({
            url: `/api/pedidos/${$('#modalConfirmarEntrega').data('pedido-id')}/entregar`,
            method: 'PUT',
            success: () => { $('#modalConfirmarEntrega').modal('hide'); mostrarAlerta('✅ Pedido marcado como entregado', 'success'); cargarPedidos(); },
            error: () => mostrarAlerta('Error al entregar', 'danger')
        });
    });

    function configurarEventosDetalle() {
        $('.btn-guardar').off('click').on('click', function () {
            const fila = $(this).closest('tr');
            const idDetalle = fila.data('id');
            const cantidad = fila.find('.cantidad').val();
            const precio = fila.find('.precio').val();
            const notas = fila.find('.notas').val();

            $.ajax({
                url: `/api/detalle-pedido/${idDetalle}`,
                method: 'PUT',
                data: {
                    cantidad: cantidad,
                    precio_unitario: precio,
                    notas: notas
                },
                success: function (response) {
                    mostrarAlerta(response.message, 'success');
                    cargarDetallePedido(pedidoActualId);
                },
                error: function (error) {
                    console.error('Error al guardar:', error);
                    mostrarAlerta('Error al guardar cambios', 'danger');
                }
            });
        });

        $('.btn-eliminar').off('click').on('click', function () {
            const fila = $(this).closest('tr');
            const idDetalle = fila.data('id');

            Swal.fire({
                title: 'Eliminar producto',
                text: '¿Estás seguro de eliminar este producto del pedido?',
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#e74a3b',
                cancelButtonColor: '#858796',
                confirmButtonText: 'Sí, eliminar',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    $.ajax({
                        url: `/api/detalle-pedido/${idDetalle}`,
                        method: 'DELETE',
                        success: function (response) {
                            mostrarAlerta(response.message, 'success');
                            cargarDetallePedido(pedidoActualId);
                        },
                        error: function (error) {
                            console.error('Error al eliminar:', error);
                            mostrarAlerta('Error al eliminar producto', 'danger');
                        }
                    });
                }
            });
        });

        $('.btn-agregar-extra').off('click').on('click', function () {
            const idDetalle = $(this).data('id');
            $('#modalExtra').data('detalle-id', idDetalle);
            $('#modalExtra').modal('show');
        });
    }

    $('#btnGuardarExtra').click(function () {
        const idDetalle = $('#modalExtra').data('detalle-id');
        const descripcion = $('#descripcionExtra').val().trim();
        const costo = parseFloat($('#costoExtra').val());

        if (!descripcion || costo <= 0) return mostrarAlerta('Complete los campos', 'warning');

        $.ajax({
            url: `/api/detalle-pedido/${idDetalle}/extra`,
            method: 'POST',
            data: { descripcion_extra: descripcion, costo_extra: costo },
            success: () => { $('#modalExtra').modal('hide'); $('#descripcionExtra, #costoExtra').val('').val('500'); cargarDetallePedido(pedidoActualId); mostrarAlerta('Extra agregado', 'success'); },
            error: () => mostrarAlerta('Error al agregar extra', 'danger')
        });
    });

    $('#btnRecargarPedidos').click(() => cargarPedidos());

    $('#buscarPedido').on('keyup', function () {
        const v = $(this).val().toLowerCase();
        $('#tablaPedidos tbody tr').each(function () {
            $(this).toggle($(this).text().toLowerCase().indexOf(v) > -1);
        });
    });

    $('#btnLimpiarFiltros').click(() => {
        $('#filtroEstado, #filtroTipo, #filtroFecha, #buscarPedido').val('');
        $('#tablaPedidos tbody tr').show();
        mostrarAlerta('Filtros limpiados', 'info');
    });

    $('#montoRecibido').on('input', function () {
        const total = parseFloat($('#totalCobro').text()), recibido = parseFloat($(this).val());
        $('#vueltoInfo').text(!isNaN(recibido) && recibido >= total ? `Vuelto: ₡${(recibido - total).toFixed(2)}` : 'Monto insuficiente');
    });

    $('#btnConfirmarCobro').click(function () {
        $.ajax({
            url: '/api/facturas',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ id_pedido: $('#modalCobro').data('pedido-id'), metodo_pago: $('#metodoPago').val() }),
            success: () => { $('#modalCobro').modal('hide'); mostrarAlerta('Factura generada', 'success'); cargarPedidos(); },
            error: () => mostrarAlerta('Error al generar factura', 'danger')
        });
    });

    function abrirDivisionCuentas() {
        const idPedido = pedidoActualId;
        if (!idPedido) return mostrarAlerta('Error: No se encontró el pedido', 'danger');

        $('#modalDividirCuenta').data('pedido-id', idPedido);

        $.ajax({
            url: `/api/pedidos/${idPedido}/productos-para-dividir`,
            method: 'GET',
            success: function (productos) {
                const tbody = $('#tablaProductosDividir tbody').empty();
                productos.forEach(p => {
                    tbody.append(`<tr data-id="${p.id_detalle}"><td>${p.nombre_producto}</td><td>${p.cantidad}</td><td>₡${p.precio_unitario.toFixed(2)}</td><td><input type="number" class="form-control form-control-sm asignar-persona" min="1" max="${p.cantidad}" value="0" style="width:80px"></td></tr>`);
                });
            }
        });
        $('#modalDividirCuenta').modal('show');
    }

    // Abrir modal de dividir cuenta desde el modal de Cobro
    $('#btnDividirDesdeCobro').click(function () {
        $('#modalCobro').modal('hide');
        setTimeout(abrirDivisionCuentas, 500); // 500ms para permitir que Bootstrap cierre el modal de Cobro limpiamente
    });

    // DIVISIÓN DE CUENTAS
    $(document).on('click', '#btnDividirCuenta', abrirDivisionCuentas);

    $('#tipoDivision').change(function () {
        const igual = $(this).val() === 'Igual';
        $('#divPersonas').show();
        $('#divProductos').toggle(!igual);
    });

    $('#btnConfirmarDivision').click(function () {
        const idPedido = $('#modalDividirCuenta').data('pedido-id');
        const tipo = $('#tipoDivision').val();
        const personas = parseInt($('#numPersonas').val());

        if (!personas || personas < 2) return mostrarAlerta('Mínimo 2 personas', 'warning');

        const usuario = JSON.parse(sessionStorage.getItem('usuario') || '{}');
        const idUsuario = usuario.id || usuario.id_usuario;
        if (!idUsuario) return mostrarAlerta('No se pudo obtener el usuario', 'danger');

        let asignaciones = [];
        if (tipo === 'PorProductos') {
            $('#tablaProductosDividir tbody tr').each(function () {
                const cantidad = parseInt($(this).find('.asignar-persona').val());
                if (cantidad > 0) {
                    asignaciones.push({ id_detalle: $(this).data('id'), cantidad: cantidad });
                }
            });
            if (asignaciones.length === 0) return mostrarAlerta('Seleccione productos para asignar', 'warning');
        }

        $.ajax({
            url: `/api/pedidos/${idPedido}/dividir`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ tipo, personas, asignaciones, id_usuario: idUsuario }),
            success: function (response) {
                $('#modalDividirCuenta').modal('hide');
                mostrarAlerta(`✅ Cuenta dividida en ${response.tickets} tickets`, 'success');

                $.ajax({
                    url: `/api/divisiones/${response.id_division}/tickets`,
                    method: 'GET',
                    success: function (tickets) {
                        let html = '<div class="row">';
                        tickets.forEach(t => {
                            html += `<div class="col-md-4 mb-3"><div class="card"><div class="card-header bg-primary text-white">Persona ${t.persona_numero}</div><div class="card-body"><p class="mb-1">Subtotal: ₡${t.subtotal.toFixed(2)}</p><p class="mb-1">Impuesto: ₡${t.impuesto.toFixed(2)}</p><h5 class="text-success">Total: ₡${t.total.toFixed(2)}</h5><button class="btn btn-sm btn-success btn-cobrar-ticket w-100" data-ticket-id="${t.id_ticket}" data-total="${t.total}"><i class="fas fa-file-invoice-dollar"></i> Cobrar Ticket</button></div></div></div>`;
                        });
                        html += '</div>';
                        $('#modalTickets .modal-body').html(html);
                        $('#modalTickets').modal('show');
                    }
                });
            },
            error: () => mostrarAlerta('Error al dividir cuenta', 'danger')
        });
    });

    // Cobro de tickets
    $(document).on('click', '.btn-cobrar-ticket', function () {
        const ticketId = $(this).data('ticket-id');
        const total = parseFloat($(this).data('total'));
        $('#modalCobroTicket').data('ticket-id', ticketId).data('btn-origen', $(this));
        $('#totalTicket').text(total.toFixed(2));
        $('#montoRecibidoTicket, #vueltoTicketInfo').val('').text('');
        $('#modalCobroTicket').modal('show');
    });

    $('#montoRecibidoTicket').on('input', function () {
        const total = parseFloat($('#totalTicket').text()), recibido = parseFloat($(this).val());
        $('#vueltoTicketInfo').text(!isNaN(recibido) && recibido >= total ? `Vuelto: ₡${(recibido - total).toFixed(2)}` : (recibido < total ? 'Monto insuficiente' : ''));
    });

    $('#btnConfirmarCobroTicket').click(function () {
        const ticketId = $('#modalCobroTicket').data('ticket-id');
        const metodoPago = $('#metodoPagoTicket').val();
        const total = parseFloat($('#totalTicket').text());

        if (metodoPago === 'Efectivo') {
            const recibido = parseFloat($('#montoRecibidoTicket').val());
            if (!recibido || recibido < total) return mostrarAlerta('Monto insuficiente', 'warning');
        }

        $.ajax({
            url: '/api/facturas/ticket',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({ id_ticket: ticketId, metodo_pago: metodoPago }),
            success: function (response) {
                $('#modalCobroTicket').modal('hide');
                mostrarAlerta(`✅ Ticket pagado - Factura #${response.id_factura}`, 'success');
                const btn = $('#modalCobroTicket').data('btn-origen');
                if (btn) btn.text('✅ Pagado').removeClass('btn-success').addClass('btn-secondary').prop('disabled', true);

                if ($('#modalTickets .btn-cobrar-ticket:not(:disabled)').length === 0) {
                    setTimeout(() => { $('#modalTickets').modal('hide'); cargarPedidos(); }, 1000);
                }
            },
            error: () => mostrarAlerta('Error al cobrar ticket', 'danger')
        });
    });

    // INICIALIZACIÓN
    cargarPedidos();
    $('#filtroFecha').val(new Date().toISOString().split('T')[0]);
    console.log('✅ Módulo de pedidos inicializado');
});