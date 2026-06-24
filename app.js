const API_URL = "https://script.google.com/macros/s/AKfycbz1jpNYNXD7EbyCWF1CKpC0JQOqJ9pq-rVEakMRAZMPEzwkW0Fe1ZCFX3FgiM1Gen3a/exec";
let globalData = {}, currentTab = "Kecamatan", chartInstance = null;

$(document).ready(async () => {
    const res = await fetch(API_URL);
    globalData = await res.json();
    document.getElementById('loader').classList.add('hidden');
    document.getElementById('dashboardContent').classList.remove('hidden');
    
    renderKabupaten();
    buildDropdown();
    renderTable("Kecamatan");
});

function renderKabupaten() {
    // Cari baris Lampung Timur atau ambil rata-rata
    const data = globalData["Kecamatan"] || [];
    const kab = data.find(r => r["Kecamatan"]?.toLowerCase().includes("lampung timur"));
    if (kab) {
        let val = parseFloat(kab["Progres"]);
        document.getElementById('kabProgres').innerText = (val * 100).toFixed(2) + "%";
    }
}

function buildDropdown() {
    const select = $('#filterWilayah');
    (globalData["Kecamatan"] || []).forEach(r => {
        if(r["Kecamatan"] && !r["Kecamatan"].toLowerCase().includes("lampung timur")) 
            select.append(`<option value="${r["Kecamatan"]}">${r["Kecamatan"]}</option>`);
    });
}

function renderTable(tab) {
    currentTab = tab;
    if ($.fn.DataTable.isDataTable('#mainDataTable')) $('#mainDataTable').DataTable().destroy();
    
    let data = globalData[tab] || [];
    let cols = Object.keys(data[0] || {}).map(k => ({ title: k, data: k }));

    $('#mainDataTable').DataTable({
        data: data,
        columns: cols,
        scrollX: true,
        createdRow: (row, data) => {
            let app = parseInt(data["APPROVED BY Pengawas"]) || 0;
            let open = parseInt(data["OPEN"]) || 0;
            if ((app + open) > 0 && (app/(app+open)) < 0.2) $(row).addClass('bg-red-50');
        }
    });
}

$('#filterWilayah, #filterAssignment').change(() => {
    let table = $('#mainDataTable').DataTable();
    let val = $('#filterWilayah').val();
    table.column(0).search(val ? '^'+val+'$' : '', true, false).draw();
    renderChart(val);
});

function renderChart(wilayah) {
    if (chartInstance) chartInstance.destroy();
    let data = (globalData[currentTab] || []).filter(r => !wilayah || r["Kecamatan"] === wilayah);
    
    const ctx = document.getElementById('progressChart').getContext('2d');
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(r => r["Kecamatan"] || r["Desa"] || r["PPL"]),
            datasets: [{ label: 'OPEN', data: data.map(r => r["OPEN"]), backgroundColor: 'red' }]
        }
    });
}
