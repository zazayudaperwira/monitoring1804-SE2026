// JANGAN LUPA: Tempelkan URL Web App hasil deploy Apps Script Anda di bawah ini
const API_URL = "https://script.google.com/macros/s/AKfycbyjR0UNurdTpe4IHZ5NRndhR2XEpmQ3F2a_wiu6hIbPLRlKZz54DvOsp8MM-aEprpCnxg/exec";

let chartInstanceStatus = null;
let chartInstancePetugas = null;

$(document).ready(function() {
    fetchData();
});

async function fetchData() {
    try {
        const response = await fetch(API_URL, { method: 'GET', redirect: 'follow' });
        const jsonResult = await response.json();
        
        document.getElementById('loader').classList.add('hidden');
        document.getElementById('dashboardContent').classList.remove('hidden');
        
        const timestamp = new Date();
        document.getElementById('txtLastUpdate').innerText = `Terakhir Sinkron: ${timestamp.toLocaleTimeString('id-ID')} WIB`;
        
        renderDashboard(jsonResult);
    } catch (error) {
        console.error("Fetch Error:", error);
        document.getElementById('loader').innerHTML = `
            <div class="p-4 text-center">
                <p class="text-red-500 font-bold text-sm">Koneksi API Terputus atau Bermasalah</p>
                <p class="text-xs text-slate-400 mt-1">Harap pastikan skrip dideploy menggunakan tipe 'New Version' dan akses disetel ke 'Anyone'.</p>
            </div>
        `;
    }
}

function renderDashboard(data) {
    let totalBeban = 0, approved = 0, progress = 0, open = 0;
    let statusSummary = {};
    let pplPerformance = {};

    data.forEach(row => {
        let count = parseInt(row.count) || 0;
        let status = (row.status || '').toUpperCase().trim();
        let pplName = row.PPL || 'Tanpa Nama';

        totalBeban += count;

        if (status === 'APPROVED BY PENGAWAS') {
            approved += count;
            pplPerformance[pplName] = (pplPerformance[pplName] || 0) + count;
        } else if (status === 'OPEN') {
            open += count;
        } else {
            progress += count;
        }

        statusSummary[row.status] = (statusSummary[row.status] || 0) + count;
    });

    // Pasang Nilai Angka Makro
    document.getElementById('cardTotalMuatan').innerText = totalBeban.toLocaleString('id-ID');
    document.getElementById('cardApproved').innerText = approved.toLocaleString('id-ID');
    document.getElementById('cardProgress').innerText = progress.toLocaleString('id-ID');
    document.getElementById('cardOpen').innerText = open.toLocaleString('id-ID');

    // Chart Komposisi Status Dokumen
    if (chartInstanceStatus) chartInstanceStatus.destroy();
    chartInstanceStatus = new Chart(document.getElementById('chartStatus').getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(statusSummary),
            datasets: [{
                data: Object.values(statusSummary),
                backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981', '#6366f1', '#ec4899']
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } }
        }
    });

    // Chart Top 10 PPL
    let topPpl = Object.entries(pplPerformance).sort((a, b) => b[1] - a[1]).slice(0, 10);
    if (chartInstancePetugas) chartInstancePetugas.destroy();
    chartInstancePetugas = new Chart(document.getElementById('chartPetugas').getContext('2d'), {
        type: 'bar',
        data: {
            labels: topPpl.map(item => item[0].replace(/\[.*?\]\s*/g, '')), // Bersihkan format ID [1804...] dari nama petugas agar rapi
            datasets: [{
                label: 'Dokumen Disetujui (Approved)',
                data: topPpl.map(item => item[1]),
                backgroundColor: '#10b981',
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { grid: { display: false }, ticks: { font: { size: 10 } } },
                y: { beginAtZero: true }
            },
            plugins: { legend: { display: false } }
        }
    });

    // Eksekusi Pembuatan DataTable
    buildDataTable(data);
}

function buildDataTable(data) {
    if ($.fn.DataTable.isDataTable('#tableRaw')) {
        $('#tableRaw').DataTable().destroy();
        $('#tableRaw').empty();
    }

    // Tentukan urutan kolom yang ideal untuk ditampilan di baris terdepan tabel
    const preferredOrder = ["Kecamatan", "Desa", "Nama_SLS", "PPL", "PML", "status", "count", "regionCode", "email"];
    
    // Gabungkan seluruh key yang ada secara dinamis
    let allKeys = Object.keys(data[0]);
    let structuralColumns = preferredOrder.filter(k => allKeys.includes(k));
    allKeys.forEach(k => {
        if (!structuralColumns.includes(k)) structuralColumns.push(k);
    });

    const dataTablesConfig = structuralColumns.map(key => {
        return { title: key.replace('_', ' '), data: key, defaultContent: "-" };
    });

    $('#tableRaw').DataTable({
        data: data,
        columns: dataTablesConfig,
        dom: 'Bfrtip',
        buttons: [
            { 
                extend: 'excelHtml5', 
                title: 'Data_Monitoring_1804_Joined', 
                className: 'bg-emerald-600 text-white font-medium text-xs px-3.5 py-2 rounded-lg hover:bg-emerald-700 transition shadow-sm' 
            }
        ],
        pageLength: 10,
        order: [[5, "desc"]], // Mengurutkan otomatis berdasarkan status
        language: {
            search: "Cari data gabungan:",
            lengthMenu: "Tampilkan _MENU_ data",
            info: "Menampilkan _START_ sampai _END_ dari _TOTAL_ entri",
            paginate: { next: "→", previous: "←" }
        }
    });
    
    $('.dt-button').removeClass('dt-button');
}
