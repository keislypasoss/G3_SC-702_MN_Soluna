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
    const paginaActual = window.location.pathname;
    
    // Lista de páginas públicas (sin autenticación)
    const paginasPublicas = [
        '/login.html',
        '/recuperar-password.html', 
        '/restablecer-password.html',
        '/register.html'
    ];
    
    // Si es página pública, no verificar
    if (paginasPublicas.some(pagina => paginaActual.includes(pagina))) {
        return;
    }
    
    // Definir qué páginas puede ver cada rol
    const permisosPorRol = {
        'Administrador': [
            '/index.html', '/dashboard',
            '/productos.html', '/productos',
            '/usuarios.html', '/usuarios',
            '/mesas.html', '/mesas',
            '/caja.html', '/caja',
            '/cocina.html', '/cocina',
            '/pedidos.html', '/pedidos',
            '/inventario.html', '/inventario',
            '/reportes.html', '/reportes',
            '/menu.html', '/menu'
        ],
        'Mesero': [
            '/index.html', '/dashboard',
            '/mesas.html', '/mesas',
            '/pedidos.html', '/pedidos'
        ],
        'Cajero': [
            '/index.html', '/dashboard',
            '/pedidos.html', '/pedidos',
            '/caja.html', '/caja'
        ],
        'Cocinero': [
            '/index.html', '/dashboard',
            '/cocina.html', '/cocina'
        ]
    };
    
    // Si el rol no está definido, redirigir al dashboard
    if (!permisosPorRol[rolUsuario]) {
        console.warn(`Rol ${rolUsuario} no definido en permisos. Redirigiendo...`);
        if (!paginaActual.includes('index.html') && !paginaActual.includes('dashboard')) {
            window.location.href = '/dashboard';
        }
        return;
    }
    
    // Verificar si la página actual está permitida
    const paginasPermitidas = permisosPorRol[rolUsuario];
    const accesoPermitido = paginasPermitidas.some(pagina => 
        paginaActual.includes(pagina.replace('.html', '').replace('/', ''))
    );
    
    if (!accesoPermitido) {
        console.log(`Acceso denegado a ${paginaActual} para rol ${rolUsuario}`);
        alert('No tienes permiso para acceder a esta página.');
        window.location.href = '/dashboard';
    }
}

// Función para cerrar sesión (llamada desde el modal)
function logout() {
    sessionStorage.removeItem('usuario');
    window.location.href = '/login.html';
}