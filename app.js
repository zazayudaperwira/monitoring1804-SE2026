const API = "https://script.google.com/macros/s/AKfycbw5gYyAM9v5JxW_70_TeBOyGB1yIAfqixzUgUp98BXPG50LNNQdz9Pr5uHrk_pXzRy4-A/exec";
let allData = {};
// State Filter Global
let currentFilters = { kec: "", desa: "", stat: "" };

$(document).ready(function() {
    fetch(API).then(res => res.json()).then(res => {
        allData = res.data;
        $('#updateInfo').text("Update Terakhir: " + res.metadata.update);
        
        // Inisialisasi Filter Kecamatan
        const kecs = [...new Set(allData.Kecamatan.map(d => d.Kecamatan))];
        kecs.forEach(k => $('#fKec').append(`<option value="${k}">${k}</option>`));
        
        switchTab('Kecamatan');
    });

    // Event Filter Nested
    $('#fKec').change(function() {
        currentFilters.kec = $(this).val();
        currentFilters.desa = ""; // Reset desa jika kec ganti
        updateDesaDropdown();
        applyFilters();
    });

    $('#fDesa, #fStat').change(function() {
        currentFilters.desa = $('#fDesa').val();
        currentFilters.stat = $('#fStat').val();
        applyFilters();
    });
});

function updateDesaDropdown() {
    $('#fDesa').html('<option value="">Semua Desa</option>');
    if (currentFilters.kec) {
        const desas = allData.Desa.filter(d => d.Kecamatan === currentFilters.kec);
        desas.forEach(d => $('#fDesa').append(`<option value="${d.Desa}">${d.Desa}</option>`));
    }
}

function applyFilters() {
    const table = $('#mainTable').DataTable();
    // Filter by Kecamatan (kolom 0)
    table.column(0).search(currentFilters.kec);
    // Filter by Desa (kolom 1 - sesuaikan index jika perlu)
    table.column(1).search(currentFilters.desa);
    // Filter by Status (asumsi kolom status ada, sesuaikan index)
    table.column(2).search(currentFilters.stat);
    table.draw();
}

function switchTab(sheet) {
    $('.tab-btn').removeClass('bg-orange-600 text-white').addClass('bg-orange-100 text-orange-700');
    $(`button[onclick="switchTab('${sheet}')"]`).removeClass('bg-orange-100 text-orange-700').addClass('bg-orange-600 text-white');

    if ($.fn.DataTable.isDataTable('#mainTable')) $('#mainTable').DataTable().destroy();
    
    $('#mainTable').DataTable({
        data: allData[sheet],
        columns: Object.keys(allData[sheet][0] || {}).map(k => ({ title: k, data: k })),
        scrollX: true,
        initComplete: () => applyFilters() // Terapkan filter saat tabel baru dimuat
    });
}
