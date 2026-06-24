const API = "https://script.google.com/macros/s/AKfycbw5gYyAM9v5JxW_70_TeBOyGB1yIAfqixzUgUp98BXPG50LNNQdz9Pr5uHrk_pXzRy4-A/exec";
let allData = {};
let chart;

$(document).ready(function() {
    const cached = localStorage.getItem('dashboardData');
    if (cached) {
        processData(JSON.parse(cached));
    } else {
        fetch(API).then(res => res.json()).then(res => {
            localStorage.setItem('dashboardData', JSON.stringify(res));
            processData(res);
        });
    }
});

function processData(res) {
    allData = res.data;
    $('#updateInfo').text("Update Terakhir: " + res.metadata.update);
    
    // Inisialisasi Dropdown
    const kecs = [...new Set(allData.Kecamatan.map(d => d.Kecamatan))];
    kecs.forEach(k => $('#fKec').append(`<option value="${k}">${k}</option>`));
    
    switchTab('Kecamatan');
    updateChart(); // Jalankan chart saat data siap
}

function updateChart() {
    if (!allData.SLS) return;
    
    const kec = $('#fKec').val();
    const desa = $('#fDesa').val();
    const stat = $('#fStat').val();
    
    // Filter data SLS
    let filtered = allData.SLS.filter(d => 
        (kec === "" || d.Kecamatan.includes(kec)) && 
        (desa === "" || d.Desa.includes(desa)) &&
        (stat === "" || d.Status === stat) // Sesuaikan 'Status' dengan nama kolom di Sheets
    );

    const counts = { OPEN: 0, DRAFT: 0, SUBMITTED: 0, APPROVED: 0 };
    filtered.forEach(d => {
        if(counts.hasOwnProperty(d.Status)) counts[d.Status]++;
    });

    const ctx = document.getElementById('progresChart').getContext('2d');
    if(chart) chart.destroy();
    chart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: Object.keys(counts),
            datasets: [{ label: 'Jumlah SLS', data: Object.values(counts), backgroundColor: '#ea580c' }]
        },
        options: { responsive: true, maintainAspectRatio: false }
    });
}

function switchTab(sheet) {
    if (!allData[sheet]) return;

    // Bersihkan tabel dengan aman
    if ($.fn.DataTable.isDataTable('#mainTable')) {
        $('#mainTable').DataTable().destroy();
        $('#mainTable').empty();
    }

    const cols = Object.keys(allData[sheet][0]).map(k => ({ title: k, data: k }));

    $('#mainTable').DataTable({
        data: allData[sheet],
        columns: cols,
        scrollX: true,
        deferRender: true,
        destroy: true
    });
}

function resetFilters() {
    $('#fKec').val(""); $('#fDesa').val(""); $('#fStat').val("");
    $('#fDesa').html('<option value="">Semua Desa</option>');
    updateChart();
    switchTab('Kecamatan');
}

// Event Listeners
$('#fKec').change(function() { 
    // Update dropdown desa dan grafik
    $('#fDesa').html('<option value="">Semua Desa</option>');
    allData.Desa.filter(d => d.Kecamatan === $(this).val()).forEach(d => $('#fDesa').append(`<option value="${d.Desa}">${d.Desa}</option>`));
    updateChart(); 
});
$('#fDesa, #fStat').change(() => updateChart());
