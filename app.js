// ISI DENGAN URL WEB APP SKRIP ANDA
const API_URL = "https://script.google.com/macros/s/AKfycbxik13DIgSNWMTkUQuS9_uVkIh1vCxNsNG1cOqkKu8CxEQa2Lnkv-MHSLlgskELqzv4Fg/exec";

let globalData = {};
let currentTab = "Kecamatan";
let chartInstance = null;

// Daftar Status Utama yang Mau Dilihat di Grafik
const targetStatus = [
    "OPEN", "DRAFT", "SUBMITTED BY Pencacah", "REJECTED BY Pengawas", 
    "APPROVED BY Pengawas", "REVOKED BY Pengawas", "SUBMITTED RESPONDENT", "EDITED BY Pengawas"
];

// Map Warna untuk Masing-masing Status di Grafik Stacked
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
        
        // Render Awal Halaman & Grafik
        switchTab("Kecamatan");
        renderStackedChart("Kecamatan");
    } catch (e) {
        console.error(e);
        document.getElementById('loader').innerHTML = `<p class="p-4 text-xs font-bold text-red-500">Koneksi API Gagal. Cek Deploy Apps Script Anda.</p>`;
    }
}

function switchTab(tabName) {
    currentTab = tabName;
    
    // Ubah Aktif Desain Tombol Tab
    $('.tab-btn').removeClass('bg-blue-600 text-white shadow-sm').addClass('text-slate-600 hover:bg-slate-200');
    $(`#btn-${tabName}`).removeClass('text-slate-600 hover:bg-slate-200').addClass('bg-blue-600 text-white shadow-sm');
    
    const dataSheet = globalData[tabName] || [];
    if (dataSheet.length === 0) return;

    // Bersihkan Datatable Sebelumnya
    if ($.fn.DataTable.isDataTable('#mainDataTable')) {
        $('#mainDataTable').DataTable().destroy();
        $('#mainDataTable').empty();
    }

    // Ambil Header secara Dinamis dari baris pertama objek JSON sheet bersangkutan
    const columnsConfig = Object.keys(dataSheet[0]).map(key => {
        return { title: key, data: key, defaultContent: "-" };
    });

    // Inisialisasi Ulang DataTable Lengkap dengan Fitur Download Excel
    $('#mainDataTable').DataTable({
        data: dataSheet,
        columns: columnsConfig,
        dom: 'Bfrtip',
        buttons: [
            { extend: 'excelHtml5', title: `Data_Monitoring_${tabName}`, className: 'bg-emerald-600 text-white text-xs px-3.5 py-2 rounded-lg hover:bg-emerald-700 font-medium transition' }
        ],
        pageLength: 15,
        language: { search: "Cari data di halaman ini:", paginate: { next: "→", previous: "←" } }
    });
    $('.dt-button').removeClass('dt-button');
}

function renderStackedChart(sourceKey) {
    const rawData = globalData[sourceKey] || [];
    if(rawData.length === 0) return;

    // Tentukan kolom label sumbu X berdasarkan sheet
    let labelColumn = "Kecamatan";
    if (sourceKey === "Desa") labelColumn = "Desa";
    if (sourceKey === "PETUGAS") labelColumn = "PPL";

    // Ambil maksimal 15 data teratas saja agar grafik tidak menumpuk padat di layar
    const sliceData = rawData.slice(0, 15);
    const labelsX = sliceData.map(row => (row[labelColumn] || 'Unknown').toString().replace(/\[.*?\]\s*/g, ''));

    // Bentuk Struktur Dataset untuk Grafik Berkelompok (Stacked Bar)
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
