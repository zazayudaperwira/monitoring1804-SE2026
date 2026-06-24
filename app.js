const API = "https://script.google.com/macros/s/AKfycbw5gYyAM9v5JxW_70_TeBOyGB1yIAfqixzUgUp98BXPG50LNNQdz9Pr5uHrk_pXzRy4-A/exec";
let allData = {};
let chart = null;
const STATUS_COLS = ["OPEN", "DRAFT", "SUBMITTED BY Pencacah", "REJECTED BY Pengawas", "APPROVED BY Pengawas", "REVOKED BY Pengawas", "SUBMITTED RESPONDENT", "EDITED BY Pengawas"];

$(document).ready(function() {
    let progress = 0;
    let interval = setInterval(() => { progress += 10; $('#progressBar').css('width', progress + '%'); if(progress >= 90) clearInterval(interval); }, 150);

    fetch(API).then(res => res.json()).then(res => {
        clearInterval(interval);
        $('#progressBar').css('width', '100%');
        setTimeout(() => $('#progressContainer').hide(), 300);
        
        allData = res.data;
        $('#updateInfo').text("Update Terakhir: " + res.metadata.update);
        
        // Fix NaN Progres
        const kabData = allData.Kecamatan ? allData.Kecamatan.find(d => d.Kecamatan === "Lampung Timur") : null;
        const progVal = (kabData && kabData.Progres) ? (parseFloat(kabData.Progres) * 100) : 0;
        $('#kabProgres').text((isNaN(progVal) ? 0 : progVal.toFixed(1)) + "%");
        
        renderRanking();
        [...new Set(allData.Kecamatan.map(d => d.Kecamatan))].forEach(k => $('#fKec').append(`<option value="${k}">${k}</option>`));
        switchTab('Kecamatan');
        updateChart();
    });
});

function renderRanking() {
    if (!allData.PETUGAS) return;
    let sorted = [...allData.PETUGAS].sort((a,b) => b.Progres - a.Progres);
    let top = sorted.slice(0, 10);
    let bot = sorted.slice(-10).reverse();
    
    let html = `<div class="text-green-600 font-bold mb-2">🚀 TOP 10 PETUGAS</div>`;
    top.forEach(p => html += `<div class="flex justify-between border-b p-1"><span>${p.Petugas}</span><span class="font-bold">${(p.Progres*100).toFixed(1)}%</span></div>`);
    html += `<div class="text-red-600 font-bold mt-4 mb-2">📉 BOTTOM 10 PETUGAS</div>`;
    bot.forEach(p => html += `<div class="flex justify-between border-b p-1"><span>${p.Petugas}</span><span class="font-bold">${(p.Progres*100).toFixed(1)}%</span></div>`);
    $('#rankingPetugas').html(html);
}

function updateChart() {
    if (!allData.SLS) return;
    const kec = $('#fKec').val();
    const desa = $('#fDesa').val();
    let filteredData = allData.SLS.filter(d => (kec === "" || d.Kecamatan.includes(kec)) && (desa === "" || d.Desa.includes(desa)));
    let labels = [], datasets = STATUS_COLS.map((col, i) => ({ label: col, data: [], backgroundColor: `hsl(${(i * 45)}, 70%, 60%)` }));

    if (kec === "") {
        labels = ["Kabupaten"];
        datasets.forEach(ds => ds.data = [filteredData.reduce((sum, d) => sum + (Number(d[ds.label]) || 0), 0)]);
    } else if (desa === "") {
        labels = allData.Desa.filter(d => d.Kecamatan === kec).map(d => d.Desa);
        datasets.forEach(ds => ds.data = labels.map(dName => filteredData.filter(d => d.Desa === dName).reduce((sum, d) => sum + (Number(d[ds.label]) || 0), 0)));
    } else {
        const desaSLS = filteredData.filter(d => d.Desa === desa);
        labels = desaSLS.map(d => d.nmsls);
        datasets.forEach(ds => ds.data = desaSLS.map(d => Number(d[ds.label]) || 0));
    }

    if(chart) chart.destroy();
    chart = new Chart(document.getElementById('progresChart').getContext('2d'), {
        type: 'bar',
        data: { labels: labels, datasets: datasets },
        options: { responsive: true, maintainAspectRatio: false, scales: { x: { stacked: true }, y: { stacked: true } } }
    });
}

function switchTab(sheet) {
    if (!allData[sheet]) return;
    $('.tab-btn').removeClass('bg-orange-600 text-white').addClass('bg-orange-100 text-orange-700');
    $(`button[onclick="switchTab('${sheet}')"]`).addClass('bg-orange-600 text-white').removeClass('bg-orange-100 text-orange-700');
    
    if ($.fn.DataTable.isDataTable('#mainTable')) { $('#mainTable').DataTable().destroy(); $('#mainTable').empty(); }
    
    $('#mainTable').DataTable({ 
        data: allData[sheet], 
        columns: Object.keys(allData[sheet][0]).map(k => ({ 
            title: k, data: k,
            render: (data) => (k.toLowerCase().includes('progres') && typeof data === 'number') ? (data * 100).toFixed(1) + '%' : data
        })),
        scrollX: true, destroy: true,
        rowCallback: function(row, data) {
            const target = data['Target Harian'] ? String(data['Target Harian']).toLowerCase() : "";
            if (target.includes('kurang')) {
                $(row).find('td').css({ 'color': 'red', 'font-weight': 'bold' });
            }
        },
        initComplete: () => applyFilters() 
    });
}

function applyFilters() { if($.fn.DataTable.isDataTable('#mainTable')) $('#mainTable').DataTable().search(`${$('#fKec').val()} ${$('#fDesa').val()}`.trim()).draw(); }
$('#fKec').change(function() { 
    $('#fDesa').html('<option value="">Semua Desa</option>');
    allData.Desa.filter(d => d.Kecamatan === $(this).val()).forEach(d => $('#fDesa').append(`<option value="${d.Desa}">${d.Desa}</option>`));
    updateChart(); applyFilters();
});
$('#fDesa').change(() => { applyFilters(); updateChart(); });
function resetFilters() { location.reload(); }
