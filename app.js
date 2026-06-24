// MASUKKAN URL WEB APP EXEC BARU ANDA DI SINI
const API_URL = "https://script.google.com/macros/s/AKfycbyj21A-KOVdCL5RMLjKwEnqg79VpHvUqLzNdIJBVMr5g-xJ7OHWtb9yfZEd3HzQDPphTg/exec";


let globalData = {};
let currentTab = "Kecamatan";
let chartInstance = null;

// Daftar Status Utama untuk Mapping Grafik
const targetStatus = [
    "OPEN", "DRAFT", "SUBMITTED BY Pencacah", "REJECTED BY Pengawas", 
    "APPROVED BY Pengawas", "REVOKED BY Pengawas", "SUBMITTED RESPONDENT", "EDITED BY Pengawas"
];

const statusColors = {
    "OPEN": "#ef4444", "DRAFT": "#f59e0b", "SUBMITTED BY Pencacah": "#3b82f6", "REJECTED BY Pengawas": "#ec4899",
    "APPROVED BY Pengawas": "#10b981", "REVOKED BY Pengawas": "#64748b", "SUBMITTED RESPONDENT": "#8b5cf6", "EDITED BY Pengawas": "#06b6d4"
};

// STRUKTUR MATRIKS KOLOM HARDCODE (Mencegah Acak-acakan)
const tableColumnsDefinition = {
    "Kecamatan": [
        "Kecamatan", "OPEN", "DRAFT", "SUBMITTED BY Pencacah", "REJECTED BY Pengawas",
        "APPROVED BY Pengawas", "REVOKED BY Pengawas", "SUBMITTED RESPONDENT", "EDITED BY Pengawas",
        "Only Open [SLS]", "PROGRES", "Target Harian", "23-06-2026", "16.88%"
    ],
    "Desa": [
        "Kecamatan", "Desa", "OPEN", "DRAFT", "SUBMITTED BY Pencacah", "REJECTED BY Pengawas",
        "APPROVED BY Pengawas", "REVOKED BY Pengawas", "SUBMITTED RESPONDENT", "EDITED BY Pengawas",
        "Only Open [SLS]", "Progres"
    ],
    "PETUGAS": [
        "Kecamatan", "PML", "PPL", "Pengawas - Email", "Pencacah - Email", "OPEN", "DRAFT",
        "SUBMITTED BY Pencacah", "REJECTED BY Pengawas", "APPROVED BY Pengawas", "REVOKED BY Pengawas",
        "SUBMITTED RESPONDENT", "EDITED BY Pengawas", "Only Open", "Persentase Progres",
        "Target Harian", "23-06-2026", "16.88%", "selain open", "Rank"
    ],
    "SLS": [
        "idsubsls", "Kecamatan", "Desa", "jenis", "nmsls", "jumlah_kk", "jumlah_bstt", "jumlah_bsbtt",
        "jumlah_bsttk", "jumlah_bku", "jumlah_usaha", "jumlah_muatan", "dominan", "PML", "PPL",
        "Keterangan", "Pengawas - Email", "Pencacah - Email", "OPEN", "DRAFT", "SUBMITTED BY Pencacah",
        "REJECTED BY Pengawas", "APPROVED BY Pengawas", "REVOKED BY Pengawas", "SUBMITTED RESPONDENT",
        "EDITED BY Pengawas", "Only Open"
    ]
};

$(document).ready(function() {
    loadDashboardSystem();
    
    // Trigger Filter Global
    $('#filterWilayah, #filterAssignment').change(function() {
        executeGlobalFilters();
    });
});

async function loadDashboardSystem() {
    try {
        const response = await fetch(API_URL, { method: 'GET', redirect: 'follow' });
        globalData = await response.json();
        
        document.getElementById('loader').classList.add('hidden');
        document.getElementById('dashboardContent').classList.remove('hidden');
        
        const time = new Date();
        document.getElementById('txtLastUpdate').innerText = `Sync: ${time.toLocaleTimeString('id-ID')} WIB`;
        
        renderKabupatenSummary();
        buildWilayahDropdown();
        switchTab("Kecamatan");
    } catch (e) {
        console.error(e);
        document.getElementById('loader').innerHTML = `<p class="p-4 text-xs font-bold text-red-500">Koneksi Gagal. Cek setting Web App Apps Script Anda.</p>`;
    }
}

function renderKabupatenSummary() {
    const kecData = globalData["Kecamatan"] || [];
    const kabRow = kecData.find(r => Object.values(r).some(v => v.toString().toLowerCase().includes("lampung timur")));
    if (kabRow) {
        document.getElementById('kabApproved').innerText = (parseInt(kabRow["APPROVED BY Pengawas"]) || 0).toLocaleString('id-ID');
        document.getElementById('kabProgres').innerText = kabRow["PROGRES"] || kabRow["Progres"] || "0%";
    }
}

function buildWilayahDropdown() {
    const kecData = globalData["Kecamatan"] || [];
    const select = $('#filterWilayah');
    select.find('option:not(:first)').remove();
    
    kecData.forEach(row => {
        let val = row["Kecamatan"];
        if (val && !val.toLowerCase().includes("lampung timur")) {
            select.append(`<option value="${val}">${val}</option>`);
        }
    });
}

function switchTab(tabName) {
    currentTab = tabName;
    
    $('.tab-btn').removeClass('bg-blue-600 text-white shadow-sm').addClass('text-slate-600 hover:bg-slate-200');
    $(`#btn-${tabName}`).removeClass('text-slate-600 hover:bg-slate-200').addClass('bg-blue-600 text-white shadow-sm');
    
    buildDataTableStructure();
}

