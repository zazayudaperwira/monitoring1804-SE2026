
const API="https://script.google.com/macros/s/AKfycbw5gYyAM9v5JxW_70_TeBOyGB1yIAfqixzUgUp98BXPG50LNNQdz9Pr5uHrk_pXzRy4-A/exec";

let allData={};
let chart=null;

const STATUS_COLS=[
"OPEN","DRAFT","SUBMITTED BY Pencacah",
"REJECTED BY Pengawas","APPROVED BY Pengawas",
"REVOKED BY Pengawas","SUBMITTED RESPONDENT",
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



function progressValue(x){

return Number(
x.PROGRES ??
x["Persentase Progres"] ??
0
);

}



function updateKPI(){

let d=allData.Kecamatan.find(x=>x.Kecamatan==="Lampung Timur");

if(d){

let p=progressValue(d)*100;

$("#kabProgres").text(p.toFixed(1)+"%");
}

$("#totalSLS").text(allData.SLS.length);

}



function loadFilter(){

[...new Set(allData.Kecamatan.map(x=>x.Kecamatan))]
.forEach(k=>{

$("#fKec").append(`<option value="${k}">${k}</option>`)

});

}



$("#fKec").change(function(){

$("#fDesa").html('<option value="">Semua Desa</option>');

allData.Desa
.filter(x=>x.Kecamatan==$(this).val())
.forEach(x=>{

$("#fDesa").append(`<option value="${x.Desa}">${x.Desa}</option>`)

});


updateChart();
applyFilters();

});


$("#fDesa").change(function(){

updateChart();
applyFilters();

});




function sortProgress(arr){

return [...arr].sort((a,b)=>
progressValue(b)-progressValue(a)
);

}



function updateLeaderboard(){


renderRank(sortProgress(allData.Kecamatan),"topKec");

renderRank(sortProgress(allData.Desa),"topDesa");


let ppl=sortProgress(allData.PETUGAS);


renderRank(ppl,"topPetugas",true);

renderRank(
[...ppl].reverse(),
"bottomPetugas",
true
);


}



function renderRank(data,id,isPPL=false){


$("#"+id).html(

data.slice(0,10)
.map((x,i)=>{

let nama=x.PPL||x.Desa||x.Kecamatan;

let p=(progressValue(x)*100).toFixed(1);

return `
<div class="border-b py-2">
<b>${i+1}</b> ${nama}
<br>
<span class="text-xs text-gray-500">
Progress ${p}%
</span>
</div>
`

})
.join("")

)

}




function updateChart(){

let kec=$("#fKec").val();
let desa=$("#fDesa").val();

let data=allData.SLS.filter(x=>
(!kec || x.Kecamatan==kec)
&&
(!desa || x.Desa==desa)
);


let labels=[];
let datasets=STATUS_COLS.map(x=>({
label:x,
data:[]
}));


if(!kec){

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
);

});

}



if(chart) chart.destroy();


chart=new Chart(
document.getElementById("progresChart"),
{

type:"bar",

data:{
labels,
datasets
},

options:{
responsive:true,
maintainAspectRatio:false,
scales:{
x:{stacked:true},
y:{stacked:true}
}
}

});

}




function switchTab(sheet){

if($.fn.DataTable.isDataTable("#mainTable")){

$("#mainTable").DataTable().destroy();

}


let btn=`button[onclick="switchTab('${sheet}')"]`;

$(".tab-btn")
.removeClass("bg-orange-600 text-white");


$(btn)
.addClass("bg-orange-600 text-white");



$("#mainTable").DataTable({

data:allData[sheet],

columns:Object.keys(allData[sheet][0])
.map(k=>({

title:k,
data:k,

render:function(data){

if(k.toLowerCase().includes("progres"))

return (Number(data)*100).toFixed(1)+"%";

return data;

}

})),

scrollX:true,

destroy:true

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

