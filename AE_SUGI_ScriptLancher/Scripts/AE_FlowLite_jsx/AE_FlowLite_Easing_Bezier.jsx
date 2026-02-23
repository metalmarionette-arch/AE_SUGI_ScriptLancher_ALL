﻿﻿// ========= 適用（Bezier） =========
function applyBezierEasing(preset, props, side){
  var x1 = preset.x1, y1 = preset.y1, x2 = preset.x2, y2 = preset.y2;
  
  for(var i=0; i<props.length; i++){
    applyBezierToProperty(props[i], x1, y1, x2, y2, side);
  }
}

function applyBezierToProperty(prop,x1,y1,x2,y2, side){
  x1 = clamp(x1, 0.01, 0.99);
  x2 = clamp(x2, 0.01, 0.99);
  var sel=[]; 
  for(var k=1;k<=prop.numKeys;k++) 
    if(prop.keySelected(k)) sel.push(k);
  
  var keys=(sel.length>=2)?sel:(function(){
    var a=[];
    for(var i=1;i<=prop.numKeys;i++) a.push(i);
    return a;
  })();
  
  if(keys.length<2) return; 
  keys.sort(function(a,b){return prop.keyTime(a)-prop.keyTime(b);});

  var infOut=clamp(x1*100,0.1,99.0), infIn=clamp((1-x2)*100,0.1,99.0);
  var useTightHandles = (x1 >= 0.01 && x1 <= 0.1 && x2 >= 0.9 && x2 <= 0.99);
  var slopeEps = useTightHandles ? 0.01 : SLOPE_EPS;
  var slopeMax = useTightHandles ? 100.0 : SLOPE_MAX;
  var slopeOut=clamp(y1/Math.max(x1,slopeEps),-slopeMax,slopeMax);
  var slopeIn =clamp((1-y2)/Math.max(1-x2,slopeEps),-slopeMax,slopeMax);
  var sgnOut=sgn(slopeOut), sgnIn=sgn(slopeIn);
  var isBack=(y1<0)||(y2>1), BO=8.0, BI=8.0;

  for(var i=0;i<keys.length-1;i++){
    var kL=keys[i],kR=keys[i+1],tL=prop.keyTime(kL),tR=prop.keyTime(kR),dt=Math.max(tR-tL,1e-6);
    var vL=toArr(prop.keyValue(kL)), vR=toArr(prop.keyValue(kR));
    var isSpatial = (prop.isSpatial === true && !prop.dimensionsSeparated);
    var dims=isSpatial ? 1 : Math.max(vL.length,vR.length);
    
    try{
      prop.setInterpolationTypeAtKey(kL,KeyframeInterpolationType.BEZIER);
      prop.setInterpolationTypeAtKey(kR,KeyframeInterpolationType.BEZIER);
      prop.setTemporalAutoBezierAtKey(kL,false); 
      prop.setTemporalAutoBezierAtKey(kR,false);
      prop.setTemporalContinuousAtKey(kL,false); 
      prop.setTemporalContinuousAtKey(kR,false);
      prop.setRovingAtKey(kL,false); 
      prop.setRovingAtKey(kR,false);
    }catch(_){}
    
    var keepInL=prop.keyInTemporalEase(kL), keepOutR=prop.keyOutTemporalEase(kR);
    var outEase=[], inEase=[];
    
    if(isSpatial){
      var dist=0;
      for(var sd=0; sd<Math.max(vL.length,vR.length); sd++){
        var sA=(vL[sd]!==undefined)?vL[sd]:vL[vL.length-1],
            sB=(vR[sd]!==undefined)?vR[sd]:vR[vR.length-1];
        var dd=sB-sA;
        dist+=dd*dd;
      }
      var baseS=Math.sqrt(dist)/dt, magS=Math.max(Math.abs(baseS),SPEED_MIN);
      var outMagS=Math.max(Math.abs(magS*slopeOut),SPEED_MIN),
          inMagS=Math.max(Math.abs(magS*slopeIn),SPEED_MIN);

      if(isBack){
        if(y1<0) outMagS=Math.max(magS*(1+(-y1)*BO),SPEED_MIN);
        if(y2>1) inMagS=Math.max(magS*(1+(y2-1)*BI),SPEED_MIN);
      }

      var spOutS=clamp(outMagS,SPEED_MIN,SPEED_MAX),
          spInS=clamp(inMagS,SPEED_MIN,SPEED_MAX);
      outEase.push(new KeyframeEase(spOutS,infOut));
      inEase.push(new KeyframeEase(spInS,infIn));
    }else{
      for(var d=0; d<dims; d++){
        var a=(vL[d]!==undefined)?vL[d]:vL[vL.length-1], 
            b=(vR[d]!==undefined)?vR[d]:vR[vL.length-1];
        var base=(b-a)/dt, sBase=sgn(base), mag=Math.max(Math.abs(base),SPEED_MIN);
        var outMag=Math.max(Math.abs(mag*slopeOut),SPEED_MIN), 
            inMag=Math.max(Math.abs(mag*slopeIn),SPEED_MIN);
        
        if(isBack){ 
          if(y1<0) outMag=Math.max(mag*(1+(-y1)*BO),SPEED_MIN); 
          if(y2>1) inMag=Math.max(mag*(1+(y2-1)*BI),SPEED_MIN); 
        }
        
        var spOut=clamp(outMag*sBase*sgnOut,-SPEED_MAX,SPEED_MAX), 
            spIn=clamp(inMag*sBase*sgnIn,-SPEED_MAX,SPEED_MAX);
        outEase.push(new KeyframeEase(spOut,infOut)); 
        inEase.push(new KeyframeEase(spIn,infIn));
      }
    }
    
    if (side === "left"){
      prop.setTemporalEaseAtKey(kL,keepInL,outEase);
    }else if (side === "right"){
      prop.setTemporalEaseAtKey(kR,inEase,keepOutR);
    }else{
      prop.setTemporalEaseAtKey(kL,keepInL,outEase);
      prop.setTemporalEaseAtKey(kR,inEase,keepOutR);
    }
  }
}