function buildDataTableStructure() {
    let rawSheetData = globalData[currentTab] || [];
    const allowedColumns = tableColumnsDefinition[currentTab];

    if ($.fn.DataTable.isDataTable('#mainDataTable')) {
        $('#mainDataTable').DataTable().destroy();
        $('#mainDataTable').empty();
    }

    if (rawSheetData.length === 0) return;

    // Bersihkan row Kabupaten Lampung Timur agar tidak mengotori list tabel utama
    rawSheetData = rawSheetData.filter(r => {
        let firstVal = Object.values(r)[0] || "";
        return !firstVal.toString().toLowerCase().includes("lampung timur");
    });

    // Petakan Kolom Berdasarkan Urutan Hardcode
    const columnsConfig = allowedColumns.map(colName => {
        return {
            title: colName,
            data: colName,
            defaultContent: "",
            render: function(data, type, row) {
                if (data === undefined || data === null) return "";
                
                // Format Persentase
                if (colName.toLowerCase().includes("progres") || colName === "16.88%") {
                    if (!isNaN(data) && data !== "") {
                        return (parseFloat(data) * (data <= 1 ? 100 : 1)).toFixed(2) + "%";
                    }
                    return data;
                }
                // Format Angka Ribuan
                if (type === 'display' && !isNaN(data) && data !== "" && colName !== "idsubsls" && !colName.toLowerCase().includes("date") && !colName.toLowerCase().includes("rank")) {
                    return Number(data).toLocaleString('id-ID');
                }
                return data;
            }
        };
    });

    $('#mainDataTable').DataTable({
        data: rawSheetData,
        columns: columnsConfig,
        dom: 'Bfrtip',
        buttons: [
            { extend: 'excelHtml5', title: `Data_${currentTab}`, className: 'bg-emerald-600 text-white text-[11px] px-3 py-1.5 rounded hover:bg-emerald-700 font-medium transition' }
        ],
        pageLength: 10,
        scrollX: true,
        createdRow: function(row, data, dataIndex) {
            // CONDITIONAL FORMATTING JIKA APPROVED MASIH RENDAH
            let app = parseInt(data["APPROVED BY Pengawas"]) || 0;
            let open = parseInt(data["OPEN"]) || 0;
            let total = app + open;
            if (total > 0 && (app / total) < 0.2) {
                $(row).addClass('bg-red-50');
            } else if (total > 0 && (app / total) >= 0.8) {
                $(row).addClass('bg-emerald-50/60');
            }
        }
    });

    $('.dt-button').removeClass('dt-button');
    executeGlobalFilters();
}

function executeGlobalFilters() {
    const table = $('#mainDataTable').DataTable();
    let wilayah = $('#filterWilayah').val();
    
    // 1. Filter Kolom Wilayah Kecamatan di Tabel
    table.columns().search('');
    if (wilayah) {
        let idxKec = tableColumnsDefinition[currentTab].indexOf("Kecamatan");
        if (idxKec !== -1) table.column(idxKec).search('^' + wilayah + '$', true, false);
    }
    table.draw();

    // 2. Filter Sisi Grafik Berdasarkan Hasil Filter Wilayah & Status Assignment
    renderDinamisChart(wilayah);
}

function renderDinamisChart(wilayahSelected) {
    let rawSheetData = globalData[currentTab] || [];
    let statusSelected = $('#filterAssignment').val();

    // Buang row total kabupaten
    let filtered = rawSheetData.filter(r => {
        let firstVal = Object.values(r)[0] || "";
        return !firstVal.toString().toLowerCase().includes("lampung timur");
    });

    // Saring data berdasarkan filter wilayah yang aktif
    if (wilayahSelected) {
        filtered = filtered.filter(r => r["Kecamatan"] === wilayahSelected);
    }

    // Tentukan sumbu X sumbu Utama
    let labelKey = "Kecamatan";
    if (currentTab === "Desa") labelKey = "Desa";
    if (currentTab === "PETUGAS") labelKey = "PPL";
    if (currentTab === "SLS") labelKey = "nmsls";

    // Limit tampilan grafik max 15 item teratas agar rapi
    let sliceData = filtered.slice(0, 15);
    let labelsX = sliceData.map(r => (r[labelKey] || 'Unknown').toString().replace(/\[.*?\]\s*/g, ''));

    // Siapkan Dataset Grafik Stacked
    let datasets = [];
    
    if (statusSelected) {
        // Jika filter assignment dipilih, hanya tampilkan 1 bar status tersebut
        datasets = [{
            label: statusSelected,
            data: sliceData.map(r => parseInt(r[statusSelected]) || 0),
            backgroundColor: statusColors[statusSelected] || '#3b82f6'
        }];
    } else {
        // Jika kosong, tampilkan sebaran ke-8 status bertumpuk (stacked)
        datasets = targetStatus.map(status => {
            return {
                label: status,
                data: sliceData.map(r => parseInt(r[status]) || 0),
                backgroundColor: statusColors[status] || '#cbd5e1'
            };
        });
    }

    if (chartInstance) chartInstance.destroy();

    const ctx = document.getElementById('progressChart').getContext('2d');
    chartInstance = new Chart(ctx, {
        type: 'bar',
        data: { labels: labelsX, datasets: datasets },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: { stacked: true, ticks: { font: { size: 9 } } },
                y: { stacked: true, beginAtZero: true }
            },
            plugins: {
                legend: { position: 'bottom', labels: { boxWidth: 8, font: { size: 8 } } }
            }
        }
    });
}
