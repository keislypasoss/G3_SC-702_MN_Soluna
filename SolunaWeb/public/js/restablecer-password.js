$(document).ready(function () {
    // tener el token de la url
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get('token');

    if (!token) {
        mostrarError('No se proporcionó un token válido');
        return;
    }

    // hacer la verificacion de que el token sea valido
    verificarToken(token);

    // para poder validar lo 'fuerte' que es la contra
    $('#nuevaPassword').on('input', function () {
        const password = $(this).val();
        const strength = calcularFortaleza(password);
        const strengthBar = $('#passwordStrength');

        if (password.length === 0) {
            strengthBar.css({ width: '0%', backgroundColor: '' });
            return;
        }

        if (strength < 30) {
            strengthBar.css({ width: '33%', backgroundColor: '#dc3545' });
        } else if (strength < 60) {
            strengthBar.css({ width: '66%', backgroundColor: '#ffc107' });
        } else {
            strengthBar.css({ width: '100%', backgroundColor: '#28a745' });
        }
    });

    // el submit del formulario
    $('#formRestablecer').submit(function (e) {
        e.preventDefault();

        const nuevaPassword = $('#nuevaPassword').val();
        const confirmarPassword = $('#confirmarPassword').val();

        // mas validaciones 
        if (nuevaPassword.length < 6) {
            Swal.fire({
                icon: 'warning',
                title: 'La contraseña es muy corta',
                text: 'La contraseña debe tener al menos 6 caracteres, por favor cumpla con lo que se le indica'
            });
            return;
        }

        if (nuevaPassword !== confirmarPassword) {
            Swal.fire({
                icon: 'error',
                title: 'Las contraseñas no coinciden',
                text: 'Por favor verifique que las dos contraseñas sean iguales'
            });
            return;
        }

        // el proceso de loading
        Swal.fire({
            title: 'Actualizando la contraseña...',
            text: 'Por favor espere',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        // hacer el envio de la solicitud
        $.ajax({
            url: '/api/restablecer-password',
            method: 'POST',
            data: {
                token: token,
                nuevaPassword: nuevaPassword
            },
            success: function (response) {
                Swal.fire({
                    icon: 'success',
                    title: '¡Contraseña actualizada!',
                    text: 'La contraseña ha sido restablecida correctamente',
                    confirmButtonText: 'Ir a iniciar sesión'
                }).then(() => {
                    window.location.href = 'index.html';
                });
            },
            error: function (err) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: err.responseJSON?.error || 'Error al restablecer la contraseña'
                });
            }
        });
    });

    // funciones auxiliares
    function verificarToken(token) {
        $.ajax({
            url: `/api/verificar-token/${token}`,
            method: 'GET',
            success: function (response) {
                if (response.valid) {
                    $('#mensajeBienvenida').text(`Hola ${response.usuario}, crea tu nueva contraseña`);
                    $('#formularioContainer').show();
                } else {
                    mostrarError(response.error);
                }
            },
            error: function (err) {
                mostrarError(err.responseJSON?.error || 'El enlace es inválido o ha expirado');
            }
        });
    }

    function mostrarError(mensaje) {
        $('#mensajeError').text(mensaje);
        $('#errorContainer').show();
        $('#formularioContainer').hide();
        $('#mensajeBienvenida').hide();
    }

    function calcularFortaleza(password) {
        let strength = 0;
        if (password.length >= 6) strength += 20;
        if (password.length >= 10) strength += 20;
        if (/[a-z]/.test(password)) strength += 20;
        if (/[A-Z]/.test(password)) strength += 20;
        if (/[0-9]/.test(password)) strength += 20;
        if (/[^a-zA-Z0-9]/.test(password)) strength += 20;
        return Math.min(strength, 100);
    }
});