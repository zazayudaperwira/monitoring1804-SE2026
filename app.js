const API = "https://script.google.com/macros/s/AKfycbw5gYyAM9v5JxW_70_TeBOyGB1yIAfqixzUgUp98BXPG50LNNQdz9Pr5uHrk_pXzRy4-A/exec";
let allData = {};
let filterState = { kec: "", desa: "", stat: "" };

$(document).ready(function() {
    fetch(API).then(res => res.json()).then(res => {
        allData = res.data;
        $('#updateInfo').text("Update Terakhir: " + res.metadata.update);
        
        // Inisialisasi Dropdown Kecamatan
        const kecs = [...new Set(allData.Kecamatan.map(d => d.Kecamatan))];
        kecs.forEach(k => $('#fKec').append(`<option value="${k}">${k}</option>`));
        
        switchTab('Kecamatan');
    });

    $('#fKec').change(function() {
        filterState.kec = $(this).val();
        filterState.desa = "";
        updateDesaDropdown();
        applyFilters();
    });

    $('#fDesa').change(function() { filterState.desa = $(this).val(); applyFilters(); });
    $('#fStat').change(function() { filterState.stat = $(this).val(); applyFilters(); });
});

function updateDesaDropdown() {
    $('#fDesa').html('<option value="">Semua Desa</option>');
    if (filterState.kec) {
        const desas = allData.Desa.filter(d => d.Kecamatan === filterState.kec);
        desas.forEach(d => $('#fDesa').append(`<option value="${d.Desa}">${d.Desa}</option>`));
    }
}

function applyFilters() {
    const table = $('#mainTable').DataTable();
    table.column(0).search(filterState.kec).column(1).search(filterState.desa).column(2).search(filterState.stat).draw();
}

function switchTab(sheet) {
    $('.tab-btn').removeClass('bg-orange-600 text-white').addClass('bg-orange-100 text-orange-700');
    $(`button[onclick="switchTab('${sheet}')"]`).removeClass('bg-orange-100 text-orange-700').addClass('bg-orange-600 text-white');

    if ($.fn.DataTable.isDataTable('#mainTable')) $('#mainTable').DataTable().destroy();
    
    $('#mainTable').DataTable({
        data: allData[sheet],
        columns: Object.keys(allData[sheet][0] || {}).map(k => ({ title: k, data: k })),
        scrollX: true,
        initComplete: () => applyFilters()
    });
}
