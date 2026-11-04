(() => {
  'use strict';
  const STORE='404face.browser.events.v1',MAX_EVENTS=500;
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const seed=(a,b)=>{const n=Math.sin(a*127.1+b*311.7)*43758.5453;return n-Math.floor(n);};
  const validConfig=c=>c && window.MaskDesign.presets.some(p=>p.id===c.shape) && /^#[0-9a-f]{6}$/i.test(c.colour) && typeof c.characters==='string' && [...c.characters].length<=12 && Number.isFinite(c.density) && c.density>=30 && c.density<=100 && Number.isFinite(c.movement) && c.movement>=0 && c.movement<=100;
  class BrowserEngine {
    constructor() {
      this.canvas=document.createElement('canvas');this.canvas.width=640;this.canvas.height=480;this.canvas.className='live-feed';this.canvas.hidden=true;this.canvas.setAttribute('role','img');
      this.video=document.createElement('video');this.video.muted=true;this.video.playsInline=true;this.video.autoplay=true;this.video.setAttribute('aria-hidden','true');this.video.className='browser-camera-source';document.body.append(this.video);
      this.scene=document.createElement('canvas');this.scene.width=640;this.scene.height=480;
      this.lastFrame=0;this.generation=0;this.running=false;this.loading=false;this.storageOK=true;this.events=[];this.activeEvent=null;this.errorKey='';this.lastInference=-Infinity;this.lastVideoTime=-1;this.alpha=0;this.canvas.dataset.recognition='idle';
      this.simulatedDistance=26;this.simulatedRisk=.5;this.riskSmooth=.5;this.latched=false;this.hands=[];this.handsAt=-Infinity;this.noHandsSince=null;this.faceCount=0;this.observedAt=-Infinity;
      try { const saved=JSON.parse(localStorage.getItem(STORE)||'[]');if(Array.isArray(saved)) this.events=saved.filter(e=>e && e.fictional===false && e.source==='browser' && Number.isFinite(e.time) && validConfig(e.config)).slice(-MAX_EVENTS); }
      catch { this.storageOK=false; }
    }
    async request(path,body) {
      if(path==='/api/state') return {time:Date.now(),session:this.running,camera:this.running && !!this.lastFrame,config:this.config,active:!!this.activeEvent,face:!!this.face && performance.now()-this.faceAt<1500,gesture:this.gesture,gestureMessage:this.gestureMessage,hands:this.hands.length,hold:this.gestureStarted?clamp((performance.now()-this.gestureStarted)/600,0,1):0,error:this.errorKey,storageOK:this.storageOK,eventCount:this.events.length+(this.activeEvent?1:0),sensor:false,simulated:true,simulatedDistance:this.simulatedDistance,simulatedRisk:this.simulatedRisk,risk:this.riskSmooth};
      if(path==='/api/events') return this.activeEvent?[...this.events,{...this.activeEvent,duration:Date.now()-this.activeEvent.time}]:[...this.events];
      if(path==='/api/session') { if(body.active) { if(body.config) {if(!validConfig(body.config)) throw Error('configIssue');this.config={...body.config};} if(!this.running && !this.loading) await this.start(); } else this.stop();return {accepted:true}; }
      if(path==='/api/config') {if(!validConfig(body)) throw Error('configIssue');this.config={...body};return {accepted:true};}
      throw Error('browserModelIssue');
    }
    setSimulatedDistance(value) {
      const distance=Number(value);if(!Number.isFinite(distance))return;
      this.simulatedDistance=clamp(distance,2,50);this.simulatedRisk=clamp((50-this.simulatedDistance)/48,0,1);
    }
    models() {
      if(this.ready) return this.ready;
      this.canvas.dataset.recognition='loading';
      this.ready=new Promise((resolve,reject)=>{
        const worker=this.worker=new Worker('./browser-vision-worker.js?v=ad0079213291');
        this.modelTimer=setTimeout(()=>{worker.terminate();this.ready=null;reject(Error('browserModelIssue'));},90000);
        worker.onmessage=({data})=>{
          if(data.type==='ready') {clearTimeout(this.modelTimer);this.canvas.dataset.recognition='ready';resolve();}
          else if(data.type==='error') {clearTimeout(this.modelTimer);worker.terminate();this.ready=null;this.worker=null;this.inFlight=false;this.errorKey='browserModelIssue';this.stop('engine-stopped');reject(Error('browserModelIssue'));}
          else if(data.type==='result' && data.generation===this.generation) {this.inFlight=false;if(this.running) this.observe(data);}
        };
        worker.onerror=()=>{clearTimeout(this.modelTimer);worker.terminate();this.ready=null;this.worker=null;this.inFlight=false;this.errorKey='browserModelIssue';this.stop('engine-stopped');reject(Error('browserModelIssue'));};
        worker.postMessage({type:'init'});
      });
      return this.ready;
    }
    async start() {
      if(!isSecureContext || !navigator.mediaDevices?.getUserMedia || !window.Worker || !window.createImageBitmap) throw Error('browserUnsupportedIssue');
      const generation=++this.generation;this.loading=true;this.errorKey='';this.lastFrame=0;this.lastInference=-Infinity;this.lastVideoTime=-1;this.alpha=0;
      let stream;
      const camera=navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:'user',width:{ideal:640},height:{ideal:480},frameRate:{ideal:30,max:30}}}).then(value=>{stream=value;if(generation!==this.generation){value.getTracks().forEach(t=>t.stop());throw Error('cancelled');}this.stream=value;return value;});
      try {
        const cameraTimeout=new Promise((_,reject)=>{this.cameraTimer=setTimeout(()=>reject(Error('browserPermissionIssue')),60000);});
        const cancelled=new Promise((_,reject)=>{this.cancelStart=()=>reject(Error('cancelled'));});
        await Promise.race([Promise.all([Promise.race([camera,cameraTimeout]),this.models()]),cancelled]);clearTimeout(this.cameraTimer);
        if(generation!==this.generation) {stream?.getTracks().forEach(t=>t.stop());return;}
        this.video.srcObject=stream;await Promise.race([this.video.play(),cancelled]);this.cancelStart=null;
        if(generation!==this.generation) {stream.getTracks().forEach(t=>t.stop());return;}
        const vw=this.video.videoWidth||640,vh=this.video.videoHeight||480,scale=Math.min(1,960/vw,720/vh);
        this.canvas.width=this.scene.width=Math.round(vw*scale);this.canvas.height=this.scene.height=Math.round(vh*scale);
        this.running=true;this.loading=false;this.face=null;this.faceAt=-Infinity;this.gesture=false;this.gestureStarted=0;this.lastGesture=-Infinity;this.inFlight=false;this.latched=false;this.hands=[];this.handsAt=-Infinity;this.noHandsSince=null;this.observedAt=-Infinity;this.faceCount=0;
        stream.getVideoTracks()[0].addEventListener('ended',()=>{if(this.running){this.errorKey='browserCameraIssue';this.stop('camera-lost');}});
        this.loop(performance.now());
      } catch(error) {
        stream?.getTracks().forEach(t=>t.stop());
        if(generation!==this.generation) return;
        const keys={NotAllowedError:'browserPermissionIssue',SecurityError:'browserPermissionIssue',NotFoundError:'browserNoCameraIssue',NotReadableError:'browserCameraBusyIssue',AbortError:'browserCameraIssue'};
        this.errorKey=keys[error.name]||(/Issue$/.test(error.message)?error.message:'browserModelIssue');this.stop('camera-lost');throw Error(this.errorKey);
      }
    }
    stop(reason='session-ended') {
      this.generation++;this.running=false;this.loading=false;this.cancelStart?.();this.cancelStart=null;clearTimeout(this.cameraTimer);cancelAnimationFrame(this.animation);
      this.stream?.getTracks().forEach(t=>t.stop());this.stream=null;this.video.pause();this.video.srcObject=null;this.lastFrame=0;
      this.finishEvent(reason);this.face=null;this.alpha=0;this.gesture=false;this.gestureStarted=0;this.lastGesture=-Infinity;this.latched=false;this.hands=[];this.noHandsSince=null;
      this.canvas.getContext('2d').clearRect(0,0,this.canvas.width,this.canvas.height);this.scene.getContext('2d').clearRect(0,0,this.scene.width,this.scene.height);
    }
    observe(data) {
      const now=performance.now();
      this.observedAt=now;this.faceCount=data.faceCount??(data.face?1:0);
      if(this.faceCount>1) {this.face=null;this.faceAt=-Infinity;this.latched=false;this.gestureStarted=0;}
      else if(data.face) {this.face=data.face;this.faceAt=now;}
      const hands=data.hands||[];this.hands=hands;this.handsAt=now;
      if(hands.length===0) {if(this.noHandsSince===null)this.noHandsSince=now;} else this.noHandsSince=null;
      const gesture=hands.length===2 && window.MaskBrowserGesture.formsFrame(hands[0],hands[1]);
      this.gestureMessage=hands.length<2?'showHands':hands.map(h=>window.MaskBrowserGesture.classify(h.points,h.world)).find(s=>s!=='ready')||'frameInward';
      if(gesture) {if(!this.gestureStarted)this.gestureStarted=now;this.lastGesture=now;} else if(now-this.lastGesture>250)this.gestureStarted=0;
      this.gesture=gesture;
    }
    activation(now) {
      const faceFresh=!!this.face && now-this.faceAt<1500 && this.faceCount<2;
      const inputFresh=now-this.observedAt<1200;
      if(!faceFresh || !inputFresh || (this.noHandsSince!==null && now-this.noHandsSince>=700)) {
        this.latched=false;this.gestureStarted=0;this.lastGesture=-Infinity;
      }
      if(faceFresh && inputFresh && this.gestureStarted && now-this.gestureStarted>=600 && now-this.lastGesture<250)this.latched=true;
      return faceFresh && inputFresh && this.latched;
    }
    loop(now) {
      if(!this.running) return;
      try {
        if(this.video.readyState>=2) {
          const ctx=this.scene.getContext('2d');ctx.save();ctx.translate(this.canvas.width,0);ctx.scale(-1,1);ctx.drawImage(this.video,0,0,this.canvas.width,this.canvas.height);ctx.restore();
          const live=this.canvas.getContext('2d');live.drawImage(this.scene,0,0);
          const faceFresh=this.face && now-this.faceAt<1500;
          const active=this.activation(now);
          this.riskSmooth+=(this.simulatedRisk-this.riskSmooth)*.12;
          this.alpha+=(Number(!!active)-this.alpha)*.17;
          if(active && !this.activeEvent) this.activeEvent={id:crypto.randomUUID(),time:Date.now(),duration:0,config:{...this.config},response:true,status:'active',distanceAvailable:false,simulated:true,minSimulatedDistance:this.simulatedDistance,peakRisk:this.simulatedRisk,fictional:false,source:'browser'};
          if(active && this.activeEvent) {this.activeEvent.minSimulatedDistance=Math.min(this.activeEvent.minSimulatedDistance,this.simulatedDistance);this.activeEvent.peakRisk=Math.max(this.activeEvent.peakRisk,this.simulatedRisk);}
          if(!active) this.finishEvent(faceFresh?'released':'face-lost');
          if(this.alpha>.015 && faceFresh) this.drawMask(live,now);
          if(now-this.handsAt<600)this.drawHands(live);
          this.lastFrame=Date.now();
          if(!this.inFlight && now-this.lastInference>=110 && this.video.currentTime!==this.lastVideoTime && this.worker) {
            this.inFlight=true;this.lastInference=now;this.lastVideoTime=this.video.currentTime;const generation=this.generation;
            createImageBitmap(this.video).then(image=>{if(this.running && generation===this.generation && this.worker)this.worker.postMessage({type:'frame',generation,time:now,image},[image]);else {image.close();if(generation===this.generation)this.inFlight=false;}}).catch(()=>{if(generation===this.generation)this.inFlight=false;});
          }
        }
      } catch {this.errorKey='browserCameraIssue';this.stop('camera-lost');return;}
      this.animation=requestAnimationFrame(t=>this.loop(t));
    }
    finishEvent(reason) {
      if(!this.activeEvent) return;
      this.events.push({...this.activeEvent,duration:Date.now()-this.activeEvent.time,status:'complete',endReason:reason});this.events=this.events.slice(-MAX_EVENTS);this.activeEvent=null;
      try {localStorage.setItem(STORE,JSON.stringify(this.events));} catch {this.storageOK=false;}
    }
    drawHands(ctx) {
      const edges=[[0,1],[1,2],[2,3],[3,4],[0,5],[5,6],[6,7],[7,8],[5,9],[9,10],[10,11],[11,12],[9,13],[13,14],[14,15],[15,16],[13,17],[17,18],[18,19],[19,20],[0,17]];
      ctx.save();ctx.strokeStyle='rgba(154,224,203,.68)';ctx.fillStyle='rgba(230,255,245,.85)';ctx.lineWidth=1.4;
      for(const hand of this.hands) {const p=hand.points.map(p=>({x:(1-p.x)*this.canvas.width,y:p.y*this.canvas.height}));ctx.beginPath();for(const[a,b]of edges){ctx.moveTo(p[a].x,p[a].y);ctx.lineTo(p[b].x,p[b].y);}ctx.stroke();for(const q of p){ctx.beginPath();ctx.arc(q.x,q.y,2,0,Math.PI*2);ctx.fill();}}
      ctx.restore();
    }
    drawMask(ctx,now) {
      const p=i=>({x:(1-this.face[i].x)*this.canvas.width,y:this.face[i].y*this.canvas.height});
      const nose=p(6),chin=p(152),left=p(454),right=p(234);
      const width=Math.hypot(right.x-left.x,right.y-left.y),height=Math.hypot(chin.x-nose.x,chin.y-nose.y);
      if(width<25 || height<20) return;
      const config=this.config,preset=window.MaskDesign.presets.find(p=>p.id===config.shape),key=JSON.stringify(config);
      if(this.maskKey!==key) {
        this.maskKey=key;this.points=[];
        for(let row=0;row<72;row++) for(let col=0;col<76;col++) {
          const u=(col+.5)/76*2-1,v=.02+(row+.5)/72*1.25,edge=Math.min(v-preset.upper(u),preset.lower(u)-v,(1-Math.abs(u))*.3),s=seed(col,row);
          if(edge<0 || s>config.density/100 || (preset.pattern==='contour' && edge>.04 && Math.sin(v*30+u*7)>-.55))continue;
          this.points.push({u,v,s,edge,col,row});
        }
        this.glyphs=[...(config.characters||'01')];this.atlas=document.createElement('canvas');this.atlas.width=this.glyphs.length*32;this.atlas.height=32;
        const a=this.atlas.getContext('2d');a.fillStyle=config.colour;a.font='600 25px Consolas,monospace';a.textAlign='center';a.textBaseline='middle';this.glyphs.forEach((g,i)=>a.fillText(g,i*32+16,16));
      }
      const sx=width*.51*preset.width*(.84+this.riskSmooth*.32),sy=height/.76,angle=Math.atan2(right.y-left.y,right.x-left.x),path=new Path2D();
      for(let i=0;i<=60;i++){const u=i/30-1,x=u*sx,y=(preset.upper(u)-.38)*sy;if(i===0)path.moveTo(x,y);else path.lineTo(x,y);}
      for(let i=60;i>=0;i--){const u=i/30-1;path.lineTo(u*sx,(preset.lower(u)-.38)*sy);}path.closePath();
      ctx.save();ctx.translate(nose.x,nose.y);ctx.rotate(angle);ctx.clip(path);ctx.setTransform(1,0,0,1,0,0);ctx.globalAlpha=this.alpha*.88;ctx.filter=`blur(${4+this.riskSmooth*7}px)`;ctx.drawImage(this.scene,-5,-5,this.canvas.width+10,this.canvas.height+10);ctx.restore();
      ctx.save();ctx.translate(nose.x,nose.y);ctx.rotate(angle);ctx.globalAlpha=this.alpha*.07;ctx.fillStyle=config.colour;ctx.fill(path);ctx.clip(path);
      const phase=Math.floor(now/220),flow=config.movement/100*(.5+this.riskSmooth),time=now/1000;
      for(const point of this.points) {
        const size=width/67*(.88+point.s*.2),glyph=(point.col+point.row*3+Math.floor(point.s*27)+(point.s>.6?phase:0))%this.glyphs.length;
        const x=point.u*sx+Math.sin(point.v*13-time*.85+point.u*3)*flow*width*.008,y=(point.v-.38)*sy;
        ctx.globalAlpha=this.alpha*(.5+Math.min(point.edge/.045,1)*.4);ctx.drawImage(this.atlas,glyph*32,0,32,32,x-size/2,y-size/2,size,size);
      }
      ctx.restore();
    }
  }
  window.MaskBrowserEngine=BrowserEngine;
})();
