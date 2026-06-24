// MASUKKAN URL WEB APP EXEC BARU ANDA DI SINI
const API_URL = "https://script.google.com/macros/s/AKfycbxH-76Z7fMlqJHNjvbB2lsn3HTJV_IKWZ0sf8bGVpTEzlroDT2GaW-Fd9sDDTVUdtvasw/exec";


let globalData = {};
let currentTab = "Kecamatan";
let mainChart = null;
let trendChart = null;

const targetStatus = [
    "OPEN", "DRAFT", "SUBMITTED BY Pencacah", "REJECTED BY Pengawas", 
    "APPROVED BY Pengawas", "REVOKED BY Pengawas", "SUBMITTED RESPONDENT", "EDITED BY Pengawas"
];

const statusColors = {
    "OPEN": "#ef4444", "DRAFT": "#f59e0b", "SUBMITTED BY Pencacah": "#3b82f6", "REJECTED BY Pengawas": "#ec4899",
    "APPROVED BY Pengawas": "#10b981", "REVOKED BY Pengawas": "#64748b", "SUBMITTED RESPONDENT": "#8b5cf6", "EDITED BY Pengawas": "#06b6d4"
};

$(document).ready(function() {
    loadDashboardSystem();
    
    // Event Handler untuk Filter Global
    $('#globalKecamatan').change(function() {
        populateSubFilters();
        executeGlobalFiltering();
    });
    $('#globalDesa, #globalPml').change(function() {
        executeGlobalFiltering();
    });
    $('#chartTypeToggle, #subFilterChart').change(function() {
        renderMainVisualizations();
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
        
        // Render Ringkasan Level Kabupaten (Mencari baris Lampung Timur)
        renderKabupatenSummary();
        
        // Buat Opsi Filter Berdasarkan Master Kecamatan
        buildKecamatanDropdown();
        
        switchTab("Kecamatan");
    } catch (e) {
        console.error(e);
        document.getElementById('loader').innerHTML = `<p class="p-4 text-xs font-bold text-red-500">API Terputus. Pastikan Apps Script di-deploy kembali sebagai 'Anyone'.</p>`;
    }
}

function renderKabupatenSummary() {
    const kecData = globalData["Kecamatan"] || [];
    // Cari baris agregat total kabupaten
    const kabRow = kecData.find(r => Object.values(r).some(v => v.toString().toLowerCase().includes("lampung timur")));
    
    if (kabRow) {
        document.getElementById('kabApproved').innerText = (parseInt(kabRow["APPROVED BY Pengawas"]) || 0).toLocaleString('id-ID');
        document.getElementById('kabProgres').innerText = kabRow["PROGRES"] || kabRow["Progres"] || "0%";
    } else {
        // Fallback hitung manual dari data kecamatan jika tidak ditemukan row khusus
        let totalApp = 0, totalTarget = 0;
        kecData.forEach(r => {
            totalApp += parseInt(r["APPROVED BY Pengawas"]) || 0;
            totalTarget += parseInt(r["Target Total"]) || parseInt(r["OPEN"]) || 0;
        });
        document.getElementById('kabApproved').innerText = totalApp.toLocaleString('id-ID');
        let ratio = totalTarget > 0 ? (totalApp / totalTarget) * 100 : 0;
        document.getElementById('kabProgres').innerText = ratio.toFixed(2) + "%";
    }
}

function buildKecamatanDropdown() {
    const kecData = globalData["Kecamatan"] || [];
    const select = $('#globalKecamatan');
    select.find('option:not(:first)').remove();
    
    kecData.forEach(row => {
        let val = row["Kecamatan"];
        if (val && !val.toLowerCase().includes("lampung timur")) {
            select.append(`<option value="${val}">${val}</option>`);
        }
    });
}

function populateSubFilters() {
    let kecSelected = $('#globalKecamatan').val();
    
    // Atur visibilitas input filter berdasar kedalaman tab yang aktif
    if (kecSelected === "") {
        $('#filterDesaWrapper, #filterPmlWrapper').addClass('hidden');
        return;
    }
    
    if (currentTab === "Desa" || currentTab === "SLS") {
        $('#filterDesaWrapper').removeClass('hidden');
        const desaSelect = $('#globalDesa');
        desaSelect.find('option:not(:first)').remove();
        
        let uniqueDesa = new Set();
        (globalData["Desa"] || []).forEach(r => {
            if (r["Kecamatan"] === kecSelected && r["Desa"]) uniqueDesa.add(r["Desa"]);
        });
        uniqueDesa.forEach(d => desaSelect.append(`<option value="${d}">${d}</option>`));
    } else {
        $('#filterDesaWrapper').addClass('hidden');
    }

    if (currentTab === "PETUGAS" || currentTab === "SLS") {
        $('#filterPmlWrapper').removeClass('hidden');
        const pmlSelect = $('#globalPml');
        pmlSelect.find('option:not(:first)').remove();
        
        let uniquePml = new Set();
        const srcSheet = currentTab === "SLS" ? "SLS" : "PETUGAS";
        (globalData[srcSheet] || []).forEach(r => {
            if (r["Kecamatan"] === kecSelected && r["PML"]) uniquePml.add(r["PML"]);
        });
        uniquePml.forEach(p => pmlSelect.append(`<option value="${p}">${p}</option>`));
    } else {
        $('#filterPmlWrapper').addClass('hidden');
    }
}

function executeGlobalFiltering() {
    // Jalankan ulang penggambaran tabel & grafik sesuai kombinasi filter
    const table = $('#mainDataTable').DataTable();
    
    let kec = $('#globalKecamatan').val();
    let desa = $('#globalDesa').val();
    let pml = $('#globalPml').val();

    // Reset filter kolom terdahulu
    table.columns().search('');

    if (kec) {
        let idxKec = getColumnIndexByName("Kecamatan");
        if (idxKec !== -1) table.column(idxKec).search(kec);
    }
    if (desa && !$('#filterDesaWrapper').hasClass('hidden')) {
        let idxDesa = getColumnIndexByName("Desa");
        if (idxDesa !== -1) table.column(idxDesa).search(desa);
    }
    if (pml && !$('#filterPmlWrapper').hasClass('hidden')) {
        let idxPml = getColumnIndexByName("PML");
        if (idxPml !== -1) table.column(idxPml).search(pml);
    }

    table.draw();
    renderMainVisualizations();
}

function getColumnIndexByName(name) {
    const table = $('#mainDataTable').DataTable();
    let idx = -1;
    table.columns().every(function(index) {
        if (this.header().innerText.trim() === name) {
            idx = index;
        }
    });
    return idx;
}

function switchTab(tabName) {
    currentTab = tabName;
    
    $('.tab-btn').removeClass('bg-blue-600 text-white shadow-sm').addClass('text-slate-600 hover:bg-slate-200');
    $(`#btn-${tabName}`).removeClass('text-slate-600 hover:bg-slate-200').addClass('bg-blue-600 text-white shadow-sm');
    
    // Tampilkan tombol filter penunjang yang relevan
    populateSubFilters();

    const dataSheet = globalData[tabName] || [];
    if (dataSheet.length === 0) return;

    if ($.fn.DataTable.isDataTable('#mainDataTable')) {
        $('#mainDataTable').DataTable().destroy();
        $('#mainDataTable').empty();
    }

    const columnsConfig = Object.keys(dataSheet[0]).map(key => {
        return { 
            title: key, 
            data: key, 
            defaultContent: "-",
            render: function(data, type, row) {
                if (type === 'display' && !isNaN(data) && data !== "" && data !== null && !key.toLowerCase().includes("id")) {
                    return Number(data).toLocaleString('id-ID');
                }
                return data;
            }
        };
    });

    // BANGUN DATATABLE DENGAN CONDITIONAL FORMATTING SISI SEL
    $('#mainDataTable').DataTable({
        data: dataSheet,
        columns: columnsConfig,
        dom: 'Bfrtip',
        buttons: [
            { extend: 'excelHtml5', title: `Monitoring_${tabName}`, className: 'bg-emerald-600 text-white text-[11px] px-3 py-1.5 rounded hover:bg-emerald-700 font-medium transition shadow-sm' }
        ],
        pageLength: 10,
        scrollX: true,
        // CONDITIONAL FORMATTING: Deteksi jika target disetujui bernilai minim
        createdRow: function(row, data, dataIndex) {
            let appValue = parseInt(data["APPROVED BY Pengawas"]) || 0;
            let openValue = parseInt(data["OPEN"]) || 0;
            let total = appValue + openValue;
            
            if (total > 0 && (appValue / total) < 0.2) {
                // Beri penanda warna merah soft pada baris jika capaian disetujui di bawah 20%
                $(row).addClass('bg-red-50/80');
            } else if (total > 0 && (appValue / total) >= 0.8) {
                // Hijau segar jika sudah mendominasi target selesai
                $(row).addClass('bg-emerald-50/50');
            }
        }
    });

    $('.dt-button').removeClass('dt-button');
    
    // Sesuaikan interface dropdown opsi filter grafik pembantu
    buildSubFilterChartOptions();
    renderMainVisualizations();
}

function buildSubFilterChartOptions() {
    const wrapper = $('#subFilterChartWrapper');
    const select = $('#subFilterChart');
    select.empty();

    if (currentTab === "Kecamatan") {
        wrapper.addClass('hidden');
    } else {
        wrapper.removeClass('hidden');
        select.append('<option value="all">Lihat Semua Data</option>');
        select.append('<option value="filter">Ikuti Filter Atas</option>');
    }
}

function renderMainVisualizations() {
    // Ambil data yang sudah lolos filter global untuk disajikan ke dalam Chart
    let kec = $('#globalKecamatan').val();
    let desa = $('#globalDesa').val();
    let pml = $('#globalPml').val();
    
    let filteredDataset = globalData[currentTab] || [];

    // Lakukan pemotongan array berdasar pilihan filter agar data grafik sinkron dengan tabel
    if (kec) filteredDataset = filteredDataset.filter(r => r["Kecamatan"] === kec);
    if (desa && currentTab === "Desa") filteredDataset = filteredDataset.filter(r => r["Desa"] === desa);
    if (pml && (currentTab === "PETUGAS" || currentTab === "SLS")) filteredDataset = filteredDataset.filter(r => r["PML"] === pml);

    // Limit grafik max 12 objek terdepan
    let chartSlice = filteredDataset.slice(0, 12);
    
    let labelKey = "Kecamatan";
    if (currentTab === "Desa") labelKey = "Desa";
    if (currentTab === "PETUGAS") labelKey = "PPL";
    if (currentTab === "SLS") labelKey = "nmsls";

    let labelsX = chartSlice.map(r => (r[labelKey] || 'Unknown').toString().replace(/\[.*?\]\s*/g, ''));
    let cType = $('#chartTypeToggle').val();

    if (mainChart) mainChart.destroy();

    const ctx = document.getElementById('progressChart').getContext('2d');

    if (cType === 'bar') {
        // MODE 1: STACKED BAR CHART 8 STATUS DOKUMEN
        const datasets = targetStatus.map(status => {
            return {
                label: status,
                data: chartSlice.map(r => parseInt(r[status]) || 0),
                backgroundColor: statusColors[status] || '#cbd5e1'
            };
        });

        mainChart = new Chart(ctx, {
            type: 'bar',
            data: { labels: labelsX, datasets: datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true } },
                plugins: { legend: { position: 'bottom', labels: { boxWidth: 8, font: { size: 8 } } } }
            }
        });
    } else {
        // MODE 2: PIE CHART KONTRIBUSI APPROVED ANTAR SUB-UNIT
        let pieData = chartSlice.map(r => parseInt(r["APPROVED BY Pengawas"]) || 0);
        mainChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: labelsX,
                datasets: [{
                    data: pieData,
                    backgroundColor: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#14b8a6', '#f43f5e', '#10b981', '#64748b', '#a855f7']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { position: 'right', labels: { boxWidth: 10, font: { size: 9 } } } }
            }
        });
    }

    // GAMBAR TREND GRAFIK: TARGET HARIAN VS CAPAIAN REAL (LINE CHART)
    renderTrendLineAnalysis();
}

