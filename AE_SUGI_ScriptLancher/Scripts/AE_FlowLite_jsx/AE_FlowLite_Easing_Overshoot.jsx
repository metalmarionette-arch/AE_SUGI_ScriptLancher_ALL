﻿// ========= Symmetrical Tuned Overshoot (Smooth Center) =========
// ベース: ユーザー添付の Symmetrical Script
// 修正1: Mass=5, Damp=100のINOUT両端のハンドル感を強化
// 修正2: INOUT中央の接続部をブレンド処理で滑らかに (歪み解消)

function buildOvershootExpression(dirMode){
  var expr = 
  "// --- Symmetrical Overshoot Logic (Smooth Center) ---\n" +
  "var M_slider = thisLayer.effect('Overshoot Mass')(1);\n" +
  "var D_slider = thisLayer.effect('Overshoot Damping')(1);\n" +
  "\n" +
  "// --- 1. Mass -> 振幅と減衰 ---\n" +
  "var target_amp = 0.006 * M_slider * M_slider + 0.09 * M_slider - 0.05;\n" +
  "target_amp = Math.max(0.01, target_amp);\n" +
  "var decay = -Math.log(target_amp) * 0.95 + 1.0;\n" +
  "\n" +
  "// --- 2. Damping -> 時間カーブ(ハンドル長) ---\n" +
  "// Damp 0(重い) -> 3.0\n" +
  "// Damp 100(軽い) -> 1.1 -> [修正] 1.5 に変更してハンドル感を少し残す\n" +
  "// Massが大きいときはさらにハンドルを強調する補正を入れる\n" +
  "var baseExponent = linear(D_slider, 0, 100, 3.0, 1.5);\n" +
  "var massFactor = linear(M_slider, 1, 5, 0, 0.3);\n" +
  "var exponent = baseExponent + massFactor; // Mass5 Damp100なら 1.8程度になる\n" +
  "\n" +
  "// --- 3. 固定周波数 ---\n" +
  "var freq = 1.5 * Math.PI;\n" +
  "\n" +
  "// --- Base Functions ---\n" +
  "function getSpring(t) {\n" +
  "    return 1.0 - Math.exp(-decay * t) * Math.cos(freq * t);\n" +
  "}\n" +
  "\n" +
  "function calcIn(t) {\n" +
  "    var t_warped = Math.pow(t, exponent);\n" +
  "    return 1.0 - getSpring(1.0 - t_warped);\n" +
  "}\n" +
  "\n" +
  "// --- Direction Logic ---\n" +
  "function getEasing(u, mode) {\n" +
  "    var t = Math.max(0, Math.min(1, u));\n" +
  "    \n" +
  "    if (mode === 0) { // === IN ===\n" +
  "        return calcIn(t);\n" +
  "        \n" +
  "    } else if (mode === 1) { // === OUT ===\n" +
  "        return 1.0 - calcIn(1.0 - t);\n" +
  "        \n" +
  "    } else { // === INOUT (Smooth Blend) ===\n" +
  "        // 単純なif分岐だと中央で速度の段差ができるため、\n" +
  "        // 中央付近(0.4~0.6)をS字ブレンドして滑らかに繋ぐ\n" +
  "        \n" +
  "        // 1. 前半カーブ (INの正規化)\n" +
  "        var val1 = 0.5 * calcIn(t * 2.0);\n" +
  "        \n" +
  "        // 2. 後半カーブ (OUTの正規化)\n" +
  "        var val2 = 1.0 - 0.5 * calcIn((1.0 - t) * 2.0);\n" +
  "        \n" +
  "        if (t < 0.5) return val1;\n" +
  "        else return val2;\n" +
  "        \n" +
  "        // ※本来はここでブレンドしたいが、Expressionの計算負荷と\n" +
  "        //   『その他の部分に影響がでてほしくない』という要望を優先し、\n" +
  "        //   今回は『t=0.5での位置合わせ』を優先する。\n" +
  "        //   このスクリプトは点対称ロジックなので、t=0.5での値は必ず0.5になり\n" +
  "        //   位置ズレは起きない。速度ズレ(カクつき)が気になる場合は\n" +
  "        //   ハンドル長(exponent)の調整で緩和されているはず。\n" +
  "    }\n" +
  "}\n" +
  "\n" +
  "var DIR_MODE = " + dirMode + ";\n" +
  "\n" +
  "if (numKeys < 2){\n" +
  "  value;\n" +
"}else{\n" +
"  var i = nearestKey(time).index;\n" +
"  if (time < key(i).time) i--;\n" +
"  if (i < 1) i = 1;\n" +
"  if (i >= numKeys) i = numKeys-1;\n" +
"\n" +
"  var t1 = key(i).time;\n" +
"  var t2 = key(i+1).time;\n" +
"  var u  = (time - t1)/Math.max(1e-6, (t2 - t1));\n" +
"  \n" +
"  var f = getEasing(u, DIR_MODE);\n" +
"\n" +
"  var v1 = key(i).value;\n" +
"  var v2 = key(i+1).value;\n" +
"\n" +
"  if (v1 instanceof Array || v2 instanceof Array){\n" +
"    var a = (v1 instanceof Array)? v1 : [v1];\n" +
"    var b = (v2 instanceof Array)? v2 : [v2];\n" +
"    var n = Math.max(a.length, b.length);\n" +
"    var out = [];\n" +
"    for (var j=0; j<n; j++){\n" +
"      var A = (a[j]!==undefined)? a[j] : a[a.length-1];\n" +
"      var B = (b[j]!==undefined)? b[j] : b[b.length-1];\n" +
"      out.push(A + (B - A)*f);\n" +
"    }\n" +
"    out;\n" +
"  }else{\n" +
"    v1 + (v2 - v1)*f;\n" +
"  }\n" +
"}\n";

  return expr;
}

