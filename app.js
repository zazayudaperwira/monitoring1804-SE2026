const API = "https://script.google.com/macros/s/AKfycbw5gYyAM9v5JxW_70_TeBOyGB1yIAfqixzUgUp98BXPG50LNNQdz9Pr5uHrk_pXzRy4-A/exec";
let allData = {};
let chart;

const STATUS_ORDER = [
    "OPEN", "DRAFT", "SUBMITTED BY Pencacah", "REJECTED BY Pengawas", 
    "APPROVED BY Pengawas", "REVOKED BY Pengawas", "SUBMITTED RESPONDENT", "EDITED BY Pengawas"
];

$(document).ready(function() {
    fetch(API).then(res => res.json()).then(res => {
        allData = res.data;
        $('#updateInfo').text("Update Terakhir: " + res.metadata.update);
        
        const kecs = [...new Set(allData.Kecamatan.map(d => d.Kecamatan))];
        kecs.forEach(k => $('#fKec').append(`<option value="${k}">${k}</option>`));
        STATUS_ORDER.forEach(s => $('#fStat').append(`<option value="${s}">${s}</option>`));
        
        switchTab('Kecamatan');
        updateChart();
    });
});

function updateChart() {
    if (!allData.SLS) return;
    const kec = $('#fKec').val();
    const desa = $('#fDesa').val();
    const stat = $('#fStat').val();
    
    let filtered = allData.SLS.filter(d => 
        (kec === "" || d.Kecamatan.includes(kec)) && 
        (desa === "" || d.Desa.includes(desa)) &&
        (stat === "" || d.Status === stat)
    );

    const counts = STATUS_ORDER.map(s => filtered.filter(d => d.Status === s).length);

    if(chart) chart.destroy();
    chart = new Chart(document.getElementById('progresChart'), {
        type: 'bar',
        data: { labels: STATUS_ORDER, datasets: [{ label: 'Jumlah SLS', data: counts, backgroundColor: '#ea580c' }] },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function switchTab(sheet) {
    if (!allData[sheet]) return;
    $('.tab-btn').removeClass('bg-orange-600 text-white').addClass('bg-orange-100 text-orange-700');
    $(`button[onclick="switchTab('${sheet}')"]`).removeClass('bg-orange-100 text-orange-700').addClass('bg-orange-600 text-white');

    if ($.fn.DataTable.isDataTable('#mainTable')) { $('#mainTable').DataTable().destroy(); $('#mainTable').empty(); }
    
    $('#mainTable').DataTable({
        data: allData[sheet],
        columns: Object.keys(allData[sheet][0]).map(k => ({ title: k, data: k })),
        scrollX: true, destroy: true
    });
}

function resetFilters() {
    $('#fKec').val(""); $('#fDesa').val(""); $('#fStat').val("");
    $('#fDesa').html('<option value="">Semua Desa</option>');
    updateChart();
    switchTab('Kecamatan');
}

$('#fKec').change(function() { 
    $('#fDesa').html('<option value="">Semua Desa</option>');
    allData.Desa.filter(d => d.Kecamatan === $(this).val()).forEach(d => $('#fDesa').append(`<option value="${d.Desa}">${d.Desa}</option>`));
    updateChart(); 
});
$('#fDesa, #fStat').change(() => updateChart());
