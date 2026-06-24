// MASUKKAN URL WEB APP EXEC BARU ANDA DI SINI
const API_URL = "https://script.google.com/macros/s/AKfycbxH-76Z7fMlqJHNjvbB2lsn3HTJV_IKWZ0sf8bGVpTEzlroDT2GaW-Fd9sDDTVUdtvasw/exec";

let globalData = {};
let currentTab = "Kecamatan";
let chartInstance = null;

// Daftar Status Utama yang akan dibaca untuk Grafik Stacked
const targetStatus = [
    "OPEN", "DRAFT", "SUBMITTED BY Pencacah", "REJECTED BY Pengawas", 
    "APPROVED BY Pengawas", "REVOKED BY Pengawas", "SUBMITTED RESPONDENT", "EDITED BY Pengawas"
];

const statusColors = {
    "OPEN": "#ef4444", "DRAFT": "#f59e0b", "SUBMITTED BY Pencacah": "#3b82f6", "REJECTED BY Pengawas": "#ec4899",
    "APPROVED BY Pengawas": "#10b981", "REVOKED BY Pengawas": "#64748b", "SUBMITTED RESPONDENT": "#8b5cf6", "EDITED BY Pengawas": "#06b6d4"
};

$(document).ready(function() {
    loadAllSheetsData();
    $('#filterChartSource').change(function() {
        renderStackedChart($(this).val());
    });
});

async function loadAllSheetsData() {
    try {
        const response = await fetch(API_URL, { method: 'GET', redirect: 'follow' });
        globalData = await response.json();
        
        document.getElementById('loader').classList.add('hidden');
        document.getElementById('dashboardContent').classList.remove('hidden');
        
        const time = new Date();
        document.getElementById('txtLastUpdate').innerText = `Sync: ${time.toLocaleTimeString('id-ID')} WIB`;
        
        switchTab("Kecamatan");
        renderStackedChart("Kecamatan");
    } catch (e) {
        console.error(e);
        document.getElementById('loader').innerHTML = `<p class="p-4 text-xs font-bold text-red-500">Koneksi API Gagal. Cek kembali deploy Apps Script Anda.</p>`;
    }
}

function switchTab(tabName) {
    currentTab = tabName;
    
    $('.tab-btn').removeClass('bg-blue-600 text-white shadow-sm').addClass('text-slate-600 hover:bg-slate-200');
    $(`#btn-${tabName}`).removeClass('text-slate-600 hover:bg-slate-200').addClass('bg-blue-600 text-white shadow-sm');
    
    const dataSheet = globalData[tabName] || [];
    if (dataSheet.length === 0) return;

    if ($.fn.DataTable.isDataTable('#mainDataTable')) {
        $('#mainDataTable').DataTable().destroy();
        $('#mainDataTable').empty();
    }

    // MEMBUAT KOLOM OTOMATIS: Mengikuti nama kolom asli dari Google Sheets tanpa hardcode
    const columnsConfig = Object.keys(dataSheet[0]).map(key => {
        return { 
            title: key, 
            data: key, 
            defaultContent: "-",
            render: function(data, type, row) {
                // Jika data berupa angka, format dengan titik sebagai ribuan agar rapi
                if (type === 'display' && !isNaN(data) && data !== "" && data !== null && key !== "idsubsls") {
                    return Number(data).toLocaleString('id-ID');
                }
                return data;
            }
        };
    });

    $('#mainDataTable').DataTable({
        data: dataSheet,
        columns: columnsConfig,
        dom: 'Bfrtip',
        buttons: [
            { extend: 'excelHtml5', title: `Data_Monitoring_${tabName}`, className: 'bg-emerald-600 text-white text-xs px-3.5 py-2 rounded-lg hover:bg-emerald-700 font-medium transition' }
        ],
        pageLength: 15,
        scrollX: true, // Berikan scroll horizontal jika kolom terlalu lebar
        language: { search: "Cari data:", paginate: { next: "→", previous: "←" } }
    });
    $('.dt-button').removeClass('dt-button');
}

function renderStackedChart(sourceKey) {
    const rawData = globalData[sourceKey] || [];
    if(rawData.length === 0) return;

    // Tentukan sumbu X dinamis berdasarkan sheet yang dipilih
    let labelColumn = Object.keys(rawData[0])[0]; // Default ambil kolom pertama
    if (sourceKey === "Kecamatan") labelColumn = "Kecamatan";
    if (sourceKey === "Desa") labelColumn = "Desa";
    if (sourceKey === "PETUGAS") labelColumn = "PPL";

    // Ambil maksimal 15 baris data teratas agar visualisasi tidak terlalu rapat
    const sliceData = rawData.slice(0, 15);
    const labelsX = sliceData.map(row => (row[labelColumn] || 'Unknown').toString().replace(/\[.*?\]\s*/g, ''));

    const datasets = targetStatus.map(status => {
        return {
            label: status,
            data: sliceData.map(row => parseInt(row[status]) || 0),
            backgroundColor: statusColors[status] || '#cbd5e1'
        };
    });

    if (chartInstance) chartInstance.destroy();

    const ctx = document.getElementById('progressChart').getContext('2d');
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labelsX,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { stacked: true, ticks: { font: { size: 9 } } },
                y: { stacked: true, beginAtZero: true }
            },
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 9 } } }
            }
        }
    });
}
