// public/js/inventario.js

let allInsumos = [];

$(document).ready(function () {
    console.log("Inicializando inventario.js");
    cargarInventario();

    // Configurar modal de ajuste (Bootstrap 4 usa jQuery para eventos)
    $('#ajusteStockModal').on('show.bs.modal', function () {
        $('#formAjusteStock')[0].reset();
        $('#nuevoStockGroup').hide();
        $('#stockActualDisplay').val('');
    });

    $('#selectProducto').on('change', function (e) {
        const option = $(this).find('option:selected');
        if (option.val()) {
            const stock = option.attr('data-stock');
            $('#stockActualDisplay').val(stock);
        } else {
            $('#stockActualDisplay').val('');
        }
    });

    $('#tipoAjuste').on('change', function (e) {
        if ($(this).val() === 'ajuste') {
            $('#cantidadGroup').hide();
            $('#cantidadAjuste').removeAttr('required');
            $('#nuevoStockGroup').show();
            $('#nuevoStock').attr('required', 'required');
        } else {
            $('#cantidadGroup').show();
            $('#cantidadAjuste').attr('required', 'required');
            $('#nuevoStockGroup').hide();
            $('#nuevoStock').removeAttr('required');
        }
    });

    $('#btnGuardarAjuste').on('click', guardarAjuste);

    // Eventos para filtros
    $('#filtroCategoria').on('change', aplicarFiltros);
    $('#filtroStock').on('change', aplicarFiltros);
});

async function cargarInventario() {
    try {
        const response = await fetch('/api/insumos');
        if (!response.ok) throw new Error('Error de conexión con el servidor');

        allInsumos = await response.json();

        // Poblar el select del modal de ajuste
        const selectProducto = document.getElementById('selectProducto');
        selectProducto.innerHTML = '<option value="">Seleccione un producto</option>';
        allInsumos.forEach(insumo => {
            const option = document.createElement('option');
            option.value = insumo.id_insumo;
            option.textContent = insumo.nombre_insumo;
            option.setAttribute('data-stock', parseFloat(insumo.stock_actual) || 0);
            selectProducto.appendChild(option);
        });

        aplicarFiltros();
    } catch (err) {
        console.error(err);
        document.getElementById('cuerpoInventario').innerHTML = '<tr><td colspan="9" class="text-center text-danger">Error cargando inventario.</td></tr>';
    }
}

function aplicarFiltros() {
    const categoria = $('#filtroCategoria').val();
    const stockStatus = $('#filtroStock').val();

    let filtrados = allInsumos;

    if (categoria) {
        filtrados = filtrados.filter(i => (i.categoria || 'Ingredientes') === categoria);
    }

    if (stockStatus) {
        filtrados = filtrados.filter(i => {
            const stockActual = parseFloat(i.stock_actual) || 0;
            const stockMinimo = parseFloat(i.stock_minimo) || 0;
            if (stockStatus === 'agotado') return stockActual === 0;
            if (stockStatus === 'bajo') return stockActual > 0 && stockActual <= stockMinimo;
            if (stockStatus === 'normal') return stockActual > stockMinimo;
            return true;
        });
    }

    renderizarTabla(filtrados);
}

