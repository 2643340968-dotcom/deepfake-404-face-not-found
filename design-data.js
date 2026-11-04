(() => {
  'use strict';
  const gaussian = u => Math.exp(-u * u / .06);
  const s = Math.abs;
  const presets = [
    { id: 'base', name: { en: 'Base', zh: '基础' }, description: { en: 'A complete character surface with a softly tapered silhouette.', zh: '完整字符表面，柔和收拢的下颌轮廓。' }, movement: 35, density: 72, width: 1, pattern: 'surface', upper: u => .58 - .2 * gaussian(u) - .38 * s(u) ** 10, lower: u => 1.13 - .58 * s(u) ** 1.35 },
    { id: 'arc', name: { en: 'Arc', zh: '弧面' }, description: { en: 'A rounded lower edge and a low, continuous sweep.', zh: '低起伏的上缘，圆润而连续的底部弧线。' }, movement: 28, density: 82, width: .96, pattern: 'surface', upper: u => .44 - .14 * gaussian(u) - .12 * s(u) ** 3, lower: u => .93 - .39 * u * u },
    { id: 'wing', name: { en: 'Wing', zh: '展翼' }, description: { en: 'A broad silhouette with lifted, outward-reaching cheeks.', zh: '向两侧舒展，上扬的颊缘形成宽阔轮廓。' }, movement: 48, density: 76, width: 1.13, pattern: 'surface', upper: u => .54 - .18 * gaussian(u) - .41 * s(u) ** 3, lower: u => .91 - .36 * s(u) ** 1.7 },
    { id: 'petal', name: { en: 'Petal', zh: '花瓣' }, description: { en: 'Soft scallops trace a gently unfolding lower edge.', zh: '柔和的波瓣，沿下缘轻轻展开。' }, movement: 40, density: 78, width: .98, pattern: 'surface', upper: u => .53 - .16 * gaussian(u) - .23 * s(u) ** 5, lower: u => 1.06 - .45 * s(u) ** 1.4 + .065 * Math.cos(u * Math.PI * 3) },
    { id: 'ribbon', name: { en: 'Ribbon', zh: '缎带' }, description: { en: 'A narrow ribbon of characters crossing the lower face.', zh: '纤薄的字符带，横向勾勒下半张脸。' }, movement: 55, density: 85, width: 1.08, pattern: 'surface', upper: u => .52 - .12 * gaussian(u) - .18 * s(u) ** 3, lower: u => .74 - .28 * u * u },
    { id: 'veil', name: { en: 'Veil', zh: '垂纱' }, description: { en: 'An elongated taper with a slowly shifting character weave.', zh: '向下延伸的尖细轮廓，字符如薄纱流动。' }, movement: 65, density: 70, width: .82, pattern: 'flow', upper: u => .57 - .2 * gaussian(u) - .29 * s(u) ** 8, lower: u => 1.24 - .78 * s(u) ** 1.25 },
    { id: 'facet', name: { en: 'Facet', zh: '折面' }, description: { en: 'Angular cheek lines meet a broad, geometric jaw.', zh: '利落的颊部折线，连接宽阔的几何下缘。' }, movement: 24, density: 80, width: 1, pattern: 'surface', upper: u => .38 + .22 * Math.min(s(u) / .4, 1) - .4 * Math.max((s(u) - .4) / .6, 0), lower: u => s(u) < .4 ? 1.08 - .1 * s(u) / .4 : .98 - .42 * (s(u) - .4) / .6 },
    { id: 'echo', name: { en: 'Echo', zh: '回声' }, description: { en: 'Open contour bands follow a light, pointed silhouette.', zh: '轻盈的尖底轮廓，留白与字符带交替。' }, movement: 42, density: 85, width: .93, pattern: 'contour', upper: u => .47 - .16 * gaussian(u) - .12 * s(u) ** 5, lower: u => 1.02 - .57 * s(u) ** 1.3 }
  ];
  const palette = [
    { hex: '#505B90', en: 'Mist blue', zh: '雾蓝' }, { hex: '#A4597D', en: 'Rose', zh: '玫粉' },
    { hex: '#388A79', en: 'Jade', zh: '玉绿' }, { hex: '#3C91A6', en: 'Teal', zh: '湖青' },
    { hex: '#BB8738', en: 'Amber', zh: '琥珀' }, { hex: '#BB5555', en: 'Coral', zh: '珊瑚' },
    { hex: '#8763A6', en: 'Violet', zh: '紫罗兰' }, { hex: '#494E5E', en: 'Graphite', zh: '石墨' }
  ];
  const messages = {
    en: {
      title: '404 FACE NOT FOUND — Collection', brand: '404 FACE NOT FOUND', home: '404 FACE NOT FOUND, return to collection', navigation: 'Page controls', collection: 'Collection', project: 'Project',
      language: '切换为中文', languageButton: '中文', pause: 'Pause character animation', play: 'Play character animation', motionOn: 'Motion on', motionOff: 'Motion off',
      editorLabel: 'Customize mask', back: 'Back to collection', editorEyebrow: 'YOUR MASK, YOUR RULES', editorTitle: 'Make it yours.', shapeLabel: 'Mask shape', characters: 'Characters', charactersHelp: '1–12 characters; empty uses 01',
      colour: 'Character colour', wheelLabel: 'Hue and saturation wheel', wheelHelp: 'Drag to choose colour. Left and right change hue; up and down change saturation. Hold Shift for larger steps.', wheelValue: 'Hue {h} degrees, saturation {s} percent', hexLabel: 'HEX', hexInput: 'Hexadecimal colour', hexError: 'Enter a six-digit HEX colour.', brightness: 'Brightness', saturation: 'Saturation', hue: 'Hue',
      movement: 'Flow amplitude', calm: 'Calm', flowing: 'Flowing', density: 'Character density', sparse: 'Sparse', dense: 'Dense', reset: 'Reset defaults', preview: 'Current shape preview',
      headingCollection: 'THE COLLECTION', headingCustom: 'PERSONAL EXPRESSION', heading: 'Find your mask', headingEnd: '.', note: 'Different forms. The same you.', noteSub: 'A study of digital identity.',
      carousel: 'Mask shape collection', carouselRole: 'carousel', field: 'CHARACTER FIELD', drag: 'Drag to switch', selection: 'Current selection', choices: 'Choose a mask shape',
      selectMask: 'Choose {name}', customizeMask: 'Customize {name} mask', switchMask: 'Switch to {name} mask', customize: 'Customize mask', done: 'Try it live',
      footer: 'DIGITAL IDENTITY / HUMAN EXPRESSION', footerStatus: 'INTERACTION STUDY — 2026', closeProject: 'Close project introduction', projectTitle: 'A little space for privacy.',
      projectBody: 'Exploring facial privacy through gestures, distance and digital masks.', projectNote: 'An HCI study of digital identity. A photo-frame gesture represents an external capture, and the digital mask responds through movement.', reference: 'Visual reference'
    },
    zh: {
      title: '404 FACE NOT FOUND — 形态选择', brand: '404 FACE NOT FOUND', home: '404 FACE NOT FOUND，返回选择', navigation: '页面操作', collection: '口罩选择', project: '项目介绍',
      language: 'Switch to English', languageButton: 'EN', pause: '暂停字符动画', play: '播放字符动画', motionOn: '动态开启', motionOff: '动态暂停',
      editorLabel: '定制口罩', back: '返回选择', editorEyebrow: '你的口罩，你的表达', editorTitle: '定义你的表达', shapeLabel: '口罩形状', characters: '字符内容', charactersHelp: '1—12 个字符；留空使用 01',
      colour: '字符色彩', wheelLabel: '色相与饱和度轮盘', wheelHelp: '拖动轮盘选色。左右方向键调整色相，上下方向键调整饱和度；按住 Shift 可增大步幅。', wheelValue: '色相 {h} 度，饱和度 {s}%', hexLabel: '色值', hexInput: '十六进制颜色值', hexError: '请输入六位十六进制颜色值。', brightness: '明暗', saturation: '饱和度', hue: '色相',
      movement: '流动幅度', calm: '平静', flowing: '流动', density: '字符密度', sparse: '疏', dense: '密', reset: '恢复默认', preview: '当前形态预览',
      headingCollection: '口罩形态集', headingCustom: '自定义表达', heading: '选择你的口罩', headingEnd: '。', note: '不同的形态，同一个你。', noteSub: '关于数字身份的一次探索。',
      carousel: '口罩形态轮播', carouselRole: '轮播图', field: '字符场域', drag: '左右拖动切换', selection: '当前选择', choices: '选择口罩形状',
      selectMask: '选择{name}', customizeMask: '定制{name}口罩', switchMask: '切换到{name}口罩', customize: '定制这个口罩', done: '进入实时体验',
      footer: '数字身份 / 人的表达', footerStatus: '交互试验 — 2026', closeProject: '关闭项目介绍', projectTitle: '为隐私留一点空间',
      projectBody: '以手势、距离和数字口罩，探索面部隐私的表达方式。', projectNote: '一个以网页为载体的 HCI 交互试验。拍照手势象征外部捕获，数字口罩以形变作出回应。', reference: '视觉参考'
    }
  };
  Object.assign(messages.en, {
    invalidDateFormat:'Use a valid date in YYYY-MM-DD format.',
    oneRecord:'1 record',
    liveNav:'Live experience', historyNav:'Protection log', liveEyebrow:'THE LIVE STUDY', liveTitle:'Privacy, in motion.', liveIntro:'One gesture. A response that is yours.', liveView:'Live view', yourSpace:'A SPACE OF YOUR OWN', standbyTitle:'Come as you are.', standbyBody:'Your live view appears here when you begin.', localOnly:'Processed on this device', simulation:'SIMULATED CAPTURE', simulationNote:'The gesture represents a capture; this study does not detect or prevent real photography.', start:'Begin experience', stop:'End experience', starting:'Starting…', retry:'Reconnect', seeRecords:'View protection log', chosenMask:'YOUR MASK', editMask:'Edit mask ↗', gestureTitle:'INVITE A RESPONSE', gestureLead:'Frame the moment.', gestureBody:'Extend both index fingers and thumbs. Turn the two L shapes inward to form a frame, and hold for about a second.', holdLabel:'Gesture hold progress', faceLabel:'Face', handsLabel:'Hands', distanceLabel:'Distance', riskLabel:'Simulated risk', distanceNote:'After the gesture activates, closer distance brings a stronger mask response.',
    idle:'Not started', offline:'Experience unavailable', connected:'Ready when you are', connecting:'Connecting live view', waiting:'Waiting for your gesture', holding:'Hold your frame', responding:'Mask responding', unavailable:'Unavailable', detected:'Detected', looking:'Looking for a face', notEvaluated:'Not evaluated', noSensor:'Sensor unavailable', gestureIdle:'Begin to try the gesture', showHands:'Show both hands in view', twoHands:'{n} / 2 detected', frameInward:'Turn the two L shapes inward', extendIndex:'Extend your index fingers', openThumb:'Open your thumbs', foldFingers:'Fold the other fingers', holdPose:'Keep the frame still', releasePose:'Release to finish this response', noFace:'Face the camera to continue', cameraIssue:'The camera is unavailable. Check the exhibit camera and retry.', engineIssue:'The live experience is not connected. Reconnect when the exhibit is ready.', applying:'Applying your selected mask…', configIssue:'The selected mask has not been confirmed. End the experience and retry.', ended:'Experience ended. Your camera is off.', tabPaused:'Experience paused while this page was hidden. Begin again when ready.', storageIssue:'Records are available for this run, but could not be saved on this device.',
    historyEyebrow:'THE INTERACTION ARCHIVE', historyTitle:'A trace of every response.', historyIntro:'Revisit simulated captures and the masks that responded.', recordSummary:'Record summary', eventsLabel:'Simulated events', responsesLabel:'Mask responses', archivePrivacy:'Only a trace of the response.\nYour face is never saved.', showSample:'Preview sample records ↗', hideSample:'Return to real records ↗', sampleNotice:'Sample data for interface preview. These are not your actual records.', backReal:'Return to real records', fromDate:'From', toDate:'To', allShapes:'All shapes', clearFilters:'Reset filters', export:'Export records ↓', timezone:'Times shown in UTC+08:00', resultCount:'{n} records', eventTime:'Event time', maskLabel:'Mask', responseLabel:'Response', noRecords:'No traces yet.', noRecordsBody:'Trigger a response with the gesture. Its record will appear here.', goLive:'Enter the live study', noMatches:'No records in this range.', invalidDates:'The start date must be on or before the end date.', archiveNote:'These records describe a prototype response, not proof of real privacy protection.', eventDetail:'EVENT DETAIL', sampleDetail:'SAMPLE EVENT', closeRecord:'Close event details', configAtEvent:'Mask configuration at activation', recordNote:'This is a configuration and data preview, not a photo or video of the event.', reuseMask:'Use this mask', maskResponded:'Mask responded', ongoing:'Responding now', responseTime:'Duration', peakRisk:'Peak simulated risk', closestDistance:'Closest valid distance', unavailableDistance:'No valid distance', charactersDetail:'Characters', colourDetail:'Colour', finishedBy:'Response ended', released:'Gesture released', faceLost:'Face no longer tracked', cameraLost:'Camera unavailable', sessionEnded:'Experience ended', engineStopped:'Engine stopped', sample:'Sample', openEvent:'View event at {time}', archiveLoadError:'Records could not be loaded. Reconnect and retry.', loadingRecords:'Loading records…', exported:'Records exported.', draftIssue:'Your changes work now, but could not be saved in this browser.', readyNote:'Your camera stays off until you begin.', confirmConfig:'Selected mask applied', liveTitlePage:'404 FACE NOT FOUND — Live experience', historyTitlePage:'404 FACE NOT FOUND — Protection log'
  });
  Object.assign(messages.zh, {
    invalidDateFormat:'请输入有效日期，格式为 YYYY-MM-DD。',
    oneRecord:'1 条记录',
    liveNav:'实时体验', historyNav:'防护记录', liveEyebrow:'实时交互', liveTitle:'隐私，在此刻回应。', liveIntro:'一个手势，唤起你的数字口罩。', liveView:'实时画面', yourSpace:'为你保留的空间', standbyTitle:'准备好，做回自己。', standbyBody:'开始后，你的实时画面会出现在这里。', localOnly:'仅在此设备处理', simulation:'模拟捕获体验', simulationNote:'手势象征拍照意图，不代表识别或阻止现实偷拍。', start:'开始体验', stop:'结束体验', starting:'正在启动…', retry:'重新连接', seeRecords:'查看防护记录', chosenMask:'你的口罩', editMask:'调整口罩 ↗', gestureTitle:'让口罩出现', gestureLead:'用双手，框住这一刻。', gestureBody:'伸出食指和拇指，两只 L 朝内组成取景框，保持约一秒。', holdLabel:'手势保持进度', faceLabel:'面部', handsLabel:'双手', distanceLabel:'距离', riskLabel:'模拟风险', distanceNote:'有效手势触发后，距离越近，口罩响应越强。',
    idle:'尚未开始', offline:'体验暂不可用', connected:'准备就绪', connecting:'正在连接实时画面', waiting:'等待你的手势', holding:'请保持取景框', responding:'口罩正在回应', unavailable:'不可用', detected:'已检测', looking:'寻找面部中', notEvaluated:'尚未评估', noSensor:'传感器不可用', gestureIdle:'开始后等待手势', showHands:'请让双手进入画面', twoHands:'已检测 {n} / 2', frameInward:'请让两只 L 朝内形成取景框', extendIndex:'请伸直食指', openThumb:'请张开拇指', foldFingers:'请收拢其余手指', holdPose:'保持取景框不动', releasePose:'松开手势，结束这次回应', noFace:'请正对摄像头继续', cameraIssue:'摄像头暂不可用，请检查展示设备后重试。', engineIssue:'实时体验尚未连接，展示设备准备就绪后可重新连接。', applying:'正在应用你的口罩…', configIssue:'所选口罩尚未得到确认，请结束体验后重试。', ended:'体验已结束，摄像头已关闭。', tabPaused:'页面隐藏时已暂停体验，准备好后可重新开始。', storageIssue:'本次记录暂可查看，但未能保存到此设备。',
    historyEyebrow:'交互档案', historyTitle:'每次回应，皆有迹可循。', historyIntro:'回看模拟拍照事件与对应的口罩响应。', recordSummary:'记录概览', eventsLabel:'模拟事件', responsesLabel:'口罩响应', archivePrivacy:'只留下一次回应的轨迹。\n不保存你的面部画面。', showSample:'预览示例记录 ↗', hideSample:'返回实际记录 ↗', sampleNotice:'正在查看示例数据，不是你的实际防护记录。', backReal:'返回实际记录', fromDate:'开始日期', toDate:'结束日期', allShapes:'全部形状', clearFilters:'重置筛选', export:'导出记录 ↓', timezone:'时间为 UTC+08:00', resultCount:'{n} 条记录', eventTime:'事件时间', maskLabel:'口罩', responseLabel:'响应', noRecords:'还没有留下记录。', noRecordsBody:'完成一次手势触发后，回应会保存在这里。', goLive:'进入实时体验', noMatches:'这个时间范围内没有记录。', invalidDates:'开始日期不能晚于结束日期。', archiveNote:'记录反映交互原型的响应，不作为真实隐私防护的证明。', eventDetail:'事件详情', sampleDetail:'示例事件', closeRecord:'关闭记录详情', configAtEvent:'触发时的口罩配置', recordNote:'此处展示口罩配置与响应数据，不是现场照片或录像。', reuseMask:'使用这个口罩', maskResponded:'口罩已响应', ongoing:'正在回应', responseTime:'持续时长', peakRisk:'最高模拟风险', closestDistance:'最近有效距离', unavailableDistance:'无有效距离', charactersDetail:'字符', colourDetail:'颜色', finishedBy:'结束原因', released:'手势松开', faceLost:'面部跟踪中断', cameraLost:'摄像头不可用', sessionEnded:'体验结束', engineStopped:'引擎停止', sample:'示例', openEvent:'查看 {time} 的事件', archiveLoadError:'暂时无法读取记录，请重新连接后重试。', loadingRecords:'正在读取记录…', exported:'记录已导出。', draftIssue:'修改仍然有效，但未能保存在此浏览器。', readyNote:'点击开始之前，摄像头保持关闭。', confirmConfig:'所选口罩已应用', liveTitlePage:'404 FACE NOT FOUND — 实时体验', historyTitlePage:'404 FACE NOT FOUND — 防护记录'
  });
  Object.assign(messages.en, {
    home:'404 FACE NOT FOUND, return home', homeNav:'Home', liveNav:'Live', done:'Continue to live guide', homeTitlePage:'404 FACE NOT FOUND — Home', guideTitlePage:'404 FACE NOT FOUND — Before you begin',
    homeEyebrow:'AN INTERACTIVE STUDY OF DIGITAL IDENTITY', homeTitle:'404\nFACE NOT FOUND', homeIntro:'When the camera comes closer,\nlet your privacy take shape.', homeArt:'A fluid boundary. A personal expression.', homeStart:'Choose your mask', homeQuick:'Try your current mask', homeAbout:'A photo-frame gesture. A digital response.', homeArchive:'Explore the protection log',
    homeSelected:'CURRENT FORM', homeInteract:'Move or touch. The characters respond.', homeReplay:'Replay entrance', homeSkip:'Skip intro', homeDisturb:'Touch the character mask to send a ripple',
    guideEyebrow:'BEFORE YOU BEGIN', guideBack:'Edit your mask', guideTitle:'Frame the\nmoment.', guideStepFace:'Face the camera with your face and both hands in view.', guideStepHands:'Extend your index fingers and thumbs. Turn both L shapes inward.', guideStepHold:'Hold for about a second. The mask appears, then fades after you release.', guideHold:'Hold for about 1 second', guideStart:'I’m ready. Begin.', guidePrivacy:'The camera is on only during the experience. Images are not saved. The gesture represents a simulated capture.', changeMask:'Change ↗', leaveLive:'End experience', showGuide:'How to interact', resumeLive:'Begin again', liveMinimalNote:'SIMULATED CAPTURE · PROCESSED ON THIS DEVICE', liveLoading:'Preparing your live view…', livePaused:'Your experience is paused.',
    sampleNotice:'DEMO ARCHIVE · These entries are fictional.', showSample:'View demo archive ↗', hideSample:'View device records ↗', backReal:'View device records', sampleDetail:'FICTIONAL DEMO EVENT'
  });
  Object.assign(messages.zh, {
    home:'404 FACE NOT FOUND，返回首页', homeNav:'首页', done:'下一步：互动引导', homeTitlePage:'404 FACE NOT FOUND — 首页', guideTitlePage:'404 FACE NOT FOUND — 互动引导',
    homeEyebrow:'关于数字身份与面部隐私的交互试验', homeTitle:'404\nFACE NOT FOUND', homeIntro:'当镜头靠近，\n让你的隐私被看见。', homeArt:'流动的边界，自由的表达。', homeStart:'选择你的口罩', homeQuick:'使用当前口罩体验', homeAbout:'用手势模拟一次拍照，让数字口罩作出回应。', homeArchive:'翻阅防护档案',
    homeSelected:'当前形态', homeInteract:'移动或轻触，让字符回应。', homeReplay:'重播入场', homeSkip:'跳过开场', homeDisturb:'轻触字符口罩，触发涟漪',
    guideEyebrow:'开始之前', guideBack:'调整口罩', guideTitle:'用双手，\n框住这一刻。', guideStepFace:'正对摄像头，让面部与双手进入画面。', guideStepHands:'伸出食指和拇指，两只 L 朝内组成取景框。', guideStepHold:'保持约一秒，口罩出现；松手后逐渐消退。', guideHold:'保持约 1 秒', guideStart:'准备好了，开始体验', guidePrivacy:'摄像头仅在体验时开启，画面不保存。手势用于模拟拍照意图。', changeMask:'更换 ↗', leaveLive:'结束体验', showGuide:'操作提示', resumeLive:'重新开始', liveMinimalNote:'模拟捕获体验 · 仅在本机处理', liveLoading:'正在准备实时画面…', livePaused:'体验已暂停。',
    sampleNotice:'演示档案 · 以下记录均为虚构内容。', showSample:'查看演示档案 ↗', hideSample:'查看本机记录 ↗', backReal:'查看本机记录', sampleDetail:'虚构演示事件'
  });
  Object.assign(messages.zh, {
    guideStepHold:'保持约一秒。口罩出现后可松开手势；双手全部离开画面后，口罩消失。',trackingOccluded:'短时遮挡，保持定位',
    wholeHand:'请让整只手进入画面',rightAngle:'食指与拇指组成直角',sensorPanel:'距离与风险',sensorRisk:'Risk · 距离风险',sensorOffline:'未连接现场装置',sensorNoReading:'传感器无有效读数',sensorStandby:'距离实时更新 · 等待手势触发',sensorResponding:'距离实时更新 · 口罩正在响应',sensorRange:'{near} cm → 100% · {far} cm → 0%',sensorSource:'Processing + Arduino · 真实传感器数据',
    guidePrivacy:'摄像头由本机 Processing 开启，画面不保存或上传。请连接 Arduino 与距离传感器；Risk 在 2—50 cm 内随靠近而升高。',liveMinimalNote:'模拟捕获体验 · PROCESSING + ARDUINO · 仅在本机处理'
  });
  Object.assign(messages.en, {
    guideStepHold:'Hold for about a second. Relax the gesture after the mask appears; it disappears when both hands leave the frame.',trackingOccluded:'Holding position through brief occlusion',
    wholeHand:'Keep your whole hand in view',rightAngle:'Make a right angle with index and thumb',sensorPanel:'DISTANCE & RISK',sensorRisk:'Risk · proximity',sensorOffline:'Installation not connected',sensorNoReading:'No valid sensor reading',sensorStandby:'Distance updates live · waiting for your gesture',sensorResponding:'Distance updates live · mask responding',sensorRange:'{near} cm → 100% · {far} cm → 0%',sensorSource:'Processing + Arduino · real sensor data',
    guidePrivacy:'Processing uses the camera on this computer. Frames are never saved or uploaded. Connect Arduino and the distance sensor; Risk rises as you move closer within 2–50 cm.',liveMinimalNote:'SIMULATED CAPTURE · PROCESSING + ARDUINO · ON THIS DEVICE'
  });
  const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
  function hsvToHex({ h, s, v }) {
    h = ((h % 360) + 360) % 360;
    s = clamp(s, 0, 100) / 100; v = clamp(v, 0, 100) / 100;
    const c = v * s, x = c * (1 - Math.abs((h / 60) % 2 - 1)), m = v - c;
    const rgb = h < 60 ? [c,x,0] : h < 120 ? [x,c,0] : h < 180 ? [0,c,x] : h < 240 ? [0,x,c] : h < 300 ? [x,0,c] : [c,0,x];
    return '#' + rgb.map(n => Math.round((n + m) * 255).toString(16).padStart(2, '0')).join('').toUpperCase();
  }
  function hexToHsv(hex) {
    const rgb = hex.slice(1).match(/../g).map(n => parseInt(n,16) / 255);
    const [r,g,b] = rgb, max = Math.max(...rgb), min = Math.min(...rgb), d = max - min;
    let h = 0;
    if (d) h = max === r ? 60 * (((g-b) / d + 6) % 6) : max === g ? 60 * ((b-r) / d + 2) : 60 * ((r-g) / d + 4);
    return { h, s: max ? d / max * 100 : 0, v: max * 100 };
  }
  window.MaskDesign = { presets, palette, messages, hsvToHex, hexToHsv };
})();
