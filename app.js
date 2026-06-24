const API =
"https://script.google.com/macros/s/AKfycbw5gYyAM9v5JxW_70_TeBOyGB1yIAfqixzUgUp98BXPG50LNNQdz9Pr5uHrk_pXzRy4-A/exec";


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



function persen(x){

return (getProgress(x)*100)
.toFixed(1)+"%";

}






$(async function(){


let res =
await fetch(API);


let json =
await res.json();



allData=json.data;



$("#updateInfo")
.text(
"Update : "+json.metadata.update
);



loadFilter();


updateKPI();


ranking();



switchTab("Kecamatan");


chartUpdate();



});









function updateKPI(){



$("#totalSLS")
.text(
allData.SLS.length
);



let done =
allData.SLS.reduce(
(a,b)=>
a+Number(
b["APPROVED BY Pengawas"]||0
),0);


$("#totalDone")
.text(done);




let kab =
allData.Kecamatan[0];


$("#kabProgres")
.text(
persen(kab)
);


$("#progressCard")
.text(
persen(kab)
);



}









function loadFilter(){


[...new Set(
allData.Kecamatan.map(x=>x.Kecamatan)
)]
.forEach(x=>{


$("#fKec")
.append(
`
<option>
${x}
</option>
`
);


});


}









function ranking(){



render(
[...allData.Kecamatan]
.sort((a,b)=>
getProgress(b)-getProgress(a)),
"topKec",
"Kecamatan"
);



render(
[...allData.Desa]
.sort((a,b)=>
getProgress(b)-getProgress(a)),
"topDesa",
"Desa"
);



let ppl =
[...allData.PETUGAS]
.sort((a,b)=>
getProgress(b)-getProgress(a));



renderPPL(
ppl,
"topPetugas"
);



renderPPL(
[...ppl].reverse(),
"bottomPetugas"
);



}









function render(data,id,type){


$("#"+id)
.html(

data.slice(0,10)
.map((x,i)=>`

<div class="border-b py-3">

<b>${i+1}</b>
${x[type]}


<br>

<span class="text-gray-500 text-sm">

PROGRES :
${persen(x)}

</span>


</div>


`)
.join("")


);


}









function renderPPL(data,id){


$("#"+id)
.html(

data.slice(0,10)
.map((x,i)=>`

<div class="border-b py-3">


<b>${i+1}</b>
${x.PPL}


<br>


<span class="text-sm text-gray-500">

${x.Kecamatan}


<br>

Persentase Progres :
${persen(x)}

</span>


</div>


`)
.join("")


);



}









function switchTab(sheet){



if(
$.fn.DataTable.isDataTable("#mainTable")
){

$("#mainTable")
.DataTable()
.destroy();


}



let data =
allData[sheet];




$("#mainTable")
.DataTable({



data:data,



columns:

Object.keys(data[0])
.map(k=>({


title:k,


data:k,


render:function(v){



if(
k=="PROGRES" ||
k=="Progres" ||
k=="Persentase Progres"
)

return (Number(v)*100).toFixed(1)+"%";


return v;



}


})),


pageLength:10,

searching:true,

ordering:true,

scrollX:true



});



}









function chartUpdate(){


let data =
allData.SLS;


let desa =
[...new Set(
data.map(x=>x.Desa)
)];



let selesai =
desa.map(d=>

data.filter(x=>x.Desa==d)
.reduce(
(a,b)=>
a+
Number(
b["APPROVED BY Pengawas"]||0
),
0)

);



if(chart)
chart.destroy();



chart =
new Chart(
document.getElementById("progresChart"),


{


type:"bar",


data:{


labels:desa,


datasets:[{


label:"Selesai",


data:selesai


}]


}


}

);


}






function resetFilters(){

$("#fKec").val("");

$("#fDesa").val("");

chartUpdate();

}