function renderizarTabla(insumos) {
    const tbody = document.getElementById('cuerpoInventario');
    tbody.innerHTML = '';

    let totalProductos = insumos.length;
    let stockBajo = 0;
    let stockAgotado = 0;

    if (insumos.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center">No hay insumos que coincidan con los filtros</td></tr>';
        document.getElementById('totalProductos').textContent = 0;
        document.getElementById('stockBajo').textContent = 0;
        document.getElementById('stockAgotado').textContent = 0;
        return;
    }

    insumos.forEach(insumo => {
        const tr = document.createElement('tr');

        const stockActual = parseFloat(insumo.stock_actual) || 0;
        const stockMinimo = parseFloat(insumo.stock_minimo) || 0;

        let estadoHtml = '';
        if (stockActual === 0) {
            stockAgotado++;
            estadoHtml = '<span class="badge badge-danger">Agotado</span>';
        } else if (stockActual <= stockMinimo) {
            stockBajo++;
            estadoHtml = '<span class="badge badge-warning">Stock Bajo</span>';
        } else {
            estadoHtml = '<span class="badge badge-success">Normal</span>';
        }

        const catText = insumo.categoria || 'Ingrediente';

        tr.innerHTML = `
            <td>${insumo.nombre_insumo}</td>
            <td>${catText}</td>
            <td class="text-right font-weight-bold">${stockActual.toLocaleString('es-CR')}</td>
            <td class="text-right">${stockMinimo.toLocaleString('es-CR')}</td>
            <td>${insumo.unidad_medida || 'U'}</td>
            <td class="text-center">${estadoHtml}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-info mb-1" onclick="abrirAjuste(${insumo.id_insumo})" title="Ajuste Rápido">
                    <i class="fas fa-edit"></i>
                </button>
                <button class="btn btn-sm btn-secondary mb-1" onclick="verHistorial(${insumo.id_insumo}, '${insumo.nombre_insumo.replace(/'/g, "\\'")}')" title="Historial">
                    <i class="fas fa-history"></i>
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('totalProductos').textContent = totalProductos;
    document.getElementById('stockBajo').textContent = stockBajo;
    document.getElementById('stockAgotado').textContent = stockAgotado;
}

function abrirAjuste(id_insumo) {
    $('#ajusteStockModal').modal('show');
    // Forzar selección del item en el combo despues de que el modal se abre
    setTimeout(() => {
        const select = document.getElementById('selectProducto');
        select.value = id_insumo;
        select.dispatchEvent(new Event('change'));
    }, 100);
}

async function guardarAjuste() {
    const id_insumo = document.getElementById('selectProducto').value;
    const tipoAjuste = document.getElementById('tipoAjuste').value;
    const cantidad = parseFloat(document.getElementById('cantidadAjuste').value);
    const nuevoStock = parseFloat(document.getElementById('nuevoStock').value);
    const motivo = document.getElementById('motivoAjuste').value;

    // Obtenemos el usuario de la sesión actual (sessionStorage)
    let id_usuario = null;
    let usuarioStr = sessionStorage.getItem('usuario');
    if (!usuarioStr) usuarioStr = localStorage.getItem('user'); // fallback por si acaso

    if (usuarioStr) {
        try {
            const parsed = JSON.parse(usuarioStr);
            id_usuario = parsed.id || parsed.id_usuario;
        } catch (e) { }
    }

    if (!id_usuario) {
        alert("Error: No se encontró información del usuario. Por favor inicie sesión nuevamente.");
        return;
    }

    if (!id_insumo || !tipoAjuste) {
        alert("Por favor completa los campos requeridos.");
        return;
    }

    if (tipoAjuste !== 'ajuste' && (!cantidad || isNaN(cantidad) || cantidad <= 0)) {
        alert("La cantidad introducida no es válida.");
        return;
    }

    if (tipoAjuste === 'ajuste' && (isNaN(nuevoStock) || nuevoStock < 0)) {
        alert("El nuevo stock no es válido.");
        return;
    }

    const requestBody = {
        id_insumo: parseInt(id_insumo),
        tipo_ajuste: tipoAjuste,
        cantidad: tipoAjuste === 'ajuste' ? 0 : cantidad,
        nuevo_stock: tipoAjuste === 'ajuste' ? nuevoStock : 0,
        motivo: motivo,
        id_usuario: id_usuario
    };

    try {
        const response = await fetch('/api/inventario/ajuste', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        const data = await response.json();
        if (response.ok && data.success) {
            alert('Ajuste registrado exitosamente');
            $('#ajusteStockModal').modal('hide');
            cargarInventario();
        } else {
            alert('Error al ajustar: ' + (data.error || 'Error desconocido'));
        }
    } catch (err) {
        console.error(err);
        alert('Error en conexión al servidor');
    }
}

async function verHistorial(id_insumo, nombre_insumo) {
    try {
        const response = await fetch('/api/inventario/historial/' + id_insumo);
        if (!response.ok) throw new Error('Error al obtener historial');

        const historial = await response.json();

        let html = `<h6 class="font-weight-bold mb-3">${nombre_insumo}</h6>`;

        if (historial.length === 0) {
            html += '<p>No hay movimientos registrados para este insumo.</p>';
        } else {
            html += `
            <div class="table-responsive">
                <table class="table table-sm table-bordered">
                    <thead>
                        <tr>
                            <th>Fecha</th>
                            <th>Tipo</th>
                            <th>Stock Ant.</th>
                            <th>Stock Nuevo</th>
                            <th>Usuario</th>
                            <th>Motivo</th>
                        </tr>
                    </thead>
                    <tbody>
            `;

            historial.forEach(h => {
                const trClass = h.tipo_movimiento === 'Entrada' ? 'table-success' : (h.tipo_movimiento === 'Salida' ? 'table-danger' : 'table-warning');
                html += `
                    <tr>
                        <td>${new Date(h.fecha_movimiento).toLocaleString('es-CR')}</td>
                        <td class="${trClass}">${h.tipo_movimiento}</td>
                        <td class="text-right">${h.cantidad_anterior}</td>
                        <td class="text-right font-weight-bold">${h.cantidad_nueva}</td>
                        <td>${h.nombre_usuario || 'Sistema'}</td>
                        <td>${h.motivo || ''}</td>
                    </tr>
                `;
            });

            html += `
                    </tbody>
                </table>
            </div>
            `;
        }

        document.getElementById('historialContent').innerHTML = html;
        $('#historialModal').modal('show');

    } catch (err) {
        console.error(err);
        alert('Error cargando el historial.');
    }
}
