﻿﻿﻿﻿// ============================================================================
// グローバル変数 & カスタムプリセット管理
// ============================================================================
var CUSTOM_PRESETS = [];
if (typeof CUSTOM_FILE_PATH === "undefined") {
  var CUSTOM_FILE_PATH = Folder.userData.fullName + "/FlowLite_CustomPresets.json";
}

// ディープコピー関数
function clonePreset(obj){
  return JSON.parse(JSON.stringify(obj));
}

function arrayIndexOf(arr, item){
  if (!arr) return -1;
  for (var i = 0; i < arr.length; i++){
    if (arr[i] === item) return i;
  }
  return -1;
}

function selectAnimatedPropertiesOnSelectedLayers(){
  var comp = app.project.activeItem;
  if (!comp || !comp.selectedLayers || comp.selectedLayers.length === 0){
    alert("レイヤーを選択してください。");
    return;
  }

  var selectedCount = 0;

  function selectAnimatedPropsInGroup(group){
    for (var i = 1; i <= group.numProperties; i++){
      var p = group.property(i);
      if (!p) continue;
      if (p.numProperties && p.numProperties > 0){
        selectAnimatedPropsInGroup(p);
      }
      if (p.numKeys && p.numKeys > 0){
        try{
          p.selected = true;
          selectedCount++;
        }catch(_){}
      }
    }
  }

  for (var l = 0; l < comp.selectedLayers.length; l++){
    selectAnimatedPropsInGroup(comp.selectedLayers[l]);
  }

  if (selectedCount === 0){
    alert("選択レイヤーにキーがあるプロパティが見つかりません。");
  }
}

// カスタムプリセットの読み込み
function loadCustomPresets(){
  var f = new File(CUSTOM_FILE_PATH);
  if(f.exists){
    try{
      f.open("r");
      var str = f.read();
      f.close();
      var data = JSON.parse(str);
      if(data instanceof Array) {
        CUSTOM_PRESETS = data;
      } else if (data && data.presets instanceof Array) {
        CUSTOM_PRESETS = data.presets;
      } else {
        CUSTOM_PRESETS = [];
      }
    }catch(e){
      // alert("カスタムプリセット読み込みエラー: " + e.toString());
    }
  }
}

// カスタムプリセットの保存
function saveCustomPresets(){
  var f = new File(CUSTOM_FILE_PATH);
  try{
    f.open("w");
    f.write(JSON.stringify(CUSTOM_PRESETS));
    f.close();
  }catch(e){
    alert("カスタムプリセット保存エラー: " + e.toString());
  }
}

// 起動時に読み込み
loadCustomPresets();
if(!(CUSTOM_PRESETS instanceof Array)){
  CUSTOM_PRESETS = [];
}


// ============================================================================
// プレビュー
// ============================================================================
function getPresetCategory(preset){
  if (!preset || typeof preset !== "object") return "";
  return preset.category || "";
}

function drawStepCurve(g, points, W, H, yr){
  if (!points || points.length === 0) return;
  var first = mapXY(points[0].percent, points[0].value, W, H, yr.min, yr.max);
  g.newPath();
  g.moveTo(first[0], first[1]);
  for (var j = 1; j < points.length; j++){
    var prev = points[j-1];
    var curr = points[j];
    var x = mapXY(curr.percent, prev.value, W, H, yr.min, yr.max);
    g.lineTo(x[0], x[1]);
    var y = mapXY(curr.percent, curr.value, W, H, yr.min, yr.max);
    g.lineTo(y[0], y[1]);
  }
}

