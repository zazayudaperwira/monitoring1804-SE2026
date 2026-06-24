const API="https://script.google.com/macros/s/AKfycbw5gYyAM9v5JxW_70_TeBOyGB1yIAfqixzUgUp98BXPG50LNNQdz9Pr5uHrk_pXzRy4-A/exec";

let allData={};
let chart=null;

const STATUS_COLS=[
"OPEN",
"DRAFT",
"SUBMITTED BY Pencacah",
"REJECTED BY Pengawas",
"APPROVED BY Pengawas",
"REVOKED BY Pengawas",
"SUBMITTED RESPONDENT",
"EDITED BY Pengawas"
];


$(document).ready(function(){

fetch(API)
.then(r=>r.json())
.then(res=>{

allData=res.data;

$("#updateInfo").text("Update Terakhir : "+res.metadata.update);

loadFilter();
updateKPI();
updateLeaderboard();

switchTab("Kecamatan");
updateChart();

});

});



function updateKPI(){

let sls=allData.SLS||[];

$("#totalSLS").text(sls.length);

let done=sls.reduce((a,b)=>a+Number(b["APPROVED BY Pengawas"]||0),0);

$("#totalDone").text(done);

if(allData.Kecamatan){

let d=allData.Kecamatan.find(x=>x.Kecamatan==="Lampung Timur");

if(d){
let p=Number(d.PROGRES)*100;
$("#kabProgres").text(p.toFixed(1)+"%");
$("#progressCard").text(p.toFixed(1)+"%");
}

}

}



function loadFilter(){

[...new Set(allData.Kecamatan.map(x=>x.Kecamatan))]
.forEach(k=>{

$("#fKec").append(`<option>${k}</option>`)

});

}



$("#fKec").change(function(){

$("#fDesa").html('<option value="">Semua Desa</option>');

allData.Desa
.filter(x=>x.Kecamatan==$(this).val())
.forEach(d=>{

$("#fDesa").append(`<option>${d.Desa}</option>`)

});

updateChart();

applyFilters();

});


$("#fDesa").change(function(){

updateChart();
applyFilters();

});



function updateChart(){

let kec=$("#fKec").val();
let desa=$("#fDesa").val();

let data=allData.SLS.filter(x=>
(!kec||x.Kecamatan==kec)&&
(!desa||x.Desa==desa)
);


let labels=[];
let datasets=STATUS_COLS.map(x=>({
label:x,
data:[]
}));


if(kec=="" && desa==""){

labels=["Kabupaten"];

datasets.forEach(ds=>{
ds.data=[
data.reduce((a,b)=>a+Number(b[ds.label]||0),0)
]
});

}else{

labels=[...new Set(data.map(x=>x.Desa))];

datasets.forEach(ds=>{

ds.data=labels.map(l=>
data.filter(x=>x.Desa==l)
.reduce((a,b)=>a+Number(b[ds.label]||0),0)
)

});

}



if(chart)chart.destroy();

chart=new Chart(
document.getElementById("progresChart"),
{
type:"bar",
data:{labels,datasets},
options:{
responsive:true,
maintainAspectRatio:false,
scales:{
x:{stacked:true},
y:{stacked:true}
}
}
}
);

}



function updateLeaderboard(){

renderRank(allData.Kecamatan,"topKec");
renderRank(allData.Desa,"topDesa");

let ppl=[...allData.PETUGAS]
.sort((a,b)=>Number(b["Persentase Progres"])-Number(a["Persentase Progres"]));

renderRank(ppl,"topPetugas");

renderRank(ppl.slice().reverse(),"bottomPetugas");

}



function renderRank(data,id){

$("#"+id).html(

data.slice(0,10).map((x,i)=>`

<div class="border-b py-2">
<b>${i+1}</b>
${x.PPL||x.Desa||x.Kecamatan}
</div>

`).join("")

);

}



function switchTab(sheet){

if($.fn.DataTable.isDataTable("#mainTable")){
$("#mainTable").DataTable().destroy();
}


$("#mainTable").DataTable({

data:allData[sheet],

columns:Object.keys(allData[sheet][0])
.map(k=>({
title:k,
data:k
})),

scrollX:true

});


}



function applyFilters(){

if($.fn.DataTable.isDataTable("#mainTable")){

$("#mainTable")
.DataTable()
.search(
$("#fKec").val()+" "+
$("#fDesa").val()
)
.draw();

}

}



function resetFilters(){

$("#fKec").val("");

$("#fDesa")
.html('<option value="">Semua Desa</option>');

updateChart();

}

