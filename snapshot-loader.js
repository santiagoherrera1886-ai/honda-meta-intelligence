window.HONDA_DATA_READY=(async function(){
  try{
    if(!window.HONDA_PACKED) throw new Error("Snapshot no encontrado");
    const bin=atob(window.HONDA_PACKED);
    const bytes=new Uint8Array(bin.length);
    for(let i=0;i<bin.length;i++) bytes[i]=bin.charCodeAt(i);
    let jsonText="";
    if("DecompressionStream" in window){
      const ds=new DecompressionStream("gzip");
      jsonText=await new Response(new Blob([bytes]).stream().pipeThrough(ds)).text();
    }else if(window.pako){
      jsonText=new TextDecoder().decode(window.pako.ungzip(bytes));
    }else{
      throw new Error("El navegador no soporta descompresión gzip");
    }
    const data=JSON.parse(jsonText);
    window.HONDA_DATA=data;
    return data;
  }catch(err){
    console.error("Honda snapshot error",err);
    throw err;
  }
})();