function buildMainPreview(parent, w, h, onUserChange){
  var cv = parent.add("customview");
  cv.preferredSize = [w||340, h||340];
  cv.minimumSize   = [100, 100];
  cv.maximumSize   = [10000, 10000];
  cv._preset = null;
  cv._yr = {min:0, max:1};

  var dragging = null;

  cv.onDraw = function(){
    var g = this.graphics, W = this.size[0], H = this.size[1];
    
    // 背景
    g.newPath(); g.rectPath(0,0,W,H);
    g.fillPath(g.newBrush(g.BrushType.SOLID_COLOR, [0.15,0.15,0.16,1]));
    
    if(!this._preset) return;
    var preset = this._preset;
    var yr, points = null;

    var presetCategory = getPresetCategory(preset);
    var isBounceB = (presetCategory === "BounceB" || (presetCategory==="Bounce" && currentCatKey==="BounceB"));
    
    if (preset.type === "bezier"){
      yr = {
        min: Math.min(0,1,preset.y1,preset.y2) - 0.2,
        max: Math.max(0,1,preset.y1,preset.y2) + 0.2
      };
      if((yr.max - yr.min) < 0.4){
          var center = (yr.max+yr.min)*0.5;
          yr.min = center - 0.2; yr.max = center + 0.2;
      }

    } else if (preset.type === "linear"){
      points = parseLinear(preset.linear);
      yr = smartYRange(points);
    } else if (preset.type === "spring"){
      var m = (preset.m!=null)? preset.m : 1.0;
      var k = (preset.k!=null)? preset.k : 30.0;
      var c = (preset.c!=null)? preset.c : 50.0;
      points = sampleSpringPointsForPreview(m,k,c, STEPS_MAIN);
      yr = smartYRange(points);
    } else if (preset.type === "bounce"){
      var BB = (preset.B!=null)? preset.B : 3.0;
      var DD = (preset.c!=null)? preset.c : 25.0;
      if (isBounceB){
        points = sampleBounceBPointsForPreview(BB, DD, STEPS_MAIN);
      } else {
        points = sampleBouncePointsForPreview(BB, DD, STEPS_MAIN);
      }
      yr = smartYRange(points);
    } else if (preset.type === "wiggle"){
      var WW = (preset.W!=null)? preset.W : 3.0;
      var DD = (preset.D!=null)? preset.D : 25.0;
      points = sampleWigglePointsForPreview(WW, DD, STEPS_MAIN);
      yr = smartYRange(points);
    } else if (preset.type === "overshoot"){
      var M = (preset.M!=null)? preset.M : 1.0;
      var C = (preset.c!=null)? preset.c : 50.0;
      var dirStr = preset.dir ? preset.dir : "INOUT";
      points = sampleOvershootPointsForPreview(M, C, dirStr, STEPS_MAIN);
      yr = smartYRange(points);
    } else if (preset.type === "flicker"){
      points = parseLinear(preset.step);
      yr = smartYRange(points);
    } else {
      yr = {min:0, max:1};
    }

    if (points && points.length === 0) points = null;
    this._yr = yr;

    // グリッド・枠
    var penGrid = g.newPen(g.PenType.SOLID_COLOR, [0.35,0.38,0.42,1], 1);
    var y1p = mapXY(0,1,W,H,yr.min,yr.max)[1];
    g.newPath(); g.moveTo(0,y1p); g.lineTo(W,y1p); g.strokePath(penGrid);
    var y0p = mapXY(0,0,W,H,yr.min,yr.max)[1];
    g.newPath(); g.moveTo(0,y0p); g.lineTo(W,y0p); g.strokePath(penGrid);
    g.newPath(); g.rectPath(0,0,W,H); g.strokePath(penGrid);

    // 曲線
    var penC = g.newPen(g.PenType.SOLID_COLOR, [1,0.36,0.36,1], 2);
    var penH = g.newPen(g.PenType.SOLID_COLOR, [0.9,0.9,0.4,1], 1);
    var brH  = g.newBrush(g.BrushType.SOLID_COLOR, [1,1,0.6,1]);
    var r = 4; 

    if (preset.type === "bezier"){
      var P0 = mapXY(0,0, W,H, yr.min,yr.max),
          C1 = mapXY(preset.x1,preset.y1, W,H, yr.min,yr.max),
          C2 = mapXY(preset.x2,preset.y2, W,H, yr.min,yr.max),
          P3 = mapXY(1,1, W,H, yr.min,yr.max);

      g.newPath(); g.moveTo(P0[0], P0[1]);
      for (var i = 1; i <= STEPS_MAIN; i++){
        var t = i / STEPS_MAIN;
        var q = bez(t, P0, C1, C2, P3);
        g.lineTo(q[0], q[1]);
      }
      g.strokePath(penC);

      g.newPath(); g.moveTo(P0[0], P0[1]); g.lineTo(C1[0], C1[1]); g.strokePath(penH);
      g.newPath(); g.moveTo(P3[0], P3[1]); g.lineTo(C2[0], C2[1]); g.strokePath(penH);

      g.newPath(); g.ellipsePath(C1[0]-r, C1[1]-r, 2*r, 2*r); g.fillPath(brH);
      g.newPath(); g.ellipsePath(C2[0]-r, C2[1]-r, 2*r, 2*r); g.fillPath(brH);

    } else if (points){
      if (preset.type === "flicker"){
        drawStepCurve(g, points, W, H, yr);
      } else {
        g.newPath();
        var f = mapXY(points[0].percent, points[0].value, W,H, yr.min,yr.max);
        g.moveTo(f[0], f[1]);
        for (var j = 1; j < points.length; j++){
          var p = mapXY(points[j].percent, points[j].value, W,H, yr.min,yr.max);
          g.lineTo(p[0], p[1]);
        }
      }
      g.strokePath(penC);
    }
  };

  cv.addEventListener("mousedown", function(e){
    if (!cv._preset || cv._preset.type !== "bezier") return;
    var mx = e.clientX, my = e.clientY;
    var W = cv.size[0], H = cv.size[1];
    var yr = cv._yr;
    var C1 = mapXY(cv._preset.x1, cv._preset.y1, W,H, yr.min, yr.max);
    var C2 = mapXY(cv._preset.x2, cv._preset.y2, W,H, yr.min, yr.max);
    var rHit = 10; 
    if (Math.pow(mx-C1[0],2) + Math.pow(my-C1[1],2) < rHit*rHit) dragging = "C1";
    else if (Math.pow(mx-C2[0],2) + Math.pow(my-C2[1],2) < rHit*rHit) dragging = "C2";
  });

  cv.addEventListener("mousemove", function(e){
    if (!dragging || !cv._preset) return;
    var mx = e.clientX, my = e.clientY;
    var W = cv.size[0], H = cv.size[1];
    var yr = cv._yr;
    var valX = mx / W;
    var valY = (H - my) / H * (yr.max - yr.min) + yr.min; 
    valX = Math.max(0, Math.min(1, valX));

    if (dragging === "C1"){
      cv._preset.x1 = valX; cv._preset.y1 = valY;
    } else if (dragging === "C2"){
      cv._preset.x2 = valX; cv._preset.y2 = valY;
    }
    cv.notify("onDraw");
    if (onUserChange) onUserChange(cv._preset);
  });

  cv.addEventListener("mouseup", function(e){ dragging = null; });
  cv.addEventListener("mouseover", function(e){ dragging = null; });

  return {
    view: cv,
    update: function(preset){ cv._preset = preset; try{cv.notify("onDraw");}catch(_){} }
  };
}

function buildCell(parent, preset, onSelect, selected){
  var cell = parent.add("group");
  cell.orientation = "column"; cell.spacing = 4; cell.margins = 0;
  var CELL_W = THUMB; var CELL_H = THUMB + 4 + LABEL_H;
  cell.preferredSize = [CELL_W, CELL_H];
  cell._selected = !!selected;

  var cv = cell.add("customview");
  cv.preferredSize = [THUMB, THUMB];
  cv._preset = preset;
  cv._isSel = function(){ return cell._selected; };

  cv.onDraw = function(){
      var g = this.graphics, W = this.size[0], H = this.size[1], sel = this._isSel();
      var bg = sel ? [0.20,0.22,0.26,1] : [0.13,0.13,0.14,1];
      g.newPath(); g.rectPath(0,0,W,H);
      g.fillPath(g.newBrush(g.BrushType.SOLID_COLOR, bg));
      var pr = this._preset;
      if (!pr) return;

      var yr, points = null;
      var presetCategory = getPresetCategory(pr);
      var isBounceB = (presetCategory === "BounceB" || (presetCategory==="Bounce" && currentCatKey==="BounceB"));

    if (pr.type === "bezier"){
      yr = { min: Math.min(0,1,pr.y1,pr.y2) - 0.2, max: Math.max(0,1,pr.y1,pr.y2) + 0.2 };
    } else if (pr.type === "linear"){
      points = parseLinear(pr.linear); yr = smartYRange(points);
    } else if (pr.type === "spring"){
      var m = (pr.m!=null)?pr.m:1, k=(pr.k!=null)?pr.k:30, c=(pr.c!=null)?pr.c:50;
      points = sampleSpringPointsForPreview(m,k,c, STEPS_THUMB); yr = smartYRange(points);
    } else if (pr.type === "bounce"){
      var BB=(pr.B!=null)?pr.B:3, DD=(pr.c!=null)?pr.c:25;
      points = isBounceB ? sampleBounceBPointsForPreview(BB,DD,STEPS_THUMB) : sampleBouncePointsForPreview(BB,DD,STEPS_THUMB);
      yr = smartYRange(points);
    } else if (pr.type === "wiggle"){
      var WW=(pr.W!=null)?pr.W:3, DD=(pr.D!=null)?pr.D:25;
      points = sampleWigglePointsForPreview(WW,DD,STEPS_THUMB); yr = smartYRange(points);
    } else if (pr.type === "overshoot"){
      var M=(pr.M!=null)?pr.M:1, C=(pr.c!=null)?pr.c:50, d=pr.dir?pr.dir:"INOUT";
      points = sampleOvershootPointsForPreview(M,C,d,STEPS_THUMB); yr = smartYRange(points);
    } else if (pr.type === "flicker"){
      points = parseLinear(pr.step); yr = smartYRange(points);
    } else { yr = {min:0, max:1}; }

    if (points && points.length === 0) points = null;
    var penB = g.newPen(g.PenType.SOLID_COLOR, sel ? [0.75,0.78,0.95,1] : [0.30,0.32,0.36,1], sel?2:1);
    g.newPath(); g.rectPath(0,0,W,H); g.strokePath(penB);

    var penC = g.newPen(g.PenType.SOLID_COLOR, [0.95,0.95,0.95,1], 2);
    var penH = g.newPen(g.PenType.SOLID_COLOR, [0.9,0.9,0.4,1], 1);
    var brH  = g.newBrush(g.BrushType.SOLID_COLOR, [1,1,0.6,1]);
    var r = 2;

    if (pr.type === "bezier"){
      var P0 = mapXY(0,0,W,H,yr.min,yr.max), C1 = mapXY(pr.x1,pr.y1,W,H,yr.min,yr.max),
          C2 = mapXY(pr.x2,pr.y2,W,H,yr.min,yr.max), P3 = mapXY(1,1,W,H,yr.min,yr.max);
      g.newPath(); g.moveTo(P0[0],P0[1]);
      for (var i=1;i<=STEPS_THUMB;i++){ g.lineTo(bez(i/STEPS_THUMB,P0,C1,C2,P3)[0], bez(i/STEPS_THUMB,P0,C1,C2,P3)[1]); }
      g.strokePath(penC);
      g.newPath(); g.moveTo(P0[0],P0[1]); g.lineTo(C1[0],C1[1]); g.strokePath(penH);
      g.newPath(); g.moveTo(P3[0],P3[1]); g.lineTo(C2[0],C2[1]); g.strokePath(penH);
      g.newPath(); g.ellipsePath(C1[0]-r,C1[1]-r,2*r,2*r); g.fillPath(brH);
      g.newPath(); g.ellipsePath(C2[0]-r,C2[1]-r,2*r,2*r); g.fillPath(brH);
    } else if (points){
      if (pr.type === "flicker"){
        drawStepCurve(g, points, W, H, yr);
      } else {
        g.newPath(); var f=mapXY(points[0].percent,points[0].value,W,H,yr.min,yr.max); g.moveTo(f[0],f[1]);
        for(var j=1;j<points.length;j++){ var p=mapXY(points[j].percent,points[j].value,W,H,yr.min,yr.max); g.lineTo(p[0],p[1]); }
      }
      g.strokePath(penC);
    }
  };
  cv.addEventListener("mousedown", function(){ if(onSelect) onSelect(preset, cell); });
  var label = cell.add("statictext", undefined, preset.name);
  label.preferredSize=[THUMB, LABEL_H]; label.justify="center";
  label.addEventListener("mousedown", function(){ if(onSelect) onSelect(preset, cell); });
  cell.setSelected = function(v){ cell._selected = !!v; try{cv.notify("onDraw");}catch(_){} };
  return cell;
}

