
const API="https://script.google.com/macros/s/AKfycbw5gYyAM9v5JxW_70_TeBOyGB1yIAfqixzUgUp98BXPG50LNNQdz9Pr5uHrk_pXzRy4-A/exec";

let allData={};
let chart=null;


$(async function(){

let res=await fetch(API);
let json=await res.json();

allData=json.data;

$("#updateInfo").text("Update : "+json.metadata.update);


loadFilter();

showKPI();

switchTab("Kecamatan");

chartUpdate();

leaderboard();

});



function showKPI(){

let kec=allData.Kecamatan;

if(kec){

let d=kec.find(x=>x.Kecamatan==="Lampung Timur");

if(d)
$("#kabProgres")
.text((d.PROGRES*100).toFixed(1)+"%");

}

}



function loadFilter(){

[...new Set(allData.Kecamatan.map(x=>x.Kecamatan))]
.forEach(x=>{

$("#fKec").append(
`<option>${x}</option>`
)

})

}



$("#fKec").change(function(){

$("#fDesa").html(
'<option value="">Semua Desa</option>'
);


allData.Desa
.filter(x=>x.Kecamatan==$(this).val())
.forEach(x=>{

$("#fDesa").append(
`<option>${x.Desa}</option>`
)

});


chartUpdate();

});

$("#fDesa").change(chartUpdate);



function chartUpdate(){

let data=allData.SLS;


let kec=$("#fKec").val();
let desa=$("#fDesa").val();


data=data.filter(x=>
(!kec||x.Kecamatan==kec)
&&
(!desa||x.Desa==desa)
);


let labels=data.map(x=>x.nmsls);


let values=data.map(x=>
Object.keys(x)
.filter(k=>k=="APPROVED BY Pengawas")
.reduce((a,k)=>a+Number(x[k]||0),0)
);



if(chart) chart.destroy();


chart=new Chart(
document.getElementById("progresChart"),
{

type:"bar",

data:{
labels,
datasets:[
{
label:"Selesai",
data:values
}
]
},

options:{
responsive:true,
maintainAspectRatio:false
}

});

}



function leaderboard(){

makeList(allData.Kecamatan,"topKec");
makeList(allData.Desa,"topDesa");
makeList(allData.PETUGAS,"topPetugas");

}


function makeList(arr,id){

if(!arr)return;

$("#"+id).html(

arr.slice(0,10)
.map((x,i)=>
`
<div class="border-b py-2">
${i+1}. ${x.Kecamatan||x.Desa||x.PPL}
</div>
`
)
.join("")

)

}



function switchTab(sheet){

if(!allData[sheet])return;


if($.fn.dataTable.isDataTable("#mainTable"))
$("#mainTable").DataTable().destroy();



new DataTable("#mainTable",{

data:allData[sheet],

columns:Object.keys(allData[sheet][0])
.map(k=>({
title:k,
data:k
})),

scrollX:true

});


}



function resetFilters(){

$("#fKec").val("");

$("#fDesa")
.html('<option value="">Semua Desa</option>');


chartUpdate();

}
