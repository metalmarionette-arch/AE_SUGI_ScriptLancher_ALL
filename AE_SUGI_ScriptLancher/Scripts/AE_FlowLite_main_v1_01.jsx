﻿#target aftereffects
(function CurvePresetFlowWrapV2(thisObj){

  // --- モジュール読み込み (サブフォルダを指定) ---
  #include "AE_FlowLite_jsx/AE_FlowLite_Config.jsx"
  #include "AE_FlowLite_jsx/AE_FlowLite_Presets.jsx"
  
  // --- Easingロジックを機能別に読み込み ---
  #include "AE_FlowLite_jsx/AE_FlowLite_Easing_Bezier.jsx"
  #include "AE_FlowLite_jsx/AE_FlowLite_Easing_Linear.jsx"
  #include "AE_FlowLite_jsx/AE_FlowLite_Easing_Spring.jsx"
  #include "AE_FlowLite_jsx/AE_FlowLite_Easing_Bounce.jsx"
  #include "AE_FlowLite_jsx/AE_FlowLite_Easing_Wiggle.jsx"
  #include "AE_FlowLite_jsx/AE_FlowLite_Easing_Overshoot.jsx"
  #include "AE_FlowLite_jsx/AE_FlowLite_Easing_Flicker.jsx"
  #include "AE_FlowLite_jsx/AE_FlowLite_EasingCore.jsx" // Easing呼び出しハブ

  #include "AE_FlowLite_jsx/AE_FlowLite_UI.jsx"

  // --- メイン処理 ---
  
  // このメインスクリプトの場所を基準に、サブフォルダのフルパスを生成
  var mainScriptFile = new File($.fileName);
  var subFolderPath = mainScriptFile.parent.fullName + "/AE_FlowLite_jsx/";

  // loadPresets 関数にサブフォルダのパスを渡す
  if(!loadPresets(subFolderPath)){
    return; // プリセット読み込み失敗
  }

  var existingPalette = null;
  try {
    existingPalette = $.global.__FLOWLITE_PALETTE__;
  } catch (_) {}

  if (existingPalette && (existingPalette instanceof Window)){
    try {
      existingPalette.show();
      existingPalette.active = true;
      return;
    } catch (_){
      try { $.global.__FLOWLITE_PALETTE__ = null; } catch(__){}
    }
  }

  var ui=buildUI(thisObj);
  if (ui instanceof Window){
    try { $.global.__FLOWLITE_PALETTE__ = ui; } catch (_){ }
    ui.center();
    ui.show();
  }

})(this);
