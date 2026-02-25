document.addEventListener("DOMContentLoaded", async () => {

    const form = document.querySelector(".user");

    if (!form) return;

    // Cargar roles en el select automáticamente desde la BD
    const roleSelect = document.getElementById("exampleInputRole");

    try {
        const response = await fetch('/api/roles');
        const roles = await response.json();

        roles.forEach(rol => {
            const option = document.createElement("option");
            option.value = rol.id_rol;
            option.textContent = rol.nombre_rol;
            roleSelect.appendChild(option);
        });

    } catch (error) {
        console.error("Error cargando roles:", error);
    }

    form.addEventListener("submit", async (e) => {
        e.preventDefault();

        const nombre = document.getElementById("exampleFirstName").value.trim();
        const apellido = document.getElementById("exampleLastName").value.trim();
        const correo = document.getElementById("exampleInputEmail").value.trim();
        const password = document.getElementById("exampleInputPassword").value.trim();
        const repeatPassword = document.getElementById("exampleRepeatPassword").value.trim();
        const id_rol = roleSelect.value;

        if (!nombre || !apellido || !correo || !password || !repeatPassword || !id_rol) {
            alert("Complete todos los campos");
            return;
        }

        if (password !== repeatPassword) {
            alert("Las contraseñas no coinciden");
            return;
        }

        try {
            const response = await fetch('/api/usuarios', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    nombre,
                    apellido,
                    correo,
                    password,
                    id_rol
                })
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.error || "Error al registrar usuario");
                return;
            }

            alert("Usuario registrado correctamente");
            window.location.href = "login.html";

        } catch (error) {
            console.error("Error:", error);
            alert("Error de conexión con el servidor");
        }

    });

});