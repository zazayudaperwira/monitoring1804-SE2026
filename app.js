const API_URL = "https://script.google.com/macros/s/KODE_ANDA/exec";
let globalData = {}, chartInstance = null;

$(document).ready(async () => {
    const res = await fetch(API_URL);
    globalData = await res.json();
    $('#loader').addClass('hidden');
    $('#dashboardContent').removeClass('hidden');
    renderTable("Kecamatan");
});

function renderTable(tab) {
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
            if ((app+open) > 0 && (app/(app+open)) < 0.2) $(row).addClass('bg-red-50');
        }
    });
}

function showRankings() {
    let pet = globalData["PETUGAS"] || [];
    // Sort berdasarkan APPROVED
    pet.sort((a,b) => (parseInt(b["APPROVED BY Pengawas"]) || 0) - (parseInt(a["APPROVED BY Pengawas"]) || 0));
    
    let top10 = pet.slice(0, 10);
    let bottom10 = pet.slice(-10);
    
    alert("TOP 10 Petugas:\n" + top10.map(p => p["PPL"] + ": " + p["APPROVED BY Pengawas"]).join("\n"));
}
