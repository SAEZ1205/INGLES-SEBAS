(function(){
  if(window.__inglesSebasAndroidReady)return;
  window.__inglesSebasAndroidReady=true;

  ['vendor/orbitron/600.css','vendor/orbitron/800.css','vendor/rajdhani/500.css','vendor/rajdhani/600.css','vendor/rajdhani/700.css','vendor/ibm-plex-mono/500.css'].forEach(href=>{
    const link=document.createElement('link');link.rel='stylesheet';link.href=href;document.head.appendChild(link);
  });

  function restoreBackupText(text){
    try{
      const parsed=JSON.parse(text);
      const incoming=Array.isArray(parsed)?parsed:parsed.cards;
      if(!Array.isArray(incoming))throw new Error('formato');
      const cleaned=incoming.filter(x=>x&&typeof x.en==='string'&&typeof x.es==='string').map(migrate);
      if(!cleaned.length)throw new Error('vacio');
      cards=cleaned;persistNow();buildQueue();renderAll();showNext();
      toast('Backup restaurado · '+cards.length+' palabras');
    }catch(e){console.error(e);toast('Ese archivo no es un backup válido');}
  }
  window.__receiveAndroidBackup=restoreBackupText;

  function addBackupPanel(){
    const aside=document.querySelector('aside.side');
    if(!aside||document.getElementById('androidBackupPanel'))return;
    const panel=document.createElement('details');
    panel.className='panel';panel.id='androidBackupPanel';
    panel.innerHTML='<summary>💾 copia de seguridad</summary><div class="panelBody"><div style="font-size:13px;line-height:1.3;color:var(--muted);margin-bottom:10px">Guarda tus palabras, progreso y estadísticas para recuperarlos si cambias de celular.</div><button class="add-btn" id="btnExportBackup">📤 exportar progreso</button><button class="add-btn" id="btnImportBackup" style="border-color:var(--magenta);color:var(--magenta)">📥 importar progreso</button><div style="text-align:center;font:9px IBM Plex Mono,monospace;color:var(--muted);margin-top:6px">INGLÉS SEBAS · Android v1.1.0</div></div>';
    aside.appendChild(panel);

    document.getElementById('btnExportBackup').addEventListener('click',()=>{
      try{
        persistNow();
        const payload=JSON.stringify({app:'INGLES-SEBAS',format:1,appVersion:'1.1.0',exportedAt:new Date().toISOString(),cards},null,2);
        const filename='ingles-sebas-backup-'+new Date().toISOString().slice(0,10)+'.json';
        if(window.AndroidNative&&window.AndroidNative.exportBackup){window.AndroidNative.exportBackup(payload,filename);return;}
        toast('Exportación no disponible');
      }catch(e){console.error(e);toast('No se pudo exportar el backup');}
    });

    document.getElementById('btnImportBackup').addEventListener('click',()=>{
      if(window.AndroidNative&&window.AndroidNative.importBackup)window.AndroidNative.importBackup();
      else toast('Importación no disponible');
    });
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',addBackupPanel);else addBackupPanel();
})();