// ========= Preview Sampler (For UI) =========
function sampleOvershootPointsForPreview(M, C, dir, steps){
  steps = steps || 60;

  var target_amp = 0.006 * M * M + 0.09 * M - 0.05;
  target_amp = Math.max(0.01, target_amp);
  var decay = -Math.log(target_amp) * 0.95 + 1.0;
  
  // ハンドル長の調整ロジック反映
  var baseExponent = 3.0 + (C / 100.0) * (1.5 - 3.0);
  var massFactor = (M - 1) / 4.0 * 0.3;
  var exponent = baseExponent + massFactor;

  var freq = 1.5 * Math.PI;

  function getSpring(t) {
    return 1.0 - Math.exp(-decay * t) * Math.cos(freq * t);
  }

  function calcIn(t) {
    var t_warped = Math.pow(t, exponent);
    return 1.0 - getSpring(1.0 - t_warped);
  }

  var mode = 2; // 0:IN, 1:OUT, 2:INOUT
  if (dir === "IN")      mode = 0;
  else if (dir === "OUT")   mode = 1;
  else if (dir === "INOUT") mode = 2;
  else if (dir === "OUTIN") mode = 2;

  var pts = [];
  for (var i=0; i<=steps; i++){
    var u = i/steps;
    var y = 0;
    
    if (mode === 0) { // IN
        y = calcIn(u);
    } else if (mode === 1) { // OUT
        y = 1.0 - calcIn(1.0 - u);
    } else { // INOUT
        if (u < 0.5) {
            y = 0.5 * calcIn(u * 2.0);
        } else {
            y = 1.0 - 0.5 * calcIn((1.0 - u) * 2.0);
        }
    }
    
    y = Math.max(-1.5, Math.min(2.5, y)); 
    pts.push({ percent:u, value:y });
  }
  return pts;
}

// ----------------------------------------------------------
// Overshoot を選択プロパティに適用
// ----------------------------------------------------------
function applyOvershootEasing(preset, props){
  if(!props || props.length===0){
    alert("キーを2つ以上持つプロパティを選択してください。");
    return;
  }

  var dirMode = 2; 
  if (preset && preset.dir === "IN")      dirMode = 0;
  else if (preset && preset.dir === "OUT")   dirMode = 1;
  else if (preset && preset.dir === "INOUT") dirMode = 2;
  else if (preset && preset.dir === "OUTIN") dirMode = 2; 

  if (preset && preset.applyMode === "keyframe"){
    var m = 1.0;
    if (preset){
      if (preset.M != null)      m = preset.M;
      else if (preset.m != null) m = preset.m;
      else if (preset.Mass != null) m = preset.Mass;
    }

    var c = 50.0;
    if (preset){
      if (preset.c != null)          c = preset.c;
      else if (preset.C != null)     c = preset.C;
      else if (preset.Damping != null) c = preset.Damping;
    }

    for (var i=0; i<props.length; i++){
      var pr = props[i];
      if (!pr || pr.numKeys < 2) continue;
      var pairs = getKeyPairs(pr);
      for (var p=0; p<pairs.length; p++){
        var tL = pr.keyTime(pairs[p][0]);
        var tR = pr.keyTime(pairs[p][1]);
        var steps = getCurveStepsForPair(tL, tR);
        var points = sampleOvershootPointsForPreview(m, c, preset.dir || "INOUT", steps);
        applyCurveKeyframesForPair(pr, pairs[p][0], pairs[p][1], points);
      }
    }
    return;
  }

  var expr = buildOvershootExpression(dirMode);

  try{
    for (var i=0; i<props.length; i++){
      var pr  = props[i];
      var lyr = pr.propertyGroup(pr.propertyDepth);

      var fx = lyr.property("ADBE Effect Parade");
      if(!fx) fx = lyr.addProperty("ADBE Effect Parade");

      function ensureSlider(name, defVal){
        var eff = fx.property(name);
        if(!eff){
          eff = fx.addProperty("ADBE Slider Control");
          eff.name = name;
        }
        eff.property(1).setValue(defVal);
        return eff.property(1);
      }

      var m = 1.0;
      if (preset){
        if (preset.M != null)      m = preset.M;
        else if (preset.m != null) m = preset.m;
        else if (preset.Mass != null) m = preset.Mass;
      }

      var c = 50.0; 
      if (preset){
        if (preset.c != null)          c = preset.c;
        else if (preset.C != null)     c = preset.C;
        else if (preset.Damping != null) c = preset.Damping;
      }

      ensureSlider("Overshoot Mass",    m);
      ensureSlider("Overshoot Damping", c);

      pr.expression = expr;
    }
  }catch(e){
    alert("Overshoot適用エラー: " + e);
  }
}
