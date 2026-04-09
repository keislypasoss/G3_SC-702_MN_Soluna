$(document).ready(function () {

    let tabla = null;
    let productos = [];
    let categorias = [];

    // ALERTAS
    function mostrarAlerta(mensaje, tipo = "success") {
        $(".alert-dismissible").remove();

        const alerta = `
            <div class="alert alert-${tipo} alert-dismissible fade show">
                ${mensaje}
                <button type="button" class="close" data-dismiss="alert">&times;</button>
            </div>
        `;

        $(".container-fluid").first().prepend(alerta);
        setTimeout(() => $(".alert").alert("close"), 4000);
    }

    // DATATABLE
    function inicializarTabla() {
        tabla = $("#tablaMenu").DataTable({
            language: {
                url: "//cdn.datatables.net/plug-ins/1.10.24/i18n/Spanish.json"
            },
            data: [],
            columns: [
                { data: "nombre_producto" },
                { data: "categoria" },
                {
                    data: "precio",
                    render: d => `₡${parseFloat(d).toFixed(2)}`
                },
                {
                    data: "es_disponible",
                    render: d =>
                        d
                            ? '<span class="badge badge-success">Disponible</span>'
                            : '<span class="badge badge-danger">No disponible</span>'
                },
                {
                    data: null,
                    orderable: false,
                    render: row => `
                        <button class="btn btn-sm btn-warning btn-editar" data-id="${row.id_producto}" title="Editar">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-${row.es_disponible ? "danger" : "success"} btn-toggle" data-id="${row.id_producto}" title="Alternar Disponibilidad">
                            ${row.es_disponible ? "Desactivar" : "Activar"}
                        </button>
                    `
                }
            ]
        });
    }

    function refrescarTabla(data = productos) {
        if (tabla) {
            tabla.clear().rows.add(data).draw();
        }
    }

    // CARGA DE DATOS DESDE EL BACKEND
    async function cargarCategorias() {
        try {
            const res = await fetch('/api/categorias');
            if (!res.ok) throw new Error('Error al cargar categorias');
            categorias = await res.json();
            
            // Llenar selectores
            let opciones = '<option value="">Seleccione...</option>';
            let opcionesFiltro = '<option value="">Todas las categorías</option>';
            
            categorias.forEach(c => {
                const opt = `<option value="${c.id_categoria}">${c.nombre}</option>`;
                opciones += opt;
                
                const optFiltro = `<option value="${c.nombre}">${c.nombre}</option>`;
                opcionesFiltro += optFiltro;
            });
            
            $("#categoriaProducto").html(opciones);
            $("#filtroCategoria").html(opcionesFiltro);
        } catch (e) {
            console.error('Categorias error:', e);
            mostrarAlerta('No se pudieron cargar las categorías', 'danger');
        }
    }

    async function cargarProductos() {
        try {
            const res = await fetch('/api/productos');
            if (!res.ok) throw new Error('Error al cargar productos');
            productos = await res.json();
            refrescarTabla();
        } catch (e) {
            console.error('Productos error:', e);
            mostrarAlerta('No se pudieron cargar los productos', 'danger');
        }
    }

    // CRUD PRODUCTOS
    async function guardarProducto() {
        const id = $("#productoId").val();
        
        const payload = {
            nombre: $("#nombreProducto").val(),
            descripcion: $("#descripcionProducto").val(),
            id_categoria: $("#categoriaProducto").val(),
            precio: $("#precioProducto").val(),
            es_disponible: $("#disponibleProducto").is(":checked")
        };

        if (!payload.nombre || !payload.id_categoria || !payload.precio) {
            mostrarAlerta("Campos requeridos incompletos", "warning");
            return;
        }

        const url = id ? `/api/productos/${id}` : '/api/productos';
        const method = id ? 'PUT' : 'POST';

        try {
            const res = await fetch(url, {
                method: method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            
            const data = await res.json();
            if (data.success) {
                mostrarAlerta(data.message, "success");
                $("#nuevoProductoModal").modal("hide");
                cargarProductos(); // Recargar de DB
                $("#formProducto")[0].reset();
                $("#productoId").val("");
            } else {
                throw new Error(data.error);
            }
        } catch (e) {
            console.error('Error al guardar:', e);
            mostrarAlerta('Error al guardar: ' + e.message, 'danger');
        }
    }

    // EDITAR
    $(document).on("click", ".btn-editar", function () {
        const id = $(this).data("id");
        const p = productos.find(x => x.id_producto === id);

        $("#productoId").val(p.id_producto);
        $("#nombreProducto").val(p.nombre_producto);
        $("#descripcionProducto").val(p.descripcion);
        $("#categoriaProducto").val(p.id_categoria);
        $("#precioProducto").val(p.precio);
        // Omitiendo stock ya que está removido de BD/Columnas
        $("#disponibleProducto").prop("checked", p.es_disponible);

        $("#nuevoProductoLabel").text("Editar Producto");
        $("#nuevoProductoModal").modal("show");
    });

    // TOGGLE
    $(document).on("click", ".btn-toggle", async function () {
        const id = $(this).data("id");

        try {
            const res = await fetch(`/api/productos/${id}/toggle-disponibilidad`, {
                method: 'POST'
            });
            const data = await res.json();
            if (data.success) {
                mostrarAlerta(`Disponibilidad actualizada a: ${data.nuevoEstado ? 'Activa' : 'Inactiva'}`, "info");
                cargarProductos();
            } else {
                throw new Error(data.error);
            }
        } catch (e) {
            mostrarAlerta("Error cambiando disponibilidad", "danger");
        }
    });

    // FILTROS
    $("#filtroCategoria, #filtroDisponibilidad").change(function () {
        let filtrados = [...productos];

        const categoria = $("#filtroCategoria").val(); // nombre categoria string
        const disponible = $("#filtroDisponibilidad").val();

        if (categoria) {
            filtrados = filtrados.filter(p => p.categoria === categoria);
        }

        if (disponible !== "") {
            const isDisp = disponible === "true";
            filtrados = filtrados.filter(p => p.es_disponible === isDisp);
        }

        refrescarTabla(filtrados);
    });

    // GUARDAR PRODUCTO EVENTO
    $("#btnGuardarProducto").click(guardarProducto);

    $("#nuevoProductoModal").on("hidden.bs.modal", function () {
        $("#formProducto")[0].reset();
        $("#productoId").val("");
        $("#nuevoProductoLabel").text("Nuevo Producto");
    });

    // INICIAR
    inicializarTabla();
    cargarCategorias().then(cargarProductos);
});