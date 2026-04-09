// js/dashboard-soluna.js
// Carga los datos reales del backend en el dashboard

document.addEventListener('DOMContentLoaded', () => {
    cargarEstadisticasDashboard();
});

async function cargarEstadisticasDashboard() {
    try {
        await Promise.all([
            cargarKPIs(),
            cargarPedidosRecientes(),
            cargarGraficoVentas(),
            cargarGraficoTopProductos()
        ]);
    } catch (err) {
        console.error('Error al cargar el dashboard:', err);
    }
}

// ─── 1. KPIs: Ventas del Día, Pedidos Activos, Mesas Ocupadas, Pedidos Hoy ───────
async function cargarKPIs() {
    try {
        // Estadísticas de pedidos de hoy
        const [statsRes, mesasRes, cajaRes] = await Promise.all([
            fetch('/api/pedidos/estadisticas/hoy'),
            fetch('/api/mesas'),
            fetch('/api/caja/estado')
        ]);

        // --- Ventas del día ---
        if (cajaRes.ok) {
            const cajaData = await cajaRes.json();
            const ventasEl = document.getElementById('ventasDia');
            if (ventasEl) {
                const ventas = parseFloat(cajaData.ventas) || 0;
                ventasEl.textContent = `₡${ventas.toLocaleString('es-CR', { minimumFractionDigits: 2 })}`;
            }
        }

        // --- Pedidos activos y pedidos de hoy ---
        if (statsRes.ok) {
            const stats = await statsRes.json();

            const pedidosActivosEl = document.getElementById('pedidosActivos');
            if (pedidosActivosEl) {
                const activos = (stats.pendientes || 0) + (stats.en_cocina || 0) + (stats.listos || 0);
                pedidosActivosEl.textContent = activos;
            }

            const pedidosHoyEl = document.getElementById('pedidosHoy');
            if (pedidosHoyEl) {
                pedidosHoyEl.textContent = stats.total_hoy || 0;
            }
        }

        // --- Mesas ocupadas ---
        if (mesasRes.ok) {
            const mesas = await mesasRes.json();
            const mesasOcupadasEl = document.getElementById('mesasOcupadas');
            if (mesasOcupadasEl) {
                const ocupadas = mesas.filter(m => m.estado === 'Ocupada').length;
                const total = mesas.length;
                mesasOcupadasEl.textContent = `${ocupadas}/${total}`;
            }
        }

    } catch (err) {
        console.error('Error cargando KPIs del dashboard:', err);
    }
}

// ─── 2. Tabla de Pedidos Recientes ───────────────────────────────────────────────
async function cargarPedidosRecientes() {
    try {
        const res = await fetch('/api/pedidos');
        if (!res.ok) throw new Error('Error al obtener pedidos');

        const pedidos = await res.json();
        const tbody = document.querySelector('#tablaPedidos tbody');
        if (!tbody) return;

        if (pedidos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No hay pedidos activos</td></tr>';
            return;
        }

        // Mostrar los últimos 10 pedidos
        const recientes = pedidos.slice(0, 10);
        tbody.innerHTML = recientes.map(p => {
            const hora = new Date(p.fecha_pedido).toLocaleTimeString('es-CR', { hour: '2-digit', minute: '2-digit' });
            const total = parseFloat(p.total || 0).toLocaleString('es-CR', { minimumFractionDigits: 2 });
            const estadoBadge = getEstadoBadge(p.estado);
            const mesa = p.numero_mesa ? `Mesa ${p.numero_mesa}` : 'Sin mesa';
            const productos = p.cantidad_productos || 0;
            return `
                <tr>
                    <td><strong>#${p.id_pedido}</strong></td>
                    <td>${mesa}</td>
                    <td>${productos} producto${productos !== 1 ? 's' : ''}</td>
                    <td>₡${total}</td>
                    <td>${estadoBadge}</td>
                    <td>${hora}</td>
                </tr>
            `;
        }).join('');

    } catch (err) {
        console.error('Error cargando pedidos recientes:', err);
        const tbody = document.querySelector('#tablaPedidos tbody');
        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error al cargar pedidos</td></tr>';
        }
    }
}

function getEstadoBadge(estado) {
    const badges = {
        'Pendiente':  '<span class="badge badge-warning">Pendiente</span>',
        'En Cocina':  '<span class="badge badge-info">En Cocina</span>',
        'Listo':      '<span class="badge badge-primary">Listo</span>',
        'Entregado':  '<span class="badge badge-success">Entregado</span>',
        'Pagado':     '<span class="badge badge-secondary">Pagado</span>',
        'Cancelado':  '<span class="badge badge-danger">Cancelado</span>'
    };
    return badges[estado] || `<span class="badge badge-light">${estado}</span>`;
}

