const API = "https://script.google.com/macros/s/AKfycbw5gYyAM9v5JxW_70_TeBOyGB1yIAfqixzUgUp98BXPG50LNNQdz9Pr5uHrk_pXzRy4-A/exec";
let allData = {};

async function init() {
    // Simulasi loading progres
    let progress = 0;
    const interval = setInterval(() => {
        progress += 10;
        $('#progress-bar').css('width', progress + '%');
        $('#perc').text(progress);
        if (progress >= 90) clearInterval(interval);
    }, 200);

    const res = await fetch(API);
    allData = await res.json();
    
    $('#progress-bar').css('width', '100%');
    $('#perc').text(100);
    $('#loader').fadeOut();

    $('#updateInfo').text("Update Terakhir: " + allData.metadata.update);
    setupFilters();
    switchTab('Kecamatan');
}

function setupFilters() {
    const kecs = [...new Set(allData.data.Kecamatan.map(d => d.Kecamatan))];
    kecs.forEach(k => $('#fKec').append(`<option value="${k}">${k}</option>`));
    
    $('#fKec').change(() => {
        const selected = $('#fKec').val();
        $('#fDesa').html('<option value="">Semua Desa</option>');
        const desas = allData.data.Desa.filter(d => d.Kecamatan.includes(selected));
        desas.forEach(d => $('#fDesa').append(`<option value="${d.Desa}">${d.Desa}</option>`));
    });
}

function switchTab(sheet) {
    const table = $('#mainTable').DataTable();
    table.destroy();
    $('#mainTable').DataTable({
        data: allData.data[sheet],
        columns: Object.keys(allData.data[sheet][0]).map(k => ({ title: k, data: k })),
        scrollX: true
    });
}

$(document).ready(init);
