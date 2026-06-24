const API_URL = "https://script.google.com/macros/s/AKfycbyj21A-KOVdCL5RMLjKwEnqg79VpHvUqLzNdIJBVMr5g-xJ7OHWtb9yfZEd3HzQDPphTg/exec";


let globalData = {};
let currentTab = "Kecamatan";
let chartInstance = null;
let spreadsheetInfoTime = "Sync Real-time";

// Pengaturan Sinkronisasi Otomatis (5 Menit = 300 Detik)
const SYNC_INTERVAL_SEC = 300;
let syncCountdown = SYNC_INTERVAL_SEC;
let syncTimerInterval = null;

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
        "Only Open [SLS]", "PROGRES", "Target Harian"
    ],
    "Desa": [
        "Kecamatan", "Desa", "OPEN", "DRAFT", "SUBMITTED BY Pencacah", "REJECTED BY Pengawas",
        "APPROVED BY Pengawas", "REVOKED BY Pengawas", "SUBMITTED RESPONDENT", "EDITED BY Pengawas",
        "Only Open [SLS]", "Progres", "Target Harian"
    ],
    "PETUGAS": [
        "Kecamatan", "PML", "PPL", "Pengawas - Email", "Pencacah - Email", "OPEN", "DRAFT",
        "SUBMITTED BY Pencacah", "REJECTED BY Pengawas", "APPROVED BY Pengawas", "REVOKED BY Pengawas",
        "SUBMITTED RESPONDENT", "EDITED BY Pengawas", "Only Open", "Persentase Progres", "Target Harian", "Rank"
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
    startSyncTimer();
    
    $('#filterWilayah, #filterAssignment').change(function() {
        executeGlobalFilters();
    });
});

// LOGIKA SINKRONISASI OTOMATIS BERJALAN MUNDUR
function startSyncTimer() {
    if (syncTimerInterval) clearInterval(syncTimerInterval);
    syncCountdown = SYNC_INTERVAL_SEC;
    
    syncTimerInterval = setInterval(() => {
        syncCountdown--;
        let min = Math.floor(syncCountdown / 60).toString().padStart(2, '0');
        let sec = (syncCountdown % 60).toString().padStart(2, '0');
        $('#txtSyncTimer').text(`Auto-Sync: ${min}:${sec}`);
        
        if (syncCountdown <= 0) {
            clearInterval(syncTimerInterval);
            $('#loader').removeClass('hidden');
            loadDashboardWithProgress();
            startSyncTimer();
        }
    }, 1000);
}

function updateProgressBar(percent, text) {
    $('#loadingProgressFill').css('width', percent + '%');
    $('#loadingProgressText').text(`${text} (${percent}%)`);
}

async function loadDashboardWithProgress() {
    try {
        updateProgressBar(15, "Menghubungkan ke API server...");
        const response = await fetch(API_URL, { method: 'GET', redirect: 'follow' });
        
        updateProgressBar(45, "Mendownload data dari Google Spreadsheet...");
        globalData = await response.json();
        
        updateProgressBar(75, "Mengekstrak waktu pembacaan Cell A1...");
        
        if (globalData["Kecamatan"] && globalData["Kecamatan"].length > 0) {
            let sampleRow = globalData["Kecamatan"][0];
            let foundTimeKey = Object.keys(sampleRow).find(k => k.toString().includes("KONDISI"));
            if (foundTimeKey) {
                spreadsheetInfoTime = foundTimeKey.trim();
            }
        }

        cleanAndNormalizeKeys();

        updateProgressBar(100, "Selesai! Membuka dashboard...");
        
        setTimeout(() => {
            document.getElementById('loader').classList.add('hidden');
            document.getElementById('dashboardContent').classList.remove('hidden');
            
            document.getElementById('txtLastUpdate').innerText = spreadsheetInfoTime;
            
            renderKabupatenSummary();
            buildWilayahDropdown();
            switchTab(currentTab);
        }, 400);

    } catch (e) {
        console.error(e);
        $('#loadingProgressText').html(`<span class="text-red-500">Gagal memuat data otomatis.</span>`);
    }
}

