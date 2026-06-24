const API_URL = "https://script.google.com/macros/s/AKfycbz1jpNYNXD7EbyCWF1CKpC0JQOqJ9pq-rVEakMRAZMPEzwkW0Fe1ZCFX3FgiM1Gen3a/exec";
let globalData = {};

$(document).ready(async function() {
    try {
        const response = await fetch(API_URL);
        const rawData = await response.json();
        
        // --- FITUR OTOMATIS: Membersihkan Nama Kolom ---
        // Kita loop setiap tab dan bersihkan key-nya dari spasi liar
        globalData = Object.keys(rawData).reduce((acc, tab) => {
            acc[tab] = rawData[tab].map(row => {
                let cleanRow = {};
                Object.keys(row).forEach(key => {
                    cleanRow[key.trim()] = row[key]; // .trim() menghapus spasi kiri/kanan
                });
                return cleanRow;
            });
            return acc;
        }, {});

        console.log("Data bersih:", globalData);
        initDashboard();
    } catch (err) { console.error("Error:", err); }
});

function initDashboard() {
    // Isi Filter Kecamatan
    let kecList = [...new Set(globalData["Kecamatan"].map(r => r["Kecamatan"]))];
    kecList.forEach(k => $('#filterWilayah').append(`<option value="${k}">${k}</option>`));
    
    // Inisialisasi Tabel Kecamatan
    renderTable("Kecamatan");
    $('#loader').hide();
    $('#dashboardContent').show();
}

function renderTable(tab) {
    let data = globalData[tab] || [];
    let statusFilter = $('#filterAssignment').val();
    
    // Filter Otomatis
    if(statusFilter) {
        data = data.filter(r => r[statusFilter] !== undefined); 
    }

    if ($.fn.DataTable.isDataTable('#mainDataTable')) $('#mainDataTable').DataTable().destroy();
    
    $('#mainDataTable').DataTable({
        data: data,
        columns: Object.keys(data[0] || {}).map(k => ({ title: k, data: k })),
        scrollX: true
    });
}

// Event Listener Otomatis untuk Filter
$('#filterWilayah, #filterAssignment').on('change', function() {
    renderTable('Kecamatan'); // Atau sesuaikan dengan tab aktif
});
