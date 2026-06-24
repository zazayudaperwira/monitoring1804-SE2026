const API="https://script.google.com/macros/s/AKfycbw5gYyAM9v5JxW_70_TeBOyGB1yIAfqixzUgUp98BXPG50LNNQdz9Pr5uHrk_pXzRy4-A/exec";

let allData={};
let chart=null;


function getProgress(row){

    if(row.PROGRES!==undefined)
        return Number(row.PROGRES);

    if(row.Progres!==undefined)
        return Number(row.Progres);

    if(row["Persentase Progres"]!==undefined)
        return Number(row["Persentase Progres"]);

    return 0;
}


function persen(row){

    return (getProgress(row)*100).toFixed(1)+"%";

}




$(async function(){

    let res=await fetch(API);
    let json=await res.json();

    allData=json.data;


    $("#updateInfo")
    .text("Update Terakhir : "+json.metadata.update);


    let kab=allData.Kecamatan[0];

    if(kab){

        $("#kabProgres")
        .text(persen(kab));

    }


    loadFilter();


    updateRanking();


    switchTab("Kecamatan");


    updateChart();

});







function loadFilter(){


    let kec=[...new Set(
        allData.Kecamatan.map(x=>x.Kecamatan)
    )];


    kec.forEach(x=>{

        $("#fKec")
        .append(
        `<option value="${x}">
        ${x}
        </option>`
        );

    });


}






function updateRanking(){


let ppl=[
...allData.PETUGAS
]
.sort(
(a,b)=>getProgress(b)-getProgress(a)
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


$("#"+id).html(

data.slice(0,10)
.map((x,i)=>{


return `

<div class="border-b py-2">

<b>${i+1}. ${x.PPL}</b>

<br>

<span>
Kecamatan :
${x.Kecamatan || "-"}
</span>

<br>

<span class="text-green-600">

Persentase Progres :
${persen(x)}

</span>


</div>


`


})
.join("")


);


}










function switchTab(sheet){


if(!allData[sheet]) return;



if(
$.fn.DataTable.isDataTable("#mainTable")
){

$("#mainTable")
.DataTable()
.clear()
.destroy();

$("#mainTable")
.empty();

}




let data=allData[sheet];



$("#mainTable")
.DataTable({


data:data,


columns:

Object.keys(data[0])
.map(col=>({


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
).toFixed(1)+"%";


}


return value;


}


})),


pageLength:10,


searching:true,


ordering:true,


scrollX:true



});



}








function updateChart(){


let data=allData.SLS;


let labels=[
...new Set(
data.map(x=>x.Kecamatan)
)
];



let values=labels.map(k=>


data.filter(x=>x.Kecamatan===k)

.reduce(
(a,b)=>
a+
Number(
b["APPROVED BY Pengawas"]||0
),
0
)

);



if(chart)
chart.destroy();



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

}

}

);



}





function resetFilters(){

$("#fKec").val("");

$("#fDesa").val("");

updateChart();

}