function cleanAndNormalizeKeys() {
    Object.keys(globalData).forEach(sheetName => {
        globalData[sheetName] = globalData[sheetName].map(row => {
            let newRow = {};
            Object.keys(row).forEach(k => { newRow[k.trim()] = row[k]; });

            let progValue = row["Progres"] || row["PROGRES"] || row["progres"] || row["Persentase Progres"];
            if (progValue !== undefined) {
                newRow["PROGRES"] = progValue;
                newRow["Progres"] = progValue;
                newRow["Persentase Progres"] = progValue;
            }

            let targetDayValue = row["Target Harian"] || row["target harian"];
            if (targetDayValue !== undefined) {
                newRow["Target Harian"] = targetDayValue;
            }

            if (newRow["Kecamatan"]) {
                newRow["_CleanKecamatan"] = newRow["Kecamatan"].toString().replace(/[^a-zA-Z0-9\s\-]/g, '').trim();
            }
            return newRow;
        });
    });
}

function renderKabupatenSummary() {
    const kecData = globalData["Kecamatan"] || [];
    const kabRow = kecData.find(r => r["Kecamatan"] && r["Kecamatan"].toString().toLowerCase().includes("lampung timur"));
    
    if (kabRow) {
        document.getElementById('kabApproved').innerText = (parseInt(kabRow["APPROVED BY Pengawas"]) || 0).toLocaleString('id-ID');
        let rawProg = kabRow["PROGRES"] || 0;
        if (typeof rawProg === "string") rawProg = rawProg.replace(/[^0-9.]/g, '');
        let num = parseFloat(rawProg);
        if (!isNaN(num)) {
            if (num <= 1 && num > 0) num = num * 100;
            document.getElementById('kabProgres').innerText = num.toFixed(2) + "%";
        }
    }
}

function buildWilayahDropdown() {
    const kecData = globalData["Kecamatan"] || [];
    const select = $('#filterWilayah');
    const currVal = select.val();
    select.find('option:not(:first)').remove();
    
    kecData.forEach(row => {
        let clean = row["_CleanKecamatan"];
        let raw = row["Kecamatan"];
        if (raw && !raw.toLowerCase().includes("lampung timur")) {
            select.append(`<option value="${clean}">${raw}</option>`);
        }
    });
    if(currVal) select.val(currVal);
}