// ============================================================================
// UI構築（サムネ右＋スクロール＋フッター固定版 + 左右幅固定）
// ============================================================================
function buildUI(thisObj){
  var CATEGORY_LABELS = [
    {ui:"ベジェ",        key:"Bezier"},
    {ui:"スプリング",    key:"Spring"},
    {ui:"バウンス A",    key:"BounceA"},
    {ui:"バウンス B",    key:"BounceB"},
    {ui:"ウィグル",      key:"Wiggle"},
    {ui:"オーバーシュート", key:"Overshoot"},
    {ui:"フリッカー",    key:"Flicker"}
  ];

  // ★ ウィンドウと左右カラムの固定サイズ
  var FIXED_W = 800;
  var FIXED_H = 760;

  var LEFT_W  = 400; // プレビュー＋パラメータ側
  var RIGHT_W = 360; // タブ＋サムネ側

  // 状態変数
  currentCatKey   = "Bezier";
  var currentList = [];
  var activePresetData = null;
  var selectedIndex = 0;
  var currentDirMode = "INOUT";
  var applyMode = "expression";

  var layoutReady = false;

  // 1. ウィンドウ生成 --------------------------------------------------------
  var isPanel = (thisObj instanceof Panel);
  var win = isPanel
          ? thisObj
          : new Window("palette","Curve Presets (FlowLite)", undefined);

  win.orientation   = "column";
  win.alignChildren = ["fill","fill"];
  win.margins       = 10;
  win.spacing       = 0;

  win.preferredSize = [FIXED_W, FIXED_H];
  win.minimumSize   = [FIXED_W, FIXED_H];
  win.maximumSize   = [FIXED_W, FIXED_H];

  if (isPanel){
    win.size = [FIXED_W, FIXED_H];
  }

  // ========================================================================
  // 2. メインエリア
  // ========================================================================
  var mainRow = win.add("group");
  mainRow.orientation   = "row";
  mainRow.alignment     = ["fill","fill"];
  mainRow.alignChildren = ["fill","fill"];
  mainRow.spacing       = 10;
  mainRow.margins       = 0;

  // ------------------ 左カラム --------------------------------------------
  var leftCol = mainRow.add("group");
  leftCol.orientation   = "column";
  leftCol.alignment     = ["left","fill"];
  leftCol.alignChildren = ["fill","top"];
  leftCol.spacing       = 8;
  leftCol.margins       = 0;

  leftCol.preferredSize = [LEFT_W, 100];
  leftCol.minimumSize   = [LEFT_W, 0];
  leftCol.maximumSize   = [LEFT_W, 10000];

  var topSection = leftCol.add("group");
  topSection.orientation   = "column";
  topSection.alignChildren = ["fill","top"];
  topSection.alignment     = ["fill","top"];
  topSection.spacing       = 8;
  topSection.margins       = 0;

  // --- ヘッダー ---
  var head = topSection.add("group");
  head.orientation   = "row";
  head.alignChildren = ["left","center"];
  head.add("statictext", undefined, "選択中：");
  var txtName = head.add("statictext", undefined, "(none)");
  txtName.characters = 28;

  // --- 方向ラジオ ---
  var dirRow = topSection.add("group");
  dirRow.orientation   = "row";
  dirRow.alignChildren = ["left","center"];
  dirRow.add("statictext", undefined, "方向：");
  var dirPanel = dirRow.add("group");
  dirPanel.orientation   = "row";
  dirPanel.spacing       = 8;

  var rIN    = dirPanel.add("radiobutton",undefined,"IN");
  var rOUT   = dirPanel.add("radiobutton",undefined,"OUT");
  var rINOUT = dirPanel.add("radiobutton",undefined,"INOUT");
  var rOUTIN = dirPanel.add("radiobutton",undefined,"OUTIN");
  var rCUSTOM= dirPanel.add("radiobutton",undefined,"CUSTOM");
  var rALL   = dirPanel.add("radiobutton",undefined,"ALL");

  function applyDirRadio(mode){
    rIN.value    = (mode==="IN");
    rOUT.value   = (mode==="OUT");
    rINOUT.value = (mode==="INOUT");
    rOUTIN.value = (mode==="OUTIN");
    rCUSTOM.value= (mode==="CUSTOM");
    rALL.value   = (mode==="ALL");
    currentDirMode = mode;
    refreshList(true);
  }

  function isForcedAllCategory(catKey){
    return (catKey==="Spring" || catKey==="BounceA" || catKey==="BounceB" || catKey==="Wiggle");
  }
  function updateDirControlsForCategory(){
    var forced = isForcedAllCategory(currentCatKey);
    rIN.enabled     = !forced;
    rOUT.enabled    = !forced;
    rINOUT.enabled  = !forced;
    rOUTIN.enabled  = !forced;
    rCUSTOM.enabled = true;
    rALL.enabled    = true;
    if (forced && currentDirMode !== "CUSTOM" && currentDirMode !== "ALL"){
      applyDirRadio("ALL");
    }
  }

  rIN.onClick     = function(){ applyDirRadio("IN"); };
  rOUT.onClick    = function(){ applyDirRadio("OUT"); };
  rINOUT.onClick  = function(){ applyDirRadio("INOUT"); };
  rOUTIN.onClick  = function(){ applyDirRadio("OUTIN"); };
  rCUSTOM.onClick = function(){ applyDirRadio("CUSTOM"); };
  rALL.onClick    = function(){ applyDirRadio("ALL"); };

  // --- プレビューヘッダー ---
  var prevHead = topSection.add("group");
  prevHead.orientation   = "row";
  prevHead.alignChildren = ["left","center"];
  prevHead.spacing       = 8;

  var btnAddPreset = prevHead.add("button", undefined, "プリセットに追加");
  btnAddPreset.size = [120, 24];
  var btnDelete = prevHead.add("button", undefined, "プリセットから削除");
  btnDelete.size = [140, 24];
  btnDelete.visible = false;

  var btnOpenCustomFolder = prevHead.add("button", undefined, "カスタムフォルダを開く");
  btnOpenCustomFolder.size = [150, 24];
  var sp = prevHead.add("group");
  sp.alignment = ["fill","center"];

  var loadRow = topSection.add("group");
  loadRow.orientation   = "row";
  loadRow.alignChildren = ["left","center"];
  loadRow.spacing       = 8;
  var btnLoadCurve = loadRow.add("button", undefined, "選択カーブを読込");
  btnLoadCurve.size = [120, 24];

  // --- メインプレビュー ---
  var prevWrap = topSection.add("group");
  prevWrap.orientation = "column";
  prevWrap.alignment   = ["fill","top"];

  var mainPrev = buildMainPreview(prevWrap, 340, 340, function(updatedPreset){
    if (currentCatKey === "Bezier" && updatedPreset && updatedPreset.type === "bezier"){
      uiBezierX1.setOnlyUI(updatedPreset.x1);
      uiBezierY1.setOnlyUI(updatedPreset.y1);
      uiBezierX2.setOnlyUI(updatedPreset.x2);
      uiBezierY2.setOnlyUI(updatedPreset.y2);
    }
  });

  // --- パラメータスタック ---
  var paramStack = topSection.add("group");
  paramStack.orientation   = "stack";
  paramStack.alignment     = ["fill","top"];
  paramStack.alignChildren = ["fill","top"];

  // Bezier UI ---------------------------------------------------------------
  var bezierPanel = paramStack.add("panel", undefined, "Bezier Parameters");
  bezierPanel.orientation = "column";
  bezierPanel.visible     = false;

  function addBezierRow(label, init, minVal, maxVal){
    if(minVal===undefined) minVal=-2;
    if(maxVal===undefined) maxVal= 2;
    var g = bezierPanel.add("group");
    g.orientation   = "row";
    g.alignChildren = ["left","center"];
    var lbl = g.add("statictext", undefined, label + ":");
    lbl.preferredSize = [90, 18];
    var sld = g.add("slider", undefined, init*100, minVal*100, maxVal*100);
    sld.preferredSize = [170, 18];
    var edt = g.add("edittext", undefined, init.toFixed(2));
    edt.characters = 6;

    function updateActive(){
      if(!activePresetData || activePresetData.type!=="bezier") return;
      var v = sld.value/100;
      if(label==="X1") activePresetData.x1 = v;
      if(label==="Y1") activePresetData.y1 = v;
      if(label==="X2") activePresetData.x2 = v;
      if(label==="Y2") activePresetData.y2 = v;
      mainPrev.update(activePresetData);
    }
    function commitValue(){
      var v = parseFloat(edt.text);
      if(isNaN(v)) v = init;
      v = Math.max(minVal, Math.min(maxVal, v));
      sld.value = v*100;
      edt.text  = v.toFixed(2);
      updateActive();
    }
    function setVal(v){
      v = Math.max(minVal, Math.min(maxVal, isNaN(v)?init:v));
      sld.value = v*100;
      edt.text  = v.toFixed(2);
    }
    function setOnlyUI(v){
      v = Math.max(minVal, Math.min(maxVal, v));
      sld.value = v*100;
      edt.text  = v.toFixed(2);
    }
    function getVal(){ return sld.value/100; }

    sld.onChanging = function(){
      edt.text = (sld.value/100).toFixed(2);
      updateActive();
    };
    edt.onChanging = function(){
      if(!isNaN(parseFloat(edt.text))){
        sld.value = parseFloat(edt.text)*100;
        updateActive();
      }
    };
    edt.onChange = commitValue;

    return { set:setVal, get:getVal, setOnlyUI:setOnlyUI };
  }

  var uiBezierX1 = addBezierRow("X1", 0.30, 0.01, 0.99);
  var uiBezierY1 = addBezierRow("Y1", 0.00, -2.0, 2.0);
  var uiBezierX2 = addBezierRow("X2", 0.70, 0.01, 0.99);
  var uiBezierY2 = addBezierRow("Y2", 1.00, -2.0, 2.0);

  function setBezierUI(p){
    uiBezierX1.set(p.x1!=null?p.x1:0.3);
    uiBezierY1.set(p.y1!=null?p.y1:0.0);
    uiBezierX2.set(p.x2!=null?p.x2:0.7);
    uiBezierY2.set(p.y2!=null?p.y2:1.0);
  }

  // 共通のパラメータパネル生成 ----------------------------------------------
  function createParamPanel(name, rowsData, typeCheck, updateFunc){
    var p = paramStack.add("panel", undefined, name);
    p.orientation = "column";
    p.visible     = false;
    var uiEls = {};

    for(var i=0; i<rowsData.length; i++){
      (function(d){
        var g = p.add("group");
        g.orientation   = "row";
        g.alignChildren = ["left","center"];
        var lbl = g.add("statictext", undefined, d.label + ":");
        lbl.preferredSize = [120, 18];
        var sld = g.add("slider", undefined, d.init*d.scale, d.min*d.scale, d.max*d.scale);
        sld.preferredSize = [160, 18];
        var edt = g.add("edittext", undefined, d.init.toFixed(d.dec));
        edt.characters = 6;

        function sync(){
          if(!activePresetData || activePresetData.type!==typeCheck) return;
          var v = sld.value/d.scale;
          activePresetData[d.prop] = v;
          updateFunc();
        }
        function commit(){
          var v = parseFloat(edt.text);
          if(isNaN(v)) v = d.init;
          v = Math.max(d.min, Math.min(d.max, v));
          sld.value = v*d.scale;
          edt.text  = v.toFixed(d.dec);
          sync();
        }

        sld.onChanging = function(){
          edt.text = (sld.value/d.scale).toFixed(d.dec);
          sync();
        };
        edt.onChanging = function(){
          if(!isNaN(parseFloat(edt.text))){
            sld.value = parseFloat(edt.text)*d.scale;
            sync();
          }
        };
        edt.onChange = commit;

        uiEls[d.prop] = {
          set: function(val){
            val = (val!=null)?val:d.init;
            val = Math.max(d.min, Math.min(d.max, val));
            sld.value = val*d.scale;
            edt.text  = val.toFixed(d.dec);
          },
          get: function(){ return sld.value/d.scale; }
        };
      })(rowsData[i]);
    }
    return {panel:p, uis:uiEls};
  }

  var springObj = createParamPanel(
    "Spring Parameters",
    [
      {label:"Mass",      prop:"m", min:0, max:5,   scale:100, init:1,  dec:2},
      {label:"Stiffness", prop:"k", min:0, max:100, scale:1,   init:30, dec:2},
      {label:"Damping",   prop:"c", min:0, max:100, scale:1,   init:50, dec:2}
    ],
    "spring",
    function(){ mainPrev.update(activePresetData); }
  );
  var springPanel = springObj.panel;

  var wiggleObj = createParamPanel(
    "Wiggle Parameters",
    [
      {label:"Wiggles (W)", prop:"W", min:1, max:10,  scale:10, init:3,  dec:1},
      {label:"Damping (D)", prop:"D", min:0, max:100, scale:1,  init:25, dec:1}
    ],
    "wiggle",
    function(){ mainPrev.update(activePresetData); }
  );
  var wigglePanel = wiggleObj.panel;

  var overObj = createParamPanel(
    "Overshoot Parameters",
    [
      {label:"Mass (M)",   prop:"M", min:0, max:5,   scale:100, init:1,  dec:2},
      {label:"Damping (c)",prop:"c", min:0, max:100, scale:1,   init:50, dec:2}
    ],
    "overshoot",
    function(){ mainPrev.update(activePresetData); }
  );
  var overshootPanel = overObj.panel;

  var bounceObj = createParamPanel(
    "Bounce 設定",
    [
      {label:"バウンド数", prop:"B", min:1, max:10,  scale:1,   init:3,  dec:2},
      {label:"減衰",       prop:"c", min:0, max:100, scale:1,   init:25, dec:2}
    ],
    "bounce",
    function(){ mainPrev.update(activePresetData); }
  );
  var bouncePanel = bounceObj.panel;

  var leftSpacer = leftCol.add("group");
  leftSpacer.alignment = ["fill","fill"];
  leftSpacer.minimumSize = [0,0];

  var applyModeRow = leftCol.add("group");
  applyModeRow.orientation   = "row";
  applyModeRow.alignment     = ["fill","bottom"];
  applyModeRow.alignChildren = ["left","center"];
  applyModeRow.spacing       = 8;
  applyModeRow.add("statictext", undefined, "適用方法:");
  var applyModePanel = applyModeRow.add("group");
  applyModePanel.orientation = "row";
  applyModePanel.spacing     = 8;
  var applyExpr = applyModePanel.add("radiobutton", undefined, "エクスプレッション");
  var applyKeys = applyModePanel.add("radiobutton", undefined, "キーフレーム");
  applyExpr.value = true;
  applyExpr.onClick = function(){ applyMode = "expression"; };
  applyKeys.onClick = function(){ applyMode = "keyframe"; };

  var applyRow = leftCol.add("group");
  applyRow.orientation   = "row";
  applyRow.alignment     = ["fill","bottom"];
  applyRow.alignChildren = ["left","center"];
  applyRow.spacing       = 8;
  var btnApply = applyRow.add("button", undefined, "選択キーに適用");
  btnApply.alignment = ["left","center"];
  var btnSelectAllAnimated = applyRow.add("button", undefined, "選択レイヤーの全アニメーションを選択");

  var applySideRow = leftCol.add("group");
  applySideRow.orientation   = "row";
  applySideRow.alignment     = ["fill","bottom"];
  applySideRow.alignChildren = ["left","center"];
  applySideRow.spacing       = 8;
  var btnApplyLeft = applySideRow.add("button", undefined, "左キーのみ適用");
  var btnApplyRight = applySideRow.add("button", undefined, "右キーのみ適用");
  btnSelectAllAnimated.alignment = ["left","center"];

  // （Spring / Wiggle / Overshoot / Bounce / Bezier のパネル生成は元のままなので省略）

  // ... ここに createParamPanel / springObj / wiggleObj / overObj / bounceObj / bezierPanel など
  // （元ファイルと同じ内容をそのまま置いてください。省略部分はロジック変更なしです）

  // ------------------ 右カラム：タブ＋サムネイル ---------------------------
  var rightCol = mainRow.add("group");
  rightCol.orientation   = "column";
  rightCol.alignment     = ["right","fill"];
  rightCol.alignChildren = ["fill","fill"];
  rightCol.spacing       = 4;
  rightCol.margins       = 0;

  rightCol.preferredSize = [RIGHT_W, 100];
  rightCol.minimumSize   = [RIGHT_W, 0];
  rightCol.maximumSize   = [RIGHT_W, 10000];

  // --- タブ ---
  var tabArea = rightCol.add("group");
  tabArea.orientation   = "column";
  tabArea.alignChildren = ["fill","top"];
  tabArea.alignment     = ["fill","top"];
  tabArea.margins       = [0,0,0,4];

  var catTabs = tabArea.add("tabbedpanel");
  catTabs.alignChildren = ["fill","fill"];
  catTabs.alignment     = ["fill","top"];

  var tabObjs = [];
  for(var t=0; t<CATEGORY_LABELS.length; t++){
    var tab = catTabs.add("tab", undefined, CATEGORY_LABELS[t].ui);
    tabObjs.push(tab);
  }

  // --- リスト＋スクロールバー ---
  var listArea = rightCol.add("group");
  listArea.orientation   = "row";
  listArea.alignment     = ["fill","fill"];
  listArea.alignChildren = ["fill","fill"];
  listArea.spacing       = 0;
  listArea.margins       = 0;

  var viewport = listArea.add("group");
  viewport.orientation   = "stack";
  viewport.alignment     = ["fill","fill"];
  viewport.alignChildren = ["left","top"];
  viewport.margins       = 0;

  var grid = viewport.add("group");
  grid.orientation   = "column";
  grid.alignment     = ["fill","top"];
  grid.alignChildren = ["left","top"];
  grid.spacing       = CELL_GAP;
  grid.location      = [0,0];

  // ★ スクロールバーは高さ固定にせず、親の高さいっぱい使う
  var scrollBar = listArea.add("scrollbar");
  scrollBar.alignment      = ["right","fill"]; // ← ここが重要
  scrollBar.preferredSize  = [16, 0];          // 幅だけ 16px に固定
  scrollBar.minimumSize    = [16, 0];
  scrollBar.maximumSize    = [16, 10000];

  // スクロール処理 ----------------------------------------------------------
  function getMarginValue(margins, key){
    if (typeof margins === "number") return margins || 0;
    return (margins && margins[key] != null) ? margins[key] : 0;
  }

  function syncListHeightsToWindow(){
    if (!layoutReady || !win || !rightCol || !listArea || !viewport || !scrollBar) return;

    var winSize = (win.size && win.size.length === 2) ? win.size
                : (win.preferredSize && win.preferredSize.length === 2 ? win.preferredSize : null);
    if (!winSize) return;

    var topMargin    = getMarginValue(win.margins, "top");
    var bottomMargin = getMarginValue(win.margins, "bottom");

    var usableH = Math.max(0, winSize[1] - topMargin - bottomMargin);
    var rowSpace = win.spacing || 0;
    var colSpace = rightCol.spacing || 0;
    var maxRightH = Math.max(0, usableH - rowSpace);

    rightCol.maximumSize   = [RIGHT_W, maxRightH];
    rightCol.preferredSize = [RIGHT_W, maxRightH];

    var tabH = 0;
    if (tabArea){
      var tabSize = tabArea.size || tabArea.preferredSize;
      if (tabSize && tabSize.length === 2) tabH = tabSize[1];
    }
    var listH = Math.max(0, maxRightH - tabH - colSpace);

    listArea.maximumSize   = [RIGHT_W, listH];
    listArea.preferredSize = [RIGHT_W, listH];

    viewport.maximumSize   = [RIGHT_W, listH];
    viewport.preferredSize = [RIGHT_W, listH];

    var barW = scrollBar.preferredSize ? scrollBar.preferredSize[0] : 16;
    scrollBar.maximumSize    = [barW, listH];
    scrollBar.preferredSize  = [barW, listH];
  }

  function updateScroll(){
    if (!layoutReady || !viewport || !grid || !scrollBar) return;
    if (!viewport.size || !grid.size) return;

    var vH = viewport.size[1] || 0;   // 表示枠の高さ
    var contentH = grid.size[1] || 0; // 中身（サムネ全体）の高さ

    var maxScroll = Math.max(0, contentH - vH);  // ここを素直に計算
    scrollBar.maxvalue = maxScroll;
    if (scrollBar.value > maxScroll) scrollBar.value = maxScroll;
    scrollBar.visible  = (maxScroll > 0);

    grid.location.y = -scrollBar.value;
  }

  scrollBar.onChanging = function(){
    grid.location.y = -scrollBar.value;
  };

  win.addEventListener("wheel", function(e){
    if(!scrollBar.visible) return;
    var delta = e.detail ? e.detail * -1 : 0;
    var step  = 30;
    if(delta > 0)      scrollBar.value -= step;
    else if(delta < 0) scrollBar.value += step;

    if(scrollBar.value < 0) scrollBar.value = 0;
    if(scrollBar.value > scrollBar.maxvalue) scrollBar.value = scrollBar.maxvalue;
    grid.location.y = -scrollBar.value;
  });

  layoutReady = true;

  // ========================================================================
  // 3. ロジック
  // ========================================================================
  function updateParamVisibility(p){
    springPanel.visible    = false;
    bouncePanel.visible    = false;
    wigglePanel.visible    = false;
    overshootPanel.visible = false;
    bezierPanel.visible    = false;

    if(!p) return;

    if (p.type==="spring" && currentCatKey==="Spring"){
      springPanel.visible = true;
      springObj.uis.m.set(p.m);
      springObj.uis.k.set(p.k);
      springObj.uis.c.set(p.c);
    } else if (p.type==="bounce" && (currentCatKey==="BounceA" || currentCatKey==="BounceB")){
      bouncePanel.visible = true;
      bounceObj.uis.B.set(p.B);
      bounceObj.uis.c.set(p.c);
    } else if (p.type==="wiggle" && currentCatKey==="Wiggle"){
      wigglePanel.visible = true;
      wiggleObj.uis.W.set(p.W);
      wiggleObj.uis.D.set(p.D);
    } else if (p.type==="overshoot" && currentCatKey==="Overshoot"){
      overshootPanel.visible = true;
      overObj.uis.M.set(p.M);
      overObj.uis.c.set(p.c);
    } else if (p.type==="bezier" && currentCatKey==="Bezier"){
      bezierPanel.visible = true;
      setBezierUI(p);
    }
  }

  function updateApplyModeControls(){
    if (currentCatKey === "Bezier"){
      applyExpr.enabled = false;
      applyKeys.enabled = true;
      applyKeys.value = true;
      applyMode = "keyframe";
    } else {
      applyExpr.enabled = true;
      applyKeys.enabled = true;
      if (currentCatKey === "Spring" ||
          currentCatKey === "BounceA" ||
          currentCatKey === "BounceB" ||
          currentCatKey === "Wiggle" ||
          currentCatKey === "Overshoot"){
        applyExpr.value = true;
        applyKeys.value = false;
      }
      if (!applyExpr.value && !applyKeys.value){
        applyExpr.value = true;
      }
      applyMode = applyExpr.value ? "expression" : "keyframe";
    }
  }

  function clampValue(v, a, b){
    return Math.max(a, Math.min(b, v));
  }

  function selectTabByKey(key){
    for (var i = 0; i < CATEGORY_LABELS.length; i++){
      if (CATEGORY_LABELS[i].key === key){
        catTabs.selection = tabObjs[i];
        currentCatKey = key;
        updateDirControlsForCategory();
        updateApplyModeControls();
        refreshList(true);
        return;
      }
    }
  }

  function getSliderValue(layer, name, fallback){
    try{
      var fx = layer.property("ADBE Effect Parade");
      if (!fx) return fallback;
      var prop = fx.property(name);
      if (!prop) return fallback;
      return prop.property(1).value;
    }catch(_){
      return fallback;
    }
  }

  function parseCurveArrayFromExpression(expr){
    var start = expr.indexOf("var curve");
    if (start < 0) return null;
    var open = expr.indexOf("[", start);
    var close = expr.indexOf("]", open);
    if (open < 0 || close < 0) return null;
    var body = expr.substring(open + 1, close);
    var parts = body.split(",");
    var arr = [];
    for (var i = 0; i < parts.length; i++){
      var v = parseFloat(parts[i]);
      if (!isNaN(v)) arr.push(v);
    }
    if (arr.length < 4 || (arr.length % 2) !== 0) return null;
    return arr;
  }

  function buildLinearStringFromCurveArray(arr, valueScale){
    valueScale = (valueScale != null) ? valueScale : 1.0;
    var parts = [];
    for (var i = 0; i < arr.length; i += 2){
      var x = arr[i] * 100;
      var y = arr[i + 1] * valueScale;
      var valueStr = (Math.round(y * 100) / 100).toString();
      var percentStr = (Math.round(x * 10) / 10).toString();
      if (i === 0 && x === 0){
        parts.push(valueStr);
      } else {
        parts.push(valueStr + " " + percentStr + "%");
      }
    }
    return parts.join(", ");
  }

  function buildBezierFromProperty(prop){
    if (!prop || prop.numKeys < 2) return null;
    var keys = [];
    for (var k=1; k<=prop.numKeys; k++){
      if (prop.keySelected(k)) keys.push(k);
    }
    if (keys.length < 2){
      keys = [1, 2];
    }
    keys.sort(function(a,b){ return prop.keyTime(a) - prop.keyTime(b); });
    var kL = keys[0];
    var kR = keys[1];
    var tL = prop.keyTime(kL);
    var tR = prop.keyTime(kR);
    var dt = Math.max(1e-6, tR - tL);
    var v1 = prop.keyValue(kL);
    var v2 = prop.keyValue(kR);
    if (v1 instanceof Array) v1 = v1[0];
    if (v2 instanceof Array) v2 = v2[0];
    var base = (v2 - v1) / dt;

    var outEase = prop.keyOutTemporalEase(kL);
    var inEase = prop.keyInTemporalEase(kR);
    if (!outEase || !inEase || outEase.length === 0 || inEase.length === 0) return null;

    var x1 = clampValue(outEase[0].influence / 100, 0.01, 0.99);
    var x2 = 1 - clampValue(inEase[0].influence / 100, 0.01, 0.99);

    var slopeOut = (Math.abs(base) < 1e-6) ? 0 : (outEase[0].speed / base);
    var slopeIn = (Math.abs(base) < 1e-6) ? 0 : (inEase[0].speed / base);

    var y1 = slopeOut * x1;
    var y2 = 1 - slopeIn * (1 - x2);
    y1 = clampValue(y1, -2, 2);
    y2 = clampValue(y2, -2, 2);

    return { x1:x1, y1:y1, x2:x2, y2:y2 };
  }

  function loadSelectedCurve(){
    if (typeof getSelectedProperties !== "function"){
      alert("選択情報が取得できませんでした。");
      return;
    }
    var props = getSelectedProperties();
    if (!props || props.length === 0){
      alert("キーを2つ以上持つプロパティを選択してください。");
      return;
    }
    var pr = props[0];
    var expr = pr.expression ? pr.expression.toString() : "";
    var hasExpression = (expr && expr.length > 0);
    var lyr = pr.propertyGroup(pr.propertyDepth);
    var preset = null;
    var fromExpression = false;

    if (hasExpression){
      if (expr.indexOf("stepLookup") >= 0){
        var curveArr = parseCurveArrayFromExpression(expr);
        if (curveArr){
          preset = {
            name: "選択カーブ",
            type: "flicker",
            step: buildLinearStringFromCurveArray(curveArr, 100),
            dir: "INOUT"
          };
          selectTabByKey("Flicker");
          fromExpression = true;
        }
      } else if (expr.indexOf("FL_Mass") >= 0){
        preset = {
          name: "選択カーブ",
          type: "spring",
          m: getSliderValue(lyr, "FL_Mass", 1.0),
          k: getSliderValue(lyr, "FL_Stiffness", 30.0),
          c: getSliderValue(lyr, "FL_Damping", 50.0),
          dir: "INOUT"
        };
        selectTabByKey("Spring");
        fromExpression = true;
      } else if (expr.indexOf("bounceB_01") >= 0){
        preset = {
          name: "選択カーブ",
          type: "bounce",
          B: getSliderValue(lyr, "Bounce Bounces", 3.0),
          c: getSliderValue(lyr, "Bounce Damping", 25.0),
          dir: "OUT"
        };
        selectTabByKey("BounceB");
        fromExpression = true;
      } else if (expr.indexOf("bounceA_01") >= 0){
        preset = {
          name: "選択カーブ",
          type: "bounce",
          B: getSliderValue(lyr, "Bounce Bounces", 3.0),
          c: getSliderValue(lyr, "Bounce Damping", 25.0),
          dir: "OUT"
        };
        selectTabByKey("BounceA");
        fromExpression = true;
      } else if (expr.indexOf("Wiggle W") >= 0){
        preset = {
          name: "選択カーブ",
          type: "wiggle",
          W: getSliderValue(lyr, "Wiggle W", 3.0),
          D: getSliderValue(lyr, "Wiggle Damping", 25.0),
          dir: "INOUT"
        };
        selectTabByKey("Wiggle");
        fromExpression = true;
      } else if (expr.indexOf("Overshoot Mass") >= 0){
        var dir = "INOUT";
        var m = expr.match(/DIR_MODE\\s*=\\s*(\\d+)/);
        if (m && m.length > 1){
          var mode = parseInt(m[1], 10);
          if (mode === 0) dir = "IN";
          else if (mode === 1) dir = "OUT";
        }
        preset = {
          name: "選択カーブ",
          type: "overshoot",
          M: getSliderValue(lyr, "Overshoot Mass", 1.0),
          c: getSliderValue(lyr, "Overshoot Damping", 50.0),
          dir: dir
        };
        selectTabByKey("Overshoot");
        fromExpression = true;
      } else if (expr.indexOf("lookupCurve") >= 0){
        var arr = parseCurveArrayFromExpression(expr);
        if (arr){
          preset = {
            name: "選択カーブ",
            type: "linear",
            linear: buildLinearStringFromCurveArray(arr, 1.0),
            dir: "INOUT"
          };
          selectTabByKey("Bezier");
          fromExpression = true;
        }
      }
    }

    if (!preset && !hasExpression){
      var bez = buildBezierFromProperty(pr);
      if (bez){
        preset = {
          name: "選択カーブ",
          type: "bezier",
          x1: bez.x1, y1: bez.y1, x2: bez.x2, y2: bez.y2,
          dir: "INOUT"
        };
        selectTabByKey("Bezier");
      }
    }

    if (!preset){
      alert("読み込めるカーブが見つかりませんでした。");
      return;
    }

    if (fromExpression){
      applyExpr.value = true;
      applyKeys.value = false;
      applyMode = "expression";
      updateApplyModeControls();
    }

    activePresetData = clonePreset(preset);
    txtName.text = preset.name;
    updateParamVisibility(activePresetData);
    mainPrev.update(activePresetData);
  }

  function onSelectPreset(preset, cell, index){
    selectedIndex     = index;
    activePresetData  = clonePreset(preset);

    for (var r=0; r<grid.children.length; r++){
      var row = grid.children[r];
      for (var c=0; c<row.children.length; c++){
        var cc = row.children[c];
        if(cc.setSelected) cc.setSelected(cc._index === selectedIndex);
      }
    }

    txtName.text = preset.name;

    var original = currentList[index];
    var isCustom = (arrayIndexOf(CUSTOM_PRESETS, original) !== -1);
    btnDelete.visible = isCustom;

    updateParamVisibility(activePresetData);
    mainPrev.update(activePresetData);

    syncListHeightsToWindow();
    win.layout.layout(true);
    updateScroll();
  }

  // リスト再構築（グリッド作り直し） ---------------------------------------
  function rebuildRows(force){
    var scrollW = 16;

    // ★ 右カラムの固定幅から、サムネが使える横幅を計算
    var availW = RIGHT_W - scrollW - 10; // ちょっと余裕を引いておく

    if (availW < THUMB + 20) {
      availW = THUMB + 20;
    }

    var perRow = Math.floor(availW / (THUMB + CELL_GAP));
    if (perRow < 1) perRow = 1;

    while (grid.children.length > 0){
      grid.remove(grid.children[0]);
    }

    if (currentList.length === 0){
      var emptyRow = grid.add("group");
      emptyRow.add("statictext", undefined, "該当なし");
    } else {
      var rowGroup = null;
      var count    = 0;

      for (var i=0; i<currentList.length; i++){
        if (count === 0){
          rowGroup = grid.add("group");
          rowGroup.orientation   = "row";
          rowGroup.alignChildren = ["left","top"];
          rowGroup.spacing       = CELL_GAP;
        }

        var p = currentList[i];
        (function(preset, index, parentRow){
          var cell = buildCell(
            parentRow,
            preset,
            function(){ onSelectPreset(preset, cell, index); },
            index === selectedIndex
          );
          cell._index = index;
        })(p, i, rowGroup);

        count++;
        if (count >= perRow) count = 0;
      }
    }

    syncListHeightsToWindow();
    win.layout.layout(true);
    updateScroll();
  }

  // カテゴリ & 方向フィルタ -----------------------------------------------
  function filterPresets(){
    var source = ALL_PRESETS.concat(CUSTOM_PRESETS);
    var out    = [];

    function isCustom(p){ return arrayIndexOf(CUSTOM_PRESETS, p) !== -1; }

    for (var i=0; i<source.length; i++){
      var p = source[i];
      var matchCat = false;

      if (currentCatKey === "BounceA" || currentCatKey === "BounceB"){
        if (p.category === "Bounce") matchCat = true;
      } else if (p.category === currentCatKey){
        matchCat = true;
      }

      if (matchCat){
        var matchDir = false;
        if (currentDirMode === "ALL")              matchDir = true;
        else if (currentDirMode === "CUSTOM")      matchDir = isCustom(p);
        else if (p.dir === currentDirMode)         matchDir = true;
        if (matchDir) out.push(p);
      }
    }
    return out;
  }

  function refreshList(resetSelection){
    currentList = filterPresets();

    if (resetSelection) selectedIndex = 0;
    if (selectedIndex >= currentList.length) selectedIndex = 0;

    if (currentList.length > 0){
      onSelectPreset(currentList[selectedIndex], null, selectedIndex);
    } else {
      activePresetData = null;
      txtName.text     = "(none)";
      btnDelete.visible = false;
      updateParamVisibility(null);
      mainPrev.update(null);
      syncListHeightsToWindow();
      win.layout.layout(true);
      updateScroll();
    }
    rebuildRows(true);
  }

  // --- イベント設定 ---------------------------------------------------------
  catTabs.onChange = function(){
    var idx = arrayIndexOf(tabObjs, catTabs.selection);
    if (idx < 0) idx = 0;
    currentCatKey = CATEGORY_LABELS[idx].key;
    updateDirControlsForCategory();
    updateApplyModeControls();
    refreshList(true);
  };

  btnAddPreset.onClick = function(){
    if (!activePresetData){
      alert("データがありません");
      return;
    }
    var defaultName = "Custom_" + currentCatKey;
    var newName = prompt("プリセット名を入力してください", defaultName);
    if(!newName) return;

    var newP = clonePreset(activePresetData);
    newP.name = newName;

    if (currentCatKey==="BounceA" || currentCatKey==="BounceB")
      newP.category = "Bounce";
    else
      newP.category = currentCatKey;

    newP.dir = (currentDirMode==="ALL" || currentDirMode==="CUSTOM") ? "INOUT" : currentDirMode;

    CUSTOM_PRESETS.push(newP);
    saveCustomPresets();

    if (currentDirMode !== "ALL" && currentDirMode !== "CUSTOM")
      applyDirRadio("CUSTOM");
    else
      refreshList(true);
  };

  btnDelete.onClick = function(){
    var target = currentList[selectedIndex];
    if(!target) return;
    var idx = arrayIndexOf(CUSTOM_PRESETS, target);
    if (idx === -1){
      alert("削除できません");
      return;
    }
    if(!confirm("削除しますか？")) return;

    CUSTOM_PRESETS.splice(idx, 1);
    saveCustomPresets();
    refreshList(true);
  };

  btnOpenCustomFolder.onClick = function(){
    var f = new File(CUSTOM_FILE_PATH);
    var folder = f.parent;
    if (!folder.exists){
      folder.create();
    }
    try{
      folder.execute();
    }catch(e){
      alert("フォルダを開けませんでした: " + e);
    }
  };

  btnLoadCurve.onClick = function(){
    loadSelectedCurve();
  };

  btnSelectAllAnimated.onClick = function(){
    app.beginUndoGroup("FlowLite: Select Animated Properties");
    try{
      selectAnimatedPropertiesOnSelectedLayers();
    }catch(e){
      alert("Error: " + e);
    }finally{
      app.endUndoGroup();
    }
  };

  function applyBezierSide(side){
    if (!activePresetData){
      alert("データがありません");
      return;
    }
    if (activePresetData.type !== "bezier"){
      alert("ベジェプリセットを選択してください。");
      return;
    }
    var props = getSelectedProperties();
    if (!props || props.length === 0){
      alert("キーを2つ以上持つプロパティを選択してください。");
      return;
    }
    var label = (side === "left") ? "左ハンドル" : "右ハンドル";
    app.beginUndoGroup("FlowLite: " + label);
    try{
      applyBezierEasing(activePresetData, props, side);
    }catch(e){
      alert("Error: " + e);
    }finally{
      app.endUndoGroup();
    }
  }

  btnApply.onClick = function(){
    if (!activePresetData){
      alert("データがありません");
      return;
    }
    activePresetData.applyMode = applyMode;
    applyEasing(activePresetData);
  };

  btnApplyLeft.onClick = function(){
    applyBezierSide("left");
  };

  btnApplyRight.onClick = function(){
    applyBezierSide("right");
  };

  // 初期化 -------------------------------------------------------------------
  catTabs.selection = tabObjs[0];
  applyDirRadio("INOUT");
  updateDirControlsForCategory();
  updateApplyModeControls();

  // ★ リサイズ禁止：ドラッグされても必ず FIXED_W×FIXED_H に戻す
  win.onResizing = function(){
    this.size = [FIXED_W, FIXED_H];
    syncListHeightsToWindow();
  };

  win.onResize = function(){
    this.size = [FIXED_W, FIXED_H];
    syncListHeightsToWindow();
    this.layout.resize();
    rebuildRows(false);
  };

  win.onShow = function(){
    this.size = [FIXED_W, FIXED_H];
    syncListHeightsToWindow();
    this.layout.resize();
    rebuildRows(true);
  };

  syncListHeightsToWindow();
  win.layout.layout(true);
  updateScroll();
  return win;
}