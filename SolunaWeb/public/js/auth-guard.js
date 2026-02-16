// js/auth-guard.js
document.addEventListener('DOMContentLoaded', () => {
    console.log('Verificando autenticación...');

    // Obtener usuario de sessionStorage
    const usuarioString = sessionStorage.getItem('usuario');

    if (!usuarioString) {
        console.log('No hay sesión activa. Redirigiendo a login...');
        // Si no está en login.html, redirigir
        if (!window.location.pathname.includes('login.html') &&
            !window.location.pathname.includes('recuperar-password.html') &&
            !window.location.pathname.includes('register.html')) {
            window.location.href = '/login.html';
        }
        return;
    }

    try {
        const usuario = JSON.parse(usuarioString);
        console.log(`Usuario autenticado: ${usuario.nombre} (${usuario.rol})`);

        // Mostrar nombre del usuario en el navbar si existe
        const userNameElement = document.getElementById('userName');
        if (userNameElement) {
            userNameElement.textContent = usuario.nombre;
        }

        // Filtrar elementos del sidebar según el rol
        const sidebarItems = document.querySelectorAll('.sidebar .nav-item[data-roles]');

        sidebarItems.forEach(item => {
            const rolesPermitidos = item.getAttribute('data-roles');
            if (rolesPermitidos) {
                // Convertir a array y verificar si el rol está incluido
                const rolesArray = rolesPermitidos.split(',').map(r => r.trim());

                if (!rolesArray.includes(usuario.rol)) {
                    item.style.display = 'none';
                    console.log(`Ocultando elemento: ${item.textContent.trim()}`);
                } else {
                    item.style.display = 'block';
                }
            }
        });

        // Verificar acceso a la página actual según rol
        verificarAccesoPagina(usuario.rol);

    } catch (error) {
        console.error('Error al procesar datos de usuario:', error);
        sessionStorage.removeItem('usuario');
        window.location.href = '/login.html';
    }
});

function verificarAccesoPagina(rolUsuario) {
    let paginaActual = window.location.pathname;

    // Normalización: Si es raíz o dashboard, tratar como index.html
    if (paginaActual === '/' || paginaActual.toLowerCase().includes('/dashboard')) {
        paginaActual = '/index.html';
    }

    // Lista de páginas públicas (sin autenticación requerida)
    const paginasPublicas = [
        '/login.html',
        '/recuperar-password.html',
        '/restablecer-password.html',
        '/register.html',
        '/404.html',
        '/blank.html'
    ];

    // Si es página pública, permitir acceso
    if (paginasPublicas.some(pagina => paginaActual.includes(pagina))) {
        return;
    }

    // Definir permisos por rol (Rutas permitidas)
    // Nota: Administrador tiene acceso total implícito
    const permisosPorRol = {
        'Administrador': ['*'],
        'Mesero': [
            '/index.html',
            '/mesas.html',
            '/pedidos.html',
            '/buttons.html', '/cards.html', '/utilities' // UI Components allowed if needed
        ],
        'Cajero': [
            '/index.html',
            '/pedidos.html',
            '/caja.html'
        ],
        'Cocinero': [
            '/index.html',
            '/cocina.html'
        ]
    };

    // Validar existencia del rol
    if (!permisosPorRol[rolUsuario]) {
        console.warn(`Rol ${rolUsuario} no reconocido. Redirigiendo a login.`);
        logout();
        return;
    }

    // Acceso total para Admin
    if (permisosPorRol[rolUsuario].includes('*')) {
        return;
    }

    // Verificar si la página actual está en la lista permitida
    // Usamos endsWith para evitar problemas con rutas relativas o absolutas
    const accesoPermitido = permisosPorRol[rolUsuario].some(pagina =>
        paginaActual.toLowerCase().endsWith(pagina.toLowerCase())
    );

    if (!accesoPermitido) {
        console.warn(`Acceso denegado a ${paginaActual} para rol ${rolUsuario}`);
        alert('No tienes permiso para acceder a esta página.');

        // Redirigir siempre a index.html (Dashboard) que es seguro para todos los roles
        window.location.href = '/index.html';
    }
}

// Función para cerrar sesión (llamada desde el modal)
function logout() {
    sessionStorage.removeItem('usuario');
    window.location.href = '/login.html';
}