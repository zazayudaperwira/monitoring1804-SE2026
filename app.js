// GANTI TAUTAN INI dengan URL Web App hasil Deploy Apps Script Anda nanti
const API_URL = "https://script.google.com/macros/s/AKfycbz...KODE_DEPLOY_ANDA.../exec";

let chartInstanceStatus = null;
let chartInstancePetugas = null;

$(document).ready(function() {
    fetchData();
});

async function fetchData() {
    try {
        const response = await fetch(API_URL);
        const jsonResult = await response.json();
        
        document.getElementById('loader').classList.add('hidden');
        document.getElementById('dashboardContent').classList.remove('hidden');
        
        // Atur penanda waktu update
        const sekarang = new Date();
        document.getElementById('txtLastUpdate').innerText = `Terakhir Sync: ${sekarang.toLocaleTimeString('id-ID')} WIB`;
        
        prosesDashboard(jsonResult);
    } catch (error) {
        console.error("Error fetching data:", error);
        document.getElementById('loader').innerHTML = `
            <p class="text-red-500 font-semibold">Gagal memuat data dari API.</p>
            <p class="text-xs text-slate-400">Pastikan URL Web App Apps Script sudah benar dan dideploy sebagai 'Anyone'.</p>
        `;
    }
}

function prosesDashboard(data) {
    let totalMuatan = 0, approved = 0, progress = 0, open = 0;
    let statusSummary = {};
    let petugasApproved = {};

    data.forEach(row => {
        let count = parseInt(row.count) || 0;
        let status = (row.status || '').toUpperCase().trim();
        let email = row.email || row.username || 'Tanpa Nama';

        totalMuatan += count;

        if (status === 'APPROVED BY PENGAWAS') {
            approved += count;
            petugasApproved[email] = (petugasApproved[email] || 0) + count;
        } else if (status === 'OPEN') {
            open += count;
        } else {
            progress += count;
        }

        statusSummary[row.status] = (statusSummary[row.status] || 0) + count;
    });

    // Update UI Card
    document.getElementById('cardTotalMuatan').innerText = totalMuatan.toLocaleString('id-ID');
    document.getElementById('cardApproved').innerText = approved.toLocaleString('id-ID');
    document.getElementById('cardProgress').innerText = progress.toLocaleString('id-ID');
    document.getElementById('cardOpen').innerText = open.toLocaleString('id-ID');

    // Chart Pie Status
    if (chartInstanceStatus) chartInstanceStatus.destroy();
    chartInstanceStatus = new Chart(document.getElementById('chartStatus').getContext('2d'), {
        type: 'doughnut',
        data: {
            labels: Object.keys(statusSummary),
            datasets: [{
                data: Object.values(statusSummary),
                backgroundColor: ['#f43f5e', '#f59e0b', '#3b82f6', '#10b981', '#6366f1', '#a855f7']
            }]
        },
        options: {
            responsive: true,
            plugins: { legend: { display: false } }
        }
    });

    // Chart Bar Petugas
    let sortedPetugas = Object.entries(petugasApproved).sort((a, b) => b[1] - a[1]).slice(0, 10);
    if (chartInstancePetugas) chartInstancePetugas.destroy();
    chartInstancePetugas = new Chart(document.getElementById('chartPetugas').getContext('2d'), {
        type: 'bar',
        data: {
            labels: sortedPetugas.map(x => x[0].split('@')[0]),
            datasets: [{ label: 'Approved', data: sortedPetugas.map(x => x[1]), backgroundColor: '#10b981', borderRadius: 6 }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: { y: { grid: { display: false } } }
        }
    });

    // Jalankan DataTable
    initDataTable(data);
}

function initDataTable(data) {
    if ($.fn.DataTable.isDataTable('#tableRaw')) {
        $('#tableRaw').DataTable().destroy();
        $('#tableRaw').empty();
    }

    const columnsHeader = Object.keys(data[0]).map(key => {
        return { title: key, data: key, defaultContent: "" };
    });

    $('#tableRaw').DataTable({
        data: data,
        columns: columnsHeader,
        dom: 'Bfrtip',
        buttons: [
            { extend: 'excelHtml5', title: 'Data_Monitoring', className: 'bg-emerald-600 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-emerald-700 transition' }
        ],
        pageLength: 10,
        language: { search: "Cari:", paginate: { next: "→", previous: "←" } }
    });
    $('.dt-button').減らせクラス; // Bersihkan default class button datatable
}
