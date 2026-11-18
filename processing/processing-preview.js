(() => {
  'use strict';
  window.MaskPublicPreview=true;
  window.MaskProcessingHandoff=true;
  window.MaskManualProcessingHandoff=true;
  const messages={
    zh:{
      homeArt:'Processing + Arduino · 本机现场版',
      guideEyebrow:'在这台电脑上准备一次',guideTitle:'让口罩回应你。',
      guideHold:'PROCESSING + ARDUINO',
      guideStepFace:'下载下方项目包，完整解压到任意可写文件夹。',
      guideStepHands:'用 Processing 4 打开 DigitalMaskOnly.pde，点击 ▶ 运行。',
      guideStepHold:'本机网页自动打开后，回到此页连接，带入你的口罩配置。',
      guideStart:'已运行项目，连接本机',
      guidePrivacy:'你的口罩和语言会带到本机。摄像头、手势、真实距离与最终画面由 Processing 处理；画面不上传、不保存。',
      processingSetup:'只安装 Processing 还不够，需要运行这个项目。首次运行会从官方源下载约 420 MB 摄像头依赖，请保持联网并等待；之后使用缓存。无需配置本机路径。',
      downloadProcessing:'下载 Processing 项目包',portableHelp:'下载后如何运行',processingHardware:'摄像头 / 手势 / 口罩无需 Arduino。真实距离与 Risk 需要连接 Arduino 和 HC-SR04；没有传感器时显示未知。',
      browserEdition:'使用浏览器版 ↗',
      archivePrivacy:'公开页展示明确标注的虚构档案。\n真实记录保存在 Processing 现场电脑。',
      footerStatus:'PROCESSING + ARDUINO — 2026'
    },
    en:{
      homeArt:'Processing + Arduino · On-site edition',
      guideEyebrow:'ONE-TIME SETUP ON THIS COMPUTER',guideTitle:'Bring your mask to life.',
      guideHold:'PROCESSING + ARDUINO',
      guideStepFace:'Download the project below and extract the whole ZIP to a writable folder.',
      guideStepHands:'Open DigitalMaskOnly.pde in Processing 4 and press Run (▶).',
      guideStepHold:'Once the local page opens, return here and connect to carry over your mask.',
      guideStart:'Project is running — connect',
      guidePrivacy:'Your mask and language follow you to the local installation. Processing handles the camera, gestures, physical distance and final image. Images are never uploaded or saved.',
      processingSetup:'Installing Processing alone does not start this project. First Run downloads about 420 MB of camera support from the official sources; stay online and wait. Later runs use the cache. No machine-specific paths are needed.',
      downloadProcessing:'Download the Processing project',portableHelp:'How to run the download',processingHardware:'Camera, gestures and masks work without Arduino. Physical distance and Risk require Arduino + HC-SR04; missing readings stay unknown.',
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
