// MASUKKAN URL WEB APP EXEC BARU ANDA DI SINI
const API_URL = "https://script.google.com/macros/s/AKfycbzXP7CRaQnhKdX1SCt8DM6tE8ZKI1IIn2OoUqs8qoKnv9_kt_UkR6TLZzQ1_FSQ_BxDrA/exec";

$(document).ready(function() {
    loadDataBerjenjang();
});

async function loadDataBerjenjang() {
    try {
        const response = await fetch(API_URL, { method: 'GET', redirect: 'follow' });
        const data = await response.json();
        
        document.getElementById('loader').classList.add('hidden');
        document.getElementById('dashboardContent').classList.remove('hidden');
        
        const skrg = new Date();
        document.getElementById('txtLastUpdate').innerText = `Sync: ${skrg.toLocaleTimeString('id-ID')} WIB`;
        
        buildTabel(data);
    } catch (error) {
        console.error("Gagal memuat data:", error);
        document.getElementById('loader').innerHTML = `
            <div class="p-4 text-center text-sm font-semibold text-red-500">
                Gagal memuat data matriks. Periksa setelan deploy Apps Script Anda.
            </div>
        `;
    }
}

function buildTabel(data) {
    if ($.fn.DataTable.isDataTable('#tableBerjenjang')) {
        $('#tableBerjenjang').DataTable().destroy();
    }

    // Terapkan konfigurasi kolom agar sesuai struktur gambar referensi
    $('#tableBerjenjang').DataTable({
        data: data,
        columns: [
            { data: "Kecamatan" },
            { data: "Desa" },
            { data: "PML" },
            { data: "PPL" },
            { data: "OPEN", render: $.fn.dataTable.render.number('.', ',', 0) },
            { data: "DRAFT", render: $.fn.dataTable.render.number('.', ',', 0) },
            { data: "SUBMITTED_BY_PENCACAH", render: $.fn.dataTable.render.number('.', ',', 0) },
            { data: "REJECTED_BY_PENGAWAS", render: $.fn.dataTable.render.number('.', ',', 0) },
            { data: "APPROVED_BY_PENGAWAS", render: $.fn.dataTable.render.number('.', ',', 0) },
            { data: "TOTAL_TARGET", render: $.fn.dataTable.render.number('.', ',', 0) },
            { 
                data: "PROGRES",
                render: function(data, type, row) {
                    let val = parseFloat(data) || 0;
                    let color = "text-rose-600 font-bold";
                    if (val >= 80) color = "text-emerald-600 font-bold";
                    else if (val >= 40) color = "text-amber-600 font-bold";
                    return `<span class="${color}">${data}</span>`;
                }
            }
        ],
        dom: 'Bfrtip',
        buttons: [
            { 
                extend: 'excelHtml5', 
                title: 'Monitoring_Progres_Berjenjang_1804', 
                className: 'bg-emerald-600 text-white font-medium text-xs px-4 py-2 rounded-lg hover:bg-emerald-700 transition' 
            }
        ],
        pageLength: 25,
        language: {
            search: "Cari Wilayah / Petugas:",
            paginate: { next: "→", previous: "←" }
        }
    });

    $('.dt-button').removeClass('dt-button');
}
