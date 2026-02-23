// ========= Flicker 用：式生成 & 適用 =========

function buildFlickerCurveArrayString(stepStr){
  var pts = parseLinear(stepStr);
  if (!pts || pts.length < 2) return "[0,1, 1,1]";
  var out = [];
  for (var i=0; i<pts.length; i++){
    out.push(+(pts[i].percent.toFixed(6)));
    out.push(+((pts[i].value/100).toFixed(6)));
  }
  return "[" + out.join(", ") + "]";
}

function buildFlickerExpression(curveArrayStr){
  var expr =
    "var curve = " + curveArrayStr + ";\n" +
    "function clamp(v,a,b){return Math.max(a, Math.min(b, v));}\n" +
    "function stepLookup(t){\n" +
    "  t = clamp(t, 0, 1);\n" +
    "  if (curve.length < 4) return t;\n" +
    "  if (t <= curve[0]) return curve[1];\n" +
    "  var last = curve.length - 2;\n" +
    "  if (t >= curve[last]) return curve[last+1];\n" +
    "  for (var i=0; i<curve.length-3; i+=2){\n" +
    "    var x1 = curve[i],   y1 = curve[i+1];\n" +
    "    var x2 = curve[i+2];\n" +
    "    if (t < x2){\n" +
    "      return y1;\n" +
    "    }\n" +
    "  }\n" +
    "  return curve[last+1];\n" +
    "}\n" +
    "\n" +
    "if (numKeys < 2){\n" +
    "  value;\n" +
    "}else{\n" +
    "  var k = nearestKey(time).index;\n" +
    "  if (time < key(k).time) k--;\n" +
    "  if (k < 1 || k >= numKeys){ value; }\n" +
    "  else{\n" +
    "    var t1 = key(k).time,   t2 = key(k+1).time;\n" +
    "    var tt = (time - t1) / Math.max(1e-6, (t2 - t1));\n" +
    "    var f  = stepLookup(tt);\n" +
    "    var v1 = key(k).value;\n" +
    "    var v2 = key(k+1).value;\n" +
    "    if (v1 instanceof Array || v2 instanceof Array){\n" +
    "      var a = (v1 instanceof Array)? v1 : [v1];\n" +
    "      var b = (v2 instanceof Array)? v2 : [v2];\n" +
    "      var n = Math.max(a.length, b.length);\n" +
    "      var out = [];\n" +
    "      for (var i=0;i<n;i++){\n" +
    "        var A = (a[i]!==undefined)? a[i] : a[a.length-1];\n" +
    "        var B = (b[i]!==undefined)? b[i] : b[b.length-1];\n" +
    "        out.push( A + (B - A) * f );\n" +
    "      }\n" +
    "      out;\n" +
    "    }else{\n" +
    "      v1 + (v2 - v1) * f;\n" +
    "    }\n" +
    "  }\n" +
    "}\n";
  return expr;
}

function applyFlickerExpressionToProperty(prop, expr){
  if (!prop || prop.numKeys < 2) return;
  var pairs = getKeyPairs(prop);

  try{
    for (var p=0; p<pairs.length; p++){
      var kL = pairs[p][0], kR = pairs[p][1];
      var tL = prop.keyTime(kL), tR = prop.keyTime(kR);
      clearIntermediateKeys(prop, tL, tR);
    }
    prop.expression = expr;
  }catch(e){
    alert("Expression apply error: " + e);
  }
}

function applyFlickerKeyframesToProperty(prop, stepStr){
  if (!prop || prop.numKeys < 2) return;
  var points = parseLinear(stepStr);
  if (!points || points.length < 2) return;

  var pairs = getKeyPairs(prop);
  for (var p=0; p<pairs.length; p++){
    applyCurveKeyframesForPair(prop, pairs[p][0], pairs[p][1], points, {
      valueScale: 0.01,
      interpType: KeyframeInterpolationType.HOLD
    });
  }
}

function applyFlickerEasing(preset, props){
  if (!props || props.length === 0){
    alert("キーを2つ以上持つプロパティを選択してください。");
    return;
  }

  var mode = preset.applyMode || "expression";
  if (mode === "keyframe"){
    for (var i=0; i<props.length; i++){
      applyFlickerKeyframesToProperty(props[i], preset.step);
    }
  }else{
    var curveStr = buildFlickerCurveArrayString(preset.step);
    var expr = buildFlickerExpression(curveStr);
    for (var j=0; j<props.length; j++){
      applyFlickerExpressionToProperty(props[j], expr);
    }
  }
}
