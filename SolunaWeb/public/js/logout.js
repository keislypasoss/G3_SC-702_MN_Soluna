
function logout() {
    // Limpiar toda la sesión
    sessionStorage.clear();
    
    // Redirigir al login
    window.location.href = '/login.html';
}

// Asignar evento al botón de logout si existe
document.addEventListener('DOMContentLoaded', () => {
    const logoutBtn = document.querySelector('[onclick*="logout"]');
    if (logoutBtn) {
        logoutBtn.onclick = function(e) {
            e.preventDefault();
            Swal.fire({
                title: '¿Cerrar Sesión?',
                text: '¿Estás seguro de que quieres cerrar sesión?',
                icon: 'question',
                showCancelButton: true,
                confirmButtonColor: '#4e73df',
                cancelButtonColor: '#858796',
                confirmButtonText: 'Sí, cerrar sesión',
                cancelButtonText: 'Cancelar'
            }).then((result) => {
                if (result.isConfirmed) {
                    logout();
                }
            });
        };
    }
});