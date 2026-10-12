(function(){
  "use strict";
  const root=document.getElementById('nextop-pvc-tool');
  if(!root) return;
  const $=id=>document.getElementById(id);
  const sides={
    front:{key:'front',file:$('nt-front-file'),wrap:$('nt-front-source-wrap'),reset:$('nt-front-reset'),crop:$('nt-front-crop'),download:$('nt-front-download'),result:$('nt-front-result'),help:$('nt-front-help'),img:null,canvas:null,ctx:null,points:[],output:null,blobUrl:null},
    back:{key:'back',file:$('nt-back-file'),wrap:$('nt-back-source-wrap'),reset:$('nt-back-reset'),crop:$('nt-back-crop'),download:$('nt-back-download'),result:$('nt-back-result'),help:$('nt-back-help'),img:null,canvas:null,ctx:null,points:[],output:null,blobUrl:null}
  };
  let cvReady=false;
  function status(msg){$('nt-cv-status').textContent=msg;}
  function waitForCV(){
    if(window.cv && window.cv.Mat){
      cvReady=true;status('Perspective engine প্রস্তুত। ছবি আপলোড করে চারটি কোণা নির্বাচন করুন।');
    }else if(window.cv && typeof window.cv.onRuntimeInitialized!=='undefined'){
      window.cv.onRuntimeInitialized=function(){cvReady=true;status('Perspective engine প্রস্তুত। ছবি আপলোড করে চারটি কোণা নির্বাচন করুন।');};
      setTimeout(()=>{if(!cvReady)waitForCVFallback();},800);
    }else setTimeout(waitForCV,350);
  }
  function waitForCVFallback(){
    if(window.cv && window.cv.Mat){cvReady=true;status('Perspective engine প্রস্তুত।');}
    else setTimeout(waitForCVFallback,700);
  }
  waitForCV();

  function dims(){
    const selected=$('nt-size').value;
    let w,h;
    if(selected==='custom'){w=parseFloat($('nt-custom-w').value)||85.6;h=parseFloat($('nt-custom-h').value)||53.98;}
    else {const a=selected.split(',');w=+a[0];h=+a[1];}
    const dpi=+$('nt-dpi').value||300;
    return {w,h,dpi,pw:Math.round(w/25.4*dpi),ph:Math.round(h/25.4*dpi)};
  }
  $('nt-size').addEventListener('change',()=>{
    const custom=$('nt-size').value==='custom';
    $('nt-custom-label').style.display=custom?'flex':'none';
    $('nt-custom-h-label').style.display=custom?'flex':'none';
  });
  function clearOutput(s){
    if(s.blobUrl){URL.revokeObjectURL(s.blobUrl);s.blobUrl=null;}
    s.output=null;s.download.disabled=true;
    s.result.innerHTML='<div class="nt-empty">ক্রপ করা ছবি এখানে দেখা যাবে।</div>';
  }
  function drawSource(s){
    if(!s.img)return;
    s.ctx.clearRect(0,0,s.canvas.width,s.canvas.height);
    s.ctx.drawImage(s.img,0,0,s.canvas.width,s.canvas.height);
    s.points.forEach((p,i)=>{
      s.ctx.beginPath();s.ctx.arc(p.x,p.y,Math.max(5,s.canvas.width/140),0,Math.PI*2);
      s.ctx.fillStyle='#16a34a';s.ctx.fill();s.ctx.lineWidth=Math.max(2,s.canvas.width/500);s.ctx.strokeStyle='#fff';s.ctx.stroke();
      s.ctx.fillStyle='#fff';s.ctx.font='bold '+Math.max(12,s.canvas.width/35)+'px Arial';s.ctx.textAlign='center';s.ctx.textBaseline='middle';s.ctx.fillText(String(i+1),p.x,p.y);
    });
    if(s.points.length>1){
      s.ctx.beginPath();s.ctx.moveTo(s.points[0].x,s.points[0].y);
      for(let i=1;i<s.points.length;i++)s.ctx.lineTo(s.points[i].x,s.points[i].y);
      if(s.points.length===4)s.ctx.closePath();
      s.ctx.strokeStyle='#22c55e';s.ctx.lineWidth=Math.max(2,s.canvas.width/450);s.ctx.stroke();
    }
  }
  function loadImage(s,file){
    if(!file)return;
    if(!file.type.startsWith('image/')){alert('অনুগ্রহ করে JPG, PNG বা অন্য image ফাইল নির্বাচন করুন।');return;}
    const url=URL.createObjectURL(file),img=new Image();
    img.onload=()=>{
      s.img=img;s.points=[];clearOutput(s);
      const maxW=1100,maxH=780,scale=Math.min(1,maxW/img.naturalWidth,maxH/img.naturalHeight);
      s.canvas=document.createElement('canvas');
      s.canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));
      s.canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
      s.ctx=s.canvas.getContext('2d',{willReadFrequently:true});
      s.wrap.innerHTML='';s.wrap.appendChild(s.canvas);
      drawSource(s);
      s.reset.disabled=false;s.crop.disabled=false;
      s.help.textContent='ছবির উপরে ক্রমানুসারে ১) উপরে-বামে ২) উপরে-ডানে ৩) নিচে-ডানে ৪) নিচে-বামে ক্লিক/ট্যাপ করুন।';
      URL.revokeObjectURL(url);
    };
    img.onerror=()=>{URL.revokeObjectURL(url);alert('ছবিটি খোলা যায়নি। অন্য ছবি চেষ্টা করুন।');};
    img.src=url;
  }
  Object.values(sides).forEach(s=>{
    s.file.addEventListener('change',e=>loadImage(s,e.target.files&&e.target.files[0]));
    s.reset.addEventListener('click',()=>{s.points=[];clearOutput(s);drawSource(s);s.help.textContent='চারটি কোণা নির্বাচন করুন: উপরে-বামে → উপরে-ডানে → নিচে-ডানে → নিচে-বামে।';});
    s.canvas=null;
  });
  // Delegated canvas click handling: canvas is created only after upload.
  root.addEventListener('click',function(e){
    for(const s of Object.values(sides)){
      if(s.canvas && e.target===s.canvas && s.points.length<4){
        const r=s.canvas.getBoundingClientRect();
        const x=(e.clientX-r.left)*(s.canvas.width/r.width);
        const y=(e.clientY-r.top)*(s.canvas.height/r.height);
        s.points.push({x,y});clearOutput(s);drawSource(s);
        s.help.textContent='নির্বাচিত কোণা: '+s.points.length+'/4'+(s.points.length===4?' — এখন Crop / Straighten চাপুন।':'');
      }
    }
  });
  function cropSide(s){
    if(!cvReady){alert('Perspective engine এখনও লোড হয়নি। ইন্টারনেট সংযোগ পরীক্ষা করে কয়েক সেকেন্ড পরে চেষ্টা করুন।');return;}
    if(!s.img||s.points.length!==4){alert('ছবির চারটি কোণা নির্বাচন করুন: উপরে-বামে, উপরে-ডানে, নিচে-ডানে, নিচে-বামে।');return;}
    const d=dims(),scaleX=s.img.naturalWidth/s.canvas.width,scaleY=s.img.naturalHeight/s.canvas.height;
    const pts=s.points.map(p=>[p.x*scaleX,p.y*scaleY]);
    let src=null,dst=null,M=null,srcTri=null,dstTri=null;
    try{
      const sourceCanvas=document.createElement('canvas');sourceCanvas.width=s.img.naturalWidth;sourceCanvas.height=s.img.naturalHeight;
      sourceCanvas.getContext('2d').drawImage(s.img,0,0);
      src=cv.imread(sourceCanvas);dst=new cv.Mat();
      srcTri=cv.matFromArray(4,1,cv.CV_32FC2,[pts[0][0],pts[0][1],pts[1][0],pts[1][1],pts[3][0],pts[3][1],pts[2][0],pts[2][1]]);
      dstTri=cv.matFromArray(4,1,cv.CV_32FC2,[0,0,d.pw-1,0,0,d.ph-1,d.pw-1,d.ph-1]);
      M=cv.getPerspectiveTransform(srcTri,dstTri);
      cv.warpPerspective(src,dst,M,new cv.Size(d.pw,d.ph),cv.INTER_CUBIC,cv.BORDER_REPLICATE,new cv.Scalar());
      const out=document.createElement('canvas');out.width=d.pw;out.height=d.ph;cv.imshow(out,dst);
      s.output=out;
      out.toBlob(blob=>{
        if(!blob){alert('PNG তৈরি করা যায়নি।');return;}
        if(s.blobUrl)URL.revokeObjectURL(s.blobUrl);
        s.blobUrl=URL.createObjectURL(blob);
        s.result.innerHTML='';const preview=document.createElement('img');preview.src=s.blobUrl;preview.alt=s.key+' corrected card';preview.style.cssText='display:block;width:100%;height:auto;max-height:360px;object-fit:contain';
        s.result.appendChild(preview);
        s.download.disabled=false;
        s.help.textContent='সম্পন্ন: '+d.pw+' × '+d.ph+' pixels, '+d.dpi+' DPI-এর জন্য তৈরি।';
      },'image/png');
    }catch(err){console.error(err);alert('ক্রপ করতে সমস্যা হয়েছে। চারটি কোণা ঠিকভাবে নির্বাচন করুন।');}
    finally{[src,dst,M,srcTri,dstTri].forEach(o=>{if(o&&o.delete)o.delete();});}
  }
  Object.values(sides).forEach(s=>{
    s.crop.addEventListener('click',()=>cropSide(s));
    s.download.addEventListener('click',()=>{
      if(!s.output)return;
      s.output.toBlob(blob=>{
        const u=URL.createObjectURL(blob),a=document.createElement('a');
        a.href=u;a.download='NEXTOP-'+s.key+'-'+dims().dpi+'dpi.png';document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1500);
      },'image/png');
    });
  });
  $('nt-print').addEventListener('click',()=>{
    const mode=$('nt-print-side').value,copies=+$('nt-copies').value;
    const chosen=[];
    if(mode==='front'||mode==='both'){if(sides.front.output)chosen.push(sides.front.output);else if(mode==='front'){alert('আগে Front Side আপলোড করে Crop করুন।');return;}}
    if(mode==='back'||mode==='both'){if(sides.back.output)chosen.push(sides.back.output);else if(mode==='back'){alert('আগে Back Side আপলোড করে Crop করুন।');return;}}
    if(!chosen.length){alert('প্রিন্ট করার আগে অন্তত একটি ছবি আপলোড করে Crop করুন।');return;}
    const printRoot=$('nextop-print-root');printRoot.innerHTML='';
    const sheet=document.createElement('div');sheet.className='nt-print-sheet';
    // Copies means copies of each selected side. On both mode, fronts and backs alternate.
    const list=[];
    for(let i=0;i<copies;i++){chosen.forEach(c=>list.push(c));}
    list.forEach(c=>{
      const img=document.createElement('img');img.src=c.toDataURL('image/png');img.alt='NEXTOP PVC card';sheet.appendChild(img);
    });
    printRoot.appendChild(sheet);
    const oldTitle=document.title;document.title='NEXTOP-A4-PVC-Card-Print';
    window.print();document.title=oldTitle;
  });
})();