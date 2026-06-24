const API_URL = "https://script.google.com/macros/s/AKfycbyG5sC5JFMHSr0725mGPPVQDDjQQswm9sjDQPXzvXI_HnA8oMLS-5JhbSLNyBze06C1vA/exec";
let allData = {};

$(document).ready(async () => {
    try {
        const response = await fetch(API_URL);
        allData = await response.json();
        
        $('#loader').fadeOut();
        // Memuat tab default saat pertama kali dibuka
        loadTable('Kecamatan');
    } catch (e) { 
        $('#loader').hide(); 
        console.error("Gagal memuat data:", e); 
    }
});

function loadTable(sheetName) {
    // 1. Validasi: Pastikan data untuk sheet tersebut ada
    if (!allData[sheetName]) {
        console.error("Data untuk sheet " + sheetName + " tidak ditemukan di API!");
        return;
    }

    // 2. Styling Tab (Warna Aktif)
    $('.tab-btn').removeClass('bg-orange-600 text-white').addClass('bg-orange-100 text-orange-700');
    $(`button[onclick="loadTable('${sheetName}')"]`).removeClass('bg-orange-100 text-orange-700').addClass('bg-orange-600 text-white');

    // 3. Ambil data spesifik per sheet
    const data = allData[sheetName];

    // 4. Hancurkan tabel lama & buat tabel baru
    if ($.fn.DataTable.isDataTable('#mainDataTable')) {
        $('#mainDataTable').DataTable().destroy();
    }
    
    $('#mainDataTable').DataTable({
        data: data,
        columns: Object.keys(data[0] || {}).map(k => ({ title: k, data: k })),
        scrollX: true,
        destroy: true,
        pageLength: 10
    });
}
