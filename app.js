const API_URL = "https://script.google.com/macros/s/AKfycbz1jpNYNXD7EbyCWF1CKpC0JQOqJ9pq-rVEakMRAZMPEzwkW0Fe1ZCFX3FgiM1Gen3a/exec";
let globalData = {}, chartInstance = null;

const tableConfigs = {
    "Kecamatan": ["Kecamatan", "OPEN", "DRAFT", "SUBMITTED BY Pencacah", "REJECTED BY Pengawas", "APPROVED BY Pengawas", "REVOKED BY Pengawas", "SUBMITTED RESPONDENT", "EDITED BY Pengawas", "Only Open [SLS]", "PROGRES", "Target Harian", "Progres"],
    "Desa": ["Kecamatan", "Desa", "OPEN", "DRAFT", "SUBMITTED BY Pencacah", "REJECTED BY Pengawas", "APPROVED BY Pengawas", "REVOKED BY Pengawas", "SUBMITTED RESPONDENT", "EDITED BY Pengawas", "Only Open [SLS]", "Progres", "Target Harian"],
    "PETUGAS": ["Kecamatan", "PML", "PPL", "Pengawas - Email", "Pencacah - Email", "OPEN", "DRAFT", "SUBMITTED BY Pencacah", "REJECTED BY Pengawas", "APPROVED BY Pengawas", "REVOKED BY Pengawas", "SUBMITTED RESPONDENT", "EDITED BY Pengawas", "Only Open", "Persentase Progres", "Target Harian", "selain open", "Rank"],
    "SLS": ["idsubsls", "Kecamatan", "Desa", "jenis", "nmsls", "jumlah_kk", "jumlah_bstt", "jumlah_bsbtt", "jumlah_bsttk", "jumlah_bku", "jumlah_usaha", "jumlah_muatan", "dominan", "PML", "PPL", "Keterangan", "Pengawas - Email", "Pencacah - Email", "OPEN", "DRAFT", "SUBMITTED BY Pencacah", "REJECTED BY Pengawas", "APPROVED BY Pengawas", "REVOKED BY Pengawas", "SUBMITTED RESPONDENT", "EDITED BY Pengawas", "Only Open"]
};

$(document).ready(async () => {
    try {
        const res = await fetch(API_URL);
        globalData = await res.json();
        $('#loader').addClass('hidden');
        $('#dashboardContent').removeClass('hidden');
        
        updateKabSummary();
        buildWilayahDropdown();
        switchTab('Kecamatan');
    } catch (e) { console.error("Error Loading Data:", e); }
});

function updateKabSummary() {
    let kab = (globalData["Kecamatan"] || []).find(r => r["Kecamatan"]?.toLowerCase().includes("lampung timur"));
    if (kab) {
        $('#kabApproved').text(parseInt(kab["APPROVED BY Pengawas"] || 0).toLocaleString());
        let val = parseFloat(kab["PROGRES"] || 0);
        $('#kabProgres').text((val * 100).toFixed(2) + "%");
    }
}

function buildWilayahDropdown() {
    (globalData["Kecamatan"] || []).forEach(r => {
        if (r["Kecamatan"] && !r["Kecamatan"].toLowerCase().includes("lampung timur"))
            $('#filterWilayah').append(`<option value="${r["Kecamatan"]}">${r["Kecamatan"]}</option>`);
    });
}

function switchTab(tab) {
    $('.tab-btn').removeClass('bg-blue-600 text-white').addClass('text-slate-600');
    $(`#btn-${tab}`).addClass('bg-blue-600 text-white');
    
    if ($.fn.DataTable.isDataTable('#mainDataTable')) $('#mainDataTable').DataTable().destroy();
    
    let data = (globalData[tab] || []).filter(r => !r["Kecamatan"]?.toLowerCase().includes("lampung timur"));
    $('#mainDataTable').DataTable({
        data: data,
        columns: tableConfigs[tab].map(k => ({ title: k, data: k })),
        scrollX: true, dom: 'Bfrtip', buttons: ['excel']
    });
    updateChart();
}

function updateChart() {
    if (chartInstance) chartInstance.destroy();
    let filter = $('#filterWilayah').val();
    let data = (globalData["Kecamatan"] || []).filter(r => !filter || r["Kecamatan"] === filter);
    
    chartInstance = new Chart(document.getElementById('progressChart').getContext('2d'), {
        type: 'bar',
        data: { labels: data.map(r => r["Kecamatan"]), datasets: [{ label: 'OPEN', data: data.map(r => r["OPEN"]), backgroundColor: '#2563eb' }] }
    });
}

$('#filterWilayah').change(updateChart);
