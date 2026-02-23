﻿// ========= Spring (m,k,c) 用：スライダー付与 =========
function ensureSpringSliders(layer, defaults){
  var fx = layer.property("Effects");
  if (!fx) fx = layer("Effects"); // 念のため

  function getOrAdd(name, defVal){
    var eff = fx.property(name);
    if (!eff){
      eff = fx.addProperty("ADBE Slider Control");
      eff.name = name;
    }
    try{ eff.property(1).setValue(defVal); }catch(_){}
    return eff;
  }
  getOrAdd("FL_Mass",       (defaults && defaults.m!=null)? defaults.m : 1.0);
  getOrAdd("FL_Stiffness",  (defaults && defaults.k!=null)? defaults.k : 30.0);
  getOrAdd("FL_Damping",    (defaults && defaults.c!=null)? defaults.c : 50.0);
}

// ========= Spring (m,k,c) 用：式の生成（Mass / Stiffness / Damping） =========
function buildSpringExpression(){
  var expr =
"function C(v,a,b){return Math.max(a,Math.min(b,v));}\n" +
"function springStep(u, wn, zeta){\n" +
"  u = C(u,0,1);\n" +
"  var t = u;\n" +
"  var y;\n" +
"  if (zeta < 1.0){\n" +
"    zeta = Math.max(0.02, zeta);\n" +
"    var wd = wn*Math.sqrt(1 - zeta*zeta);\n" +
"    var expTerm = Math.exp(-zeta*wn*t);\n" +
"    var cosTerm = Math.cos(wd*t);\n" +
"    var sinTerm = Math.sin(wd*t);\n" +
"    var A = zeta/Math.sqrt(1 - zeta*zeta);\n" +
"    y = 1 - expTerm*(cosTerm  + A*sinTerm);\n" +
"  }else{\n" +
"    var zz = Math.min(zeta,3.0);\n" +
"    var expTerm = Math.exp(-wn*zz*t);\n" +
"    y = 1 - expTerm*(1  + wn*t);\n" +
"  }\n" +
"  var tailStart = 0.94 + 0.05 * C(zeta - 0.45, 0, 1);\n" +
"  if (u > tailStart){\n" +
"    var tu = (u - tailStart) / Math.max(1e-6, 1.0 - tailStart);\n" +
"    var s = tu * tu * (3 - 2 * tu);\n" +
"    var settlePow = 0.75;\n" +
"    y = 1.0 - (1.0 - y) * Math.pow(1.0 - s, settlePow);\n" +
"  }\n" +
"  return C(y,-1,2);\n" +
"}\n" +
"function springParams(mass, stiff, damp){\n" +
"  mass = Math.max(0.01, mass);\n" +
"  var wn = 6.0 + stiff * 0.62 + mass * 0.18;\n" +
"  var zeta = 0.92 - stiff * 0.0038 - mass * 0.115 + damp * 0.011;\n" +
"  wn   = C(wn, 1, 200);\n" +
"  zeta = C(zeta, 0.02, 3.0);\n" +
"  return [wn, zeta];\n" +
"}\n" +
"\n" +
"if (numKeys < 2){\n" +
"  value;\n" +
"}else{\n" +
"  var i = nearestKey(time).index;\n" +
"  if (time < key(i).time) i--;\n" +
"  if (i < 1 || i >= numKeys){\n" +
"    value;\n" +
"  }else{\n" +
"    var t1 = key(i).time, t2 = key(i +1).time;\n" +
"    var u  = (time - t1) / Math.max(1e-6, (t2 - t1));\n" +
"    u = C(u, 0, 1);\n" +
"    var v1 = key(i).value;\n" +
"    var v2 = key(i +1).value;\n" +
"    var m = thisLayer.effect('FL_Mass')(1);\n" +
"    var k = thisLayer.effect('FL_Stiffness')(1);\n" +
"    var d = thisLayer.effect('FL_Damping')(1);\n" +
"    var params = springParams(m, k, d);\n" +
"    var wn   = params[0];\n" +
"    var zeta = params[1];\n" +
"    var f = springStep(u, wn, zeta);\n" +
"    if (v1 instanceof Array || v2 instanceof Array){\n" +
"      var a = (v1 instanceof Array)? v1 : [v1];\n" +
"      var b = (v2 instanceof Array)? v2 : [v2];\n" +
"      var n = Math.max(a.length, b.length);\n" +
"      var out = [];\n" +
"      for (var j=0; j<n; j++){\n" +
"        var A = (a[j]!==undefined)? a[j] : a[a.length-1];\n" +
"        var B = (b[j]!==undefined)? b[j] : b[b.length-1];\n" +
"        out.push( A + (B - A)*f );\n" +
"      }\n" +
"      out;\n" +
"    }else{\n" +
"      v1 + (v2 - v1)*f;\n" +
"    }\n" +
"  }\n" +
"}\n";
  return expr;
}

// ========= Spring (m,k,c) 用：式を適用（中間キー掃除→式セット） =========
function applySpringEasing(preset, props){
    if(!props || props.length===0){
      alert("キーを2つ以上持つプロパティを選択してください。");
      return;
    }

    if (preset && preset.applyMode === "keyframe"){
      var m = (preset.m != null) ? preset.m : 1.0;
      var k = (preset.k != null) ? preset.k : 30.0;
      var d = (preset.c != null) ? preset.c : 50.0;

      for (var i=0; i<props.length; i++){
        var pr = props[i];
        if (!pr || pr.numKeys < 2) continue;
        var pairs = getKeyPairs(pr);
        for (var p=0; p<pairs.length; p++){
          var tL = pr.keyTime(pairs[p][0]);
          var tR = pr.keyTime(pairs[p][1]);
          var steps = getCurveStepsForPair(tL, tR);
          var oversample = Math.min(Math.max(steps * 6, steps), 600);
          var points = sampleSpringPointsForPreview(m, k, d, oversample);
          applyCurveKeyframesForPair(pr, pairs[p][0], pairs[p][1], points, { snapToFrames: true });
        }
      }
      return;
    }

    var expr = buildSpringExpression();

    try{
      for (var i=0; i<props.length; i++){
        var pr  = props[i];
        var lyr = pr.propertyGroup(pr.propertyDepth);

        // スライダーの用意（なければ作る／あれば更新）
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

        var m = (preset.m != null) ? preset.m : 1.0;
        var k = (preset.k != null) ? preset.k : 30.0;
        var d = (preset.c != null) ? preset.c : 50.0;

        ensureSlider("FL_Mass",      m);
        ensureSlider("FL_Stiffness", k);
        ensureSlider("FL_Damping",   d);

        // 式の適用
        pr.expression = expr;
      }
    }catch(e){
      alert("Spring適用エラー: " + e);
    }
  }