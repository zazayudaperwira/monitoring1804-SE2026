const API = "https://script.google.com/macros/s/AKfycbw5gYyAM9v5JxW_70_TeBOyGB1yIAfqixzUgUp98BXPG50LNNQdz9Pr5uHrk_pXzRy4-A/exec";
let allData = {};

$(document).ready(function() {
    let progress = 0;
    const interval = setInterval(() => {
        progress += 10;
        $('#progress-bar').css('width', progress + '%');
        $('#perc').text(progress);
        if (progress >= 90) clearInterval(interval);
    }, 150);

    fetch(API)
        .then(res => res.json())
        .then(res => {
            allData = res.data;
            $('#progress-bar').css('width', '100%');
            $('#perc').text(100);
            $('#loader').fadeOut();
            $('#updateInfo').text("Update Terakhir: " + res.metadata.update);
            
            setupFilters();
            switchTab('Kecamatan');
        })
        .catch(err => {
            console.error("Error:", err);
            $('#loader').hide();
            alert("Gagal memuat data. Periksa koneksi atau API.");
        });
});

function switchTab(sheet) {
    if (!allData[sheet]) return;

    // Styling Button
    $('.tab-btn').removeClass('bg-orange-600 text-white').addClass('bg-orange-100 text-orange-700');
    $(`button[onclick="switchTab('${sheet}')"]`).removeClass('bg-orange-100 text-orange-700').addClass('bg-orange-600 text-white');

    // Destroy & Create Table
    if ($.fn.DataTable.isDataTable('#mainTable')) {
        $('#mainTable').DataTable().destroy();
    }
    
    $('#mainTable').html(''); // Bersihkan HTML tabel
    $('#mainTable').DataTable({
        data: allData[sheet],
        columns: Object.keys(allData[sheet][0]).map(k => ({ title: k, data: k })),
        scrollX: true,
        destroy: true
    });
}

function setupFilters() {
    // Isi Filter Kecamatan
    const kecs = [...new Set(allData.Kecamatan.map(d => d.Kecamatan))];
    kecs.forEach(k => $('#fKec').append(`<option value="${k}">${k}</option>`));
    
    $('#fKec').change(() => {
        const selected = $('#fKec').val();
        const table = $('#mainTable').DataTable();
        table.column(0).search(selected).draw();
    });
}
