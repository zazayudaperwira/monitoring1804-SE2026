const API =
"https://script.google.com/macros/s/AKfycbw5gYyAM9v5JxW_70_TeBOyGB1yIAfqixzUgUp98BXPG50LNNQdz9Pr5uHrk_pXzRy4-A/exec";


let allData={};
let chart=null;



function getProgress(row){

    return Number(
        row.PROGRES ??
        row.Progres ??
        row["Persentase Progres"] ??
        0
    );

}



function persen(row){

    return (getProgress(row)*100)
    .toFixed(1)+"%";

}







$(async function(){


const res =
await fetch(API);


const json =
await res.json();


allData=json.data;



$("#updateInfo")
.text(
"Update Terakhir : "+json.metadata.update
);



$("#totalSLS")
.text(
allData.SLS.length
);



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




if(allData.Kecamatan.length){

$("#kabProgres")
.text(
persen(allData.Kecamatan[0])
);


$("#progressCard")
.text(
persen(allData.Kecamatan[0])
);

}




loadFilter();



updateRanking();



switchTab("Kecamatan");



updateChart();



});









function loadFilter(){


let kec =
[
...new Set(
allData.Kecamatan
.map(x=>x.Kecamatan)
)
];



kec.forEach(x=>{


$("#fKec")
.append(
`
<option value="${x}">
${x}
</option>
`
);


});


}









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



let petugas =
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






renderPetugas(
petugas,
"topPetugas",
10
);



renderPetugas(
[...petugas].reverse(),
"bottomPetugas",
10
);



}









function renderWilayah(
data,
id,
jumlah,
kolom
){



$("#"+id)
.html(


data.slice(0,jumlah)
.map((x,i)=>{


return `

<div class="border-b py-3">


<b>
${i+1}. ${x[kolom]}
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









function renderPetugas(
data,
id,
jumlah
){



$("#"+id)
.html(


data.slice(0,jumlah)
.map((x,i)=>{


return `


<div class="border-b py-3">


<b>
${i+1}. ${x.PPL}
</b>


<br>


<span>

Kecamatan :
${x.Kecamatan || "-"}

</span>


<br>


<span class="text-gray-500">

Persentase Progres :
${persen(x)}

</span>



</div>


`;


})
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


$("#mainTable")
.empty();


}



let data =
allData[sheet];



if(!data || !data.length)
return;




$("#mainTable")
.DataTable({

data:data,


columns:


Object.keys(data[0])
.map(col=>{


return {


title:col,


data:col,


render:function(value){



if(
col==="PROGRES" ||
col==="Progres" ||
col==="Persentase Progres"
){

return (
Number(value)*100
)
.toFixed(1)+"%";

}



return value;


}


};


}),



pageLength:10,


searching:true,


ordering:true,


scrollX:true


});



}









function updateChart(){


let data =
allData.SLS;



let labels =
[
...new Set(
data.map(x=>x.Kecamatan)
)
];



let nilai =
labels.map(k=>{


return data
.filter(x=>x.Kecamatan===k)
.reduce(
(a,b)=>
a+
Number(
b["APPROVED BY Pengawas"]||0
),
0
);


});



if(chart)
chart.destroy();




chart =
new Chart(
document.getElementById("progresChart"),
{


type:"bar",


data:{


labels:labels,


datasets:[{

label:"APPROVED BY Pengawas",

data:nilai


}]


},


options:{


responsive:true,


maintainAspectRatio:false


}



}

);



}









function resetFilters(){


$("#fKec")
.val("");



$("#fDesa")
.val("");



updateChart();



}
