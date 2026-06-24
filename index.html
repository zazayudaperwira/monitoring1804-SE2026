const API="https://script.google.com/macros/s/AKfycbw5gYyAM9v5JxW_70_TeBOyGB1yIAfqixzUgUp98BXPG50LNNQdz9Pr5uHrk_pXzRy4-A/exec";
let allData={};

function p(x){
return Number(x.PROGRES??x.Progres??x["Persentase Progres"]??0);
}
function pct(x){return (p(x)*100).toFixed(1)+"%";}

$(async()=>{
let j=await (await fetch(API)).json();
allData=j.data;

$("#updateInfo").text("Update : "+j.metadata.update);
$("#totalSLS").text(allData.SLS.length);
$("#totalDone").text(allData.SLS.reduce((a,b)=>a+Number(b["APPROVED BY Pengawas"]||0),0));
$("#progressCard").text(pct(allData.Kecamatan[0]));

rank();
switchTab("Kecamatan");
});

function rank(){

let kec=[...allData.Kecamatan].sort((a,b)=>p(b)-p(a));
let desa=[...allData.Desa].sort((a,b)=>p(b)-p(a));
let ppl=[...allData.PETUGAS].sort((a,b)=>p(b)-p(a));

draw(kec,"topKec");
draw(desa,"topDesa");
drawPpl(ppl,"topPetugas");
drawPpl([...ppl].reverse(),"bottomPetugas");

}

function draw(a,id){
$("#"+id).html(a.slice(0,10).map((x,i)=>`
<div class="border-b py-2">
<b>${i+1}</b> ${x.Kecamatan||x.Desa}<br>
PROGRES : ${pct(x)}
</div>`).join(""));
}

function drawPpl(a,id){
$("#"+id).html(a.slice(0,10).map((x,i)=>`
<div class="border-b py-2">
<b>${i+1}</b> ${x.PPL}<br>
${x.Kecamatan||""}<br>
Persentase Progres : ${pct(x)}
</div>`).join(""));
}

function switchTab(sheet){

if($.fn.DataTable.isDataTable("#mainTable"))
$("#mainTable").DataTable().destroy();

let d=allData[sheet];

$("#mainTable").DataTable({
data:d,
columns:Object.keys(d[0]).map(k=>({title:k,data:k})),
searching:true,
ordering:true,
scrollX:true
});

}
