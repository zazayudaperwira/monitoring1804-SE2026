
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


function getProgress(row){

    if(row.PROGRES !== undefined)
        return Number(row.PROGRES);

    if(row.Progres !== undefined)
        return Number(row.Progres);

    if(row["Persentase Progres"] !== undefined)
        return Number(row["Persentase Progres"]);

    return 0;
}



$(document).ready(function(){

fetch(API)
.then(r=>r.json())
.then(res=>{

allData=res.data;

$("#updateInfo").text(
"Update Terakhir : "+res.metadata.update
);

loadFilter();

updateKPI();

updateLeaderboard();

switchTab("Kecamatan");

updateChart();

});

});



function updateKPI(){

let sls=allData.SLS || [];

$("#totalSLS").text(sls.length);


let kec=allData.Kecamatan
.find(x=>x.Kecamatan==="Lampung Timur");


if(kec){

let p=getProgress(kec)*100;

$("#kabProgres").text(
p.toFixed(1)+"%"
);

$("#progressCard").text(
p.toFixed(1)+"%"
);

}

}



function loadFilter(){

[...new Set(
allData.Kecamatan.map(x=>x.Kecamatan)
)]
.forEach(x=>{

$("#fKec").append(
`<option value="${x}">${x}</option>`
);

});

}



$("#fKec").change(function(){

$("#fDesa").html(
'<option value="">Semua Desa</option>'
);


allData.Desa
.filter(x=>x.Kecamatan==$(this).val())
.forEach(x=>{

$("#fDesa").append(
`<option value="${x.Desa}">${x.Desa}</option>`
);

});


updateChart();

});



$("#fDesa").change(updateChart);



function updateLeaderboard(){


renderRank(
[...allData.Kecamatan]
.sort((a,b)=>getProgress(b)-getProgress(a)),
"topKec"
);


renderRank(
[...allData.Desa]
.sort((a,b)=>getProgress(b)-getProgress(a)),
"topDesa"
);



let ppl=[
...allData.PETUGAS
];


ppl.sort(
(a,b)=>getProgress(b)-getProgress(a)
);


renderRank(
ppl,
"topPetugas",
true
);


renderRank(
[...ppl].reverse(),
"bottomPetugas",
true
);

}



function renderRank(data,id){

$("#"+id).html(

data.slice(0,10)
.map((x,i)=>{

let nama=
x.PPL ||
x.Desa ||
x.Kecamatan;


return `
<div class="border-b py-2">
<b>${i+1}.</b> ${nama}
<br>
<span class="text-xs text-gray-500">
Progress : ${(getProgress(x)*100).toFixed(1)}%
</span>
</div>
`;

})
.join("")

);

}



function switchTab(sheet){

if($.fn.DataTable.isDataTable("#mainTable")){

$("#mainTable")
.DataTable()
.destroy();

}


$("#mainTable").DataTable({

data:allData[sheet],

columns:
Object.keys(allData[sheet][0])
.map(k=>({

title:k,

data:k,

render:function(data,type,row){

if(
k==="PROGRES" ||
k==="Progres" ||
k==="Persentase Progres"
){

return (Number(data)*100)
.toFixed(1)+"%";

}

return data;

}

})),

scrollX:true

});


}



function updateChart(){

let kec=$("#fKec").val();
let desa=$("#fDesa").val();


let data=allData.SLS.filter(x=>

(!kec || x.Kecamatan==kec)
&&
(!desa || x.Desa==desa)

);



let labels=[...new Set(
data.map(x=>x.Desa)
)];


let datasets=STATUS_COLS.map(s=>({

label:s,

data:labels.map(l=>

data.filter(x=>x.Desa==l)
.reduce((a,b)=>
a+Number(b[s]||0),0)

)

}));


if(chart)
chart.destroy();


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

x:{
stacked:true
},

y:{
stacked:true
}

}

}

}

);

}


function resetFilters(){

$("#fKec").val("");

$("#fDesa")
.html(
'<option value="">Semua Desa</option>'
);

updateChart();

}
