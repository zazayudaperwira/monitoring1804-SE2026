const API_URL = "https://script.google.com/macros/s/AKfycbyj21A-KOVdCL5RMLjKwEnqg79VpHvUqLzNdIJBVMr5g-xJ7OHWtb9yfZEd3HzQDPphTg/exec";


let globalData = {};
let currentTab = "Kecamatan";
let chartInstance = null;

const targetStatus = [
    "OPEN", "DRAFT", "SUBMITTED BY Pencacah", "REJECTED BY Pengawas", 
    "APPROVED BY Pengawas", "REVOKED BY Pengawas", "SUBMITTED RESPONDENT", "EDITED BY Pengawas"
];

const statusColors = {
    "OPEN": "#ef4444", "DRAFT": "#f59e0b", "SUBMITTED BY Pencacah": "#3b82f6", "REJECTED BY Pengawas": "#ec4899",
    "APPROVED BY Pengawas": "#10b981", "REVOKED BY Pengawas": "#64748b", "SUBMITTED RESPONDENT": "#8b5cf6", "EDITED BY Pengawas": "#06b6d4"
};

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
    loadDashboardWithProgress();
    
    $('#filterWilayah, #filterAssignment').change(function() {
        executeGlobalFilters();
    });
});

// SIMULASI PROGRESS BAR REAL-TIME
function updateProgressBar(percent, text) {
    $('#loadingProgressFill').css('width', percent + '%');
    $('#loadingProgressText').text(`${text} (${percent}%)`);
}

async function loadDashboardWithProgress() {
    try {
        updateProgressBar(15, "Menghubungkan ke API server...");
        const response = await fetch(API_URL, { method: 'GET', redirect: 'follow' });
        
        updateProgressBar(45, "Data terunduh, menyusun struktur data...");
        globalData = await response.json();
        
        updateProgressBar(75, "Melakukan kalkulasi persentase wilayah...");
        
        // Membersihkan string pembersih spasi dan emoji di level Kecamatan
        if (globalData["Kecamatan"]) {
            globalData["Kecamatan"] = globalData["Kecamatan"].map(r => {
                if (r["Kecamatan"]) {
                    r["_CleanKecamatan"] = r["Kecamatan"].toString().replace(/[^a-zA-Z0-9\s\-]/g, '').trim();
                }
                return r;
            });
        }

        updateProgressBar(100, "Selesai! Membuka dashboard...");
        
        setTimeout(() => {
            document.getElementById('loader').classList.add('hidden');
            document.getElementById('dashboardContent').classList.remove('hidden');
            
            const time = new Date();
            document.getElementById('txtLastUpdate').innerText = `Sync: ${time.toLocaleTimeString('id-ID')} WIB`;
            
            renderKabupatenSummary();
            buildWilayahDropdown();
            switchTab("Kecamatan");
        }, 400);

    } catch (e) {
        console.error(e);
        $('#loadingProgressText').html(`<span class="text-red-500">Gagal memuat data. Cek Deployment Apps Script Anda.</span>`);
    }
}

function renderKabupatenSummary() {
    const kecData = globalData["Kecamatan"] || [];
    const kabRow = kecData.find(r => r["Kecamatan"] && r["Kecamatan"].toString().toLowerCase().includes("lampung timur"));
    
    if (kabRow) {
        document.getElementById('kabApproved').innerText = (parseInt(kabRow["APPROVED BY Pengawas"]) || 0).toLocaleString('id-ID');
        
        // FORMAT PERSENTASE 0.1133 -> 11.34% SECARA PRESISI
        let rawProg = kabRow["PROGRES"] || kabRow["Progres"] || 0;
        if (typeof rawProg === "string") rawProg = parseFloat(rawProg.replace(/[^0-9.]/g, ''));
        if (rawProg < 1 && rawProg > 0) rawProg = rawProg * 100;
        
        document.getElementById('kabProgres').innerText = parseFloat(rawProg).toFixed(2) + "%";
    }
}

