const API_URL = "https://script.google.com/macros/s/AKfycbyPob9uO9sS1Ssg0jw2yPBpPhjiSVoRRVT_NVPwQQcblbIYTkaOjtyicf528rpQt08hBw/exec";
let allData = {};

$(document).ready(async () => {
    allData = await (await fetch(API_URL)).json();
    initDashboard();
});

function initDashboard() {
    // 1. Summary Kabupaten
    const kab = allData["Kecamatan"].find(r => r["Kecamatan"]?.includes("Lampung Timur"));
    $('#totalProgres').text(kab ? (parseFloat(kab["PROGRES"])*100).toFixed(2) + "%" : "0%");

    // 2. Grafik Status (Donut Chart)
    const statusLabels = ['OPEN', 'DRAFT', 'SUBMITTED BY Pencacah', 'REJECTED BY Pengawas', 'APPROVED BY Pengawas'];
    new Chart(document.getElementById('statusChart'), {
        type: 'doughnut',
        data: {
            labels: statusLabels,
            datasets: [{
                data: statusLabels.map(s => kab[s] || 0),
                backgroundColor: ['#fb923c', '#f97316', '#ea580c', '#c2410c', '#9a3412']
            }]
        }
    });

    loadTable('Kecamatan');
}

function loadTable(sheet) {
    if ($.fn.DataTable.isDataTable('#mainDataTable')) $('#mainDataTable').DataTable().destroy();
    
    const data = allData[sheet];
    $('#mainDataTable').DataTable({
        data: data,
        columns: Object.keys(data[0]).map(k => ({ title: k, data: k })),
        scrollX: true,
        pageLength: 10
    });
}
