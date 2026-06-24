const API_URL = "https://script.google.com/macros/s/AKfycbyG5sC5JFMHSr0725mGPPVQDDjQQswm9sjDQPXzvXI_HnA8oMLS-5JhbSLNyBze06C1vA/exec";
let allData = {};

async function fetchData() {
    const res = await fetch(API_URL);
    allData = await res.json();
    renderDashboard();
    changeTab('Kecamatan');
}

function renderDashboard() {
    const kab = allData["Kecamatan"].find(r => r["Kecamatan"]?.includes("Lampung Timur"));
    if (kab) {
        $('#totalProgres').text((parseFloat(kab["PROGRES"] || 0) * 100).toFixed(2) + "%");
        
        // Setup Chart
        const ctx = document.getElementById('statusChart').getContext('2d');
        new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: ['OPEN', 'DRAFT', 'SUBMITTED', 'REJECTED', 'APPROVED'],
                datasets: [{
                    data: [kab["OPEN"], kab["DRAFT"], kab["SUBMITTED BY Pencacah"], kab["REJECTED BY Pengawas"], kab["APPROVED BY Pengawas"]],
                    backgroundColor: ['#fb923c', '#f97316', '#ea580c', '#c2410c', '#9a3412']
                }]
            }
        });
    }
}

function changeTab(sheetName) {
    $('.tab-btn').removeClass('bg-orange-600 text-white').addClass('bg-orange-100 text-orange-700');
    $(`button[onclick="changeTab('${sheetName}')"]`).removeClass('bg-orange-100 text-orange-700').addClass('bg-orange-600 text-white');

    const data = allData[sheetName];
    if ($.fn.DataTable.isDataTable('#mainDataTable')) $('#mainDataTable').DataTable().destroy();
    
    $('#mainDataTable').DataTable({
        data: data,
        columns: Object.keys(data[0]).map(k => ({ title: k, data: k })),
        scrollX: true,
        destroy: true
    });
}

$(document).ready(fetchData);
