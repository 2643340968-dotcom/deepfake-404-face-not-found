(() => {
  'use strict';
  window.MaskPublicPreview=true;
  window.MaskProcessingHandoff=false;
  Object.assign(window.MaskDesign.messages.zh, {
    archivePrivacy:'仅在当前浏览器保存触发时间与口罩配置。\n不保存人脸、图片、视频或关键点。',
    footerStatus:'BROWSER LIVE — 2026',liveMinimalNote:'浏览器实时体验 · 画面仅在本机处理',
    guideHold:'保持约 0.6 秒',guideStepHold:'保持约 0.6 秒激活；双手都离开画面后，口罩消失。',
    guidePrivacy:'点击开始后才请求摄像头。画面仅在设备内处理，不上传、不保存；只在本浏览器保存触发记录。',guideStart:'开启摄像头，开始体验',
    browserPreparing:'正在加载识别模型，首次开启可能需要片刻…',browserAllowCamera:'请允许摄像头访问；识别模型也在加载中…',browserCannotStart:'暂时无法开始',
    browserPermissionIssue:'尚未获得摄像头权限。请在浏览器的网站设置中允许访问，再点重新开始。',browserNoCameraIssue:'没有找到摄像头。请连接摄像头，或换用带摄像头的手机或电脑。',browserCameraBusyIssue:'摄像头被其他应用占用。关闭其他视频应用后再试。',browserCameraIssue:'摄像头画面已中断。请检查设备后重新开始。',browserModelIssue:'识别模型加载失败。请检查网络后重试；模型可能需要首次下载。',browserUnsupportedIssue:'请使用最新版 Chrome、Edge 或 Safari，并通过 HTTPS 打开页面。',
    browserDistancePanel:'距离模拟',browserDistanceLabel:'模拟距离',browserRiskLabel:'模拟 Risk',browserDistanceControl:'拖动滑块，体验距离变化',browserNear:'近 · 2 cm',browserFar:'远 · 50 cm',browserSimulationNote:'网页未连接距离传感器；数值仅用于体验形变。',browserSimulationStatus:'模拟值，不代表真实距离或隐私风险概率。',
    distanceLabel:'模拟距离',riskLabel:'模拟 Risk',closestDistance:'最小模拟距离',peakRisk:'最高模拟 Risk',historyIntro:'回看你的手势触发，以及数字口罩的回应。',eventsLabel:'手势触发',responsesLabel:'口罩回应',releasePose:'双手移出画面后结束回应',cameraIssue:'请检查摄像头权限或设备后重试。',engineIssue:'请检查网络与摄像头权限后重试。',archiveLoadError:'本浏览器的记录暂时无法读取，请重试。'
  });
  Object.assign(window.MaskDesign.messages.en, {
    archivePrivacy:'Only activation times and mask settings stay in this browser.\nNo faces, images, videos or landmarks are saved.',
    footerStatus:'BROWSER LIVE — 2026',liveMinimalNote:'BROWSER LIVE · PROCESSED ON THIS DEVICE',guideHold:'Hold for about 0.6 seconds',guideStepHold:'Hold for about 0.6 seconds to activate. Move both hands out of view to end the response.',guidePrivacy:'The camera starts only after you choose to begin. Images are processed on this device, never uploaded or saved. Only interaction metadata stays in this browser.',guideStart:'Enable camera and begin',
    browserPreparing:'Loading recognition models. The first start may take a moment…',browserAllowCamera:'Allow camera access while the recognition models load…',browserCannotStart:'Unable to start yet',browserPermissionIssue:'Camera permission was not granted. Allow camera access in this site’s browser settings, then try again.',browserNoCameraIssue:'No camera was found. Connect one or try a phone or computer with a camera.',browserCameraBusyIssue:'Another app is using the camera. Close other video apps and try again.',browserCameraIssue:'The camera feed stopped. Check the device and start again.',browserModelIssue:'Recognition models could not load. Check the network and retry.',browserUnsupportedIssue:'Try a current version of Chrome, Edge or Safari over HTTPS.',
    browserDistancePanel:'DISTANCE SIMULATION',browserDistanceLabel:'Simulated distance',browserRiskLabel:'Simulated Risk',browserDistanceControl:'Drag to explore the distance response',browserNear:'Near · 2 cm',browserFar:'Far · 50 cm',browserSimulationNote:'No distance sensor is connected. These values only drive the visual response.',browserSimulationStatus:'A simulation, not a physical measurement or privacy-risk probability.',
    distanceLabel:'Simulated distance',riskLabel:'Simulated Risk',closestDistance:'Closest simulated distance',peakRisk:'Peak simulated Risk',historyIntro:'Revisit your gesture activations and the masks that responded.',eventsLabel:'Gesture activations',responsesLabel:'Mask responses',releasePose:'Move both hands out of view to finish',cameraIssue:'Check camera permissions and the device, then retry.',engineIssue:'Check the network and camera permission, then retry.',archiveLoadError:'This browser’s records could not be read. Please retry.'
  });
})();
