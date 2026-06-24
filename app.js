const API = "https://script.google.com/macros/s/AKfycbw5gYyAM9v5JxW_70_TeBOyGB1yIAfqixzUgUp98BXPG50LNNQdz9Pr5uHrk_pXzRy4-A/exec";
let allData = {};
let chart = null;
const STATUS_COLS = ["OPEN", "DRAFT", "SUBMITTED BY Pencacah", "REJECTED BY Pengawas", "APPROVED BY Pengawas", "REVOKED BY Pengawas", "SUBMITTED RESPONDENT", "EDITED BY Pengawas"];

$(document).ready(function() {
    fetch(API).then(res => res.json()).then(res => {
        allData = res.data;
        
        // Progres Kab
        const kabData = allData.Kecamatan ? allData.Kecamatan.find(d => d.Kecamatan === "Lampung Timur") : null;
        const progVal = kabData && kabData.Progres ? (parseFloat(kabData.Progres) * 100) : 0;
        $('#kabProgres').text((isNaN(progVal) ? 0 : progVal.toFixed(1)) + "%");
        
        renderRanking(); // Panggil fungsi ranking
        
        [...new Set(allData.Kecamatan.map(d => d.Kecamatan))].forEach(k => $('#fKec').append(`<option value="${k}">${k}</option>`));
        switchTab('Kecamatan');
        updateChart();
    });
});

function renderRanking() {
    if (!allData.PETUGAS) return;
    let sorted = [...allData.PETUGAS].sort((a,b) => b.Progres - a.Progres);
    let top = sorted.slice(0, 10);
    let bot = sorted.slice(-10).reverse();
    
    let html = `<div class="text-green-600 font-bold mb-2">🚀 TOP 10 PETUGAS</div>`;
    top.forEach(p => html += `<div class="flex justify-between border-b p-1"><span>${p.Petugas}</span><span class="font-bold">${(p.Progres*100).toFixed(1)}%</span></div>`);
    html += `<div class="text-red-600 font-bold mt-4 mb-2">📉 BOTTOM 10 PETUGAS</div>`;
    bot.forEach(p => html += `<div class="flex justify-between border-b p-1"><span>${p.Petugas}</span><span class="font-bold">${(p.Progres*100).toFixed(1)}%</span></div>`);
    $('#rankingPetugas').html(html);
}

function switchTab(sheet) {
    if (!allData[sheet]) return;
    $('.tab-btn').removeClass('bg-orange-600 text-white').addClass('bg-orange-100 text-orange-700');
    $(`button[onclick="switchTab('${sheet}')"]`).removeClass('bg-orange-100 text-orange-700').addClass('bg-orange-600 text-white');
    
    if ($.fn.DataTable.isDataTable('#mainTable')) { $('#mainTable').DataTable().destroy(); $('#mainTable').empty(); }
    
    $('#mainTable').DataTable({ 
        data: allData[sheet], 
        columns: Object.keys(allData[sheet][0]).map(k => ({ 
            title: k, data: k,
            render: (data) => (k.toLowerCase().includes('progres') && typeof data === 'number') ? (data * 100).toFixed(1) + '%' : data
        })),
        scrollX: true, destroy: true,
        rowCallback: function(row, data) {
            const target = data['Target Harian'] ? String(data['Target Harian']).toLowerCase() : "";
            if (target.includes('kurang')) {
                $(row).find('td').css({ 'color': 'red', 'font-weight': 'bold' });
            }
        },
        initComplete: () => applyFilters() 
    });
}

function updateChart() { /* Logika chart tetap sama */ }
function applyFilters() { /* Logika filter tetap sama */ }
$('#fKec').change(function() { /* Logika filter tetap sama */ });
$('#fDesa').change(() => { applyFilters(); updateChart(); });
function resetFilters() { /* Logika reset tetap sama */ }
