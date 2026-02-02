$(document).ready(function () {
    let dataTable = null;

    function mostrarAlerta(mensaje, tipo = 'info') {
        $('.alert-dismissible').remove();
        const alerta = $(`
            <div class="alert alert-${tipo} alert-dismissible fade show">
                ${mensaje}
                <button type="button" class="close" data-dismiss="alert">&times;</button>
            </div>
        `);
        $('.container-fluid').first().prepend(alerta);
        setTimeout(() => alerta.alert('close'), 4000);
    }

    function inicializarDataTable() {
        dataTable = $('#tablaProductos').DataTable({
            language: { url: "//cdn.datatables.net/plug-ins/1.10.24/i18n/Spanish.json" },
            columns: [
                { data: 'nombre_producto' },
                { data: 'categoria' },
                {
                    data: 'precio',
                    render: d => `₡${parseFloat(d).toFixed(2)}`
                },
                {
                    data: 'es_disponible',
                    render: d =>
                        d
                            ? '<span class="badge badge-success">Disponible</span>'
                            : '<span class="badge badge-danger">No disponible</span>'
                },
                {
                    data: null,
                    orderable: false,
                    render: row => `
                        <button class="btn btn-sm btn-${row.es_disponible ? 'danger' : 'success'} btn-toggle"
                            data-id="${row.id_producto}">
                            ${row.es_disponible ? 'Desactivar' : 'Activar'}
                        </button>
                    `
                }
            ]
        });
    }

    function actualizarContadores(data) {
        const disponibles = data.filter(p => p.es_disponible).length;
        const noDisponibles = data.length - disponibles;

        $('#contadorProductos').text(`${data.length} productos`);
        $('#contadorDisponibles').text(disponibles);
        $('#contadorNoDisponibles').text(noDisponibles);
    }

    function cargarProductos() {
        $.get('/api/productos', function (data) {
            dataTable.clear().rows.add(data).draw();
            actualizarContadores(data);
        });
    }

    function toggleDisponibilidad(id) {
        $.post(`/api/productos/${id}/toggle-disponibilidad`, function (res) {
            if (res.success) {
                mostrarAlerta(
                    res.nuevoEstado ? 'Producto ACTIVADO' : 'Producto DESACTIVADO',
                    res.nuevoEstado ? 'success' : 'warning'
                );
                cargarProductos();
            } else {
                mostrarAlerta(res.error, 'danger');
            }
        });
    }

    $(document).on('click', '.btn-toggle', function () {
        const id = $(this).data('id');
        if (confirm('¿Seguro que deseas cambiar la disponibilidad?')) {
            toggleDisponibilidad(id);
        }
    });

    $('#btnRecargar').click(cargarProductos);

    inicializarDataTable();
    cargarProductos();
});
