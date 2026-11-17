(() => {
  'use strict';
  window.MaskPublicPreview=true;
  window.MaskProcessingHandoff=true;
  window.MaskManualProcessingHandoff=true;
  const messages={
    zh:{
      homeArt:'Processing + Arduino · 本机现场版',
      guideEyebrow:'连接现场体验',guideTitle:'让口罩回应你。',
      guideHold:'PROCESSING + ARDUINO',
      guideStepFace:'在这台电脑上启动 Processing 现场程序。',
      guideStepHands:'连接 Arduino 距离传感器，并关闭串口监视器。',
      guideStepHold:'连接后确认手势引导，再开始实时体验。',
      guideStart:'连接本机 Processing',
      guidePrivacy:'你的口罩和语言会带到本机。摄像头、手势、真实距离与最终画面由 Processing 处理；画面不上传、不保存。',
      processingSetup:'首次使用？先运行项目里的 Start-WebExperience.ps1，再点击连接。本机程序未启动时，连接页将无法打开。',
      browserEdition:'使用浏览器版 ↗',
      archivePrivacy:'公开页展示明确标注的虚构档案。\n真实记录保存在 Processing 现场电脑。',
      footerStatus:'PROCESSING + ARDUINO — 2026'
    },
    en:{
      homeArt:'Processing + Arduino · On-site edition',
      guideEyebrow:'CONNECT THE INSTALLATION',guideTitle:'Bring your mask to life.',
      guideHold:'PROCESSING + ARDUINO',
      guideStepFace:'Start the Processing installation on this computer.',
      guideStepHands:'Connect the Arduino distance sensor and close the serial monitor.',
      guideStepHold:'Continue to the local gesture guide, then begin the live experience.',
      guideStart:'Connect to local Processing',
      guidePrivacy:'Your mask and language follow you to the local installation. Processing handles the camera, gestures, physical distance and final image. Images are never uploaded or saved.',
      processingSetup:'First visit? Run Start-WebExperience.ps1 from the project, then connect. The local page is available only while the installation is running.',
      browserEdition:'Try the browser edition ↗',
      archivePrivacy:'The public page shows labelled fictional entries.\nReal records stay on the Processing computer.',
      footerStatus:'PROCESSING + ARDUINO — 2026'
    }
  };
  for(const language of ['zh','en']) {
    const target=window.MaskDesign.messages[language];
    Object.assign(target,messages[language]);
    for(const key of ['title','homeTitlePage','guideTitlePage','liveTitlePage','historyTitlePage']) {
      target[key]=`${target[key]} · Processing + Arduino`;
    }
  }
})();
