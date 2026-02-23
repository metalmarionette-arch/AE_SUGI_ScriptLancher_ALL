﻿// ========= Bounce A (従来) 用：式の生成 =========
function buildBounceAExpression(){
  var expr =
"function C(v,a,b){ return Math.max(a, Math.min(b, v)); }\n" +
"\n" +
// ★ 関数名を bounceA_01 に変更
"function bounceA_01(u, B, D){\n" +
"  u = C(u, 0, 1);\n" +
"  var b = Math.max(1, B);\n" +
"  var d = C(D, 0, 100) / 100.0;\n" +
"  var base = 1 - Math.pow(1 - u, 2);\n" +
"  var freq = Math.PI * (b + 0.5);\n" +
"  var osc  = Math.abs(Math.sin(freq * u));\n" +
"  var envPow = 0.5 + 2.5 * d;\n" +
"  var env    = Math.pow(1 - u, envPow);\n" +
"  var amp = 0.3 + 0.9 * (1 - d);\n" +
"  var y = base - amp * env * osc;\n" +
"  return C(y, -0.5, 1.05);\n" +
"}\n" +
"\n" +
"function sliderOr(name, defVal){\n" +
"  try{\n" +
"    return effect(name)(\"スライダー\");\n" +
"  }catch(e){\n" +
"    return defVal;\n" +
"  }\n" +
"}\n" +
"\n" +
"var kNum = numKeys;\n" +
"if (kNum < 2){\n" +
"  value;\n" +
"}else{\n" +
"  var t = time;\n" +
"  if (t <= key(1).time){\n" +
"    key(1).value;\n" +
"  }else if (t >= key(kNum).time){\n" +
"    key(kNum).value;\n" +
"  }else{\n" +
"    var i = 1;\n" +
"    while (i < kNum && t > key(i+1).time){ i++; }\n" +
"    var t1 = key(i).time;\n" +
"    var t2 = key(i+1).time;\n" +
"    var u  = (t - t1) / Math.max(1e-6, (t2 - t1));\n" +
"    u = C(u, 0, 1);\n" +
"    var v1 = key(i).value;\n" +
"    var v2 = key(i+1).value;\n" +
"    var B = sliderOr(\"Bounce Bounces\", 3);\n" +
"    var D = sliderOr(\"Bounce Damping\", 25);\n" +
"    var f = bounceA_01(u, B, D);\n" + // ★ bounceA_01 を呼ぶ
"    if (v1 instanceof Array || v2 instanceof Array){\n" +
"      var a = (v1 instanceof Array) ? v1 : [v1];\n" +
"      var b = (v2 instanceof Array) ? v2 : [v2];\n" +
"      var n = Math.max(a.length, b.length);\n" +
"      var out = [];\n" +
"      for (var j = 0; j < n; j++){\n" +
"        var A = (a[j] !== undefined) ? a[j] : a[a.length-1];\n" +
"        var Bv = (b[j] !== undefined) ? b[j] : b[b.length-1];\n" +
"        out.push( A + (Bv - A) * f );\n" +
"      }\n" +
"      out;\n" +
"    }else{\n" +
"      v1 + (v2 - v1) * f;\n" +
"    }\n" +
"  }\n" +
"}\n";
  return expr;
}

// ========= Bounce A (従来) 用：式を適用 =========
// ★ 関数名を applyBounceAEasing に変更
function applyBounceAEasing(preset, props){
  if(!props || props.length===0){
    alert("キーを2つ以上持つプロパティを選択してください。");
    return;
  }

  if (preset && preset.applyMode === "keyframe"){
    var B = (preset.B != null) ? preset.B : 3.0;
    var D = (preset.c != null) ? preset.c : 25.0;
    for (var i=0; i<props.length; i++){
      var pr = props[i];
      if (!pr || pr.numKeys < 2) continue;
      var pairs = getKeyPairs(pr);
      for (var p=0; p<pairs.length; p++){
        var tL = pr.keyTime(pairs[p][0]);
        var tR = pr.keyTime(pairs[p][1]);
        var steps = getCurveStepsForPair(tL, tR);
        var oversample = Math.min(Math.max(steps * 6, steps), 600);
        var points = sampleBouncePointsForPreview(B, D, oversample);
        applyCurveKeyframesForPair(pr, pairs[p][0], pairs[p][1], points, { snapToFrames: true });
      }
    }
    return;
  }

  var expr = buildBounceAExpression(); // ★ Aを呼ぶ

  try{
    for (var i=0; i<props.length; i++){
      var pr  = props[i];
      var lyr = pr.propertyGroup(pr.propertyDepth);

      var fx = lyr.property("ADBE Effect Parade");
      if(!fx) fx = lyr.addProperty("ADBE Effect Parade");

      function ensureSlider(name, val){
        var p = fx.property(name);
        if(!p){
          p = fx.addProperty("ADBE Slider Control");
          p.name = name;
        }
        p.property(1).setValue(val);
        return p.property(1);
      }

      var B = (preset.B != null) ? preset.B : 3.0;
      var D = (preset.c != null) ? preset.c : 25.0;

      ensureSlider("Bounce Bounces", B);
      ensureSlider("Bounce Damping", D);

      pr.expression = expr;
    }
  }catch(e){
    alert("Bounce A 適用エラー: " + e);
  }
}


