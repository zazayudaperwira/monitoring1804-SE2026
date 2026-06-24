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
    const kecs = [...new Set(allData.Kecamatan.map(d => d.Kecamatan))];
    kecs.forEach(k => $('#fKec').append(`<option value="${k}">${k}</option>`));
    switchTab('Kecamatan');
}

$('#fKec').change(function() { filterState.kec = $(this).val(); filterState.desa = ""; updateDesaDropdown(); applyFilters(); });
$('#fDesa').change(function() { filterState.desa = $(this).val(); applyFilters(); });
$('#fStat').change(function() { filterState.stat = $(this).val(); applyFilters(); });

function updateDesaDropdown() {
    $('#fDesa').html('<option value="">Semua Desa</option>');
    if (filterState.kec && allData.Desa) {
        const desas = allData.Desa.filter(d => d.Kecamatan === filterState.kec);
        desas.forEach(d => $('#fDesa').append(`<option value="${d.Desa}">${d.Desa}</option>`));
    }
}

function applyFilters() {
    const t = $('#mainTable').DataTable();
    // Gunakan pencarian global untuk memastikan data ditemukan
    // Kita kombinasikan teks dari dropdown untuk dicari di seluruh kolom tabel
    const query = (filterState.kec ? filterState.kec : "") + " " + (filterState.desa ? filterState.desa : "");
    t.search(query).draw();
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
    const columns = keys.map(k => ({ title: k, data: k }));

    $('#mainTable').DataTable({
        data: allData[sheet],
        columns: columns,
        scrollX: true,
        deferRender: true,
        destroy: true
    });
}
