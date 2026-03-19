$(document).ready(function () {
    let pedidoActualId = null;
    
    function mostrarAlerta(mensaje, tipo = 'info') {
        const alerta = $(`
            <div class="alert alert-${tipo} alert-dismissible fade show" role="alert">
                ${mensaje}
                <button type="button" class="close" data-dismiss="alert">
                    <span>&times;</span>
                </button>
            </div>
        `);
        
        $('.container-fluid').first().prepend(alerta);
        
        setTimeout(() => {
            alerta.alert('close');
        }, 3000);
    }
    
    function cargarPedidosReales() {
        $.ajax({
            url: '/api/pedidos',
            method: 'GET',
            success: function(pedidos) {
                const tbody = $('#cuerpoPedidos');
                tbody.empty();
                
                if (!pedidos || pedidos.length === 0) {
                    mostrarAlerta('No hay pedidos activos en la base de datos', 'info');
                    return;
                }
                
                let html = '';
                let pendientes = 0, enCocina = 0, listos = 0, entregados = 0;
                
                pedidos.forEach(p => {
                    if (p.estado === 'Pendiente') pendientes++;
                    if (p.estado === 'En Cocina') enCocina++;
                    if (p.estado === 'Listo') listos++;
                    if (p.estado === 'Entregado') entregados++;
                    
                    const estadoClass = {
                        'Pendiente': 'secondary',
                        'En Cocina': 'warning',
                        'Listo': 'success',
                        'Entregado': 'info',
                        'Pagado': 'primary'
                    }[p.estado] || 'secondary';
                    
                    let clienteInfo = 'Sin información';
                    if (p.numero_mesa && p.nombre_cliente) {
                        clienteInfo = `Mesa ${p.numero_mesa} - ${p.nombre_cliente}`;
                    } else if (p.nombre_cliente) {
                        clienteInfo = `Delivery - ${p.nombre_cliente}`;
                    } else if (p.numero_mesa) {
                        clienteInfo = `Mesa ${p.numero_mesa}`;
                    }
                    
                    const fecha = new Date(p.fecha_pedido);
                    const hora = fecha.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                    
                    let botonesAccion = '';
                    
                    if (p.estado === 'Listo') {
                        botonesAccion = `
                            <button class="btn btn-sm btn-success btn-entregar" 
                                    data-id="${p.id_pedido}"
                                    data-cliente="${clienteInfo}"
                                    title="Marcar como entregado">
                                <i class="fas fa-check-circle"></i> Entregar
                            </button>
                        `;
                    } else if (p.estado === 'Entregado') {
                        botonesAccion = `
                            <button class="btn btn-sm btn-success btn-cobrar" 
                                    data-id="${p.id_pedido}"
                                    data-total="${p.total}"
                                    title="Generar factura y cobrar">
                                <i class="fas fa-file-invoice-dollar"></i> Cobrar
                            </button>
                        `;
                    } else {
                        botonesAccion = `
                            <button class="btn btn-sm btn-primary btn-detalle" 
                                    data-id="${p.id_pedido}"
                                    title="Ver y modificar detalle">
                                <i class="fas fa-edit"></i> Modificar
                            </button>
                        `;
                    }
                    
                    html += `
                        <tr data-estado="${p.estado}">
                            <td>#${p.id_pedido}</td>
                            <td>${clienteInfo}</td>
                            <td>${p.cantidad_productos || 0} productos</td>
                            <td><strong>₡${parseFloat(p.total || 0).toFixed(2)}</strong></td>
                            <td>
                                <span class="badge badge-${estadoClass} badge-estado">
                                    ${p.estado}
                                </span>
                            </td>
                            <td>${hora}</td>
                            <td class="text-center">
                                ${botonesAccion}
                            </td>
                        </tr>
                    `;
                });
                
                tbody.html(html);
                
                $('#contadorPedidos').text(`${pedidos.length} pedidos`);
                $('#pedidosHoy').text(pedidos.length);
                $('#pendientes').text(pendientes);
                $('#enCocina').text(enCocina);
                $('#listos').text(listos);
                $('#entregados').text(entregados);
                
                $('.btn-entregar').off('click').on('click', function() {
                    const idPedido = $(this).data('id');
                    const clienteInfo = $(this).data('cliente');
                    mostrarModalConfirmarEntrega(idPedido, clienteInfo);
                });
                
                $('.btn-cobrar').off('click').on('click', function() {
                    const idPedido = $(this).data('id');
                    const total = parseFloat($(this).data('total'));
                    
                    $('#modalCobro').data('pedido-id', idPedido);
                    $('#totalCobro').text(total.toFixed(2));
                    $('#montoRecibido').val('');
                    $('#vueltoInfo').text('');
                    
                    $('#modalCobro').modal('show');
                });
                
                $('.btn-detalle').off('click').on('click', function() {
                    const idPedido = $(this).data('id');
                    cargarDetallePedido(idPedido);
                    $('#modalDetallePedido').modal('show');
                });
                
                console.log(` Cargados ${pedidos.length} pedidos reales`);
            },
            error: function(error) {
                console.error('Error al cargar pedidos:', error);
                mostrarAlerta('Error al cargar pedidos', 'warning');
            }
        });
    }
    
    function cargarDetallePedido(idPedido) {
        pedidoActualId = idPedido;
        
        $('#modalDetallePedido .modal-title').text(`Detalle del Pedido #${idPedido} - Personalización`);
        
        $.ajax({
            url: `/api/pedidos/${idPedido}/detalle`,
            method: 'GET',
            success: function(detalles) {
                const tbody = $('#detallePedido tbody');
                tbody.empty();
                
                if (!detalles || detalles.length === 0) {
                    tbody.append(`
                        <tr>
                            <td colspan="5" class="text-center text-muted py-4">
                                <i class="fas fa-box-open fa-2x mb-2 text-gray-300"></i>
                                <p class="mb-0">No hay productos en este pedido</p>
                            </td>
                        </tr>
                    `);
                    return;
                }
                
                let totalPedido = 0;
                
                detalles.forEach(d => {
                    const subtotal = d.cantidad * d.precio_unitario;
                    totalPedido += subtotal;
                    
                    tbody.append(`
                        <tr data-id="${d.id_detalle}">
                            <td>
                                <strong>${d.nombre_producto}</strong>
                                ${d.notas ? '<br><small class="text-muted">' + d.notas + '</small>' : ''}
                            </td>
                            <td>
                                <input type="number" 
                                       class="form-control form-control-sm cantidad" 
                                       value="${d.cantidad}" 
                                       min="1" 
                                       style="width: 80px;">
                            </td>
                            <td>
                                <div class="input-group input-group-sm">
                                    <div class="input-group-prepend">
                                        <span class="input-group-text">₡</span>
                                    </div>
                                    <input type="number" 
                                           class="form-control precio" 
                                           value="${d.precio_unitario}" 
                                           min="0" 
                                           step="100">
                                </div>
                            </td>
                            <td>
                                <textarea class="form-control form-control-sm notas" 
                                          rows="2" 
                                          placeholder="Ej: Sin cebolla, extra queso...">${d.notas || ''}</textarea>
                                <button class="btn btn-sm btn-outline-primary btn-agregar-extra mt-1"
                                        data-id="${d.id_detalle}">
                                    <i class="fas fa-plus-circle"></i> Agregar Extra
                                </button>
                            </td>
                            <td class="text-center">
                                <button class="btn btn-sm btn-success btn-guardar" title="Guardar cambios">
                                    <i class="fas fa-save"></i>
                                </button>
                                <button class="btn btn-sm btn-danger btn-eliminar ml-1" title="Eliminar producto">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    `);
                });
                
                tbody.append(`
                    <tr class="table-primary font-weight-bold">
                        <td colspan="3" class="text-right">TOTAL DEL PEDIDO:</td>
                        <td colspan="2">₡${totalPedido.toFixed(2)}</td>
                    </tr>
                `);
                
                configurarEventosDetalle();
                
                $('#modalDetallePedido .modal-footer').html(`
                    <button type="button" class="btn btn-info" id="btnDividirCuenta">
                        <i class="fas fa-cut"></i> Dividir Cuenta
                    </button>
                    <button type="button" class="btn btn-secondary" data-dismiss="modal">Cerrar</button>
                `);
                
                console.log(` Cargado detalle del pedido #${idPedido} con ${detalles.length} productos`);
            },
            error: function(error) {
                console.error('Error al cargar detalle:', error);
                mostrarAlerta('Error al cargar detalle del pedido', 'danger');
                $('#detallePedido tbody').html(`
                    <tr>
                        <td colspan="5" class="text-center text-danger py-4">
                            <i class="fas fa-exclamation-triangle fa-2x mb-2"></i>
                            <p class="mb-0">Error al cargar el detalle</p>
                            <small>${error.responseJSON?.error || 'Error de conexión'}</small>
                        </td>
                    </tr>
                `);
            }
        });
    }
    
    function mostrarModalConfirmarEntrega(idPedido, clienteInfo) {
        if ($('#modalConfirmarEntrega').length === 0) {
            const modalHtml = `
                <div class="modal fade" id="modalConfirmarEntrega" tabindex="-1" role="dialog">
                    <div class="modal-dialog" role="document">
                        <div class="modal-content">
                            <div class="modal-header">
                                <h5 class="modal-title">Confirmar Entrega</h5>
                                <button type="button" class="close" data-dismiss="modal">
                                    <span>&times;</span>
                                </button>
                            </div>
                            <div class="modal-body">
                                <p>¿Estás seguro de marcar este pedido como <strong>Entregado</strong>?</p>
                                <p class="text-muted" id="modalInfoPedido"></p>
                                <div class="alert alert-info">
                                    <i class="fas fa-info-circle"></i> 
                                    Se registrará la hora de entrega automáticamente.
                                </div>
                            </div>
                            <div class="modal-footer">
                                <button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
                                <button type="button" class="btn btn-success" id="btnConfirmarEntrega">
                                    <i class="fas fa-check-circle"></i> Sí, Entregar
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
            $('body').append(modalHtml);
        }
        
        $('#modalInfoPedido').text(`Pedido #${idPedido} - ${clienteInfo}`);
        $('#modalConfirmarEntrega').data('pedido-id', idPedido);
        $('#modalConfirmarEntrega').modal('show');
    }
    
    $(document).on('click', '#btnConfirmarEntrega', function() {
        const idPedido = $('#modalConfirmarEntrega').data('pedido-id');
        
        $.ajax({
            url: `/api/pedidos/${idPedido}/entregar`,
            method: 'PUT',
            success: function(response) {
                $('#modalConfirmarEntrega').modal('hide');
                mostrarAlerta(`✅ Pedido #${idPedido} marcado como entregado`, 'success');
                cargarPedidosReales();
            },
            error: function(error) {
                console.error('Error al entregar pedido:', error);
                mostrarAlerta('Error al marcar pedido como entregado', 'danger');
                $('#modalConfirmarEntrega').modal('hide');
            }
        });
    });
    
    function configurarEventosDetalle() {
        $('.btn-guardar').off('click').on('click', function() {
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
                success: function(response) {
                    mostrarAlerta(response.message, 'success');
                    cargarDetallePedido(pedidoActualId);
                },
                error: function(error) {
                    console.error('Error al guardar:', error);
                    mostrarAlerta('Error al guardar cambios', 'danger');
                }
            });
        });
        
        $('.btn-eliminar').off('click').on('click', function() {
            if (!confirm('¿Estás seguro de eliminar este producto del pedido?')) {
                return;
            }
            
            const fila = $(this).closest('tr');
            const idDetalle = fila.data('id');
            
            $.ajax({
                url: `/api/detalle-pedido/${idDetalle}`,
                method: 'DELETE',
                success: function(response) {
                    mostrarAlerta(response.message, 'success');
                    cargarDetallePedido(pedidoActualId);
                },
                error: function(error) {
                    console.error('Error al eliminar:', error);
                    mostrarAlerta('Error al eliminar producto', 'danger');
                }
            });
        });
        
        $('.btn-agregar-extra').off('click').on('click', function() {
            const idDetalle = $(this).data('id');
            $('#modalExtra').data('detalle-id', idDetalle);
            $('#modalExtra').modal('show');
        });
    }
    
    $('#btnGuardarExtra').click(function() {
        const idDetalle = $('#modalExtra').data('detalle-id');
        const descripcion = $('#descripcionExtra').val();
        const costo = $('#costoExtra').val();
        
        if (!descripcion.trim()) {
            mostrarAlerta('Por favor ingresa una descripción del extra', 'warning');
            return;
        }
        
        if (!costo || costo <= 0) {
            mostrarAlerta('Por favor ingresa un costo válido', 'warning');
            return;
        }
        
        $.ajax({
            url: `/api/detalle-pedido/${idDetalle}/extra`,
            method: 'POST',
            data: {
                descripcion_extra: descripcion,
                costo_extra: costo
            },
            success: function(response) {
                mostrarAlerta(response.message, 'success');
                $('#modalExtra').modal('hide');
                $('#descripcionExtra').val('');
                $('#costoExtra').val('500');
                cargarDetallePedido(pedidoActualId);
            },
            error: function(error) {
                console.error('Error al agregar extra:', error);
                mostrarAlerta('Error al agregar extra', 'danger');
            }
        });
    });
    
    $('#modalExtra').on('hidden.bs.modal', function() {
        $('#descripcionExtra').val('');
        $('#costoExtra').val('500');
    });
    
    $('#btnRecargarPedidos').click(function() {
        cargarPedidosReales();
        mostrarAlerta('Pedidos recargados', 'info');
    });
    
    $('#buscarPedido').on('keyup', function() {
        const valor = $(this).val().toLowerCase();
        $('#tablaPedidos tbody tr').filter(function() {
            $(this).toggle($(this).text().toLowerCase().indexOf(valor) > -1);
        });
    });
    
    $('#btnLimpiarFiltros').click(function() {
        $('#filtroEstado').val('');
        $('#filtroTipo').val('');
        $('#filtroFecha').val('');
        $('#buscarPedido').val('');
        mostrarAlerta('Filtros limpiados', 'info');
        $('#tablaPedidos tbody tr').show();
    });
    
    $('#montoRecibido').on('input', function () {
        const total = parseFloat($('#totalCobro').text());
        const recibido = parseFloat($(this).val());
        
        if (!isNaN(recibido) && recibido >= total) {
            const vuelto = recibido - total;
            $('#vueltoInfo').text("Vuelto: ₡" + vuelto.toFixed(2));
        } else {
            $('#vueltoInfo').text("Monto insuficiente");
        }
    });
    
    $('#btnConfirmarCobro').click(function () {
        const idPedido = $('#modalCobro').data('pedido-id');
        const metodoPago = $('#metodoPago').val();
        
        $.ajax({
            url: '/api/facturas',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                id_pedido: idPedido,
                metodo_pago: metodoPago
            }),
            success: function (response) {
                $('#modalCobro').modal('hide');
                mostrarAlerta(`Factura generada correctamente`, 'success');
                cargarPedidosReales();
            },
            error: function (error) {
                console.error(error);
                mostrarAlerta("Error al generar factura", "danger");
            }
        });
    });

    $(document).on('click', '#btnDividirCuenta', function() {
        const idPedido = pedidoActualId;
        $('#modalDividirCuenta').data('pedido-id', idPedido);
        
        $.ajax({
            url: `/api/pedidos/${idPedido}/productos-para-dividir`,
            method: 'GET',
            success: function(productos) {
                const tbody = $('#tablaProductosDividir tbody');
                tbody.empty();
                
                productos.forEach(p => {
                    tbody.append(`
                        <tr data-id="${p.id_detalle}">
                            <td>${p.nombre_producto}</td>
                            <td>${p.cantidad}</td>
                            <td>₡${p.precio_unitario.toFixed(2)}</td>
                            <td>
                                <input type="number" class="form-control form-control-sm asignar-persona" 
                                       min="1" max="${p.cantidad}" value="0" style="width: 80px;">
                            </td>
                        </tr>
                    `);
                });
            }
        });
        
        $('#modalDividirCuenta').modal('show');
    });
    
    $('#tipoDivision').change(function() {
        const tipo = $(this).val();
        if (tipo === 'Igual') {
            $('#divPersonas').show();
            $('#divProductos').hide();
        } else {
            $('#divPersonas').show();
            $('#divProductos').show();
        }
    });
    
    $('#btnConfirmarDivision').click(function() {
        const idPedido = $('#modalDividirCuenta').data('pedido-id');
        const tipo = $('#tipoDivision').val();
        const personas = parseInt($('#numPersonas').val());
        
        if (!personas || personas < 2) {
            mostrarAlerta('Debe ingresar al menos 2 personas', 'warning');
            return;
        }
        
        let asignaciones = [];
        
        if (tipo === 'PorProductos') {
            $('#tablaProductosDividir tbody tr').each(function() {
                const idDetalle = $(this).data('id');
                const asignado = parseInt($(this).find('.asignar-persona').val());
                if (asignado > 0) {
                    asignaciones.push({
                        id_detalle: idDetalle,
                        cantidad: asignado
                    });
                }
            });
        }
        
        const usuarioSession = JSON.parse(sessionStorage.getItem('usuario'));
        const idUsuario = usuarioSession ? (usuarioSession.id || usuarioSession.id_usuario) : null;

        if (!idUsuario) {
            mostrarAlerta('No se pudo obtener el usuario de sesión. Por favor, vuelve a iniciar sesión.', 'danger');
            return;
        }

        $.ajax({
            url: `/api/pedidos/${idPedido}/dividir`,
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                tipo: tipo,
                personas: personas,
                asignaciones: asignaciones,
                id_usuario: idUsuario
            }),
            success: function(response) {
                $('#modalDividirCuenta').modal('hide');
                mostrarAlerta(`✅ Cuenta dividida en ${response.tickets} tickets`, 'success');
                mostrarTicketsDivision(response.id_division);
            },
            error: function(error) {
                mostrarAlerta('Error al dividir cuenta', 'danger');
            }
        });
    });
    
    function mostrarTicketsDivision(idDivision) {
        $.ajax({
            url: `/api/divisiones/${idDivision}/tickets`,
            method: 'GET',
            success: function(tickets) {
                let html = '<div class="row">';
                tickets.forEach(t => {
                    html += `
                        <div class="col-md-4 mb-3">
                            <div class="card">
                                <div class="card-header bg-primary text-white">
                                    Persona ${t.persona_numero}
                                </div>
                                <div class="card-body">
                                    <p class="mb-1">Subtotal: ₡${t.subtotal.toFixed(2)}</p>
                                    <p class="mb-1">Impuesto: ₡${t.impuesto.toFixed(2)}</p>
                                    <h5 class="text-success">Total: ₡${t.total.toFixed(2)}</h5>
                                    <button class="btn btn-sm btn-success btn-cobrar-ticket w-100 mt-2"
                                            data-ticket-id="${t.id_ticket}"
                                            data-total="${t.total}">
                                        <i class="fas fa-file-invoice-dollar"></i> Cobrar Ticket
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                });
                html += '</div>';
                
                $('#modalTickets .modal-body').html(html);
                $('#modalTickets').modal('show');
            }
        });
    }

    
    $(document).on('click', '.btn-cobrar-ticket', function() {
        const ticketId = $(this).data('ticket-id');
        const total = parseFloat($(this).data('total'));
        
        $('#modalCobroTicket').data('ticket-id', ticketId);
        $('#totalTicket').text(total.toFixed(2));
        $('#montoRecibidoTicket').val('');
        $('#vueltoTicketInfo').text('');
        
        // Guardamos referencia al botón para deshabilitarlo al pagar
        $('#modalCobroTicket').data('btn-origen', $(this));
        
        $('#modalCobroTicket').modal('show');
    });
    
    $('#montoRecibidoTicket').on('input', function() {
        const total = parseFloat($('#totalTicket').text());
        const recibido = parseFloat($(this).val());
        
        if (!isNaN(recibido) && recibido >= total) {
            const vuelto = recibido - total;
            $('#vueltoTicketInfo').text(`Vuelto: ₡${vuelto.toFixed(2)}`);
        } else if (!isNaN(recibido) && recibido < total) {
            $('#vueltoTicketInfo').text('Monto insuficiente');
        } else {
            $('#vueltoTicketInfo').text('');
        }
    });
    
    $('#btnConfirmarCobroTicket').click(function() {
        const ticketId = $('#modalCobroTicket').data('ticket-id');
        const metodoPago = $('#metodoPagoTicket').val();
        const total = parseFloat($('#totalTicket').text());
        
        if (metodoPago === 'Efectivo') {
            const recibido = parseFloat($('#montoRecibidoTicket').val());
            if (!recibido || recibido < total) {
                mostrarAlerta('Monto insuficiente', 'warning');
                return;
            }
        }
        
        $.ajax({
            url: '/api/facturas/ticket',
            method: 'POST',
            contentType: 'application/json',
            data: JSON.stringify({
                id_ticket: ticketId,
                metodo_pago: metodoPago
            }),
            success: function(response) {
                $('#modalCobroTicket').modal('hide');
                mostrarAlerta(`✅ Ticket pagado - Factura #${response.id_factura} generada`, 'success');
                
                // Deshabilitar el botón del ticket ya pagado
                const btnOrigen = $('#modalCobroTicket').data('btn-origen');
                if (btnOrigen) {
                    btnOrigen
                        .text('✅ Pagado')
                        .removeClass('btn-success')
                        .addClass('btn-secondary')
                        .prop('disabled', true);
                }
                
                // Si todos los tickets están pagados, cerrar el modal y recargar
                const ticketsPendientes = $('#modalTickets .btn-cobrar-ticket:not(:disabled)').length;
                if (ticketsPendientes === 0) {
                    setTimeout(function() {
                        $('#modalTickets').modal('hide');
                        cargarPedidosReales();
                    }, 1200);
                }
            },
            error: function(error) {
                console.error('Error al cobrar ticket:', error);
                mostrarAlerta('Error al cobrar ticket', 'danger');
            }
        });
    });
    

    cargarPedidosReales();
    
    const hoy = new Date().toISOString().split('T')[0];
    $('#filtroFecha').val(hoy);
    
    console.log('✅ Módulo de pedidos inicializado correctamente');
    console.log('📋 Funcionalidades listas:');
    console.log('   - Cargar pedidos reales de la BD');
    console.log('   - Modificar cantidad y precio');
    console.log('   - Agregar notas y extras');
    console.log('   - Eliminar productos');
    console.log('   - Búsqueda y filtrado');
    console.log('   - Dividir cuentas');
    console.log('   - Cobrar tickets individuales');
});