// LOGIKA UTAMA EKSTRAKSI PERINGKAT 10 PPL TERTINGGI & TERENDAH DIANTARA GRAFIK & TABEL
function generateTopBottomPplHighlight(cleanWilayah) {
    let petugasData = globalData["PETUGAS"] || [];
    
    // Filter berdasarkan wilayah jika dropdown aktif
    if (cleanWilayah) {
        petugasData = petugasData.filter(r => {
            if (!r["Kecamatan"]) return false;
            let targetClean = r["Kecamatan"].toString().replace(/[^a-zA-Z0-9\s\-]/g, '').trim();
            return targetClean.toLowerCase().includes(cleanWilayah.toLowerCase());
        });
    }

    // Ubah nilai progres desimal string ke angka presisi murni
    let validPpl = petugasData.map(p => {
        let rawProg = p["Persentase Progres"] || 0;
        if (typeof rawProg === "string") rawProg = rawProg.replace(/[^0-9.]/g, '');
        let num = parseFloat(rawProg);
        if (!isNaN(num) && num <= 1 && num > 0) num = num * 100;
        p["_numProg"] = isNaN(num) ? 0 : num;
        return p;
    }).filter(p => p["PPL"] !== undefined && p["PPL"] !== "");

    // Urutkan Tertinggi dan Terendah
    let sortedTop = [...validPpl].sort((a, b) => b["_numProg"] - a["_numProg"]);
    let sortedBottom = [...validPpl].sort((a, b) => a["_numProg"] - b["_numProg"]);

    // Render HTML PPL Tertinggi
    let topHtml = "";
    sortedTop.slice(0, 10).forEach((ppl, index) => {
        let kecName = ppl["Kecamatan"] ? ppl["Kecamatan"].toString().split("-")[1] || ppl["Kecamatan"] : "";
        topHtml += `<tr>
            <td class="p-2 text-center font-bold text-slate-500">${index + 1}</td>
            <td class="p-2 font-semibold text-slate-700">${ppl["PPL"]} <span class="text-[10px] text-slate-400 font-normal">(${kecName.trim()})</span></td>
            <td class="p-2 text-center font-bold text-emerald-600">${ppl["_numProg"].toFixed(2)}%</td>
        </tr>`;
    });
    $('#topPplList').html(topHtml || `<tr><td colspan="3" class="p-3 text-center text-slate-400">Tidak ada data PPL</td></tr>`);

    // Render HTML PPL Terendah
    let bottomHtml = "";
    sortedBottom.slice(0, 10).forEach((ppl, index) => {
        let kecName = ppl["Kecamatan"] ? ppl["Kecamatan"].toString().split("-")[1] || ppl["Kecamatan"] : "";
        bottomHtml += `<tr>
            <td class="p-2 text-center font-bold text-slate-500">${index + 1}</td>
            <td class="p-2 font-semibold text-slate-700">${ppl["PPL"]} <span class="text-[10px] text-slate-400 font-normal">(${kecName.trim()})</span></td>
            <td class="p-2 text-center font-bold text-rose-600">${ppl["_numProg"].toFixed(2)}%</td>
        </tr>`;
    });
    $('#bottomPplList').html(bottomHtml || `<tr><td colspan="3" class="p-3 text-center text-slate-400">Tidak ada data PPL</td></tr>`);
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

    let processedData = rawSheetData.filter(r => {
        let firstVal = Object.values(r)[0] || "";
        return !firstVal.toString().toLowerCase().includes("lampung timur");
    });

    const columnsConfig = allowedColumns.map(colName => {
        return {
            title: colName,
            data: colName,
            defaultContent: "-",
            render: function(data, type, row) {
                if (data === undefined || data === null || data === "") return "-";
                
                if (colName === "PROGRES" || colName === "Progres" || colName === "Persentase Progres") {
                    if (typeof data === "string") data = data.replace(/[^0-9.]/g, '');
                    let num = parseFloat(data);
                    if (!isNaN(num)) {
                        if (num <= 1 && num > 0) num = num * 100;
                        return num.toFixed(2) + "%";
                    }
                    return data;
                }
                
                if (type === 'display' && !isNaN(data) && colName !== "idsubsls" && !colName.toLowerCase().includes("date") && !colName.toLowerCase().includes("rank")) {
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
        
        // WARNAI MERAH SATU BARIS PENUH JIKA TARGET HARIAN TIDAK TERCAPAI ATAU NILAINYA GAGAL
        createdRow: function(row, data, dataIndex) {
            let targetHarian = data["Target Harian"];
            let progresVal = data["PROGRES"] || data["Progres"] || data["Persentase Progres"] || 0;
            
            if (typeof progresVal === "string") progresVal = progresVal.replace(/[^0-9.]/g, '');
            let pct = parseFloat(progresVal);
            if (!isNaN(pct) && pct <= 1 && pct > 0) pct = pct * 100;

            // Logika: Jika target harian diisi teks strip atau bernilai kosong/0 saat progresnya masih rendah,
            // atau jika data target harian tidak terpenuhi, tandai merah sebagai penanda evaluasi
            if (targetHarian === "0" || targetHarian === 0 || (pct < 15 && targetHarian !== "-")) {
                $(row).addClass('row-target-failed');
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
    
    if (valSelected) {
        let idxKec = tableColumnsDefinition[currentTab].indexOf("Kecamatan");
        if (idxKec !== -1) {
            table.column(idxKec).search(valSelected, true, false);
        }
    }
    table.draw();

    renderDinamisChart(valSelected);
    
    // Perbarui Widget Highlight 10 PPL Berdasarkan Filter Wilayah
    generateTopBottomPplHighlight(valSelected);
}

function renderDinamisChart(cleanWilayah) {
    let rawSheetData = globalData[currentTab] || [];
    let statusSelected = $('#filterAssignment').val();

    let filtered = rawSheetData.filter(r => {
        let firstVal = Object.values(r)[0] || "";
        return !firstVal.toString().toLowerCase().includes("lampung timur");
    });

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
