(() => {
  'use strict';
  const UI=window.MaskUI, {presets}=window.MaskDesign;
  const publicPreview=window.MaskPublicPreview===true;
  const processingHandoff=window.MaskProcessingHandoff===true;
  const $=selector=>document.querySelector(selector), t=(key,values)=>UI.t(key,values);
  const app=$('.app'), feed=$('.live-feed');
  let page='', state=null, connected=false, wants=false, busy=false, messageKey='readyNote';
  let lastBeat=0, lastFrame=0, frameURL='', frameBusy=false, startingAt=0, lastCameraAt=0;
  let records=[], filtered=[], sampleMode=true, recordError=false, historyBusy=false, historyAt=0, lastCount=-1, selectedEvent=null;
  let liveEntry=false;
  let toastTimer;
  const locale=()=>UI.language==='zh'?'zh-CN':'en-GB';
  const formatTime=(timestamp,withDate=false)=>new Intl.DateTimeFormat(locale(),{timeZone:'Asia/Hong_Kong',...(withDate?{year:'numeric',month:'short',day:'numeric'}:{}),hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(timestamp);
  const dateKey=timestamp=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Hong_Kong',year:'numeric',month:'2-digit',day:'2-digit'}).format(timestamp);
  const maskName=config=>(presets.find(p=>p.id===config.shape)||presets[0]).name[UI.language];
  const sameConfig=(a,b)=>a && b && ['shape','characters','colour','movement','density'].every(key=>key==='colour'?a[key].toUpperCase()===b[key].toUpperCase():a[key]===b[key]);
  const demoDay=Date.parse(`${dateKey(Date.now())}T00:00:00+08:00`);
  const samples=[
    [1,'17:42','petal','#A4597D',64,.68,4200], [1,'14:07','base','#505B90',91,.34,3600],
    [1,'10:28','wing','#388A79',null,0,3100], [2,'19:36','veil','#8763A6',49,.82,5600],
    [2,'16:24','arc','#3C91A6',83,.44,3800], [3,'18:03','facet','#494E5E',61,.71,4700],
    [3,'12:56','ribbon','#BB8738',104,.18,3300], [4,'15:18','echo','#505B90',74,.56,4100],
    [4,'09:42','petal','#BB5555',96,.28,3500], [5,'20:14','base','#A4597D',47,.90,5200],
    [6,'13:22','wing','#388A79',73,.57,3900], [7,'10:05','veil','#8763A6',null,0,3000]
  ].map(([days,time,shape,colour,distance,risk,duration],index)=>{
    const preset=presets.find(p=>p.id===shape), [hour,minute]=time.split(':').map(Number);
    return {id:`demo-${index+1}`,fictional:true,time:demoDay-days*86400000+(hour*60+minute)*60000,duration,config:{shape,colour,characters:index===2?'PRIVATE':'01',movement:preset.movement,density:preset.density},response:true,status:'complete',distanceAvailable:distance!==null,...(distance===null?{}:{minDistance:distance}),peakRisk:risk,endReason:distance===null?'session-ended':'released'};
  });
  async function api(path,body) {
    const response=await fetch(path,{cache:'no-store',signal:AbortSignal.timeout(3500),...(body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})});
    if(!response.ok) throw new Error('Local experience unavailable');
    return response.json();
  }
  function notify(key) {
    clearTimeout(toastTimer); $('.toast').textContent=t(key); $('.toast').hidden=false;
    toastTimer=setTimeout(()=>$('.toast').hidden=true,4000);
  }
  function clearFeed() {
    feed.hidden=true; feed.removeAttribute('src'); lastFrame=0;
    if(frameURL) URL.revokeObjectURL(frameURL); frameURL='';
  }
  function endSession(reason='ended',beacon=false) {
    const wasRunning=wants;
    wants=false; startingAt=0; lastCameraAt=0; clearFeed();
    if(wasRunning) {
      messageKey=reason;
      if(beacon) navigator.sendBeacon('/api/session',new Blob([JSON.stringify({active:false})],{type:'application/json'}));
      else api('/api/session',{active:false}).catch(()=>{});
    }
    renderLive();
  }
  async function startSession() {
    if(publicPreview) return;
    if(busy) return;
    if(wants) { endSession(); return; }
    busy=true; wants=true; startingAt=Date.now(); lastCameraAt=0; messageKey='applying'; renderLive();
    try {
      await api('/api/session',{active:true,config:UI.selected}); lastBeat=Date.now(); connected=true;
      if(!wants || page!=='live') await api('/api/session',{active:false});
    } catch { wants=false; connected=false; messageKey='engineIssue'; clearFeed(); }
    finally { busy=false; renderLive(); }
  }
  $('#session-button').addEventListener('click',startSession);
  $('#reconnect').addEventListener('click',()=>{ messageKey='readyNote'; if(!wants) startSession(); else poll(); });
  $('#guide-start').addEventListener('click',()=>{ if(processingHandoff) { location.assign(window.MaskInstallation.url(UI.selected,UI.language)); return; } if(publicPreview) { location.hash='history'; return; } liveEntry=true; location.hash='live'; });
  const pageTitle=()=>t({home:'homeTitlePage',collection:'title',guide:'guideTitlePage',live:'liveTitlePage',history:'historyTitlePage'}[page]||'homeTitlePage');
  function showPage() {
    let hash=location.hash.slice(1);
    if(processingHandoff && !window.MaskManualProcessingHandoff && (hash==='guide' || hash==='live')) {
      location.replace(window.MaskInstallation.url(UI.selected,UI.language));
      return;
    }
    if(publicPreview && hash==='live') { hash='guide'; history.replaceState(null,'','#guide'); }
    if(hash==='live' && !liveEntry && !wants) { hash='guide'; history.replaceState(null,'','#guide'); }
    const next=hash==='customize'?'collection':['home','collection','guide','live','history'].includes(hash)?hash:'home';
    if(next==='home' && hash!=='home') history.replaceState(null,'','#home');
    const previous=page;
    const steps=['home','collection','customize','guide'];
    const from=page==='collection' && app.dataset.mode==='customize'?'customize':page;
    const target=hash==='customize'?'customize':next;
    UI.transitionLayout(()=>applyPage(next,hash,previous),{
      enabled:steps.includes(from) && steps.includes(target),
      direction:steps.indexOf(target)<steps.indexOf(from)?'back':'forward'
    });
  }
  function applyPage(next,hash,previous) {
    if(page==='live' && next!=='live') endSession();
    page=next; app.dataset.page=page;
    document.querySelectorAll('[data-view]').forEach(view=>view.hidden=view.dataset.view!==page);
    UI.setCustomize(page==='collection' && hash==='customize',false);
    document.querySelectorAll('[data-page]').forEach(link=>{
      if(link.dataset.page===page || (page==='live' && link.dataset.page==='guide')) link.setAttribute('aria-current','page'); else link.removeAttribute('aria-current');
    });
    document.title=pageTitle();
    if(page==='collection') {
      window.scrollTo({top:0,behavior:'instant'}); UI.refresh();
      if(hash!=='customize') $('#collection h1').focus({preventScroll:true});
    }
    else { window.scrollTo({top:0,behavior:'instant'}); $(`#${page} h1`).focus({preventScroll:true}); }
    if(page==='home' || page==='guide') renderMask();
    if(page==='home') UI.enterHome(!!previous);
    else UI.leaveHome();
    if(page==='live') { liveEntry=false; renderLive(); startSession(); }
    if(page==='history') { renderHistory(); loadRecords(true); }
  }
  window.addEventListener('hashchange',showPage);
  window.addEventListener('load',()=>requestAnimationFrame(()=>{ if(page==='home') window.scrollTo({top:0,behavior:'instant'}); }),{once:true});
  window.addEventListener('dpm:enter-live',()=>{ location.hash='guide'; });
  document.addEventListener('keydown',event=>{ if(event.key==='Escape' && page==='live') location.hash='home'; });
  document.addEventListener('visibilitychange',()=>{ if(document.hidden) endSession('tabPaused',true); });
  window.addEventListener('pagehide',()=>endSession('ended',true));
  window.addEventListener('dpm:storage-error',()=>notify('draftIssue'));
  window.addEventListener('dpm:design',renderMask);

  function renderMask() {
    const config=UI.selected;
    $('.guide-mask-name').textContent=maskName(config);
    UI.paintPreview($('#guide-mask'),config); UI.paintPreview($('#guide-effect'),config);
    $('.home-selected-name').textContent=maskName(config);
    $('.home-mask-label i').style.background=config.colour;
    UI.renderHome();
  }
  function renderLive() {
    renderTelemetry();
    feed.alt=t('liveView');
    const current=wants && state?.session && connected;
    const matching=sameConfig(state?.config,UI.selected);
    const fresh=current && state.camera && lastFrame && Date.now()-lastFrame<1800;
    const status=!connected?'offline':!wants?'idle':!fresh?'connecting':state.active?'responding':!state.face?'looking':state.gesture?'holding':'waiting';
    $('.mirror-stage').dataset.status=status;
    $('.live-fallback').hidden=!!fresh; feed.hidden=!fresh;
    const feedback=fresh?window.MaskInstallation.gestureFeedback(state):status;
    $('#stage-status').textContent=!fresh?t(status):state.active?t(feedback)+(state.faceVisible===false?' · '+t('trackingOccluded'):''):`${t(feedback)}${state.gesture?' · '+Math.round(Math.min(1,Math.max(0,state.hold||0))*100)+'%':''} · ${t('twoHands',{n:state.hands})}`;
    $('#session-button').disabled=busy;
    $('#session-button span:first-child').textContent=t(busy?'starting':'resumeLive');
    $('#session-button').hidden=wants || !connected;
    $('#reconnect').hidden=connected || !!fresh;
    let key=messageKey;
    if(!connected) key='engineIssue';
    else if(current && state.error) key='cameraIssue';
    else if(wants && !matching) key=Date.now()-startingAt>6000?'configIssue':'applying';
    else if(wants && current) key='connecting';
    if(wants && connected && matching && !state?.error) key='connecting';
    $('#live-fallback-title').textContent=t(wants?'liveLoading':!connected?'offline':'livePaused');
    $('.live-loading').hidden=!wants || !connected || !!state?.error;
    $('.live-message').textContent=t(key);
    $('.live-message').classList.toggle('is-error',key.endsWith('Issue'));
  }
  function renderTelemetry() {
    const reading=window.MaskInstallation.telemetry(state,connected),panel=$('.live-telemetry'),meter=$('.sensor-risk-meter');
    panel.dataset.sensor=reading.available?'connected':'unavailable';
    const percent=reading.available?Math.round(reading.risk*100):null;
    $('#live-distance').textContent=reading.available?new Intl.NumberFormat(locale(),{maximumFractionDigits:1}).format(reading.distance):'—';
    $('#live-risk').textContent=reading.available?new Intl.NumberFormat(locale(),{maximumFractionDigits:0}).format(percent):'—';
    $('#live-distance-unit').hidden=$('#live-risk-unit').hidden=!reading.available;
    meter.style.setProperty('--risk-fill',`${percent??0}%`);
    meter.setAttribute('aria-hidden',String(!reading.available));
    meter.setAttribute('aria-valuenow',String(percent??0));
    meter.setAttribute('aria-valuetext',reading.available?`${percent}%`:t(reading.online?'sensorNoReading':'sensorOffline'));
    $('#live-sensor-status').textContent=t(!reading.online?'sensorOffline':!reading.available?'sensorNoReading':wants && reading.active?'sensorResponding':'sensorStandby');
    $('#live-sensor-range').textContent=reading.online && Number.isFinite(state?.nearDistance) && Number.isFinite(state?.farDistance)?t('sensorRange',{near:state.nearDistance,far:state.farDistance}):t('sensorSource');
  }
  async function nextFrame() {
    if(frameBusy || !wants || page!=='live' || document.hidden || !state?.camera || !sameConfig(state.config,UI.selected)) return;
    frameBusy=true;
    try {
      const response=await fetch('/api/frame',{cache:'no-store',signal:AbortSignal.timeout(1800)});
      if(!response.ok) return;
      const blob=await response.blob();
      if(!wants || page!=='live') return;
      const previous=frameURL; frameURL=URL.createObjectURL(blob);
      feed.onload=()=>{ lastFrame=Date.now(); renderLive(); };
      feed.src=frameURL;
      if(previous) URL.revokeObjectURL(previous);
    } catch { if(Date.now()-lastFrame>1800) clearFeed(); }
    finally { frameBusy=false; }
  }
  async function poll() {
    try {
      const next=await api('/api/state');
      if(!Number.isFinite(next.time) || (Date.now()-next.time>4000 && !(wants && Date.now()-startingAt<20000))) throw new Error('Stale engine');
      if(!connected && !wants && messageKey==='engineIssue') messageKey='readyNote';
      state=next; connected=true;
      if(wants && Date.now()-lastBeat>1800) { lastBeat=Date.now(); await api('/api/session',{active:true}); }
      if(page==='history' && (recordError || lastCount!==state.eventCount || records.some(record=>record.status==='active'))) loadRecords();
      if(wants && state.camera) lastCameraAt=Date.now();
      if(wants && window.MaskInstallation.cameraTimedOut(startingAt,lastCameraAt)) { endSession('cameraIssue'); }
      if(wants && state.session && Date.now()-startingAt>8000 && !sameConfig(state.config,UI.selected)) endSession('configIssue');
    } catch {
      connected=false;
      if(wants) endSession('engineIssue');
      if(page==='history') { recordError=true; renderHistory(); }
    }
    renderLive();
  }
  let polling=false;
  async function tick() {
    if(!polling && !document.hidden) { polling=true; await poll(); polling=false; }
    setTimeout(tick,wants?350:1500);
  }
  if(!publicPreview) setInterval(nextFrame,140);

  for(const preset of presets) { const option=document.createElement('option'); option.value=preset.id; $('#history-shape').append(option); }
  function updateShapeLabels() {
    for(const option of $('#history-shape').options) option.textContent=option.value?presets.find(p=>p.id===option.value).name[UI.language]:t('allShapes');
  }
  async function loadRecords(force=false) {
    if(publicPreview) return;
    if(historyBusy || (!force && Date.now()-historyAt<1300)) return;
    historyBusy=true; historyAt=Date.now();
    try {
      const result=await api('/api/events');
      if(!Array.isArray(result)) throw new Error('Invalid records');
      records=result.filter(record=>Number.isFinite(record.time) && record.config && presets.some(p=>p.id===record.config.shape));
      recordError=false; lastCount=state?.eventCount??records.length;
    } catch { recordError=true; }
    finally { historyBusy=false; renderHistory(); }
  }
  function cell(tag,className,text) { const element=document.createElement(tag); element.className=className; element.textContent=text; return element; }
  function renderHistory() {
    const source=sampleMode?samples:records;
    const from=$('#date-from').value, to=$('#date-to').value, shape=$('#history-shape').value;
    const validDate=value=>!value || (/^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10)===value);
    const invalidFormat=!validDate(from)||!validDate(to);
    const invalid=invalidFormat || !!(from && to && from>to);
    $('#date-from').setAttribute('aria-invalid',String(invalid)); $('#date-to').setAttribute('aria-invalid',String(invalid));
    filtered=source.filter(record=>!invalid && (!from || dateKey(record.time)>=from) && (!to || dateKey(record.time)<=to) && (!shape || record.config.shape===shape)).sort((a,b)=>b.time-a.time);
    $('#record-total').textContent=source.length; $('#response-total').textContent=source.filter(record=>record.response).length;
    $('.sample-banner').hidden=!sampleMode; $('#sample-toggle').textContent=t(sampleMode?'hideSample':'showSample'); $('#sample-toggle').setAttribute('aria-pressed',String(sampleMode));
    $('#result-count').textContent=invalid?t(invalidFormat?'invalidDateFormat':'invalidDates'):t(filtered.length===1?'oneRecord':'resultCount',{n:filtered.length});
    $('.archive-error').hidden=sampleMode || (!recordError && state?.storageOK!==false);
    $('.archive-error').textContent=t(recordError?'archiveLoadError':'storageIssue');
    $('.archive-empty').hidden=source.length>0 || (recordError && !sampleMode);
    $('.archive-no-results').hidden=!source.length || filtered.length>0;
    $('.archive-columns').hidden=!filtered.length;
    $('#export-records').disabled=!filtered.length;
    const rows=document.createDocumentFragment();
    for(const record of filtered) {
      const button=document.createElement('button'); button.className='record-row'; button.type='button';
      button.setAttribute('aria-label',t('openEvent',{time:formatTime(record.time,true)}));
      const time=cell('time','event-time',''); time.dateTime=new Date(record.time).toISOString();
      time.append(cell('span','event-date',dateKey(record.time)),cell('strong','',formatTime(record.time)));
      const mask=cell('span','event-mask',''); const swatch=cell('i','',''); swatch.style.background=record.config.colour;
      mask.append(swatch,cell('span','',maskName(record.config)));
      button.append(time,mask,cell('span','event-response',t(record.status==='active'?'ongoing':'maskResponded')),cell('span','event-distance',record.distanceAvailable?`${Math.round(record.minDistance)} cm`:'—'),cell('span','event-risk',record.distanceAvailable?`${Math.round(record.peakRisk*100)}%`:'—'),cell('span','record-arrow','↗'));
      button.querySelector('.event-distance').dataset.label=`${t('distanceLabel')} · `;
      button.querySelector('.event-risk').dataset.label=`${t('riskLabel')} · `;
      button.addEventListener('click',()=>openRecord(record)); rows.append(button);
    }
    $('#record-list').replaceChildren(rows);
    if($('.record-dialog').open && selectedEvent) renderRecord();
  }
  $('.archive-filters').addEventListener('submit',event=>event.preventDefault());
  $('.archive-filters').addEventListener('change',renderHistory);
  $('.archive-filters').addEventListener('input',renderHistory);
  $('.archive-filters').addEventListener('reset',()=>setTimeout(renderHistory,0));
  $('#reset-search').addEventListener('click',()=>$('.archive-filters').reset());
  function toggleSamples(next) { sampleMode=publicPreview || next; renderHistory(); if(!sampleMode) loadRecords(true); }
  $('#sample-toggle').addEventListener('click',()=>toggleSamples(!sampleMode));
  const endKeys={'released':'released','face-lost':'faceLost','camera-lost':'cameraLost','session-ended':'sessionEnded','engine-stopped':'engineStopped'};
  function renderRecord() {
    const record=selectedEvent;
    $('#record-source').textContent=t(record.fictional?'sampleDetail':'eventDetail');
    $('#record-title').textContent=maskName(record.config);
    UI.paintPreview($('#record-mask'),record.config);
    const seconds=new Intl.NumberFormat(locale(),{maximumFractionDigits:1}).format(record.duration/1000);
    const values=[['eventTime',formatTime(record.time,true)],['responseLabel',t(record.status==='active'?'ongoing':'maskResponded')],['responseTime',`${seconds} ${UI.language==='zh'?'秒':'s'}`],['closestDistance',record.distanceAvailable?`${Math.round(record.minDistance)} cm`:t('unavailableDistance')],['peakRisk',record.distanceAvailable?`${Math.round(record.peakRisk*100)}%`:t('notEvaluated')],['charactersDetail',record.config.characters],['colourDetail',record.config.colour],['finishedBy',record.status==='active'?'—':t(endKeys[record.endReason]||'released')]];
    const details=document.createDocumentFragment();
    for(const [key,value] of values) { const row=document.createElement('div'); row.append(cell('dt','',t(key)),cell('dd','',value)); details.append(row); }
    $('#record-details').replaceChildren(details);
  }
  function openRecord(record) { selectedEvent=record; renderRecord(); $('.record-dialog').showModal(); }
  $('.record-dialog .dialog-close').addEventListener('click',()=>$('.record-dialog').close());
  $('.record-dialog').addEventListener('click',event=>{ if(event.target===$('.record-dialog')) { const rect=event.target.getBoundingClientRect(); if(event.clientX<rect.left || event.clientX>rect.right || event.clientY<rect.top || event.clientY>rect.bottom) event.target.close(); } });
  $('#reuse-mask').addEventListener('click',()=>{ UI.useConfig(selectedEvent.config); $('.record-dialog').close(); location.hash='customize'; });
  $('#export-records').addEventListener('click',()=>{
    const content={type:sampleMode?'fictional-demo-events':'simulated-capture-events',timezone:'UTC+08:00',exportedAt:new Date().toISOString(),events:filtered};
    const url=URL.createObjectURL(new Blob([JSON.stringify(content,null,2)],{type:'application/json'}));
    const link=document.createElement('a'); link.href=url; link.download=`404-face-not-found-${sampleMode?'sample':'records'}-${dateKey(Date.now())}.json`; link.click();
    setTimeout(()=>URL.revokeObjectURL(url),1000); notify('exported');
  });
  window.addEventListener('dpm:language',()=>{ updateShapeLabels(); renderMask(); renderLive(); renderHistory(); document.title=pageTitle(); });
  $('#sample-toggle').hidden=publicPreview;
  const imported=!publicPreview?window.MaskInstallation.decode(location.hash):null;
  if(imported) { UI.useConfig(imported.config);UI.setLanguage(imported.language);history.replaceState(null,'','#guide'); }
  updateShapeLabels(); renderMask(); showPage(); if(!publicPreview) tick();
})();