function renderTrendLineAnalysis() {
    if (trendChart) trendChart.destroy();

    // Simulasi Akumulasi Kurva Kecepatan Entri Real Lapangan vs Target Ideal Berjalan
    let mockDates = ["15/06", "17/06", "19/06", "21/06", "23/06", "24/06"];
    
    // Contoh pengambilan data agregat riil vs akumulasi target ideal harian
    let targetIdealCurve = [1000, 3000, 6000, 12000, 18000, 24000];
    let realCapaianCurve = [800, 2100, 5400, 10500, 16200, 19800]; 

    const ctxTrend = document.getElementById('trendLineChart').getContext('2d');
    trendChart = new Chart(ctxTrend, {
        type: 'line',
        data: {
            labels: mockDates,
            datasets: [
                {
                    label: "Target Lintasan Ideal",
                    data: targetIdealCurve,
                    borderColor: '#475569',
                    borderDash: [5, 5],
                    fill: false,
                    tension: 0.1
                },
                {
                    label: "Realisasi Approved",
                    data: realCapaianCurve,
                    borderColor: '#10b981',
                    backgroundColor: '#10b981',
                    fill: false,
                    tension: 0.2
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, font: { size: 9 } } } },
            scales: { y: { beginAtZero: true } }
        }
    });
}
}
