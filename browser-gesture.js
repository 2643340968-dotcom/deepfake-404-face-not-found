(() => {
  'use strict';
  const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,(a.z||0)-(b.z||0));
  const joint=(a,b,c)=>{
    const u=[a.x-b.x,a.y-b.y,(a.z||0)-(b.z||0)],v=[c.x-b.x,c.y-b.y,(c.z||0)-(b.z||0)];
    return Math.acos(Math.max(-1,Math.min(1,u.reduce((s,x,i)=>s+x*v[i],0)/Math.max(1e-12,Math.hypot(...u)*Math.hypot(...v)))))*180/Math.PI;
  };
  function classify(points,world=points) {
    if(points?.length!==21 || world?.length!==21) return 'showHands';
    const p=world,size=distance(p[0],p[9]);
    if(size<.0001) return 'showHands';
    if(joint(p[5],p[6],p[7])<145 || joint(p[6],p[7],p[8])<145 || distance(p[0],p[8])<distance(p[0],p[6])*1.12) return 'extendIndex';
    if(joint(p[2],p[3],p[4])<140 || distance(p[4],p[5])<size*.50) return 'openThumb';
    let curled=0;
    for(const m of [9,13,17]) if(joint(p[m],p[m+1],p[m+2])<155 || distance(p[0],p[m+3])<distance(p[0],p[m+1])*1.08) curled++;
    if(curled<2) return 'foldFingers';
    const [i,t]=axes(points),cos=i[0]*t[0]+i[1]*t[1];
    return cos>.55 || cos<-.65 ? 'frameInward' : 'ready';
  }
  function axes(p) {
    return [[p[8].x-p[5].x,p[8].y-p[5].y],[p[4].x-p[2].x,p[4].y-p[2].y]].map(a=>{const n=Math.max(1e-8,Math.hypot(...a));return a.map(v=>v/n);});
  }
  function formsFrame(a,b) {
    if(classify(a.points,a.world)!=='ready' || classify(b.points,b.world)!=='ready') return false;
    const p=a.points,q=b.points,sa=distance(p[0],p[9]),sb=distance(q[0],q[9]);
    if(sa<.005 || sb<.005 || sa/sb<.35 || sa/sb>2.85) return false;
    const dx=q[5].x-p[5].x,dy=q[5].y-p[5].y,separation=Math.hypot(dx,dy);
    if(separation<Math.max(sa,sb)*.8 || separation>Math.max(sa,sb)*9) return false;
    const u=axes(p),v=axes(q),dot=(a,b)=>a[0]*b[0]+a[1]*b[1];
    if(u.some(a=>(a[0]*dx+a[1]*dy)/separation<-.30) || v.some(a=>(a[0]*dx+a[1]*dy)/separation>.30)) return false;
    return Math.max(Math.min(-dot(u[0],v[0]),-dot(u[1],v[1])),Math.min(-dot(u[0],v[1]),-dot(u[1],v[0])))>.5;
  }
  window.MaskBrowserGesture=Object.freeze({classify,formsFrame});
})();
