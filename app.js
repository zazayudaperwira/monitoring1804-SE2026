const API_URL = "https://script.google.com/macros/s/AKfycbyj21A-KOVdCL5RMLjKwEnqg79VpHvUqLzNdIJBVMr5g-xJ7OHWtb9yfZEd3HzQDPphTg/exec";

let globalData = {};
let currentTab = "Kecamatan";
let chartInstance = null;
let spreadsheetInfoTime = "Sync Real-time";

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

const baseColumnsConfig = {
    "Kecamatan": ["Kecamatan", "OPEN", "DRAFT", "SUBMITTED BY Pencacah", "REJECTED BY Pengawas", "APPROVED BY Pengawas", "REVOKED BY Pengawas", "SUBMITTED RESPONDENT", "EDITED BY Pengawas", "Only Open [SLS]"],
    "Desa": ["Kecamatan", "Desa", "OPEN", "DRAFT", "SUBMITTED BY Pencacah", "REJECTED BY Pengawas", "APPROVED BY Pengawas", "REVOKED BY Pengawas", "SUBMITTED RESPONDENT", "EDITED BY Pengawas", "Only Open [SLS]"],
    "PETUGAS": ["Kecamatan", "PML", "PPL", "Pengawas - Email", "Pencacah - Email", "OPEN", "DRAFT", "SUBMITTED BY Pencacah", "REJECTED BY Pengawas", "APPROVED BY Pengawas", "REVOKED BY Pengawas", "SUBMITTED RESPONDENT", "EDITED BY Pengawas", "Only Open"],
    "SLS": ["idsubsls", "Kecamatan", "Desa", "jenis", "nmsls", "jumlah_kk", "jumlah_bstt", "jumlah_bsbtt", "jumlah_bsttk", "jumlah_bku", "jumlah_usaha", "jumlah_muatan", "dominan", "PML", "PPL", "Keterangan", "Pengawas - Email", "Pencacah - Email", "OPEN", "DRAFT", "SUBMITTED BY Pencacah", "REJECTED BY Pengawas", "APPROVED BY Pengawas", "REVOKED BY Pengawas", "SUBMITTED RESPONDENT", "EDITED BY Pengawas", "Only Open"]
};

$(document).ready(function() {
    loadDashboardWithProgress();
    startSyncTimer();
    $('#filterWilayah, #filterAssignment').change(function() { executeGlobalFilters(); });
});

