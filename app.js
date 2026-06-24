const API =
"https://script.google.com/macros/s/AKfycbw5gYyAM9v5JxW_70_TeBOyGB1yIAfqixzUgUp98BXPG50LNNQdz9Pr5uHrk_pXzRy4-A/exec";


let allData={};
let currentTable=null;
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

    return (getProgress(x)*100).toFixed(1)+"%";

}




$(document).ready(async function(){


let res=await fetch(API);

let json=await res.json();


allData=json.data;



$("#updateInfo")
.text(
"Update Terakhir : "+json.metadata.update
);



updateKPI();


loadFilter();

function updateRanking(){


let kec =
[...allData.Kecamatan]
.sort(
(a,b)=>
getProgress(b)-getProgress(a)
);



let desa =
[...allData.Desa]
.sort(
(a,b)=>
getProgress(b)-getProgress(a)
);



let ppl =
[...allData.PETUGAS]
.sort(
(a,b)=>
getProgress(b)-getProgress(a)
);





renderWilayah(
kec,
"topKecamatan",
5,
"Kecamatan"
);



renderWilayah(
[...kec].reverse(),
"bottomKecamatan",
5,
"Kecamatan"
);





renderWilayah(
desa,
"topDesa",
5,
"Desa"
);



renderWilayah(
[...desa].reverse(),
"bottomDesa",
5,
"Desa"
);





renderPPL(
ppl,
"topPetugas"
);



renderPPL(
[...ppl].reverse(),
"bottomPetugas"
);



}






function renderWilayah(data,id,jumlah,namaField){


if(!$("#"+id).length)
return;



$("#"+id).html(

data.slice(0,jumlah)
.map((x,i)=>{


return `

<div class="border-b py-2">


<b>
${i+1}. ${x[namaField]}
</b>


<br>


<span class="text-gray-500">

PROGRES :
${persen(x)}

</span>


</div>

`;


})
.join("")

);



}
render:function(v){


if(
col==="PROGRES" ||
col==="Progres" ||
col==="Persentase Progres"
){

return (
Number(v)*100
).toFixed(1)+"%";

}


return v;


}


})),



pageLength:10,


searching:true,


ordering:true,


scrollX:true



});



}









function updateRanking(){


let ppl=
[...allData.PETUGAS]
.sort(
(a,b)=>
getProgress(b)-getProgress(a)
);



renderPPL(
ppl,
"topPetugas"
);


renderPPL(
[...ppl].reverse(),
"bottomPetugas"
);



}







function renderPPL(data,id){


if(!$("#"+id).length)
return;



$("#"+id)
.html(

data.slice(0,10)
.map((x,i)=>`

<div class="border-b py-2">

<b>
${i+1}. ${x.PPL}
</b>


<br>

${x.Kecamatan}


<br>

Progress :
${persen(x)}

</div>

`).join("")

);


}
