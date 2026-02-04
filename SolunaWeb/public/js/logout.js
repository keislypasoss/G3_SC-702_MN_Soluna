
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
            if (confirm('¿Estás seguro de que quieres cerrar sesión?')) {
                logout();
            }
        };
    }
});