// ========= ★ Bounce B (新規) 用：式の生成 =========
function buildBounceBExpression(){
  var expr =
"function C(v,a,b){ return Math.max(a, Math.min(b, v)); }\n" +
"\n" +
// ★ 関数名を bounceB_01 に変更
"function bounceB_01(u, B, D){\n" +
"  u = C(u, 0, 1);\n" +
"  if (u === 1.0) return 1.0;\n" +
"  if (u === 0.0) return 0.0;\n" +
"  var b = Math.max(1, Math.round(B));\n" +
"  var d = C(D, 0, 100) / 100.0;\n" +
"  var R = Math.max(0.1, 0.95 - d * 0.4);\n" +
"\n" +
"  var sumT = 1.0;\n" +
"  for (var i = 1; i <= b; i++) {\n" +
"    sumT += 2 * Math.pow(R, i);\n" +
"  }\n" +
"  var t_abs = u * sumT;\n" +
"\n" +
"  if (t_abs <= 1.0) {\n" +
"    return t_abs * t_abs;\n" +
"  }\n" +
"\n" +
"  var y = 1.0;\n" +
"  var current_t = 1.0;\n" +
"  for (var i = 1; i <= b; i++) {\n" +
"    var T_i = 2 * Math.pow(R, i);\n" +
"    if (t_abs <= current_t + T_i || i === b) {\n" +
"      var tau = (t_abs - current_t) / T_i;\n" +
"      var H_i = Math.pow(R, i * 2);\n" +
"      var h = 4 * H_i * tau * (1 - tau);\n" +
"      y = 1.0 - h;\n" +
"      if (i === b) {\n" +
"        var s = tau * tau * (3 - 2 * tau);\n" +
"        var settlePow = 1.4 + 2.0 * d;\n" +
"        y = 1.0 - (1.0 - y) * Math.pow(1.0 - s, settlePow);\n" +
"      }\n" +
"      break;\n" +
"    }\n" +
"    current_t += T_i;\n" +
"  }\n" +
"  return C(y, 0.0, 1.05);\n" +
"}\n" +
"\n" +
"function sliderOr(name, defVal){\n" +
"  try{\n" +
"    return effect(name)(\"スライダー\");\n" +
"  }catch(e){\n" +
"    return defVal;\n" +
"  }\n" +
"}\n" +
"\n" +
"var kNum = numKeys;\n" +
"if (kNum < 2){\n" +
"  value;\n" +
"}else{\n" +
"  var t = time;\n" +
"  if (t <= key(1).time){\n" +
"    key(1).value;\n" +
"  }else if (t >= key(kNum).time){\n" +
"    key(kNum).value;\n" +
"  }else{\n" +
"    var i = 1;\n" +
"    while (i < kNum && t > key(i+1).time){ i++; }\n" +
"    var t1 = key(i).time;\n" +
"    var t2 = key(i+1).time;\n" +
"    var u  = (t - t1) / Math.max(1e-6, (t2 - t1));\n" +
"    u = C(u, 0, 1);\n" +
"    var v1 = key(i).value;\n" +
"    var v2 = key(i+1).value;\n" +
"    var B = sliderOr(\"Bounce Bounces\", 3);\n" +
"    var D = sliderOr(\"Bounce Damping\", 25);\n" +
"    var f = bounceB_01(u, B, D);\n" + // ★ bounceB_01 を呼ぶ
"    if (v1 instanceof Array || v2 instanceof Array){\n" +
"      var a = (v1 instanceof Array) ? v1 : [v1];\n" +
"      var b = (v2 instanceof Array) ? v2 : [v2];\n" +
"      var n = Math.max(a.length, b.length);\n" +
"      var out = [];\n" +
"      for (var j = 0; j < n; j++){\n" +
"        var A = (a[j] !== undefined) ? a[j] : a[a.length-1];\n" +
"        var Bv = (b[j] !== undefined) ? b[j] : b[b.length-1];\n" +
"        out.push( A + (Bv - A) * f );\n" +
"      }\n" +
"      out;\n" +
"    }else{\n" +
"      v1 + (v2 - v1) * f;\n" +
"    }\n" +
"  }\n" +
"}\n";
  return expr;
}

// ========= ★ Bounce B (新規) 用：式を適用 =========
function applyBounceBEasing(preset, props){
  if(!props || props.length===0){
    alert("キーを2つ以上持つプロパティを選択してください。");
    return;
  }

  if (preset && preset.applyMode === "keyframe"){
    var B = (preset.B != null) ? preset.B : 3.0;
    var D = (preset.c != null) ? preset.c : 25.0;
    for (var i=0; i<props.length; i++){
      var pr = props[i];
      if (!pr || pr.numKeys < 2) continue;
      var pairs = getKeyPairs(pr);
      for (var p=0; p<pairs.length; p++){
        var tL = pr.keyTime(pairs[p][0]);
        var tR = pr.keyTime(pairs[p][1]);
        var steps = getCurveStepsForPair(tL, tR);
        var oversample = Math.min(Math.max(steps * 6, steps), 600);
        var points = sampleBounceBPointsForPreview(B, D, oversample);
        applyCurveKeyframesForPair(pr, pairs[p][0], pairs[p][1], points, { snapToFrames: true });
      }
    }
    return;
  }

  var expr = buildBounceBExpression(); // ★ Bを呼ぶ

  try{
    for (var i=0; i<props.length; i++){
      var pr  = props[i];
      var lyr = pr.propertyGroup(pr.propertyDepth);

      var fx = lyr.property("ADBE Effect Parade");
      if(!fx) fx = lyr.addProperty("ADBE Effect Parade");

      function ensureSlider(name, val){
        var p = fx.property(name);
        if(!p){
          p = fx.addProperty("ADBE Slider Control");
          p.name = name;
        }
        p.property(1).setValue(val);
        return p.property(1);
      }

      var B = (preset.B != null) ? preset.B : 3.0;
      var D = (preset.c != null) ? preset.c : 25.0;

      ensureSlider("Bounce Bounces", B);
      ensureSlider("Bounce Damping", D);

      pr.expression = expr;
    }
  }catch(e){
    alert("Bounce B 適用エラー: " + e);
  }
}