
const API="https://script.google.com/macros/s/AKfycbw5gYyAM9v5JxW_70_TeBOyGB1yIAfqixzUgUp98BXPG50LNNQdz9Pr5uHrk_pXzRy4-A/exec";

let allData={};
let chart=null;

function getProgress(x){
    return Number(
        x.PROGRES ??
        x.Progres ??
        x["Persentase Progres"] ??
        0
    );
}

function pct(x){
    return (getProgress(x)*100).toFixed(1)+"%";
}


$(document).ready(async function(){

let res=await fetch(API);
let json=await res.json();

allData=json.data;

$("#updateInfo").text("Update Terakhir : "+json.metadata.update);

loadFilter();
updateKPI();
updateLeaderboard();
switchTab("Kecamatan");
updateChart();

});



function updateKPI(){

$("#totalSLS").text(allData.SLS.length);

let kec=allData.Kecamatan.find(x=>x.Kecamatan==="Lampung Timur");

if(kec){
$("#kabProgres").text(pct(kec));
$("#progressCard").text(pct(kec));
}

}



function loadFilter(){

[...new Set(allData.Kecamatan.map(x=>x.Kecamatan))]
.forEach(x=>{
$("#fKec").append(`<option>${x}</option>`);
});

}



function updateLeaderboard(){

let kec=[...allData.Kecamatan]
.sort((a,b)=>getProgress(b)-getProgress(a));

let desa=[...allData.Desa]
.sort((a,b)=>getProgress(b)-getProgress(a));

let ppl=[...allData.PETUGAS]
.sort((a,b)=>getProgress(b)-getProgress(a));


renderKecDesa(kec,"topKec");
renderKecDesa(desa,"topDesa");

renderPPL(ppl,"topPetugas");

renderPPL([...ppl].reverse(),"bottomPetugas");

}



function renderKecDesa(data,id){

$("#"+id).html(

data.slice(0,10).map((x,i)=>`

<div class="border-b py-2">

<b>${i+1}</b>
${x.Kecamatan || x.Desa}

<br>

<span class="text-xs text-gray-500">
PROGRES : ${pct(x)}
</span>

</div>

`).join("")

);

}



function renderPPL(data,id){

$("#"+id).html(

data.slice(0,10).map((x,i)=>`

<div class="border-b py-2">

<b>${i+1}</b>
${x.PPL}

<br>

<span class="text-xs text-gray-500">
${x.Kecamatan || ""}
<br>
Persentase Progres : ${pct(x)}
</span>

</div>

`).join("")

);

}




function switchTab(sheet){

if($.fn.DataTable.isDataTable("#mainTable")){
$("#mainTable").DataTable().clear().destroy();
}


let rows=allData[sheet] || [];


$("#mainTable").DataTable({

data:rows,

columns:Object.keys(rows[0]).map(k=>({

title:k,

data:k,

render:function(data){

if(
k==="PROGRES" ||
k==="Progres" ||
k==="Persentase Progres"
){

return pct({[k]:data});

}

return data;

}

})),

destroy:true,

scrollX:true,

pageLength:10,

searching:true,

ordering:true

});

}



function updateChart(){

let data=allData.SLS;

let labels=[...new Set(data.map(x=>x.Desa))];


let datasets=[
"OPEN",
"DRAFT",
"SUBMITTED BY Pencacah",
"REJECTED BY Pengawas",
"APPROVED BY Pengawas"
].map(s=>({

label:s,

data:labels.map(d=>
data.filter(x=>x.Desa==d)
.reduce((a,b)=>a+Number(b[s]||0),0)
)

}));


if(chart)chart.destroy();


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


function resetFilters(){

$("#fKec").val("");

$("#fDesa").html(
'<option value="">Semua Desa</option>'
);

updateChart();

}
