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
    "Kecamatan": ["Kecamatan", "OPEN", "DRAFT", "SUBMITTED BY Pencacah", "REJECTED BY Pengawas", "APPROVED BY Pengawas", "REVOKED BY Pengawas", "SUBMITTED RESPONDENT", "EDITED BY Pengawas", "Target Harian 23-06-2026", "PROGRES", "Only Open [SLS]"],
    "Desa": ["Kecamatan", "Desa", "OPEN", "DRAFT", "SUBMITTED BY Pencacah", "REJECTED BY Pengawas", "APPROVED BY Pengawas", "REVOKED BY Pengawas", "SUBMITTED RESPONDENT", "EDITED BY Pengawas", "Target Harian 23-06-2026", "PROGRES", "Only Open [SLS]"],
    "PETUGAS": ["Kecamatan", "PML", "PPL", "Pengawas - Email", "Pencacah - Email", "OPEN", "DRAFT", "SUBMITTED BY Pencacah", "REJECTED BY Pengawas", "APPROVED BY Pengawas", "REVOKED BY Pengawas", "SUBMITTED RESPONDENT", "EDITED BY Pengawas", "Target Harian 23-06-2026", "PROGRES", "Only Open"],
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
        
        Object.keys(globalData).forEach(sheet => {
            if (globalData[sheet] && globalData[sheet].length > 0) {
                let found = Object.keys(globalData[sheet][0]).find(k => k.toString().toUpperCase().includes("KONDISI"));
                if (found) spreadsheetInfoTime = found.trim();
            }
        });

        updateProgressBar(100, "Selesai! Menampilkan data...");

        setTimeout(() => {
            $('#loader').addClass('hidden');
            $('#dashboardContent').removeClass('hidden');
            document.getElementById('txtLastUpdate').innerText = spreadsheetInfoTime;
            
            try { renderKabupatenSummary(); } catch(e) { console.error(e); }
            try { buildWilayahDropdown(); } catch(e) { console.error(e); }
            
            switchTab(currentTab);
        }, 400);
    } catch (e) {
        console.error(e);
        $('#loadingProgressText').html(`<span class="text-red-500">Gagal mensinkronkan data spreadsheet.</span>`);
    }
}

function renderKabupatenSummary() {
    const kecData = globalData["Kecamatan"] || [];
    if (kecData.length === 0) return;
    
    const kabRow = kecData.find(r => r["Kecamatan"] && (
        r["Kecamatan"].toString().toLowerCase().includes("lampung timur") || 
        r["Kecamatan"].toString().toLowerCase().includes("total")
    ));
    
    if (kabRow) {
        document.getElementById('kabApproved').innerText = (parseInt(kabRow["APPROVED BY Pengawas"]) || 0).toLocaleString('id-ID');
        let rawProg = kabRow["PROGRES"] || 0;
        let num = parseFloat(rawProg.toString().replace(/[^0-9.]/g, '')) || 0;
        if (num <= 1 && num > 0) num = num * 100;
        document.getElementById('kabProgres').innerText = num.toFixed(2) + "%";
    }
}

function buildWilayahDropdown() {
    const select = $('#filterWilayah');
    const currVal = select.val();
    select.find('option:not(:first)').remove();
    
    let addedKec = new Set();
    let sourceData = globalData["Kecamatan"] || globalData["Desa"] || [];

    sourceData.forEach(row => {
        let raw = row["Kecamatan"];
        if (raw) {
            let clean = raw.toString().replace(/[^a-zA-Z0-9\s\-]/g, '').trim();
            let rawStr = raw.toString().toLowerCase();
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

function buildDataTableStructure() {
    let processedData = globalData[currentTab] || [];
    
    if ($.fn.DataTable.isDataTable('#mainDataTable')) {
        $('#mainDataTable').DataTable().destroy();
        $('#mainDataTable').empty();
    }

    processedData = processedData.filter(r => {
        let firstVal = r["Kecamatan"] || Object.values(r)[0] || "";
        let txt = firstVal.toString().toLowerCase();
        return !txt.includes("lampung timur") && !txt.includes("total");
    });

    const columnsConfig = (baseColumnsConfig[currentTab] || []).map(colName => {
        return {
            title: colName,
            data: colName,
            defaultContent: "0",
            render: function(data, type, row) {
                if (data === undefined || data === null || data === "") return "0";
                
                if (colName === "PROGRES" || colName === "Target Harian 23-06-2026") {
                    let num = parseFloat(data.toString().replace(/[^0-9.]/g, '')) || 0;
                    if (num <= 1 && num > 0) num = num * 100;
                    return num.toFixed(2) + "%";
                }
                
                if (type === 'display' && !isNaN(data) && colName !== "idsubsls" && !colName.toLowerCase().includes("email")) {
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
            let rawTarget = data["Target Harian 23-06-2026"] || 0;
            let rawProg = data["PROGRES"] || 0;
            let numTarget = parseFloat(rawTarget.toString().replace(/[^0-9.]/g, '')) || 0;
            let numProgres = parseFloat(rawProg.toString().replace(/[^0-9.]/g, '')) || 0;
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
        if (idxKec !== -1) {
            table.column(idxKec).search(valSelected);
        }
    }
    table.draw();

    renderDinamisChart(valSelected);
    generateTopBottomPplHighlight(valSelected);
}

function generateTopBottomPplHighlight(cleanWilayah) {
    let petugasData = globalData["PETUGAS"] || [];
    if (cleanWilayah) {
        petugasData = petugasData.filter(r => {
            let raw = r["Kecamatan"];
            if (!raw) return false;
            let clean = raw.toString().replace(/[^a-zA-Z0-9\s\-]/g, '').trim();
            return clean.toLowerCase().includes(cleanWilayah.toLowerCase());
        });
    }

    let validPpl = petugasData.map(p => {
        let rawProg = p["PROGRES"] || 0;
        let num = parseFloat(rawProg.toString().replace(/[^0-9.]/g, '')) || 0;
        if (num <= 1 && num > 0) num = num * 100;
        p["_numProg"] = num;
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
            let raw = r["Kecamatan"];
            if (!raw) return false;
            let clean = raw.toString().replace(/[^a-zA-Z0-9\s\-]/g, '').trim();
            return clean.toLowerCase().includes(cleanWilayah.toLowerCase());
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
