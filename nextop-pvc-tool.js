(function(){
  "use strict";
  const root=document.getElementById('nextop-pvc-tool');
  if(!root) return;
  const $=id=>document.getElementById(id);
  const sides={
    front:{key:'front',file:$('nt-front-file'),wrap:$('nt-front-source-wrap'),reset:$('nt-front-reset'),crop:$('nt-front-crop'),download:$('nt-front-download'),result:$('nt-front-result'),help:$('nt-front-help'),img:null,canvas:null,ctx:null,points:[],output:null,blobUrl:null,dragIndex:-1,pointerDown:false},
    back:{key:'back',file:$('nt-back-file'),wrap:$('nt-back-source-wrap'),reset:$('nt-back-reset'),crop:$('nt-back-crop'),download:$('nt-back-download'),result:$('nt-back-result'),help:$('nt-back-help'),img:null,canvas:null,ctx:null,points:[],output:null,blobUrl:null,dragIndex:-1,pointerDown:false}
  };
  let cvReady=false;
  function status(msg){$('nt-cv-status').textContent=msg;}
  function waitForCV(){
    if(window.cv && window.cv.Mat){
      cvReady=true;status('Perspective engine প্রস্তুত। ছবি আপলোড করুন, সবুজ পয়েন্ট টেনে কোণ ঠিক করুন।');
    }else if(window.cv && typeof window.cv.onRuntimeInitialized!=='undefined'){
      window.cv.onRuntimeInitialized=function(){cvReady=true;status('Perspective engine প্রস্তুত। সবুজ পয়েন্ট টেনে কোণ ঠিক করুন।');};
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
    if(!s.img||!s.canvas||!s.ctx)return;
    s.ctx.clearRect(0,0,s.canvas.width,s.canvas.height);
    s.ctx.drawImage(s.img,0,0,s.canvas.width,s.canvas.height);
    if(s.points.length>1){
      s.ctx.beginPath();s.ctx.moveTo(s.points[0].x,s.points[0].y);
      for(let i=1;i<s.points.length;i++)s.ctx.lineTo(s.points[i].x,s.points[i].y);
      if(s.points.length===4)s.ctx.closePath();
      s.ctx.strokeStyle='#22c55e';s.ctx.lineWidth=Math.max(3,s.canvas.width/300);s.ctx.stroke();
      if(s.points.length===4){
        s.ctx.fillStyle='rgba(34,197,94,0.10)';
        s.ctx.fill();
      }
    }
    s.points.forEach((p,i)=>{
      // Larger high-contrast handles, with numbered labels.
      const r=Math.max(12,Math.min(20,s.canvas.width/38));
      s.ctx.beginPath();s.ctx.arc(p.x,p.y,r,0,Math.PI*2);
      s.ctx.fillStyle='#16a34a';s.ctx.fill();
      s.ctx.lineWidth=Math.max(3,r/5);s.ctx.strokeStyle='#fff';s.ctx.stroke();
      s.ctx.beginPath();s.ctx.arc(p.x,p.y,Math.max(3,r/3),0,Math.PI*2);
      s.ctx.fillStyle='#fff';s.ctx.fill();
      s.ctx.fillStyle='#14532d';s.ctx.font='bold '+Math.max(13,r)+'px Arial';
      s.ctx.textAlign='center';s.ctx.textBaseline='middle';s.ctx.fillText(String(i+1),p.x,p.y);
    });
  }
  function defaultPoints(s){
    // Start with a movable inset rectangle; user can drag each handle to the actual document corners.
    const w=s.canvas.width,h=s.canvas.height;
    const x=Math.max(18,w*0.14), y=Math.max(18,h*0.12);
    const right=Math.min(w-18,w*0.86), bottom=Math.min(h-18,h*0.88);
    s.points=[
      {x,y},
      {x:right,y},
      {x:right,y:bottom},
      {x,y:bottom}
    ];
  }
  function loadImage(s,file){
    if(!file)return;
    if(!file.type.startsWith('image/')){alert('অনুগ্রহ করে JPG, PNG বা অন্য image ফাইল নির্বাচন করুন।');return;}
    const url=URL.createObjectURL(file),img=new Image();
    img.onload=()=>{
      s.img=img;clearOutput(s);
      const maxW=1100,maxH=780,scale=Math.min(1,maxW/img.naturalWidth,maxH/img.naturalHeight);
      s.canvas=document.createElement('canvas');
      s.canvas.width=Math.max(1,Math.round(img.naturalWidth*scale));
      s.canvas.height=Math.max(1,Math.round(img.naturalHeight*scale));
      s.canvas.style.cssText='display:block;width:100%;height:auto;touch-action:none;cursor:crosshair;user-select:none;';
      s.ctx=s.canvas.getContext('2d',{willReadFrequently:true});
      s.wrap.innerHTML='';s.wrap.appendChild(s.canvas);
      defaultPoints(s);
      drawSource(s);
      s.reset.disabled=false;s.crop.disabled=false;
      s.help.textContent='সবুজ বড় পয়েন্টগুলো আগে থেকেই দেওয়া আছে। ১) উপরে-বামে ২) উপরে-ডানে ৩) নিচে-ডানে ৪) নিচে-বামে পয়েন্ট টেনে কার্ডের আসল কোণায় বসান।';
      URL.revokeObjectURL(url);
    };
    img.onerror=()=>{URL.revokeObjectURL(url);alert('ছবিটি খোলা যায়নি। অন্য ছবি চেষ্টা করুন।');};
    img.src=url;
  }
  function canvasPoint(s,e){
    const r=s.canvas.getBoundingClientRect();
    return {x:Math.max(0,Math.min(s.canvas.width,(e.clientX-r.left)*(s.canvas.width/r.width))),
            y:Math.max(0,Math.min(s.canvas.height,(e.clientY-r.top)*(s.canvas.height/r.height)))};
  }
  function nearestPoint(s,p){
    let best=-1,dist=Infinity;
    const hit=Math.max(24,s.canvas.width/28);
    s.points.forEach((q,i)=>{const d=Math.hypot(q.x-p.x,q.y-p.y);if(d<dist&&d<=hit){dist=d;best=i;}});
    return best;
  }
  Object.values(sides).forEach(s=>{
    s.file.addEventListener('change',e=>loadImage(s,e.target.files&&e.target.files[0]));
    s.reset.addEventListener('click',()=>{
      if(!s.canvas)return;
      defaultPoints(s);clearOutput(s);drawSource(s);
      s.help.textContent='পয়েন্টগুলো আবার মাঝামাঝি জায়গায় বসানো হয়েছে। চারটি সবুজ পয়েন্ট টেনে কার্ডের চার কোণায় বসান।';
    });
    s.canvas=null;
  });
  // Drag-to-adjust points works with mouse, touchscreen and stylus.
  root.addEventListener('pointerdown',function(e){
    for(const s of Object.values(sides)){
      if(s.canvas && e.target===s.canvas && s.points.length===4){
        const p=canvasPoint(s,e),idx=nearestPoint(s,p);
        if(idx!==-1){
          s.dragIndex=idx;s.pointerDown=true;
          if(s.canvas.setPointerCapture)s.canvas.setPointerCapture(e.pointerId);
          e.preventDefault();return;
        }
      }
    }
  });
  root.addEventListener('pointermove',function(e){
    for(const s of Object.values(sides)){
      if(s.canvas&&s.pointerDown&&s.dragIndex!==-1){
        s.points[s.dragIndex]=canvasPoint(s,e);
        clearOutput(s);drawSource(s);
        s.help.textContent='পয়েন্ট '+(s.dragIndex+1)+' সরানো হচ্ছে। চার কোণা ঠিক হলে Crop / Straighten চাপুন।';
        e.preventDefault();return;
      }
    }
  });
  function stopDrag(){Object.values(sides).forEach(s=>{s.pointerDown=false;s.dragIndex=-1;});}
  root.addEventListener('pointerup',stopDrag);
  root.addEventListener('pointercancel',stopDrag);
  function cropSide(s){
    if(!cvReady){alert('Perspective engine এখনও লোড হয়নি। ইন্টারনেট সংযোগ পরীক্ষা করে কয়েক সেকেন্ড পরে চেষ্টা করুন।');return;}
    if(!s.img||s.points.length!==4){alert('ছবির চারটি কোণা নির্বাচন করুন। সবুজ পয়েন্টগুলো টেনে কার্ডের চার কোণায় বসান।');return;}
    const d=dims(),scaleX=s.img.naturalWidth/s.canvas.width,scaleY=s.img.naturalHeight/s.canvas.height;
    const pts=s.points.map(p=>[p.x*scaleX,p.y*scaleY]);
    let src=null,dst=null,M=null,srcTri=null,dstTri=null;
    try{
      const sourceCanvas=document.createElement('canvas');sourceCanvas.width=s.img.naturalWidth;sourceCanvas.height=s.img.naturalHeight;
      sourceCanvas.getContext('2d').drawImage(s.img,0,0);
      src=cv.imread(sourceCanvas);dst=new cv.Mat();
      // Display order is top-left, top-right, bottom-right, bottom-left.
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
    }catch(err){console.error(err);alert('ক্রপ করতে সমস্যা হয়েছে। সবুজ পয়েন্ট চারটি কার্ডের আসল কোণায় বসান।');}
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
