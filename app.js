const API = "https://script.google.com/macros/s/AKfycbw5gYyAM9v5JxW_70_TeBOyGB1yIAfqixzUgUp98BXPG50LNNQdz9Pr5uHrk_pXzRy4-A/exec";
let allData = {};

$(document).ready(function() {
    fetch(API)
        .then(res => res.json())
        .then(res => {
            allData = res.data;
            $('#updateInfo').text("Update Terakhir: " + res.metadata.update);
            switchTab('Kecamatan');
        })
        .catch(err => console.error("Gagal memuat API:", err));
});

function switchTab(sheet) {
    if (!allData[sheet]) return;

    // Styling tombol aktif
    $('.tab-btn').removeClass('bg-orange-600 text-white').addClass('bg-orange-100 text-orange-700');
    $(`button[onclick="switchTab('${sheet}')"]`).removeClass('bg-orange-100 text-orange-700').addClass('bg-orange-600 text-white');

    // Reset Tabel
    if ($.fn.DataTable.isDataTable('#mainTable')) {
        $('#mainTable').DataTable().destroy();
        $('#mainTable').empty();
    }

    // Inisialisasi DataTable
    $('#mainTable').DataTable({
        data: allData[sheet],
        columns: Object.keys(allData[sheet][0] || {}).map(k => ({ title: k, data: k })),
        scrollX: true,
        destroy: true
    });
}
