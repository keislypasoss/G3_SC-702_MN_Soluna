$(document).ready(function () {
    loadRoles();
    loadUsers();

    // Initialize DataTable
    var table = $('#tablaUsuarios').DataTable({
        language: {
            url: "//cdn.datatables.net/plug-ins/1.10.24/i18n/Spanish.json"
        },
        columns: [
            { data: 'id_usuario' },
            { data: 'nombre_completo' },
            { data: 'correo' },
            { data: 'nombre_rol' },
            {
                data: 'estado',
                render: function (data, type, row) {
                    return data
                        ? '<span class="badge badge-success">Activo</span>'
                        : '<span class="badge badge-danger">Inactivo</span>';
                }
            },
            {
                data: 'fecha_registro',
                render: function (data) {
                    return data ? new Date(data).toLocaleDateString() : 'N/A';
                }
            },
            {
                data: null,
                render: function (data, type, row) {
                    return `
                        <button class="btn btn-sm btn-info btn-editar" data-id="${row.id_usuario}" data-user='${JSON.stringify(row)}'>
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-sm btn-${row.estado ? 'danger' : 'success'} btn-toggle-status" data-id="${row.id_usuario}" data-estado="${!row.estado}">
                            <i class="fas fa-${row.estado ? 'user-slash' : 'user-check'}"></i>
                        </button>
                    `;
                }
            }
        ]
    });

    // Load Roles for Dropdown
    function loadRoles() {
        $.get('/api/roles', function (roles) {
            const select = $('#rol');
            select.empty();
            select.append('<option value="">Seleccione un rol</option>');
            roles.forEach(role => {
                select.append(`<option value="${role.id_rol}">${role.nombre_rol}</option>`);
            });

            // Also populate filter
            const filter = $('#filtroRol');
            filter.empty();
            filter.append('<option value="">Todos los roles</option>');
            roles.forEach(role => {
                filter.append(`<option value="${role.nombre_rol}">${role.nombre_rol}</option>`);
            });
        });
    }

    // Load Users for DataTable
    function loadUsers() {
        $.get('/api/usuarios', function (users) {
            table.clear().rows.add(users).draw();
            updateStats(users);
        });
    }

    // Update Dashboard Stats
    function updateStats(users) {
        $('#totalUsuarios').text(users.length);
        $('#usuariosActivos').text(users.filter(u => u.estado).length);
        $('#usuariosInactivos').text(users.filter(u => !u.estado).length);
    }

    // Save User (Create/Update)
    $('#btnGuardarUsuario').click(function () {
        // Validation
        const form = document.getElementById('formUsuario');
        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const id = $('#usuarioId').val();
        const userData = {
            nombre: $('#nombre').val(),
            apellido: $('#apellido').val(),
            correo: $('#correo').val(),

            password: $('#password').val(),
            id_rol: $('#rol').val()
        };

        const method = id ? 'PUT' : 'POST';
        const url = id ? `/api/usuarios/${id}` : '/api/usuarios';

        $.ajax({
            url: url,
            method: method,
            data: userData,
            success: function (response) {
                $('#nuevoUsuarioModal').modal('hide');
                loadUsers();
                // Clear form
                $('#formUsuario')[0].reset();
                $('#usuarioId').val('');
                Swal.fire({
                    icon: 'success',
                    title: '¡Éxito!',
                    text: response.message,
                    timer: 2000,
                    showConfirmButton: false
                });
            },
            error: function (err) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: 'Error al guardar: ' + err.responseJSON.error
                });
            }
        });
    });

    // Edit User Button Click
    $('#tablaUsuarios tbody').on('click', '.btn-editar', function () {
        const user = $(this).data('user');
        $('#usuarioId').val(user.id_usuario);

        // Split name for demo purposes (assuming space sep)
        const parts = user.nombre_completo.split(' ');
        $('#nombre').val(parts[0]);
        $('#apellido').val(parts.slice(1).join(' '));

        $('#correo').val(user.correo);

        $('#rol').val(user.id_rol);

        $('#password').val(''); // Don't show password

        $('#nuevoUsuarioModal').modal('show');
    });

    // Toggle Status
    $('#tablaUsuarios tbody').on('click', '.btn-toggle-status', function () {
        const id = $(this).data('id');
        const newStatus = $(this).data('estado');

        $.post(`/api/usuarios/${id}/toggle-status`, { estado: newStatus }, function () {
            loadUsers();
        }).fail(function (err) {
            Swal.fire({
                icon: 'error',
                title: 'Error',
                text: 'Error al cambiar estado: ' + err.responseJSON.error
            });
        });
    });

    // Reset form on modal close
    $('#nuevoUsuarioModal').on('hidden.bs.modal', function () {
        $('#formUsuario')[0].reset();
        $('#usuarioId').val('');
    });

    // Custom Filters
    $('#filtroRol').change(function () {
        const val = $(this).val();
        table.column(3).search(val ? val : '', true, false).draw();
    });

    $('#filtroEstado').change(function () {
        const val = $(this).val();
        if (val === "") {
            table.column(4).search('').draw();
        } else {
            // Search for "Activo" or "Inactivo" text badge content
            const term = val === "true" ? "Activo" : "Inactivo";
            table.column(4).search(term).draw();
        }
    });

});
