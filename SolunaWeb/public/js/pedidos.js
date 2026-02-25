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
    
    // Función para mostrar pedidos de ejemplo (fallback)
    /*function mostrarPedidosEjemplo() {
        const pedidosEjemplo = [
            {
                id: 101,
                cliente: "Mesa 1 - Sebastian Vargas",
                productos: "2 productos",
                total: "₡9,000",
                estado: "En Cocina",
                hora: "14:30",
                estadoClass: "warning"
            },
            {
                id: 102,
                cliente: "Delivery - Kehisly",
                productos: "2 productos",
                total: "₡12,500",
                estado: "Pendiente",
                hora: "14:45",
                estadoClass: "secondary"
            },
            {
                id: 103,
                cliente: "Mesa 2 - Je",
                productos: "2 productos",
                total: "₡8,000",
                estado: "Listo",
                hora: "15:00",
                estadoClass: "success"
            }
        ];
        
        let html = '';
        pedidosEjemplo.forEach(pedido => {
            html += `
                <tr>
                    <td>#${pedido.id}</td>
                    <td>${pedido.cliente}</td>
                    <td>${pedido.productos}</td>
                    <td><strong>${pedido.total}</strong></td>
                    <td>
                        <span class="badge badge-${pedido.estadoClass} badge-estado">
                            ${pedido.estado}
                        </span>
                    </td>
                    <td>${pedido.hora}</td>
                    <td>
                        <button class="btn btn-sm btn-primary btn-detalle" 
                                data-id="${pedido.id}"
                                title="Ver y modificar detalle">
                            <i class="fas fa-edit"></i> Modificar
                        </button>
                    </td>
                </tr>
            `;
        });
        
        $('#cuerpoPedidos').html(html);
        $('#contadorPedidos').text(`${pedidosEjemplo.length} pedidos`);
        
        //  botones de ejemplo
        $('.btn-detalle').off('click').on('click', function() {
            const idPedido = $(this).data('id');
            mostrarAlerta('Esto es un ejemplo. Con datos reales se cargaría el pedido #' + idPedido, 'info');
        });
    }
        */
    
  //pedidos de la base de datos
    
    function cargarPedidosReales() {
        $.ajax({
            url: '/api/pedidos',
            method: 'GET',
            success: function(pedidos) {
                const tbody = $('#cuerpoPedidos');
                tbody.empty();
                
                if (!pedidos || pedidos.length === 0) {
                    mostrarAlerta('No hay pedidos activos en la base de datos', 'info');
                    mostrarPedidosEjemplo();
                    return;
                }
                
 let html = '';
let pendientes = 0, enCocina = 0, listos = 0, entregados = 0;

pedidos.forEach(p => {
    // contar por estado
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
    
    // formatear la información del cliente
    let clienteInfo = 'Sin información';
    if (p.numero_mesa && p.nombre_cliente) {
        clienteInfo = `Mesa ${p.numero_mesa} - ${p.nombre_cliente}`;
    } else if (p.nombre_cliente) {
        clienteInfo = `Delivery - ${p.nombre_cliente}`;
    } else if (p.numero_mesa) {
        clienteInfo = `Mesa ${p.numero_mesa}`;
    }
    
    // formatear la hora
    const fecha = new Date(p.fecha_pedido);
    const hora = fecha.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    
    // Determinar qué botones mostrar según el estado
    let botonesAccion = '';
    
    if (p.estado === 'Listo') {
        // Solo mostrar botón de Entregar para pedidos Listos
        botonesAccion = `
            <button class="btn btn-sm btn-success btn-entregar" 
                    data-id="${p.id_pedido}"
                    data-cliente="${clienteInfo}"
                    title="Marcar como entregado">
                <i class="fas fa-check-circle"></i> Entregar
            </button>
        `;
        // Botón de cobrar para pedidos entregados
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
        // Botón de modificar para otros estados
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

// actualizar los contadores
$('#contadorPedidos').text(`${pedidos.length} pedidos`);
$('#pedidosHoy').text(pedidos.length);
$('#pendientes').text(pendientes);
$('#enCocina').text(enCocina);
$('#listos').text(listos);
$('#entregados').text(entregados); // Agregar este span en el HTML si quieres

// Evento para botones de entregar
$('.btn-entregar').off('click').on('click', function() {
    const idPedido = $(this).data('id');
    const clienteInfo = $(this).data('cliente');
    mostrarModalConfirmarEntrega(idPedido, clienteInfo);
});

// Evento para botones de detalle (modificar)
$('.btn-detalle').off('click').on('click', function() {
    const idPedido = $(this).data('id');
    cargarDetallePedido(idPedido);
    $('#modalDetallePedido').modal('show');
});
                
                console.log(`✅ Cargados ${pedidos.length} pedidos reales`);
            },
            error: function(error) {
                console.error('Error al cargar pedidos:', error);
                mostrarAlerta('Error al cargar pedidos. Mostrando ejemplos.', 'warning');
                mostrarPedidosEjemplo();
            }
        });
    }

    // Evento para botón cobrar
$('.btn-cobrar').off('click').on('click', function() {
    const idPedido = $(this).data('id');
    const total = parseFloat($(this).data('total'));

    $('#modalCobro').data('pedido-id', idPedido);
    $('#totalCobro').text(total.toFixed(2));
    $('#montoRecibido').val('');
    $('#vueltoInfo').text('');

    $('#modalCobro').modal('show');
});
    
   //detalle de pedido con las modificaciones
    
    function cargarDetallePedido(idPedido) {
        pedidoActualId = idPedido;
        
        // actualizar el título del modal
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
                
                //  fila de total
                tbody.append(`
                    <tr class="table-primary font-weight-bold">
                        <td colspan="3" class="text-right">TOTAL DEL PEDIDO:</td>
                        <td colspan="2">₡${totalPedido.toFixed(2)}</td>
                    </tr>
                `);
                
                // configurar los eventos para los botones recién creados
                configurarEventosDetalle();
                
                console.log(`✅ Cargado detalle del pedido #${idPedido} con ${detalles.length} productos`);
            },
            error: function(error) {
                console.error('Error al cargar detalle:', error);
                mostrarAlerta('Error al cargar detalle del pedido', 'danger');
                tbody.html(`
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
    


// Mostrar modal de confirmación para entregar pedido
function mostrarModalConfirmarEntrega(idPedido, clienteInfo) {
    // Crear modal si no existe
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

// Evento para confirmar entrega
$(document).on('click', '#btnConfirmarEntrega', function() {
    const idPedido = $('#modalConfirmarEntrega').data('pedido-id');
    
    $.ajax({
        url: `/api/pedidos/${idPedido}/entregar`,
        method: 'PUT',
        success: function(response) {
            $('#modalConfirmarEntrega').modal('hide');
            mostrarAlerta(`✅ Pedido #${idPedido} marcado como entregado a las ${new Date(response.fecha_entrega).toLocaleTimeString()}`, 'success');
            cargarPedidosReales(); // Recargar la tabla
        },
        error: function(error) {
            console.error('Error al entregar pedido:', error);
            mostrarAlerta('Error al marcar pedido como entregado', 'danger');
            $('#modalConfirmarEntrega').modal('hide');
        }
    });
});



 //eventos del detalle
    
    function configurarEventosDetalle() {
        // guardar los cambios de un producto
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
                    // cargar el detalle para actualizar total
                    cargarDetallePedido(pedidoActualId);
                },
                error: function(error) {
                    console.error('Error al guardar:', error);
                    mostrarAlerta('Error al guardar cambios', 'danger');
                }
            });
        });
        
        // eliminar el producto del pedido
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
                    // cargar el detalle
                    cargarDetallePedido(pedidoActualId);
                },
                error: function(error) {
                    console.error('Error al eliminar:', error);
                    mostrarAlerta('Error al eliminar producto', 'danger');
                }
            });
        });
        
        // agregar extra
        $('.btn-agregar-extra').off('click').on('click', function() {
            const idDetalle = $(this).data('id');
            
            // mostrar el modal de extra
            $('#modalExtra').data('detalle-id', idDetalle);
            $('#modalExtra').modal('show');
        });
    }
    
    // modal para poder agregar los extras
    
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
                
                // cargar el detalle
                cargarDetallePedido(pedidoActualId);
            },
            error: function(error) {
                console.error('Error al agregar extra:', error);
                mostrarAlerta('Error al agregar extra', 'danger');
            }
        });
    });
    
    // limpiar el modal al cerrar
    $('#modalExtra').on('hidden.bs.modal', function() {
        $('#descripcionExtra').val('');
        $('#costoExtra').val('500');
    });
    
    // recargar los pedidos
    $('#btnRecargarPedidos').click(function() {
        cargarPedidosReales();
        mostrarAlerta('Pedidos recargados', 'info');
    });
    
    // buscar los pedidos
    $('#buscarPedido').on('keyup', function() {
        const valor = $(this).val().toLowerCase();
        $('#tablaPedidos tbody tr').filter(function() {
            $(this).toggle($(this).text().toLowerCase().indexOf(valor) > -1);
        });
    });
    
    // limpiar los filtros
    $('#btnLimpiarFiltros').click(function() {
        $('#filtroEstado').val('');
        $('#filtroTipo').val('');
        $('#filtroFecha').val('');
        $('#buscarPedido').val('');
        mostrarAlerta('Filtros limpiados', 'info');
        // mostrar todos los pedidos
        $('#tablaPedidos tbody tr').show();
    });
    
    // guardar todos los cambios
    $('#btnGuardarTodos').click(function() {
        mostrarAlerta('Para guardar cambios, haz clic en el botón "Guardar" de cada producto individualmente', 'info');
    });
    
    // Calcular vuelto automático
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

            mostrarAlerta(`Factura ${response.numero_factura} generada correctamente`, 'success');

            // Abrir PDF automáticamente
            window.open(`/api/facturas/pdf/${response.id_factura}`, '_blank');

            cargarPedidosReales();
        },
        error: function (error) {
            console.error(error);
            mostrarAlerta("Error al generar factura", "danger");
        }
    });
});
    // cargar los pedidos al iniciar
    cargarPedidosReales();
    
    // configurar la fecha actual en filtro
    const hoy = new Date().toISOString().split('T')[0];
    $('#filtroFecha').val(hoy);
    
    console.log('✅ Módulo de pedidos inicializado correctamente');
    console.log('📋 Funcionalidades listas:');
    console.log('   - Cargar pedidos reales de la BD');
    console.log('   - Modificar cantidad y precio');
    console.log('   - Agregar notas y extras');
    console.log('   - Eliminar productos');
    console.log('   - Búsqueda y filtrado');
});