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


updateRanking();


switchTab("Kecamatan");


});









function updateKPI(){


$("#totalSLS")
.text(allData.SLS.length);



let selesai =
allData.SLS.reduce(
(a,b)=>
a+
Number(
b["APPROVED BY Pengawas"]||0
),
0
);


$("#totalDone")
.text(selesai);



let p =
allData.Kecamatan[0];


if(p){

$("#kabProgres")
.text(persen(p));


$("#progressCard")
.text(persen(p));

}


}









function loadFilter(){



$("#fKec")
.empty()
.append(
`<option value="">
Semua Kecamatan
</option>`
);



[...new Set(
allData.Kecamatan.map(x=>x.Kecamatan)
)]
.forEach(k=>{


$("#fKec")
.append(
`
<option value="${k}">
${k}
</option>
`
);


});



}





// FILTER KECAMATAN

$("#fKec").on("change",function(){


let val=$(this).val();



let data;



if(val===""){


data=allData.Kecamatan;


}else{


data=
allData.Kecamatan
.filter(x=>
x.Kecamatan===val
);


}



reloadTable(data);


});









function switchTab(sheet){


if(!allData[sheet])
return;



reloadTable(
allData[sheet]
);


}





function reloadTable(data){



if(
$.fn.DataTable.isDataTable("#mainTable")
){

$("#mainTable")
.DataTable()
.clear()
.destroy();

}



$("#mainTable")
.empty();



currentTable=
$("#mainTable")
.DataTable({


data:data,


columns:


Object.keys(data[0])
.map(col=>({


title:col,


data:col,


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
