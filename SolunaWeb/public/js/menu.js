$(document).ready(function () {

    let tabla = null;
    let productos = JSON.parse(localStorage.getItem("menuProductos")) || [];

    /*
       ALERTAS */
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

    /* 
       DATATABLE*/
    function inicializarTabla() {
        tabla = $("#tablaMenu").DataTable({
            language: {
                url: "//cdn.datatables.net/plug-ins/1.10.24/i18n/Spanish.json"
            },
            data: [],
            columns: [
                { data: "nombre" },
                { data: "categoria" },
                {
                    data: "precio",
                    render: d => `₡${parseFloat(d).toFixed(2)}`
                },
                {
                    data: "disponible",
                    render: d =>
                        d
                            ? '<span class="badge badge-success">Disponible</span>'
                            : '<span class="badge badge-danger">No disponible</span>'
                },
                { data: "stock" },
                {
                    data: null,
                    orderable: false,
                    render: row => `
<button class="btn btn-sm btn-warning btn-editar" data-id="${row.id}">
<i class="fas fa-edit"></i>
</button>
<button class="btn btn-sm btn-${row.disponible ? "danger" : "success"} btn-toggle" data-id="${row.id}">
                            ${row.disponible ? "Desactivar" : "Activar"}
</button>
                    `
                }
            ]
        });
    }

    function refrescarTabla(data = productos) {
        tabla.clear().rows.add(data).draw();
    }

    /*
       CRUD PRODUCTOS */
    function guardarProducto() {
        const id = $("#productoId").val();

        const producto = {
            id: id ? Number(id) : Date.now(),
            nombre: $("#nombreProducto").val(),
            descripcion: $("#descripcionProducto").val(),
            categoria: $("#categoriaProducto").val(),
            precio: Number($("#precioProducto").val()),
            stock: Number($("#stockProducto").val()),
            disponible: $("#disponibleProducto").is(":checked")
        };

        if (id) {
            productos = productos.map(p => p.id === producto.id ? producto : p);
            mostrarAlerta("Producto actualizado correctamente", "info");
        } else {
            productos.push(producto);
            mostrarAlerta("Producto agregado al menú", "success");
        }

        localStorage.setItem("menuProductos", JSON.stringify(productos));
        $("#nuevoProductoModal").modal("hide");
        refrescarTabla();
        $("#formProducto")[0].reset();
        $("#productoId").val("");
    }

    /*
       EDITAR*/
    $(document).on("click", ".btn-editar", function () {
        const id = $(this).data("id");
        const p = productos.find(x => x.id === id);

        $("#productoId").val(p.id);
        $("#nombreProducto").val(p.nombre);
        $("#descripcionProducto").val(p.descripcion);
        $("#categoriaProducto").val(p.categoria);
        $("#precioProducto").val(p.precio);
        $("#stockProducto").val(p.stock);
        $("#disponibleProducto").prop("checked", p.disponible);

        $("#nuevoProductoLabel").text("Editar Producto");
        $("#nuevoProductoModal").modal("show");
    });

    $(document).on("click", ".btn-toggle", function () {
        const id = $(this).data("id");

        productos = productos.map(p => {
            if (p.id === id) {
                p.disponible = !p.disponible;
            }
            return p;
        });

        localStorage.setItem("menuProductos", JSON.stringify(productos));
        mostrarAlerta("Disponibilidad actualizada", "warning");
        refrescarTabla();
    });

    /* 
       FILTROS*/
    $("#filtroCategoria, #filtroDisponibilidad").change(function () {
        let filtrados = [...productos];

        const categoria = $("#filtroCategoria").val();
        const disponible = $("#filtroDisponibilidad").val();

        if (categoria) {
            filtrados = filtrados.filter(p => p.categoria === categoria);
        }

        if (disponible !== "") {
            filtrados = filtrados.filter(p => String(p.disponible) === disponible);
        }

        refrescarTabla(filtrados);
    });

    /* GUARDAR PRODUCTO */
    $("#btnGuardarProducto").click(guardarProducto);

    $("#nuevoProductoModal").on("hidden.bs.modal", function () {
        $("#formProducto")[0].reset();
        $("#productoId").val("");
        $("#nuevoProductoLabel").text("Nuevo Producto");
    });


    inicializarTabla();
    refrescarTabla();
});