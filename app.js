const API = "https://script.google.com/macros/s/AKfycbw5gYyAM9v5JxW_70_TeBOyGB1yIAfqixzUgUp98BXPG50LNNQdz9Pr5uHrk_pXzRy4-A/exec";
let allData = {};
let chart = null;

const STATUS_COLS = ["OPEN", "DRAFT", "SUBMITTED BY Pencacah", "REJECTED BY Pengawas", "APPROVED BY Pengawas", "REVOKED BY Pengawas", "SUBMITTED RESPONDENT", "EDITED BY Pengawas"];

$(document).ready(function() {
    fetch(API).then(res => res.json()).then(res => {
        allData = res.data;
        $('#updateInfo').text("Update Terakhir: " + res.metadata.update);
        [...new Set(allData.Kecamatan.map(d => d.Kecamatan))].forEach(k => $('#fKec').append(`<option value="${k}">${k}</option>`));
        STATUS_COLS.forEach(s => $('#fStat').append(`<option value="${s}">${s}</option>`));
        switchTab('Kecamatan');
        updateChart();
    });
});

function updateChart() {
    if (!allData.SLS) return;
    const kec = $('#fKec').val();
    const desa = $('#fDesa').val();
    let labels = [], datasets = [];

    // DRILL-DOWN LOGIC
    if (kec === "") {
        labels = STATUS_COLS;
        let totals = STATUS_COLS.map(col => allData.SLS.reduce((sum, d) => sum + (Number(d[col]) || 0), 0));
        datasets = [{ label: 'Total Kabupaten', data: totals, backgroundColor: '#ea580c' }];
    } else if (desa === "") {
        const kecDesas = allData.Desa.filter(d => d.Kecamatan === kec).map(d => d.Desa);
        labels = kecDesas;
        datasets = STATUS_COLS.map((col, i) => ({
            label: col,
            data: labels.map(desaName => allData.SLS.filter(d => d.Desa === desaName).reduce((sum, d) => sum + (Number(d[col]) || 0), 0)),
            backgroundColor: `hsl(${(i * 45)}, 70%, 60%)`
        }));
    } else {
        const desaSLS = allData.SLS.filter(d => d.Desa === desa);
        labels = desaSLS.map(d => d.nmsls);
        datasets = STATUS_COLS.map((col, i) => ({
            label: col,
            data: desaSLS.map(d => Number(d[col]) || 0),
            backgroundColor: `hsl(${(i * 45)}, 70%, 60%)`
        }));
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
    if ($.fn.DataTable.isDataTable('#mainTable')) { $('#mainTable').DataTable().destroy(); $('#mainTable').empty(); }
    $('#mainTable').DataTable({ data: allData[sheet], columns: Object.keys(allData[sheet][0]).map(k => ({ title: k, data: k })), scrollX: true, destroy: true });
}

function applyFilters() {
    $('#mainTable').DataTable().search(`${$('#fKec').val()} ${$('#fDesa').val()} ${$('#fStat').val()}`.trim()).draw();
}

$('#fKec').change(function() { 
    $('#fDesa').html('<option value="">Semua Desa</option>');
    allData.Desa.filter(d => d.Kecamatan === $(this).val()).forEach(d => $('#fDesa').append(`<option value="${d.Desa}">${d.Desa}</option>`));
    updateChart(); applyFilters();
});

$('#fDesa').change(() => { updateChart(); applyFilters(); });
$('#fStat').change(() => applyFilters());

function resetFilters() {
    $('#fKec').val(""); $('#fDesa').html('<option value="">Semua Desa</option>').val(""); $('#fStat').val("");
    updateChart(); applyFilters();
}
