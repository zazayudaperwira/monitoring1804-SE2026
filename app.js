const API = "https://script.google.com/macros/s/AKfycbw5gYyAM9v5JxW_70_TeBOyGB1yIAfqixzUgUp98BXPG50LNNQdz9Pr5uHrk_pXzRy4-A/exec";
let allData = {};
let chart;

$(document).ready(function() {
    fetch(API).then(res => res.json()).then(res => {
        allData = res.data;
        initDashboard();
    });
});

function initDashboard() {
    const kecs = [...new Set(allData.Kecamatan.map(d => d.Kecamatan))];
    kecs.forEach(k => $('#fKec').append(`<option value="${k}">${k}</option>`));
    switchTab('Kecamatan');
    updateChart();
}

function updateChart() {
    const kec = $('#fKec').val();
    const desa = $('#fDesa').val();
    
    // Filter data untuk grafik
    let data = allData.SLS.filter(d => 
        (kec === "" || d.Kecamatan.includes(kec)) && 
        (desa === "" || d.Desa.includes(desa))
    );

    const counts = { OPEN: 0, DRAFT: 0, SUBMITTED: 0, APPROVED: 0 };
    data.forEach(d => {
        if(counts.hasOwnProperty(d.Status)) counts[d.Status]++;
    });

    if(chart) chart.destroy();
    chart = new Chart(document.getElementById('progresChart'), {
        type: 'bar',
        data: {
            labels: Object.keys(counts),
            datasets: [{ label: 'Jumlah SLS', data: Object.values(counts), backgroundColor: '#ea580c' }]
        }
    });
}

function resetFilters() {
    $('#fKec').val(""); $('#fDesa').val(""); $('#fStat').val("");
    $('#fDesa').html('<option value="">Semua Desa</option>');
    $('#mainTable').DataTable().search('').draw();
    updateChart();
}

// Event Listeners
$('#fKec').change(function() { updateDesaDropdown(); applyFilters(); updateChart(); });
$('#fDesa, #fStat').change(function() { applyFilters(); updateChart(); });

function updateDesaDropdown() {
    const kec = $('#fKec').val();
    $('#fDesa').html('<option value="">Semua Desa</option>');
    if (kec) {
        allData.Desa.filter(d => d.Kecamatan === kec).forEach(d => $('#fDesa').append(`<option value="${d.Desa}">${d.Desa}</option>`));
    }
}

function applyFilters() {
    const t = $('#mainTable').DataTable();
    t.search(($('#fKec').val() + " " + $('#fDesa').val() + " " + $('#fStat').val()).trim()).draw();
}

function switchTab(sheet) {
    if ($.fn.DataTable.isDataTable('#mainTable')) $('#mainTable').DataTable().destroy();
    $('#mainTable').DataTable({
        data: allData[sheet],
        columns: Object.keys(allData[sheet][0]).map(k => ({ title: k, data: k })),
        scrollX: true, destroy: true
    });
}