function startSyncTimer() {
    if (syncTimerInterval) clearInterval(syncTimerInterval);
    syncCountdown = SYNC_INTERVAL_SEC;
    syncTimerInterval = setInterval(() => {
        syncCountdown--;
        let min = Math.floor(syncCountdown / 60).toString().padStart(2, '0');
        let sec = (syncCountdown % 60).toString().padStart(2, '0');
        $('#txtSyncTimer').text(`Auto-Sync: ${min}:${sec}`);
        if (syncCountdown <= 0) {
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
        globalData = await response.json();
        
        updateProgressBar(60, "Mendownload & Memproses skema data...");
        if (globalData["Kecamatan"] && globalData["Kecamatan"].length > 0) {
            let sampleRow = globalData["Kecamatan"][0];
            let foundTimeKey = Object.keys(sampleRow).find(k => k.toString().includes("KONDISI"));
            if (foundTimeKey) spreadsheetInfoTime = foundTimeKey.trim();
        }

        normalizeRowKeys();
        updateProgressBar(100, "Selesai! Menampilkan data...");

        setTimeout(() => {
            $('#loader').addClass('hidden');
            $('#dashboardContent').removeClass('hidden');
            document.getElementById('txtLastUpdate').innerText = spreadsheetInfoTime;
            
            // Menggunakan proteksi try-catch terisolasi agar kegagalan satu fungsi tidak mematikan fungsi drop-down wilayah
            try { renderKabupatenSummary(); } catch(e) { console.error("Gagal memuat summary kabupaten:", e); }
            try { buildWilayahDropdown(); } catch(e) { console.error("Gagal membuat dropdown wilayah:", e); }
            
            switchTab(currentTab);
        }, 400);
    } catch (e) {
        console.error(e);
        $('#loadingProgressText').html(`<span class="text-red-500">Gagal mensinkronkan data spreadsheet.</span>`);
    }
}

function normalizeRowKeys() {
    Object.keys(globalData).forEach(sheetName => {
        globalData[sheetName] = globalData[sheetName].map(row => {
            let newRow = {};
            Object.keys(row).forEach(k => { newRow[k.trim()] = row[k]; });

            let kecKey = Object.keys(newRow).find(k => k.toLowerCase() === "kecamatan");
            if (kecKey && newRow[kecKey]) {
                newRow["Kecamatan"] = newRow[kecKey]; 
                newRow["_CleanKecamatan"] = newRow[kecKey].toString().replace(/[^a-zA-Z0-9\s\-]/g, '').trim();
            } else {
                newRow["_CleanKecamatan"] = "";
            }

            let progKey = Object.keys(newRow).find(k => ["progres", "PROGRES", "Persentase Progres"].includes(k) || k.toLowerCase().includes("progres"));
            if (progKey) {
                newRow["_MAPPED_PROGRES"] = newRow[progKey];
                newRow["PROGRES"] = newRow[progKey];
            } else {
                newRow["_MAPPED_PROGRES"] = "0";
            }

            let targetKey = Object.keys(newRow).find(k => k.toLowerCase().includes("target") || k.toLowerCase().includes("harian"));
            if (targetKey) {
                newRow["_MAPPED_TARGET"] = newRow[targetKey];
                newRow["Target Harian"] = newRow[targetKey];
            } else {
                newRow["_MAPPED_TARGET"] = "0";
            }

            return newRow;
        });
    });
}

function renderKabupatenSummary() {
    const kecData = globalData["Kecamatan"] || [];
    if (kecData.length === 0) return;
    
    // Mencari baris total secara fleksibel
    const kabRow = kecData.find(r => r["Kecamatan"] && (
        r["Kecamatan"].toString().toLowerCase().includes("lampung timur") || 
        r["Kecamatan"].toString().toLowerCase().includes("total")
    ));
    
    if (kabRow) {
        document.getElementById('kabApproved').innerText = (parseInt(kabRow["APPROVED BY Pengawas"]) || 0).toLocaleString('id-ID');
        let num = parseToPureNumeric(kabRow["_MAPPED_PROGRES"]);
        document.getElementById('kabProgres').innerText = num.toFixed(2) + "%";
    }
}

// FIX UTAMA: Pembangunan dropdown mengambil data secara defensif dari semua baris alternatif yang valid
function buildWilayahDropdown() {
    const select = $('#filterWilayah');
    const currVal = select.val();
    select.find('option:not(:first)').remove();
    
    let addedKec = new Set();
    
    // Ambil basis data referensi dari tab Kecamatan atau Desa yang tersedia
    let sourceData = globalData["Kecamatan"] || globalData["Desa"] || globalData["PETUGAS"] || [];

    sourceData.forEach(row => {
        let clean = row["_CleanKecamatan"];
        let raw = row["Kecamatan"];
        
        if (raw && clean && clean !== "") {
            let rawStr = raw.toString().toLowerCase();
            // Eliminasi kata kunci total kabupaten agar tidak ikut masuk list dropdown filter
            if (!rawStr.includes("lampung timur") && !rawStr.includes("total") && !rawStr.includes("kabupaten") && !addedKec.has(clean)) {
                select.append(`<option value="${clean}">${raw}</option>`);
                addedKec.add(clean);
            }
        }
    });
    
    if(currVal) select.val(currVal);
}

function switchTab(tabName) {
    currentTab = tabName;
    $('.tab-btn').removeClass('bg-blue-600 text-white shadow-sm').addClass('text-slate-600 hover:bg-slate-200');
    $(`#btn-${tabName}`).removeClass('text-slate-600 hover:bg-slate-200').addClass('bg-blue-600 text-white shadow-sm');
    buildDataTableStructure();
}

function parseToPureNumeric(val) {
    if (val === undefined || val === null || val === "") return 0;
    let clean = val.toString().replace(/[^0-9.]/g, '');
    let num = parseFloat(clean);
    if (isNaN(num)) return 0;
    if (num <= 1 && num > 0) num = num * 100; 
    return num;
}

function buildDataTableStructure() {
    let rawSheetData = globalData[currentTab] || [];
    
    if ($.fn.DataTable.isDataTable('#mainDataTable')) {
        $('#mainDataTable').DataTable().destroy();
        $('#mainDataTable').empty();
    }

    let processedData = rawSheetData.filter(r => {
        let firstVal = r["Kecamatan"] || Object.values(r)[0] || "";
        let txt = firstVal.toString().toLowerCase();
        return !txt.includes("lampung timur") && !txt.includes("total");
    });

    let sampleRow = processedData[0] || {};
    let realProgKey = Object.keys(sampleRow).find(k => k.toLowerCase().includes("progres") && !k.startsWith("_")) || "PROGRES";
    let realTargetKey = Object.keys(sampleRow).find(k => (k.toLowerCase().includes("target") || k.toLowerCase().includes("harian")) && !k.startsWith("_")) || "Target Harian";
    let realRankKey = Object.keys(sampleRow).find(k => k.toLowerCase() === "rank") || "Rank";

    let dynamicColumns = [...(baseColumnsConfig[currentTab] || [])];
    
    if (currentTab !== "SLS") {
        if (!dynamicColumns.includes(realProgKey)) dynamicColumns.push(realProgKey);
        if (!dynamicColumns.includes(realTargetKey)) dynamicColumns.push(realTargetKey);
        if (currentTab === "PETUGAS" && !dynamicColumns.includes(realRankKey)) dynamicColumns.push(realRankKey);
    }

    const columnsConfig = dynamicColumns.map(colName => {
        return {
            title: colName,
            data: colName,
            defaultContent: "-",
            render: function(data, type, row) {
                if (data === undefined || data === null || data === "") return "-";
                
                if (colName === realProgKey || colName === realTargetKey) {
                    let num = parseToPureNumeric(data);
                    return num.toFixed(2) + "%";
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
        createdRow: function(row, data, dataIndex) {
            let numProgres = parseToPureNumeric(data["_MAPPED_PROGRES"]);
            let numTarget = parseToPureNumeric(data["_MAPPED_TARGET"]);
            if (numTarget > 0 && numProgres < numTarget) {
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
        let currentCols = table.settings().init().columns;
        let idxKec = currentCols.findIndex(c => c.title === "Kecamatan");
        if (idxKec !== -1) table.column(idxKec).search(valSelected, true, false);
    }
    table.draw();

    renderDinamisChart(valSelected);
    generateTopBottomPplHighlight(valSelected);
}

function generateTopBottomPplHighlight(cleanWilayah) {
    let petugasData = globalData["PETUGAS"] || [];
    if (cleanWilayah) {
        petugasData = petugasData.filter(r => {
            if (!r["Kecamatan"]) return false;
            return r["Kecamatan"].toString().replace(/[^a-zA-Z0-9\s\-]/g, '').trim().toLowerCase().includes(cleanWilayah.toLowerCase());
        });
    }

    let validPpl = petugasData.map(p => {
        p["_numProg"] = parseToPureNumeric(p["_MAPPED_PROGRES"]);
        return p;
    }).filter(p => p["PPL"] !== undefined && p["PPL"] !== "");

    let sortedTop = [...validPpl].sort((a, b) => b["_numProg"] - a["_numProg"]);
    let sortedBottom = [...validPpl].sort((a, b) => a["_numProg"] - b["_numProg"]);

    let topHtml = "";
    sortedTop.slice(0, 10).forEach((ppl, index) => {
        let kecName = ppl["Kecamatan"] ? ppl["Kecamatan"].toString().split("-")[1] || ppl["Kecamatan"] : "";
        topHtml += `<tr>
            <td class="p-2 text-center font-bold text-slate-500">${index + 1}</td>
            <td class="p-2 font-semibold text-slate-700">${ppl["PPL"]} <span class="text-[10px] text-slate-400 font-normal">(${kecName.trim()})</span></td>
            <td class="p-2 text-center font-bold text-emerald-600">${ppl["_numProg"].toFixed(2)}%</td>
        </tr>`;
    });
    $('#topPplList').html(topHtml || `<tr><td colspan="3" class="p-3 text-center text-slate-400">Tidak ada data</td></tr>`);

    let bottomHtml = "";
    sortedBottom.slice(0, 10).forEach((ppl, index) => {
        let kecName = ppl["Kecamatan"] ? ppl["Kecamatan"].toString().split("-")[1] || ppl["Kecamatan"] : "";
        bottomHtml += `<tr>
            <td class="p-2 text-center font-bold text-slate-500">${index + 1}</td>
            <td class="p-2 font-semibold text-slate-700">${ppl["PPL"]} <span class="text-[10px] text-slate-400 font-normal">(${kecName.trim()})</span></td>
            <td class="p-2 text-center font-bold text-rose-600">${ppl["_numProg"].toFixed(2)}%</td>
        </tr>`;
    });
    $('#bottomPplList').html(bottomHtml || `<tr><td colspan="3" class="p-3 text-center text-slate-400">Tidak ada data</td></tr>`);
}

function renderDinamisChart(cleanWilayah) {
    let rawSheetData = globalData[currentTab] || [];
    let statusSelected = $('#filterAssignment').val();

    let filtered = rawSheetData.filter(r => {
        let firstVal = r["Kecamatan"] || Object.values(r)[0] || "";
        let txt = firstVal.toString().toLowerCase();
        return !txt.includes("lampung timur") && !txt.includes("total");
    });

    if (cleanWilayah) {
        filtered = filtered.filter(r => {
            if (!r["Kecamatan"]) return false;
            return r["Kecamatan"].toString().replace(/[^a-zA-Z0-9\s\-]/g, '').trim().toLowerCase().includes(cleanWilayah.toLowerCase());
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
        datasets = [{ label: statusSelected, data: sliceData.map(r => parseInt(r[statusSelected]) || 0), backgroundColor: statusColors[statusSelected] || '#3b82f6' }];
    } else {
        datasets = targetStatus.map(status => {
            return { label: status, data: sliceData.map(r => parseInt(r[status]) || 0), backgroundColor: statusColors[status] || '#cbd5e1' };
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
            scales: { x: { stacked: true, ticks: { font: { size: 9 } } }, y: { stacked: true, beginAtZero: true } },
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 8, font: { size: 8 } } } }
        }
    });
}
