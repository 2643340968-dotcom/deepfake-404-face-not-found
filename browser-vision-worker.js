'use strict';
let hand,face;
self.onmessage=async ({data})=>{
  if(data.type==='init') {
    try {
      importScripts('./vendor/vision_bundle.js');
      const files=await Vision.FilesetResolver.forVisionTasks(new URL('./vendor/wasm',self.location.href).href);
      hand=await Vision.HandLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:new URL('./vendor/hand_landmarker.task',self.location.href).href,delegate:'CPU'},runningMode:'VIDEO',numHands:2,minHandDetectionConfidence:.55,minHandPresenceConfidence:.55,minTrackingConfidence:.5});
      face=await Vision.FaceLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:new URL('./vendor/face_landmarker.task',self.location.href).href,delegate:'CPU'},runningMode:'VIDEO',numFaces:2,minFaceDetectionConfidence:.5,minFacePresenceConfidence:.5,minTrackingConfidence:.5});
      self.postMessage({type:'ready'});
    } catch { hand?.close();face?.close();self.postMessage({type:'error'}); }
  } else if(data.type==='frame') {
    try {
      const hands=hand.detectForVideo(data.image,data.time),faces=face.detectForVideo(data.image,data.time);
      self.postMessage({type:'result',generation:data.generation,time:data.time,faceCount:faces.faceLandmarks.length,face:faces.faceLandmarks.length===1?faces.faceLandmarks[0]:null,hands:hands.landmarks.map((points,i)=>({points,world:hands.worldLandmarks[i]}))});
    } catch { self.postMessage({type:'error',generation:data.generation}); }
    finally { data.image.close(); }
  }
};
