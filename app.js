const API = "https://script.google.com/macros/s/AKfycbw5gYyAM9v5JxW_70_TeBOyGB1yIAfqixzUgUp98BXPG50LNNQdz9Pr5uHrk_pXzRy4-A/exec";
let allData = {};
let filterState = { kec: "", desa: "", stat: "" };

$(document).ready(function() {
    const cached = localStorage.getItem('dashboardData');
    if (cached) {
        processData(JSON.parse(cached));
        $('#loader').hide();
    } else {
        loadFromAPI();
    }
});

function loadFromAPI() {
    fetch(API).then(res => res.json()).then(res => {
        localStorage.setItem('dashboardData', JSON.stringify(res));
        processData(res);
        $('#loader').fadeOut(500);
    });
}

function processData(res) {
    allData = res.data;
    $('#updateInfo').text("Update Terakhir: " + res.metadata.update);
    // Membersihkan spasi pada data untuk memastikan kesamaan
    const kecs = [...new Set(allData.Kecamatan.map(d => d.Kecamatan.trim()))];
    kecs.forEach(k => $('#fKec').append(`<option value="${k}">${k}</option>`));
    switchTab('Kecamatan');
}

$('#fKec').change(function() { filterState.kec = $(this).val(); filterState.desa = ""; updateDesaDropdown(); applyFilters(); });
$('#fDesa').change(function() { filterState.desa = $(this).val(); applyFilters(); });
$('#fStat').change(function() { filterState.stat = $(this).val(); applyFilters(); });

function updateDesaDropdown() {
    $('#fDesa').html('<option value="">Semua Desa</option>');
    if (filterState.kec && allData.Desa) {
        const desas = allData.Desa.filter(d => d.Kecamatan.trim() === filterState.kec);
        desas.forEach(d => $('#fDesa').append(`<option value="${d.Desa}">${d.Desa}</option>`));
    }
}

function applyFilters() {
    const t = $('#mainTable').DataTable();
    // Menggunakan regex ^...$ untuk pencocokan exact match yang sudah di-trim
    const filterKec = filterState.kec ? `^${$.fn.DataTable.util.escapeRegex(filterState.kec)}$` : "";
    const filterDesa = filterState.desa ? `^${$.fn.DataTable.util.escapeRegex(filterState.desa)}$` : "";
    
    t.column('Kecamatan:name').search(filterKec, true, false)
     .column('Desa:name').search(filterDesa, true, false)
     .draw();
}

function switchTab(sheet) {
    if (!allData[sheet]) return;
    $('.tab-btn').removeClass('bg-orange-600 text-white').addClass('bg-orange-100 text-orange-700');
    $(`button[onclick="switchTab('${sheet}')"]`).removeClass('bg-orange-100 text-orange-700').addClass('bg-orange-600 text-white');

    if ($.fn.DataTable.isDataTable('#mainTable')) {
        $('#mainTable').DataTable().destroy();
        $('#mainTable').empty();
    }

    const keys = Object.keys(allData[sheet][0]);
    const columns = keys.map(k => ({ title: k, data: k, name: k }));

    $('#mainTable').DataTable({
        data: allData[sheet],
        columns: columns,
        scrollX: true,
        deferRender: true,
        destroy: true,
        initComplete: function() {
            // Pembersihan data saat tabel dimuat
            applyFilters();
        }
    });
}