function buildWilayahDropdown() {
    const kecData = globalData["Kecamatan"] || [];
    const select = $('#filterWilayah');
    select.find('option:not(:first)').remove();
    
    kecData.forEach(row => {
        let clean = row["_CleanKecamatan"];
        let raw = row["Kecamatan"];
        if (raw && !raw.toLowerCase().includes("lampung timur")) {
            // value diisi kode bersih, text diisi text asli spreadsheet
            select.append(`<option value="${clean}">${raw}</option>`);
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

    // Bersihkan row total Lampung Timur
    let processedData = rawSheetData.filter(r => {
        let firstVal = Object.values(r)[0] || "";
        return !firstVal.toString().toLowerCase().includes("lampung timur");
    });

    const columnsConfig = allowedColumns.map(colName => {
        return {
            title: colName,
            data: colName,
            defaultContent: "",
            render: function(data, type, row) {
                if (data === undefined || data === null) return "";
                
                // Normalisasi kolom Persentase Progres di baris tabel
                if (colName.toLowerCase().includes("progres") || colName === "16.88%" || colName.toLowerCase().includes("persentase")) {
                    let num = parseFloat(data);
                    if (!isNaN(num)) {
                        if (num <= 1 && num > 0) num = num * 100;
                        return num.toFixed(2) + "%";
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
        data: processedData,
        columns: columnsConfig,
        dom: 'Bfrtip',
        buttons: [
            { extend: 'excelHtml5', title: `Data_Monitoring_${currentTab}`, className: 'bg-emerald-600 text-white text-[11px] px-3 py-1.5 rounded hover:bg-emerald-700 font-medium transition' }
        ],
        pageLength: 10,
        scrollX: true,
        createdRow: function(row, data, dataIndex) {
            let app = parseInt(data["APPROVED BY Pengawas"]) || 0;
            let open = parseInt(data["OPEN"]) || 0;
            let total = app + open;
            if (total > 0 && (app / total) < 0.2) {
                $(row).addClass('bg-red-50/70');
            } else if (total > 0 && (app / total) >= 0.8) {
                $(row).addClass('bg-emerald-50/40');
            }
        }
    });

    $('.dt-button').removeClass('dt-button');
    executeGlobalFilters();
}

function executeGlobalFilters() {
    const table = $('#mainDataTable').DataTable();
    let valSelected = $('#filterWilayah').val(); 
    
    table.columns().search('');
    
    // Pencarian fuzzy safe match untuk menangani ketidaksesuaian spasi/emoji antar tab
    if (valSelected) {
        let idxKec = tableColumnsDefinition[currentTab].indexOf("Kecamatan");
        if (idxKec !== -1) {
            // Gunakan metode Regex Parsial tanpa strict ^...$ agar lolos sinkronisasi
            table.column(idxKec).search(valSelected, true, false);
        }
    }
    table.draw();

    renderDinamisChart(valSelected);
}

function renderDinamisChart(cleanWilayah) {
    let rawSheetData = globalData[currentTab] || [];
    let statusSelected = $('#filterAssignment').val();

    // Buang baris total kabupaten
    let filtered = rawSheetData.filter(r => {
        let firstVal = Object.values(r)[0] || "";
        return !firstVal.toString().toLowerCase().includes("lampung timur");
    });

    // Saring data grafik dengan metode fuzzy matching
    if (cleanWilayah) {
        filtered = filtered.filter(r => {
            if (!r["Kecamatan"]) return false;
            let targetClean = r["Kecamatan"].toString().replace(/[^a-zA-Z0-9\s\-]/g, '').trim();
            return targetClean.toLowerCase().includes(cleanWilayah.toLowerCase());
        });
    }

    let labelKey = "Kecamatan";
    if (currentTab === "Desa") labelKey = "Desa";
    if (currentTab === "PETUGAS") labelKey = "PPL";
    if (currentTab === "SLS") labelKey = "nmsls";

    let sliceData = filtered.slice(0, 15);
    let labelsX = sliceData.map(r => (r[labelKey] || 'Unknown').toString().replace(/\[.*?\]\s*/g, ''));

    let datasets = [];
    if (statusSelected) {
        datasets = [{
            label: statusSelected,
            data: sliceData.map(r => parseInt(r[statusSelected]) || 0),
            backgroundColor: statusColors[statusSelected] || '#3b82f6'
        }];
    } else {
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
