const API = "https://script.google.com/macros/s/AKfycbw5gYyAM9v5JxW_70_TeBOyGB1yIAfqixzUgUp98BXPG50LNNQdz9Pr5uHrk_pXzRy4-A/exec";
let allData = {};
let chart = null;
const STATUS_COLS = ["OPEN", "DRAFT", "SUBMITTED BY Pencacah", "REJECTED BY Pengawas", "APPROVED BY Pengawas", "REVOKED BY Pengawas", "SUBMITTED RESPONDENT", "EDITED BY Pengawas"];

$(document).ready(function() {
    fetch(API).then(res => res.json()).then(res => {
        allData = res.data;
        const kabData = allData.Kecamatan.find(d => d.Kecamatan === "Lampung Timur");
        const prog = kabData ? (parseFloat(kabData.Progres) * 100 || 0) : 0;
        $('#kabProgres').text(prog.toFixed(1) + "%");
        $('#updateInfo').text("Update: " + res.metadata.update);
        
        [...new Set(allData.Kecamatan.map(d => d.Kecamatan))].forEach(k => $('#fKec').append(`<option value="${k}">${k}</option>`));
        renderRanking();
        switchTab('Kecamatan');
        updateChart();
    });
});

function renderRanking() {
    let sorted = [...allData.PETUGAS].sort((a,b) => b.Progres - a.Progres);
    let top = sorted.slice(0, 10);
    let bot = sorted.slice(-10).reverse();
    let h = `<div class="text-emerald-600 font-bold mb-2">🚀 TOP 10</div>`;
    top.forEach(p => h += `<div class="flex justify-between p-1 border-b"><span>${p.Petugas}</span><span class="font-bold">${(p.Progres*100).toFixed(1)}%</span></div>`);
    h += `<div class="text-red-600 font-bold mt-4 mb-2">📉 BOTTOM 10</div>`;
    bot.forEach(p => h += `<div class="flex justify-between p-1 border-b"><span>${p.Petugas}</span><span class="font-bold">${(p.Progres*100).toFixed(1)}%</span></div>`);
    $('#rankingPetugas').html(h);
}

function switchTab(sheet) {
    $('.tab-btn').removeClass('bg-orange-600 text-white').addClass('bg-slate-100');
    $(`button[onclick="switchTab('${sheet}')"]`).addClass('bg-orange-600 text-white').removeClass('bg-slate-100');
    if ($.fn.DataTable.isDataTable('#mainTable')) $('#mainTable').DataTable().destroy();
    
    $('#mainTable').DataTable({
        data: allData[sheet],
        columns: Object.keys(allData[sheet][0]).map(k => ({
            title: k, data: k,
            render: (v) => (k.toLowerCase().includes('progres') && typeof v === 'number') ? (v*100).toFixed(1)+'%' : v
        })),
        rowCallback: (row, data) => {
            if (data['Target Harian'] && String(data['Target Harian']).toLowerCase().includes('kurang')) {
                $(row).find('td').css('color', 'red');
            }
        }
    });
}

function updateChart() {
    // Logika Chart Drilldown sama seperti sebelumnya...
}

$('#fKec').change(function() {
    $('#fDesa').html('<option value="">Semua Desa</option>');
    allData.Desa.filter(d => d.Kecamatan === $(this).val()).forEach(d => $('#fDesa').append(`<option value="${d.Desa}">${d.Desa}</option>`));
    updateChart();
});

function resetFilters() { location.reload(); }
