// public/js/reportes.js

let cierresData = [];
let chartVentasDiaInstance = null;
let chartTopProductosInstance = null;
let chartVentasHoraInstance = null;

document.addEventListener('DOMContentLoaded', () => {
    // Inicializar fechas con el día de hoy
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('fechaInicio').value = hoy;
    document.getElementById('fechaFin').value = hoy;

    // Asegurar parseo global de tooltips con Chart.js
    Chart.defaults.global.defaultFontFamily = 'Nunito', '-apple-system,system-ui,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Arial,sans-serif';
    Chart.defaults.global.defaultFontColor = '#858796';

    // Generar reporte inicial
    generarReporte();
});

async function generarReporte() {
    // Cargar todo a la vez
    await Promise.all([
        cargarCierres(),
        cargarDatosVentas()
    ]);
}

async function cargarDatosVentas() {
    const fechaInicio = document.getElementById('fechaInicio').value;
    const fechaFin = document.getElementById('fechaFin').value;
    const queryParams = `?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;

    try {
        // Peticiones paralelas a todos los endpoints
        const [kpiRes, diaRes, topProdRes, catRes, horaRes] = await Promise.all([
            fetch(`/api/reportes/ventas-kpi${queryParams}`),
            fetch(`/api/reportes/ventas-por-dia${queryParams}`),
            fetch(`/api/reportes/top-productos${queryParams}`),
            fetch(`/api/reportes/ventas-por-categoria${queryParams}`),
            fetch(`/api/reportes/ventas-por-hora${queryParams}`)
        ]);

        if(!kpiRes.ok || !diaRes.ok || !topProdRes.ok || !catRes.ok || !horaRes.ok) {
            throw new Error('Error al obtener los datos de reporte');
        }

        const kpi = await kpiRes.json();
        const ventasDia = await diaRes.json();
        const topProductos = await topProdRes.json();
        const ventasCategoria = await catRes.json();
        const ventasHora = await horaRes.json();

        // 1. Actualizar KPIs
        document.getElementById('ventasTotales').innerText = `₡${(kpi.ventasTotales || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`;
        document.getElementById('totalPedidos').innerText = kpi.totalPedidos || 0;
        document.getElementById('ticketPromedio').innerText = `₡${(kpi.ticketPromedio || 0).toLocaleString('en-US', {minimumFractionDigits: 2})}`;
        document.getElementById('clientesAtendidos').innerText = kpi.clientesAtendidos || 0;

        // 2. Renderizar gráficos
        renderizarGraficoVentasDia(ventasDia);
        renderizarGraficoTopProductos(topProductos);
        renderizarGraficoVentasHora(ventasHora);

        // 3. Renderizar tablas
        renderizarTablaCategoria(ventasCategoria);
        renderizarTablaTopProductos(topProductos);

    } catch (error) {
        console.error('Error cargando reportes:', error);
        alert('Error al cargar la información del reporte. Intente de nuevo.');
    }
}

// ==============================
// RENDER DE GRÁFICOS
// ==============================

function renderizarGraficoVentasDia(data) {
    const formatearMoneda = (numero) => '₡' + numero.toLocaleString('en-US', {minimumFractionDigits:2});
    
    const fechaInicioStr = document.getElementById('fechaInicio').value;
    const fechaFinStr = document.getElementById('fechaFin').value;
    
    const labels = [];
    const totales = [];

    if (fechaInicioStr && fechaFinStr) {
        let actual = new Date(fechaInicioStr + 'T00:00:00');
        const limite = new Date(fechaFinStr + 'T00:00:00');
        
        let maxDias = 365; // Limite de visualizacion a 1 año
        while (actual <= limite && maxDias > 0) {
            const fechaISOLocal = actual.getFullYear() + '-' + String(actual.getMonth() + 1).padStart(2, '0') + '-' + String(actual.getDate()).padStart(2, '0');
            
            const dataPorDia = data.find(d => {
                if(!d.fecha) return false;
                return d.fecha.substring(0, 10) === fechaISOLocal;
            });
            
            labels.push(actual.toLocaleDateString());
            totales.push(dataPorDia ? dataPorDia.total : 0);
            
            actual.setDate(actual.getDate() + 1);
            maxDias--;
        }
    } else {
        data.forEach(d => {
            labels.push(new Date(d.fecha).toLocaleDateString());
            totales.push(d.total);
        });
    }

    const ctx = document.getElementById("chartVentasDia");
    if (!ctx) return;
    if(chartVentasDiaInstance) chartVentasDiaInstance.destroy();
    
    chartVentasDiaInstance = new Chart(ctx, {
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
}

function renderizarGraficoTopProductos(data) {
    const top5 = data.slice(0, 5);
    const labels = top5.map(d => d.nombre_producto);
    const cantidades = top5.map(d => d.cantidad);
    
    // Generar paleta de colores fija
    const colors = ['#4e73df', '#1cc88a', '#36b9cc', '#f6c23e', '#e74a3b'];
    const hoverColors = ['#2e59d9', '#17a673', '#2c9faf', '#dda20a', '#be2617'];

    const ctx = document.getElementById("chartTopProductos");
    if (!ctx) return;
    if(chartTopProductosInstance) chartTopProductosInstance.destroy();
    
    chartTopProductosInstance = new Chart(ctx, {
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

    // Actualizar Leyenda HTML Custom
    const leyendaContenedor = document.getElementById('leyendaProductos');
    if (leyendaContenedor) {
        leyendaContenedor.innerHTML = '';
        labels.forEach((label, i) => {
            leyendaContenedor.innerHTML += `
                <span class="mr-2">
                    <i class="fas fa-circle" style="color: ${colors[i]}"></i> ${label.substring(0, 15)}
                </span>
            `;
        });
    }
}

function renderizarGraficoVentasHora(data) {
    const formatearMoneda = (numero) => '₡' + numero.toLocaleString('en-US', {minimumFractionDigits:2});
    
    // Crear base de 24 horas (0-23)
    const labels = Array.from({length: 24}, (_, i) => `${i}:00`);
    const dataValues = new Array(24).fill(0);
    
    data.forEach(d => {
        if(d.hora >= 0 && d.hora <= 23) {
            dataValues[d.hora] = d.total;
        }
    });

    const ctx = document.getElementById("chartVentasHora");
    if (!ctx) return;
    if(chartVentasHoraInstance) chartVentasHoraInstance.destroy();

    chartVentasHoraInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: "Ventas",
                backgroundColor: "#4e73df",
                hoverBackgroundColor: "#2e59d9",
                borderColor: "#4e73df",
                data: dataValues,
            }],
        },
        options: {
            maintainAspectRatio: false,
            layout: { padding: { left: 10, right: 25, top: 25, bottom: 0 } },
            scales: {
                xAxes: [{
                    time: { unit: 'time' },
                    gridLines: { display: false, drawBorder: false },
                    ticks: { maxTicksLimit: 24 }
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
                titleMarginBottom: 10,
                titleFontColor: '#6e707e',
                titleFontSize: 14,
                backgroundColor: "rgb(255,255,255)",
                bodyFontColor: "#858796",
                borderColor: '#dddfeb',
                borderWidth: 1,
                xPadding: 15,
                yPadding: 15,
                displayColors: false,
                caretPadding: 10,
                callbacks: {
                    label: function(tooltipItem, chart) {
                        return 'Ventas: ' + formatearMoneda(tooltipItem.yLabel);
                    }
                }
            },
        }
    });
}

// ==============================
// RENDER DE TABLAS
// ==============================

function renderizarTablaCategoria(data) {
    const tbody = document.getElementById('tablaCategoria');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center">No hay datos</td></tr>';
        return;
    }

    data.forEach(row => {
        tbody.innerHTML += `
            <tr>
                <td>${row.categoria}</td>
                <td class="text-center">${row.cantidad}</td>
                <td class="text-right">₡${row.total.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
            </tr>
        `;
    });
}

function renderizarTablaTopProductos(data) {
    const tbody = document.getElementById('tablaProductos');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No hay datos</td></tr>';
        return;
    }

    // Tomar top 10
    const top10 = data.slice(0, 10);
    top10.forEach((row, i) => {
        tbody.innerHTML += `
            <tr>
                <td class="text-center">${i + 1}</td>
                <td>${row.nombre_producto}</td>
                <td class="text-center">${row.cantidad}</td>
                <td class="text-right">₡${row.total.toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
            </tr>
        `;
    });
}

// ==============================
// CIERRES DE CAJA (Original)
// ==============================

async function cargarCierres() {
    const fechaInicio = document.getElementById('fechaInicio').value;
    const fechaFin = document.getElementById('fechaFin').value;
    
    try {
        let url = '/api/caja/cierres';
        if (fechaInicio && fechaFin) {
            url += `?fechaInicio=${fechaInicio}&fechaFin=${fechaFin}`;
        }
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Error al obtener cierres');
        
        cierresData = await response.json();
        renderizarTablaCierres(cierresData);
    } catch (error) {
        console.error('Error cargando cierres:', error);
        alert('Error al cargar historial de cierres.');
    }
}

function renderizarTablaCierres(cierres) {
    const tbody = document.getElementById('tablaCierres');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    if (cierres.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" class="text-center">No se encontraron cierres en este rango de fechas</td></tr>';
        return;
    }
    
    cierres.forEach(c => {
        const fechaAp = new Date(c.fecha_apertura).toLocaleString();
        const fechaCi = c.fecha_cierre ? new Date(c.fecha_cierre).toLocaleString() : 'N/A';
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${c.id_sesion}</td>
            <td>${c.nombre_usuario || 'Desconocido'}</td>
            <td>${fechaAp}</td>
            <td>${fechaCi}</td>
            <td class="text-right">₡${parseFloat(c.monto_inicial).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
            <td class="text-right">₡${parseFloat(c.total_ventas_sistema).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
            <td class="text-right font-weight-bold">₡${parseFloat(c.monto_final).toLocaleString('en-US', {minimumFractionDigits: 2})}</td>
            <td class="text-center">${c.cantidad_facturas}</td>
            <td class="text-center">
                <button class="btn btn-sm btn-info" onclick="abrirModalCierre(${c.id_sesion})">
                    <i class="fas fa-print"></i> Reimprimir
                </button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function abrirModalCierre(idSesion) {
    const cierre = cierresData.find(c => c.id_sesion === idSesion);
    if (!cierre) return;
    
    const fechaCi = new Date(cierre.fecha_cierre).toLocaleString();
    
    // Generar layout de ticket (80mm) con estilo texto crudo / monospaced
    const ticketHtml = `
        <div style="font-size: 14px; text-align: center;">
            <p style="font-size: 18px; margin: 0;"><strong>RESTAURANTE SOLUNA</strong></p>
            <p style="margin: 0;">Reporte de Cierre de Caja</p>
            <p style="margin: 0; font-size: 12px; margin-bottom: 20px;">============================</p>
            
            <p style="margin: 2px 0; text-align: left;"><strong>Cierre #:</strong> ${cierre.id_sesion}</p>
            <p style="margin: 2px 0; text-align: left;"><strong>Fecha:</strong> ${fechaCi}</p>
            <p style="margin: 2px 0; text-align: left;"><strong>Cajero:</strong> ${cierre.nombre_usuario || 'Cajero'}</p>
            
            <p style="margin: 0; font-size: 12px; margin-top: 15px; margin-bottom: 15px;">============================</p>
            
            <div style="text-align: left;">
                <p style="margin: 2px 0;">Facturas: <strong>${cierre.cantidad_facturas}</strong></p>
                <div style="display: flex; justify-content: space-between; margin: 2px 0;">
                    <span>Monto Inicial:</span>
                    <span>₡${parseFloat(cierre.monto_inicial).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                </div>
                <div style="display: flex; justify-content: space-between; margin: 2px 0;">
                    <span>Ventas del Día:</span>
                    <span>₡${parseFloat(cierre.total_ventas_sistema).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
                </div>
            </div>
            
            <p style="margin: 0; font-size: 12px; margin-top: 10px; margin-bottom: 10px;">----------------------------</p>
            
            <div style="display: flex; justify-content: space-between; margin: 2px 0; font-size: 16px; font-weight: bold;">
                <span>TOTAL FINAL:</span>
                <span>₡${parseFloat(cierre.monto_final).toLocaleString('en-US', {minimumFractionDigits: 2})}</span>
            </div>
            
            <p style="margin: 0; font-size: 12px; margin-top: 20px;">*** COPIA REIMPRESA ***</p>
        </div>
    `;
    
    document.getElementById('ticketCierreContent').innerHTML = ticketHtml;
    $('#ticketCierreModal').modal('show');
}

function imprimirTicketCierre() {
    window.print();
}

// ==============================
// EXPORTAR (Mockup y CSV)
// ==============================

function exportarPDF() {
    alert("Para exportar, se abrirá el diálogo de impresión del navegador. Puede seleccionar 'Guardar como PDF' como destino.");
    window.print();
}

function exportarExcel() {
    if (cierresData.length === 0) {
        alert("No hay datos para exportar");
        return;
    }
    
    // Crear el string CSV
    let csvContent = "data:text/csv;charset=utf-8,";
    // Header
    csvContent += "ID,Cajero,Apertura,Cierre,Inicial,VentasSistema,MontoReal,Diff,Facturas\r\n";
    
    cierresData.forEach(c => {
        const diff = (c.monto_final - (c.monto_inicial + c.total_ventas_sistema)).toFixed(2);
        const row = [
            c.id_sesion,
            `"${c.nombre_usuario || 'Desconocido'}"`,
            `"${new Date(c.fecha_apertura).toLocaleString()}"`,
            c.fecha_cierre ? `"${new Date(c.fecha_cierre).toLocaleString()}"` : "N/A",
            c.monto_inicial,
            c.total_ventas_sistema,
            c.monto_final,
            diff,
            c.cantidad_facturas
        ];
        csvContent += row.join(",") + "\r\n";
    });

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `reporte_cierres_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
