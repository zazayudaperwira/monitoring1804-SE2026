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
        
        // Cari info KONDISI waktu data otomatis
        Object.keys(globalData).forEach(sheet => {
            if (globalData[sheet] && globalData[sheet].length > 0) {
                let found = Object.keys(globalData[sheet][0]).find(k => k.toString().toUpperCase().includes("KONDISI"));
                if (found) spreadsheetInfoTime = found.trim();
            }
        });

        normalizeRowKeys();
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

// Fungsi bantu untuk membersihkan teks key kolom agar bisa dicocokkan dengan adil
function cleanStringKey(str) {
    if (!str) return "";
    return str.toString().toLowerCase().replace(/[^a-z0-9]/g, '').trim();
}

// SMART RE-MAPPING: Menjamin properti objek apa pun formatnya dari GAS akan dipetakan ke Standar Standar UI
function normalizeRowKeys() {
    Object.keys(globalData).forEach(sheetName => {
        globalData[sheetName] = globalData[sheetName].map(row => {
            let newRow = {};
            
            // Ambil semua key asli bawaan data baris ini
            let originalKeys = Object.keys(row);

            // 1. Petakan Status-status Utama Terlebih Dahulu secara Case-Insensitive & Spaceless
            targetStatus.forEach(status => {
                let matchedKey = originalKeys.find(k => cleanStringKey(k) === cleanStringKey(status));
                newRow[status] = matchedKey ? row[matchedKey] : (row[status] || 0);
            });

            // 2. Petakan kolom-kolom fundamental lainnya
            let allStandardFields = ["Kecamatan", "Desa", "PML", "PPL", "idsubsls", "nmsls", "jenis", "Keterangan", "Pengawas - Email", "Pencacah - Email", "Only Open", "Only Open [SLS]", "Rank"];
            allStandardFields.forEach(field => {
                let matchedKey = originalKeys.find(k => cleanStringKey(k) === cleanStringKey(field));
                newRow[field] = matchedKey ? row[matchedKey] : (row[field] || "");
            });

            // Buat clean kecamatan untuk filter dropdown
            if (newRow["Kecamatan"]) {
                newRow["_CleanKecamatan"] = newRow["Kecamatan"].toString().replace(/[^a-zA-Z0-9\s\-]/g, '').trim();
            } else {
                newRow["_CleanKecamatan"] = "";
            }

            // 3. Deteksi Otomatis Kolom Progres Dinamis
            let progKey = originalKeys.find(k => {
                let ck = cleanStringKey(k);
                return ck.includes("progres") || ck.includes("persentase");
            });
            let rawProgVal = progKey ? row[progKey] : 0;
            newRow["_MAPPED_PROGRES"] = rawProgVal;
            newRow["PROGRES"] = rawProgVal;
            newRow["Persentase Progres"] = rawProgVal;

            // 4. Deteksi Otomatis Kolom Target Harian Dinamis (Bebas dari pengaruh tanggal)
            let targetKey = originalKeys.find(k => {
                let ck = cleanStringKey(k);
                return ck.includes("target") || ck.includes("harian");
            });
            let rawTargetVal = targetKey ? row[targetKey] : 0;
            newRow["_MAPPED_TARGET"] = rawTargetVal;
            newRow["Target Harian"] = rawTargetVal;
            
            // Simpan nama kolom target asli (misal "Target Harian 23-06-2026") agar judul tabel dinamis bisa mengikutinya
            if (targetKey) {
                newRow["_ORIGINAL_TARGET_NAME"] = targetKey;
                newRow[targetKey] = rawTargetVal;
            }

            // Copy sisa properti lain yang tidak tercover agar tidak hilang
            originalKeys.forEach(k => {
                if (!newRow.hasOwnProperty(k)) {
                    newRow[k] = row[k];
                }
            });

            return newRow;
        });
    });
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
        let num = parseToPureNumeric(kabRow["_MAPPED_PROGRES"]);
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
        let clean = row["_CleanKecamatan"];
        let raw = row["Kecamatan"];
        
        if (raw && clean && clean !== "") {
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

    // Filter baris total kabupaten agar tidak mengotori tabel utama
    let processedData = rawSheetData.filter(r => {
        let firstVal = r["Kecamatan"] || Object.values(r)[0] || "";
        let txt = firstVal.toString().toLowerCase();
        return !txt.includes("lampung timur") && !txt.includes("total");
    });

    let sampleRow = processedData[0] || {};
    
    // Cari penamaan kolom riil dari data
    let realProgKey = "PROGRES";
    let realTargetKey = sampleRow["_ORIGINAL_TARGET_NAME"] || "Target Harian";

    let dynamicColumns = [...(baseColumnsConfig[currentTab] || [])];
    
    if (currentTab !== "SLS") {
        if (!dynamicColumns.includes(realProgKey)) dynamicColumns.push(realProgKey);
        if (!dynamicColumns.includes(realTargetKey)) dynamicColumns.push(realTargetKey);
    }

    const columnsConfig = dynamicColumns.map(colName => {
        // Tampilkan judul kolom target secara dinamis sesuai tanggal sheet asli
        let displayTitle = colName;
        if (colName === "Target Harian" && sampleRow["_ORIGINAL_TARGET_NAME"]) {
            displayTitle = sampleRow["_ORIGINAL_TARGET_NAME"];
        }

        return {
            title: displayTitle,
            data: colName,
            defaultContent: "0",
            render: function(data, type, row) {
                // Gunakan backup mapper jika pemanggilan langsung mengembalikan nilai kosong
                let finalVal = data;
                if (colName === "PROGRES") finalVal = row["_MAPPED_PROGRES"];
                if (colName === realTargetKey || colName === "Target Harian") finalVal = row["_MAPPED_TARGET"];

                if (finalVal === undefined || finalVal === null || finalVal === "") return "0";
                
                if (colName === "PROGRES" || colName === "Target Harian" || colName === realTargetKey) {
                    let num = parseToPureNumeric(finalVal);
                    return num.toFixed(2) + "%";
                }
                
                if (type === 'display' && !isNaN(finalVal) && colName !== "idsubsls" && !colName.toLowerCase().includes("email") && !colName.toLowerCase().includes("rank")) {
                    return Number(finalVal).toLocaleString('id-ID');
                }
                return finalVal;
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
            if (!r["_CleanKecamatan"]) return false;
            return r["_CleanKecamatan"].toLowerCase().includes(cleanWilayah.toLowerCase());
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
            if (!r["_CleanKecamatan"]) return false;
            return r["_CleanKecamatan"].toLowerCase().includes(cleanWilayah.toLowerCase());
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
