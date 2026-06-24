const API_URL = "https://script.google.com/macros/s/AKfycbyG5sC5JFMHSr0725mGPPVQDDjQQswm9sjDQPXzvXI_HnA8oMLS-5JhbSLNyBze06C1vA/exec";
let allData = {};

$(document).ready(async () => {
    try {
        const response = await fetch(API_URL);
        allData = await response.json();
        
        // Isi Filter Kecamatan
        const kec = [...new Set(allData["Kecamatan"].map(r => r["Kecamatan"]))];
        kec.forEach(k => $('#filterKec').append(`<option value="${k}">${k}</option>`));
        
        $('#loader').fadeOut();
        loadTable('Kecamatan');
    } catch (e) { $('#loader').hide(); alert("Gagal memuat data"); }
});

function loadTable(sheetName) {
    // Styling Tab
    $('.tab-btn').removeClass('bg-orange-600 text-white').addClass('bg-orange-100 text-orange-700');
    $(`[onclick="loadTable('${sheetName}')"]`).removeClass('bg-orange-100 text-orange-700').addClass('bg-orange-600 text-white');

    const data = allData[sheetName];
    if ($.fn.DataTable.isDataTable('#mainDataTable')) $('#mainDataTable').DataTable().destroy();
    
    const table = $('#mainDataTable').DataTable({
        data: data,
        columns: Object.keys(data[0]).map(k => ({ title: k, data: k })),
        scrollX: true,
        destroy: true
    });

    // Event Filter
    $('#filterKec').off('change').on('change', function() {
        table.column(0).search(this.value).draw();
    });
}
