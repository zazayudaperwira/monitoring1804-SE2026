
const API="https://script.google.com/macros/s/AKfycbw5gYyAM9v5JxW_70_TeBOyGB1yIAfqixzUgUp98BXPG50LNNQdz9Pr5uHrk_pXzRy4-A/exec";

let allData={};
let chart=null;

const getProg=x=>Number(x.PROGRES ?? x.Progres ?? x["Persentase Progres"] ?? 0);
const pct=x=>(getProg(x)*100).toFixed(1)+"%";


$(async function(){

const res=await fetch(API);
const json=await res.json();

allData=json.data;

$("#updateInfo").text("Update Terakhir : "+json.metadata.update);

const kab=allData.Kecamatan.find(x=>x.Kecamatan==="Lampung Timur");
if(kab) $("#kabProgres").text(pct(kab));

loadFilter();
updateLeaderboard();
switchTab("Kecamatan");
updateChart();

});


function loadFilter(){

[...new Set(allData.Kecamatan.map(x=>x.Kecamatan))]
.forEach(x=>{
$("#fKec").append(`<option value="${x}">${x}</option>`);
});

}


function updateLeaderboard(){

let kec=[...allData.Kecamatan].sort((a,b)=>getProg(b)-getProg(a));
let desa=[...allData.Desa].sort((a,b)=>getProg(b)-getProg(a));
let ppl=[...allData.PETUGAS].sort((a,b)=>getProg(b)-getProg(a));

renderArea(kec,"topKec","Kecamatan");
renderArea(desa,"topDesa","Desa");

renderPPL(ppl,"topPetugas");
renderPPL([...ppl].reverse(),"bottomPetugas");

}


function renderArea(data,id,key){

$("#"+id).html(data.slice(0,10).map((x,i)=>`

<div class="border-b py-2">
<b>${i+1}</b> ${x[key]}
<br>
<span class="text-gray-500">
PROGRES : ${pct(x)}
</span>
</div>

`).join(""));

}


function renderPPL(data,id){

$("#"+id).html(data.slice(0,10).map((x,i)=>`

<div class="border-b py-2">
<b>${i+1}</b> ${x.PPL}
<br>
<span class="text-gray-500">
${x.Kecamatan}
<br>
Persentase Progres : ${pct(x)}
</span>
</div>

`).join(""));

}



function switchTab(sheet){

if(!allData[sheet]) return;

if($.fn.DataTable.isDataTable("#mainTable")){
$("#mainTable").DataTable().clear().destroy();
$("#mainTable").empty();
}

let data=allData[sheet];

$("#mainTable").DataTable({

data:data,

columns:Object.keys(data[0]).map(k=>({

title:k,
data:k,

render:function(v){

if(["PROGRES","Progres","Persentase Progres"].includes(k))
return (Number(v)*100).toFixed(1)+"%";

return v;

}

})),

scrollX:true,
pageLength:10,
searching:true,
ordering:true

});

}



function updateChart(){

if(!allData.SLS)return;

let data=allData.SLS;

let labels=[...new Set(data.map(x=>x.Desa))];

let values=labels.map(d=>
data.filter(x=>x.Desa===d)
.reduce((a,b)=>a+Number(b["APPROVED BY Pengawas"]||0),0)
);


if(chart) chart.destroy();

chart=new Chart(
document.getElementById("progresChart"),
{
type:"bar",
data:{
labels:labels,
datasets:[{
label:"APPROVED BY Pengawas",
data:values
}]
},
options:{
responsive:true,
maintainAspectRatio:false
}
});

}


function resetFilters(){
updateChart();
}
