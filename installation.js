(() => {
  'use strict';
  const prefix='#installation=';
  const valid=config=>config && window.MaskDesign.presets.some(p=>p.id===config.shape) && /^#[0-9a-f]{6}$/i.test(config.colour) && typeof config.characters==='string' && [...config.characters].length<=12 && !/[\u0000-\u001f\u007f]/.test(config.characters) && Number.isFinite(config.movement) && config.movement>=0 && config.movement<=100 && Number.isFinite(config.density) && config.density>=30 && config.density<=100;
  function decode(hash) {
    if(typeof hash!=='string' || !hash.startsWith(prefix) || hash.length>2048) return null;
    try {
      const data=JSON.parse(decodeURIComponent(hash.slice(prefix.length)));
      return data.version===1 && ['zh','en'].includes(data.language) && valid(data.config) ? data : null;
    } catch { return null; }
  }
  function url(config,language) {
    if(!valid(config) || !['zh','en'].includes(language)) throw Error('Invalid installation selection');
    return 'http://127.0.0.1:4173/'+prefix+encodeURIComponent(JSON.stringify({version:1,language,config}));
  }
  function telemetry(state,connected,now=Date.now()) {
    const online=!!connected && Number.isFinite(state?.time) && Math.abs(now-state.time)<4000;
    const available=online && state.sensor===true && Number.isFinite(state.distance) && state.distance>=2 && state.distance<=400 && Number.isFinite(state.distanceRisk) && state.distanceRisk>=0 && state.distanceRisk<=1;
    return {online,available,distance:available?state.distance:null,risk:available?state.distanceRisk:null,active:available && state.active===true};
  }
  function gestureFeedback(state) {
    if(!state?.face) return 'noFace';
    if(state.active) return 'responding';
    if(state.gesture) return 'holdPose';
    if(state.hands<2) return 'showHands';
    return ({'EXTEND INDEX':'extendIndex','OPEN THUMB':'openThumb','FOLD OTHER FINGERS':'foldFingers','SHOW WHOLE HAND':'wholeHand','MAKE A RIGHT ANGLE':'rightAngle','TURN L CORNERS INWARD':'frameInward'})[state.hint]||'frameInward';
  }
  function cameraTimedOut(startedAt,lastCameraAt,now=Date.now()) {
    return now-(lastCameraAt||startedAt)>(lastCameraAt?5000:20000);
  }
  window.MaskInstallation=Object.freeze({url,decode,telemetry,gestureFeedback,cameraTimedOut});
})();
