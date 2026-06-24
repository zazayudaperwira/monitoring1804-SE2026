const API = "https://script.google.com/macros/s/AKfycbw5gYyAM9v5JxW_70_TeBOyGB1yIAfqixzUgUp98BXPG50LNNQdz9Pr5uHrk_pXzRy4-A/exec";
let allData = {};
let chart = null;
const STATUS_COLS = ["OPEN", "DRAFT", "SUBMITTED BY Pencacah", "REJECTED BY Pengawas", "APPROVED BY Pengawas", "REVOKED BY Pengawas", "SUBMITTED RESPONDENT", "EDITED BY Pengawas"];

$(document).ready(function() {
    fetch(API).then(res => res.json()).then(res => {
        allData = res.data;
        $('#updateInfo').text("Update Terakhir: " + res.metadata.update);
        
        // --- FIX NaN DI SINI ---
        const kabData = allData.Kecamatan ? allData.Kecamatan.find(d => d.Kecamatan === "Lampung Timur") : null;
        // Kita paksa menjadi angka, jika gagal kita berikan angka 0
        let progressVal = 0;
        if (kabData && kabData.Progres !== undefined) {
            progressVal = parseFloat(kabData.Progres) || 0; 
        }
        $('#kabProgres').text((progressVal * 100).toFixed(1) + "%");
        // -----------------------
        
        [...new Set(allData.Kecamatan.map(d => d.Kecamatan))].forEach(k => $('#fKec').append(`<option value="${k}">${k}</option>`));
        
        switchTab('Kecamatan');
        updateChart();
    });
});

function switchTab(sheet) {
    if (!allData[sheet]) return;
    
    $('.tab-btn').removeClass('bg-orange-600 text-white').addClass('bg-orange-100 text-orange-700');
    $(`button[onclick="switchTab('${sheet}')"]`).removeClass('bg-orange-100 text-orange-700').addClass('bg-orange-600 text-white');
    
    if ($.fn.DataTable.isDataTable('#mainTable')) { 
        $('#mainTable').DataTable().destroy(); 
        $('#mainTable').empty(); 
    }
    
    $('#mainTable').DataTable({ 
        data: allData[sheet], 
        columns: Object.keys(allData[sheet][0]).map(k => ({ 
            title: k, data: k,
            render: (data) => (k.toLowerCase().includes('progres') && typeof data === 'number') ? (data * 100).toFixed(1) + '%' : data
        })),
        scrollX: true, 
        destroy: true,
        rowCallback: function(row, data) {
            // Deteksi "kurang" (case-insensitive)
            const targetVal = data['Target Harian'] ? String(data['Target Harian']).toLowerCase() : "";
            if (targetVal.includes('kurang')) {
                $(row).find('td').css({ 'color': 'red', 'font-weight': 'bold' });
            }
        }
    });
}

function updateChart() { /* Logika chart tetap sama */ }
function applyFilters() { /* Logika filter tetap sama */ }
$('#fKec').change(function() { /* Logika filter kecamatan */ });
function resetFilters() { location.reload(); }
