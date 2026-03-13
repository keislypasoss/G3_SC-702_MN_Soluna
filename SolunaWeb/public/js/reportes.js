// public/js/reportes.js

let cierresData = [];

document.addEventListener('DOMContentLoaded', () => {
    // Inicializar fechas con el día de hoy
    const hoy = new Date().toISOString().split('T')[0];
    document.getElementById('fechaInicio').value = hoy;
    document.getElementById('fechaFin').value = hoy;

    // Escuchar cambios en el tipo de reporte para mostrar/ocultar paneles
    document.getElementById('tipoReporte').addEventListener('change', (e) => {
        const tipo = e.target.value;
        const panelKPIs = document.querySelectorAll('.row.mb-4')[1]; // El row de los 4 cards
        const panelGraficos = document.querySelectorAll('.row')[2]; // El de los gráficos
        const panelTablas = document.querySelectorAll('.row')[3]; // Tablas de ventas
        const panelHoras = document.querySelectorAll('.row')[4]; // Gráfico por horas
        const contenedorCierres = document.getElementById('contenedorCierres');

        if (tipo === 'cierres') {
            // Ocultar todos los paneles de ventas
            if(panelKPIs) panelKPIs.style.display = 'none';
            if(panelGraficos) panelGraficos.style.display = 'none';
            if(panelTablas) panelTablas.style.display = 'none';
            if(panelHoras) panelHoras.style.display = 'none';
            
            // Mostrar panel de cierres
            contenedorCierres.style.display = 'block';
        } else {
            // Mostrar paneles de ventas (o restaurarlos a default, dependiento del futuro MVP)
            if(panelKPIs) panelKPIs.style.display = 'flex';
            if(panelGraficos) panelGraficos.style.display = 'flex';
            if(panelTablas) panelTablas.style.display = 'flex';
            if(panelHoras) panelHoras.style.display = 'flex';
            
            // Ocultar panel de cierres
            contenedorCierres.style.display = 'none';
        }
    });
});

async function generarReporte() {
    const tipo = document.getElementById('tipoReporte').value;
    
    if (tipo === 'cierres') {
        await cargarCierres();
    } else {
        alert('Funcionalidad de reporte para "' + tipo + '" está en desarrollo.');
    }
}

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
    // Al usar @media print, todo lo demás en el body se oculta
    // y solo se muestra #ticketCierreModal .modal-body
    window.print();
}
