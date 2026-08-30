(function(){
  function addBackupPanel(){
    const aside=document.querySelector('aside.side');
    if(!aside)return;
    const panel=document.createElement('details');
    panel.className='panel';
    panel.innerHTML='<summary>💾 copia de seguridad</summary><div class="panelBody"><div style="font-size:13px;line-height:1.3;color:var(--muted);margin-bottom:10px">Guarda tus palabras, progreso y estadísticas para recuperarlos si cambias de celular.</div><button class="add-btn" id="btnExportBackup">📤 exportar progreso</button><button class="add-btn" id="btnImportBackup" style="border-color:var(--magenta);color:var(--magenta)">📥 importar progreso</button><input id="backupFile" type="file" accept="application/json,.json" hidden><div style="text-align:center;font:9px IBM Plex Mono,monospace;color:var(--muted);margin-top:6px">INGLÉS SEBAS · Android v1.1.0</div></div>';
    aside.appendChild(panel);

    const exportBtn=document.getElementById('btnExportBackup');
    const importBtn=document.getElementById('btnImportBackup');
    const fileInput=document.getElementById('backupFile');

    exportBtn.addEventListener('click',async()=>{
      try{
        persistNow();
        const payload=JSON.stringify({app:'INGLES-SEBAS',format:1,appVersion:'1.1.0',exportedAt:new Date().toISOString(),cards},null,2);
        const filename='ingles-sebas-backup-'+new Date().toISOString().slice(0,10)+'.json';
        if(window.AndroidNative&&window.AndroidNative.exportBackup){
          const ok=await window.AndroidNative.exportBackup(payload,filename);
          if(ok){toast('Backup listo para guardar o compartir');return;}
        }
        const blob=new Blob([payload],{type:'application/json'});
        const url=URL.createObjectURL(blob);
        const a=document.createElement('a');a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
      }catch(e){console.error(e);toast('No se pudo exportar el backup');}
    });

    importBtn.addEventListener('click',()=>fileInput.click());
    fileInput.addEventListener('change',()=>{
      const file=fileInput.files&&fileInput.files[0];if(!file)return;
      const r=new FileReader();
      r.onload=()=>{try{const parsed=JSON.parse(r.result);const incoming=Array.isArray(parsed)?parsed:parsed.cards;if(!Array.isArray(incoming))throw new Error('formato');const cleaned=incoming.filter(x=>x&&typeof x.en==='string'&&typeof x.es==='string').map(migrate);if(!cleaned.length)throw new Error('vacio');cards=cleaned;persistNow();buildQueue();renderAll();showNext();toast('Backup restaurado · '+cards.length+' palabras');}catch(e){console.error(e);toast('Ese archivo no es un backup válido');}fileInput.value='';};
      r.readAsText(file);
    });
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addBackupPanel);else addBackupPanel();
})();
