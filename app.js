const API = "https://script.google.com/macros/s/AKfycbw5gYyAM9v5JxW_70_TeBOyGB1yIAfqixzUgUp98BXPG50LNNQdz9Pr5uHrk_pXzRy4-A/exec";
let allData = {};
let chart;

// Daftar kolom status yang ada di data Anda
const STATUS_COLS = ["OPEN", "DRAFT", "SUBMITTED BY Pencacah", "REJECTED BY Pengawas", "APPROVED BY Pengawas", "REVOKED BY Pengawas", "SUBMITTED RESPONDENT", "EDITED BY Pengawas"];

$(document).ready(function() {
    fetch(API).then(res => res.json()).then(res => {
        allData = res.data;
        initApp();
    });
});

function initApp() {
    const kecs = [...new Set(allData.Kecamatan.map(d => d.Kecamatan))];
    kecs.forEach(k => $('#fKec').append(`<option value="${k}">${k}</option>`));
    switchTab('SLS');
    updateChart();
}

function updateChart() {
    if (!allData.SLS) return;
    const kec = $('#fKec').val();
    const desa = $('#fDesa').val();
    
    let filtered = allData.SLS.filter(d => 
        (kec === "" || d.Kecamatan.includes(kec)) && 
        (desa === "" || d.Desa.includes(desa))
    );

    // Menjumlahkan tiap kolom status
    let totals = STATUS_COLS.map(col => filtered.reduce((sum, d) => sum + (Number(d[col]) || 0), 0));

    if(chart) chart.destroy();
    chart = new Chart(document.getElementById('progresChart').getContext('2d'), {
        type: 'bar',
        data: { labels: STATUS_COLS, datasets: [{ label: 'Total SLS', data: totals, backgroundColor: '#ea580c' }] },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function switchTab(sheet) {
    if (!allData[sheet]) return;
    if ($.fn.DataTable.isDataTable('#mainTable')) { $('#mainTable').DataTable().destroy(); $('#mainTable').empty(); }
    
    $('#mainTable').DataTable({
        data: allData[sheet],
        columns: Object.keys(allData[sheet][0]).map(k => ({ title: k, data: k })),
        scrollX: true, destroy: true
    });
}

$('#fKec').change(function() { 
    $('#fDesa').html('<option value="">Semua Desa</option>');
    allData.Desa.filter(d => d.Kecamatan === $(this).val()).forEach(d => $('#fDesa').append(`<option value="${d.Desa}">${d.Desa}</option>`));
    updateChart(); 
    $('#mainTable').DataTable().search($(this).val()).draw();
});

function resetFilters() {
    $('#fKec').val(""); $('#fDesa').val("");
    $('#fDesa').html('<option value="">Semua Desa</option>');
    $('#mainTable').DataTable().search('').draw();
    updateChart();
}