// ─── 3. Gráfico de Ventas del Mes (Area Chart) ───────────────────────────────────
let chartVentasMesInstance = null;
async function cargarGraficoVentas() {
    try {
        const fechaFin = new Date().toISOString().split('T')[0];
        const fechaInicioObj = new Date();
        fechaInicioObj.setDate(fechaInicioObj.getDate() - 30); // ultimos 30 dias
        const fechaInicio = fechaInicioObj.toISOString().split('T')[0];
        
        const res = await fetch(`/api/reportes/ventas-por-dia?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`);
        if (!res.ok) return;
        const data = await res.json();

        const ctx = document.getElementById('myAreaChart');
        if (!ctx) return;
        
        const formatearMoneda = (numero) => '₡' + numero.toLocaleString('en-US', {minimumFractionDigits:2});
        const labels = data.map(d => new Date(d.fecha).toLocaleDateString());
        const totales = data.map(d => d.total);

        if(chartVentasMesInstance) chartVentasMesInstance.destroy();
        
        chartVentasMesInstance = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: "Ventas",
                    lineTension: 0.3,
                    backgroundColor: "rgba(78, 115, 223, 0.05)",
                    borderColor: "rgba(78, 115, 223, 1)",
                    pointRadius: 3,
                    pointBackgroundColor: "rgba(78, 115, 223, 1)",
                    pointBorderColor: "rgba(78, 115, 223, 1)",
                    pointHoverRadius: 3,
                    pointHoverBackgroundColor: "rgba(78, 115, 223, 1)",
                    pointHoverBorderColor: "rgba(78, 115, 223, 1)",
                    pointHitRadius: 10,
                    pointBorderWidth: 2,
                    data: totales,
                }],
            },
            options: {
                maintainAspectRatio: false,
                layout: { padding: { left: 10, right: 25, top: 25, bottom: 0 } },
                scales: {
                    xAxes: [{
                        time: { unit: 'date' },
                        gridLines: { display: false, drawBorder: false },
                        ticks: { maxTicksLimit: 7 }
                    }],
                    yAxes: [{
                        ticks: {
                            maxTicksLimit: 5,
                            padding: 10,
                            callback: function(value) { return formatearMoneda(value); }
                        },
                        gridLines: {
                            color: "rgb(234, 236, 244)",
                            zeroLineColor: "rgb(234, 236, 244)",
                            drawBorder: false,
                            borderDash: [2],
                            zeroLineBorderDash: [2]
                        }
                    }],
                },
                legend: { display: false },
                tooltips: {
                    backgroundColor: "rgb(255,255,255)",
                    bodyFontColor: "#858796",
                    titleMarginBottom: 10,
                    titleFontColor: '#6e707e',
                    titleFontSize: 14,
                    borderColor: '#dddfeb',
                    borderWidth: 1,
                    xPadding: 15,
                    yPadding: 15,
                    displayColors: false,
                    intersect: false,
                    mode: 'index',
                    caretPadding: 10,
                    callbacks: {
                        label: function(tooltipItem, chart) {
                            var datasetLabel = chart.datasets[tooltipItem.datasetIndex].label || '';
                            return datasetLabel + ': ' + formatearMoneda(tooltipItem.yLabel);
                        }
                    }
                }
            }
        });
    } catch (err) {
        console.warn('No se pudieron cargar datos de ventas mensuales:', err);
    }
}

// ─── 4. Gráfico Top Productos (Pie Chart) ────────────────────────────────────────
let chartTopProdDashboardInstance = null;
async function cargarGraficoTopProductos() {
    try {
        const fechaFin = new Date().toISOString().split('T')[0];
        const fechaInicioObj = new Date();
        fechaInicioObj.setDate(fechaInicioObj.getDate() - 30);
        const fechaInicio = fechaInicioObj.toISOString().split('T')[0];

        const res = await fetch(`/api/reportes/top-productos?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`);
        if (!res.ok) return;
        const data = await res.json();
        
        const ctx = document.getElementById("myPieChart");
        if (!ctx) return;

        const top3 = data.slice(0, 3);
        const labels = top3.map(d => d.nombre_producto);
        const cantidades = top3.map(d => d.cantidad);
        const colors = ['#4e73df', '#1cc88a', '#36b9cc'];
        const hoverColors = ['#2e59d9', '#17a673', '#2c9faf'];

        if(chartTopProdDashboardInstance) chartTopProdDashboardInstance.destroy();

        chartTopProdDashboardInstance = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: cantidades,
                    backgroundColor: colors.slice(0, cantidades.length),
                    hoverBackgroundColor: hoverColors.slice(0, cantidades.length),
                    hoverBorderColor: "rgba(234, 236, 244, 1)",
                }],
            },
            options: {
                maintainAspectRatio: false,
                tooltips: {
                    backgroundColor: "rgb(255,255,255)",
                    bodyFontColor: "#858796",
                    borderColor: '#dddfeb',
                    borderWidth: 1,
                    xPadding: 15,
                    yPadding: 15,
                    displayColors: false,
                    caretPadding: 10,
                },
                legend: { display: false },
                cutoutPercentage: 80,
            },
        });

        // Actualizar Leyenda HTML Custom del Dashboard (que por defecto decia pizzas/pastas)
        const leyendaContenedor = ctx.parentElement.nextElementSibling;
        if(leyendaContenedor) {
            leyendaContenedor.innerHTML = '';
            labels.forEach((label, i) => {
                leyendaContenedor.innerHTML += `
                    <span class="mr-2">
                        <i class="fas fa-circle" style="color: ${colors[i]}"></i> ${label.substring(0, 15)}
                    </span>
                `;
            });
        }
    } catch (err) {
        console.warn('No se pudieron cargar datos del Top Productos:', err);
    }
}

// ─── 5. Función: Generar Reporte Rápido desde Dashboard ─────────────────────────
function generarReporteDashboard() {
    // Redirigir a la página de reportes
    window.location.href = '/reportes.html';
}
