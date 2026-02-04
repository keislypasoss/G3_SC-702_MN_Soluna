// js/login.js
document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('loginForm');

    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        const correo = document.getElementById('exampleInputEmail').value.trim();
        const password = document.getElementById('exampleInputPassword').value.trim();

        if (!correo || !password) {
            alert('Por favor completa todos los campos');
            return;
        }

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ correo, password })
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.error || 'Error al iniciar sesión');
                return;
            }

            // Guardamos la info del usuario
            sessionStorage.setItem('usuario', JSON.stringify(data.usuario));
            
            // Redirigir según el rol del usuario - 
            const usuario = data.usuario;
            let redirectPage = '/';
            
            switch (usuario.rol) {
                case 'Administrador':
                    redirectPage = '/dashboard';
                    break;
                case 'Mesero':
                    redirectPage = '/mesas.html';
                    break;
                case 'Cajero':
                    redirectPage = '/pedidos.html';
                    break;
                case 'Cocinero':
                    redirectPage = '/cocina.html';
                    break;
                default:
                    // Si no es un rol conocido, redirigir al dashboard
                    redirectPage = '/dashboard';
            }

            console.log(`Redirigiendo ${usuario.rol} a: ${redirectPage}`);
            window.location.href = redirectPage;

        } catch (error) {
            console.error('Error en login:', error);
            alert('Error de conexión con el servidor');
        }
    });
});