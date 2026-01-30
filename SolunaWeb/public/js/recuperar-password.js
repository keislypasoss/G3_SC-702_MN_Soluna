$(document).ready(function () {
    $('#formRecuperar').submit(function (e) {
        e.preventDefault();

        const correo = $('#correo').val().trim();

        if (!correo) {
            Swal.fire({
                icon: 'warning',
                title: 'Campo requerido',
                text: 'Por favor ingrese su correo electrónico'
            });
            return;
        }

        // parte del loading
        Swal.fire({
            title: 'Enviando...',
            text: 'Por favor espere',
            allowOutsideClick: false,
            didOpen: () => {
                Swal.showLoading();
            }
        });

        $.ajax({
            url: '/api/recuperar-password',
            method: 'POST',
            data: { correo: correo },
            success: function (response) {
                Swal.fire({
                    icon: 'success',
                    title: '¡Correo enviado!',
                    html: `
                        <p>${response.message}</p>
                        <p class="text-muted mt-3">
                            <small>Revisa la bandeja de entrada y tambien la de spam.</small>
                        </p>
                    `,
                    confirmButtonText: 'Ok'
                }).then(() => {
                    $('#correo').val('');
                });
            },
            error: function (err) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: err.responseJSON?.error || 'Error al procesar la solicitud'
                });
            }
        });
    });
});