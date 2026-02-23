﻿// ========= 統合適用関数 =========
function getSelectedProperties(){
  var props=[], comp=app.project.activeItem;
  if(!comp||!comp.selectedLayers) return props;
  for(var i=0;i<comp.selectedLayers.length;i++){
    var sp=comp.selectedLayers[i].selectedProperties;
    for(var j=0;j<sp.length;j++){
      var p=sp[j]; 
      if(p&&p.numKeys&&p.numKeys>=2) props.push(p);
    }
  }
  return props;
}

function getKeyPairs(prop){
  var pairs = [];
  var sel = [];
  for (var k=1; k<=prop.numKeys; k++) if (prop.keySelected(k)) sel.push(k);
  if (sel.length >= 2){
    sel.sort(function(a,b){ return prop.keyTime(a)-prop.keyTime(b); });
    for (var i=0; i<sel.length-1; i++) pairs.push([sel[i], sel[i+1]]);
  }else{
    for (var i=1; i<=prop.numKeys-1; i++) pairs.push([i, i+1]);
  }
  return pairs;
}

function blendValues(v1, v2, f){
  if (v1 instanceof Array || v2 instanceof Array){
    var a = (v1 instanceof Array)? v1 : [v1];
    var b = (v2 instanceof Array)? v2 : [v2];
    var n = Math.max(a.length, b.length);
    var out = [];
    for (var i=0; i<n; i++){
      var A = (a[i]!==undefined)? a[i] : a[a.length-1];
      var B = (b[i]!==undefined)? b[i] : b[b.length-1];
      out.push(A + (B - A) * f);
    }
    return out;
  }
  return v1 + (v2 - v1) * f;
}

function clearIntermediateKeys(prop, tL, tR){
  var toDelete = [];
  for (var k=1; k<=prop.numKeys; k++){
    var t = prop.keyTime(k);
    if (t > tL && t < tR) toDelete.push(k);
  }
  for (var d=toDelete.length-1; d>=0; d--) try{ prop.removeKey(toDelete[d]); }catch(_){}
}

function getCurveStepsForPair(tL, tR){
  var comp = app.project.activeItem;
  var frameDur = (comp && comp.frameDuration) ? comp.frameDuration : (1/30);
  var frames = Math.max(2, Math.round((tR - tL) / frameDur));
  return Math.min(Math.max(frames, 2), 120);
}

function setInterpolationForRange(prop, tL, tR, interpType){
  for (var k=1; k<=prop.numKeys; k++){
    var kt = prop.keyTime(k);
    if (kt >= tL && kt <= tR){
      try{ prop.setInterpolationTypeAtKey(k, interpType); }catch(_){}
    }
  }
}

function applyCurveKeyframesForPair(prop, kL, kR, points, options){
  if (!points || points.length < 2) return;
  var tL = prop.keyTime(kL);
  var tR = prop.keyTime(kR);
  var v1 = prop.keyValue(kL);
  var v2 = prop.keyValue(kR);
  var scale = (options && options.valueScale != null) ? options.valueScale : 1.0;

  clearIntermediateKeys(prop, tL, tR);

  var applyPoints = points;
  if (options && options.snapToFrames){
    var comp = app.project.activeItem;
    var frameDur = (comp && comp.frameDuration) ? comp.frameDuration : (1/30);
    var snapped = {};
    var span = Math.max(tR - tL, 1e-6);
    for (var i=0; i<points.length; i++){
      var pt = points[i];
      if (pt.percent <= 0 || pt.percent >= 1) continue;
      var tt = tL + span * pt.percent;
      var frameIndex = Math.round((tt - tL) / frameDur);
      var ttSnap = tL + frameIndex * frameDur;
      if (ttSnap <= tL || ttSnap >= tR) continue;
      var percentSnap = (ttSnap - tL) / span;
      var deviation = Math.abs(pt.value - percentSnap);
      var key = ttSnap.toFixed(6);
      if (!snapped[key] || deviation > snapped[key].deviation){
        snapped[key] = { percent: percentSnap, value: pt.value, deviation: deviation, time: ttSnap };
      }
    }
    applyPoints = [];
    for (var k in snapped){
      applyPoints.push(snapped[k]);
    }
    applyPoints.sort(function(a,b){ return a.time - b.time; });
  }

  for (var i=0; i<applyPoints.length; i++){
    var pt = applyPoints[i];
    if (pt.percent <= 0 || pt.percent >= 1) continue;
    var tt = tL + (tR - tL) * pt.percent;
    var f = pt.value * scale;
    var val = blendValues(v1, v2, f);
    prop.setValueAtTime(tt, val);
  }

  var interp = (options && options.interpType) ? options.interpType : KeyframeInterpolationType.LINEAR;
  setInterpolationForRange(prop, tL, tR, interp);
}

function applyEasing(preset){
  if(!preset){
    alert("プリセットが選択されていません。");
    return;
  }

  var props = getSelectedProperties();
  if(props.length === 0){
    alert("キーを2つ以上持つプロパティを選択してください。");
    return;
  }

  app.beginUndoGroup("FlowLite: " + preset.name);
  try {
    // プリセットの type に応じて、各ファイルに定義した関数を呼び出す
    if (preset.type === "bezier"){
      applyBezierEasing(preset, props);
    } else if (preset.type === "linear"){
      applyLinearEasing(preset, props);
    } else if (preset.type === "spring"){
      applySpringEasing(preset, props);

    } else if (preset.type === "bounce"){
      // どのタブが選択されているか(currentCatKey)を見て、
      // 呼び出す関数をAとBで分岐する
      if (currentCatKey === "BounceB") {
        applyBounceBEasing(preset, props);
      } else {
        // "BounceA" または予期しない場合は A (従来) を適用
        applyBounceAEasing(preset, props);
      }
    } else if (preset.type === "wiggle") {
      applyWiggleEasing(preset, props);
    } else if (preset.type === "overshoot") {
      applyOvershootEasing(preset, props);
    } else if (preset.type === "flicker") {
      applyFlickerEasing(preset, props);
    }
    
    // ★ 修正: ここにあった余計な "}" を削除しました
    
  } catch(e){
    alert("Error: " + e);
  } finally {
    app.endUndoGroup();
  }
}
