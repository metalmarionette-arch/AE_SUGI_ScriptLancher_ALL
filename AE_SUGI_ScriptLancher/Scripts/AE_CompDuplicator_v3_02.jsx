function buildUI(thisObj) {
  var myPanel = (thisObj instanceof Panel) ? thisObj : new Window("palette", "Duplicate/Move Comps with Assets", undefined);
  myPanel.orientation = "column";

  var renameGroup = myPanel.add("group", undefined);
  renameGroup.orientation = "column";
  renameGroup.alignment = "left";

  renameGroup.add("statictext", undefined, "【置換文字列1】");

  var replace1BeforeGroup = renameGroup.add("group", undefined);
  replace1BeforeGroup.add("statictext", undefined, "置換前：");
  var replace1Before = replace1BeforeGroup.add("edittext", undefined, "");
  replace1Before.characters = 20;

  var replace1AfterGroup = renameGroup.add("group", undefined);
  replace1AfterGroup.add("statictext", undefined, "置換後：");
  var replace1After = replace1AfterGroup.add("edittext", undefined, "");
  replace1After.characters = 20;

  renameGroup.add("statictext", undefined, "【置換文字列2】");

  var replace2BeforeGroup = renameGroup.add("group", undefined);
  replace2BeforeGroup.add("statictext", undefined, "置換前：");
  var replace2Before = replace2BeforeGroup.add("edittext", undefined, "");
  replace2Before.characters = 20;

  var replace2AfterGroup = renameGroup.add("group", undefined);
  replace2AfterGroup.add("statictext", undefined, "置換後：");
  var replace2After = replace2AfterGroup.add("edittext", undefined, "");
  replace2After.characters = 20;

  renameGroup.add("statictext", undefined, "【前後の文字列追加】");

  var addBeforeGroup = renameGroup.add("group", undefined);
  addBeforeGroup.add("statictext", undefined, "前追加：");
  var addBefore = addBeforeGroup.add("edittext", undefined, "");
  addBefore.characters = 20;

  var addAfterGroup = renameGroup.add("group", undefined);
  addAfterGroup.add("statictext", undefined, "後追加：");
  var addAfter = addAfterGroup.add("edittext", undefined, "");
  addAfter.characters = 20;

  // --- オプション ---
  var optionGroup = renameGroup.add("group", undefined);
  optionGroup.orientation = "column";
  optionGroup.alignment = "left";

  var replaceFootageCheckbox = optionGroup.add("checkbox", undefined, "コンポ内フッテージも差し替え");
  replaceFootageCheckbox.value = true;

  var moveCheckbox = optionGroup.add("checkbox", undefined, "移動（OFFのときは複製）");
  moveCheckbox.value = false;

  var duplicateFootageCheckbox = optionGroup.add("checkbox", undefined, "フッテージも対象に");
  duplicateFootageCheckbox.value = false;

  var collectDependenciesCheckbox = optionGroup.add("checkbox", undefined, "依存関係にある全てを複製/移動する（収集）");
  collectDependenciesCheckbox.value = false;

  function updateOptionEnabling() {
    var enabled = !moveCheckbox.value;
    replace1Before.enabled = enabled;
    replace1After.enabled = enabled;
    replace2Before.enabled = enabled;
    replace2After.enabled = enabled;
    addBefore.enabled = enabled;
    addAfter.enabled = enabled;
    replaceFootageCheckbox.enabled = enabled;
  }

  moveCheckbox.onClick = updateOptionEnabling;
  updateOptionEnabling();

  var groupOne = myPanel.add("group", undefined, "GroupOne");
  groupOne.orientation = "row";
  var duplicateButton = groupOne.add("button", undefined, "実行");

  duplicateButton.onClick = function() {
    main_sugi({
      replace: [
        { from: replace1Before.text, to: replace1After.text },
        { from: replace2Before.text, to: replace2After.text },
      ],
      add: { before: addBefore.text, after: addAfter.text },
      replaceFootage: replaceFootageCheckbox.value,
      move: moveCheckbox.value,
      duplicateFootage: duplicateFootageCheckbox.value,
      collectDependencies: collectDependenciesCheckbox.value
    });
  };

  myPanel.layout.layout(true);
  myPanel.layout.resize();
  myPanel.onResizing = myPanel.onResize = function () { this.layout.resize(); }

  myPanel.onClose = function () {
    if ($.global.__AECompDuplicatorUI === myPanel) {
      $.global.__AECompDuplicatorUI = null;
    }
    return true;
  };

  return myPanel;
}

function showSingletonUI(thisObj) {
  var existingUI = $.global.__AECompDuplicatorUI;

  if (existingUI && existingUI instanceof Window) {
    try {
      existingUI.show();
      existingUI.active = true;
      return existingUI;
    } catch (e) {
      $.global.__AECompDuplicatorUI = null;
    }
  }

  var myScriptPal = buildUI(thisObj);
  $.global.__AECompDuplicatorUI = myScriptPal;
  return myScriptPal;
}

var myScriptPal = showSingletonUI(this);

if ((myScriptPal != null) && (myScriptPal instanceof Window)) {
  myScriptPal.center();
  myScriptPal.show();
}

//////////////////////////////////////////////////
function escapeRegExp(string) {
  return string.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&');
}

function getBaseName(name) {
  return name.replace(/[_\s]*\[\d+-\d+\].*$/, "");
}

function findCompByName(name) {
  for (var i = 1; i <= app.project.numItems; i++) {
    var item = app.project.item(i);
    if (item instanceof CompItem && item.name === name) {
      return item;
    }
  }
  return null;
}

function findTargetItem(targetName) {
  var targetBaseName = getBaseName(targetName);
  var bestMatch = null;

  for (var i = 1; i <= app.project.numItems; i++) {
    var item = app.project.item(i);

    if (item.name === targetName) {
      return item;
    }

    if (!bestMatch && item instanceof FootageItem) {
        if (getBaseName(item.name) === targetBaseName) {
            bestMatch = item;
        }
    }
  }

  return bestMatch;
}

function updatePropertyExpressions(prop, compNameMap) {
  if (prop.propertyType === PropertyType.PROPERTY) {
    if (prop.canSetExpression && prop.expression) {
      var updatedExpression = prop.expression;
      for (var originalName in compNameMap) {
        var duplicatedName = compNameMap[originalName];
        var compRegex = new RegExp('\\bcomp\\(["\']' + escapeRegExp(originalName) + '["\']\\)', 'g');
        updatedExpression = updatedExpression.replace(compRegex, 'comp("' + duplicatedName + '")');
        var layerRegex = new RegExp('\\blayer\\(["\']' + escapeRegExp(originalName) + '["\']\\)', 'g');
        updatedExpression = updatedExpression.replace(layerRegex, 'layer("' + duplicatedName + '")');
      }
      if (updatedExpression !== prop.expression) {
        prop.expression = updatedExpression;
      }
    }
  } else if (prop.propertyType === PropertyType.INDEXED_GROUP || prop.propertyType === PropertyType.NAMED_GROUP) {
    for (var i = 1; i <= prop.numProperties; i++) {
      updatePropertyExpressions(prop.property(i), compNameMap);
    }
  }
}

function replaceNestedSources(layer, compNameMap, renameOptions) {
  if (layer.source instanceof CompItem) {
    var newCompName = compNameMap[layer.source.name];
    if (newCompName) {
      var newComp = findCompByName(newCompName);
      if (newComp) {
        layer.replaceSource(newComp, true);
      }
    }
  }
  else if (renameOptions.replaceFootage && (layer.source instanceof FootageItem)) {
    var currentName = layer.source.name;
    var newName = currentName;

    for (var j = 0; j < renameOptions.replace.length; j++) {
      var replaceOption = renameOptions.replace[j];
      if (replaceOption.from !== "") {
        var re = new RegExp(escapeRegExp(replaceOption.from), 'g');
        newName = newName.replace(re, replaceOption.to);
      }
    }

    if (newName !== currentName) {
      var targetItem = findTargetItem(newName);

      if (targetItem && targetItem instanceof FootageItem) {
        if (layer.source.id !== targetItem.id) {
             layer.replaceSource(targetItem, false);
        }
      }
    }
  }
}

function duplicateItem(item) {
  var proj = app.project;
  var beforeItems = [];
  for (var i = 1; i <= proj.numItems; i++){
      beforeItems.push(proj.item(i));
  }
  if (typeof item.duplicate === "function") {
      try {
          return item.duplicate();
      } catch (e) {}
  }
  var origSel = [];
  for (var i = 1; i <= proj.numItems; i++){
      if (proj.item(i).selected) {
          origSel.push(proj.item(i));
      }
      proj.item(i).selected = false;
  }
  item.selected = true;
  var dupCmdId = app.findMenuCommandId("複製");
  if (dupCmdId === 0) {
      alert("メニューコマンド「複製」が見つかりません。");
      return null;
  }
  app.executeCommand(dupCmdId);
  var newItem = null;
  for (var i = 1; i <= proj.numItems; i++){
      var candidate = proj.item(i);
      var found = false;
      for (var j = 0; j < beforeItems.length; j++){
          if (candidate === beforeItems[j]){
              found = true;
              break;
          }
      }
      if (!found) {
          newItem = candidate;
          break;
      }
  }
  for (var i = 1; i <= proj.numItems; i++){
      proj.item(i).selected = false;
  }
  for (var i = 0; i < origSel.length; i++){
      origSel[i].selected = true;
  }
  return newItem;
}

function duplicateItemWithRename(item, renameOptions) {
  var dup = duplicateItem(item);
  if (dup) {
      if (!(item instanceof FootageItem)) {
          var newName = item.name;
          for (var j = 0; j < renameOptions.replace.length; j++) {
              var rep = renameOptions.replace[j];
              if (rep.from !== "") {
                newName = newName.replace(new RegExp(rep.from, 'g'), rep.to);
              }
          }
          newName = renameOptions.add.before + newName + renameOptions.add.after;
          if (newName === item.name) {
              newName = item.name + "_copy";
          }
          dup.name = newName;
      }
  }
  return dup;
}

function buildRenamedName(name, renameOptions) {
  var newName = name;
  for (var j = 0; j < renameOptions.replace.length; j++) {
      var rep = renameOptions.replace[j];
      if (rep.from !== "") {
          var re = new RegExp(escapeRegExp(rep.from), 'g');
          newName = newName.replace(re, rep.to);
      }
  }
  newName = renameOptions.add.before + newName + renameOptions.add.after;
  return newName;
}

function findFootageByName(name) {
  var proj = app.project;
  for (var i = 1; i <= proj.numItems; i++) {
      var item = proj.item(i);
      if (item instanceof FootageItem && item.name === name) {
          return item;
      }
  }
  return null;
}

function replaceFootageInComp(comp, renameOptions) {
  if (!renameOptions.replaceFootage) {
      return;
  }

  for (var i = 1; i <= comp.numLayers; i++) {
      var layer = comp.layer(i);
      if (layer.source && layer.source instanceof FootageItem) {
          var targetName = buildRenamedName(layer.source.name, renameOptions);
          if (targetName !== layer.source.name) {
              var targetItem = findFootageByName(targetName);
              if (targetItem && targetItem.id !== layer.source.id) {
                  layer.replaceSource(targetItem, false);
              }
          }
      }
  }
}

function duplicateFolderRecursive(originalFolder, parentForDuplicate, dupFootage, renameOptions, mapping) {
  var proj = app.project;
  var newFolderName = originalFolder.name;
  for (var j = 0; j < renameOptions.replace.length; j++) {
      var rep = renameOptions.replace[j];
      if (rep.from !== "") {
        newFolderName = newFolderName.replace(new RegExp(rep.from, 'g'), rep.to);
      }
  }
  newFolderName = renameOptions.add.before + newFolderName + renameOptions.add.after;
  if (newFolderName === originalFolder.name) {
      newFolderName = originalFolder.name + "_copy";
  }
  var newFolder = proj.items.addFolder(newFolderName);
  if (parentForDuplicate) {
      newFolder.parentFolder = parentForDuplicate;
  }
  var children = [];
  for (var i = 1; i <= proj.numItems; i++){
      var item = proj.item(i);
      if (item.parentFolder === originalFolder) {
          children.push(item);
      }
  }
  for (var i = 0; i < children.length; i++){
      var child = children[i];
      if (child instanceof FolderItem) {
          duplicateFolderRecursive(child, newFolder, dupFootage, renameOptions, mapping);
      } else if (child instanceof CompItem) {
          var dup = duplicateItemWithRename(child, renameOptions);
          if (dup) {
              dup.parentFolder = newFolder;
              mapping.push({ original: child, duplicate: dup });
          }
      } else if (child instanceof FootageItem) {
          if (dupFootage) {
              var dupFootageItem = duplicateItemWithRename(child, renameOptions);
              if (dupFootageItem) {
                  dupFootageItem.parentFolder = newFolder;
                  mapping.push({ original: child, duplicate: dupFootageItem });
              }
          }
      }
  }
  return newFolder;
}

function updateExpressionsInPropertyGroup(propGroup, mapping) {
  if (propGroup.numProperties !== undefined) {
      for (var i = 1; i <= propGroup.numProperties; i++){
          var prop = propGroup.property(i);
          if (prop.canSetExpression && prop.expression !== "") {
              var expr = prop.expression;
              expr = expr.replace(/comp\(["']([^"']+)["']\)/g, function(match, p1) {
                  for (var m = 0; m < mapping.length; m++) {
                      if (mapping[m].original.name === p1) {
                          return 'comp("' + mapping[m].duplicate.name + '")';
                      }
                  }
                  return match;
              });
              expr = expr.replace(/layer\(["']([^"']+)["']\)/g, function(match, p1) {
                  for (var m = 0; m < mapping.length; m++) {
                      if (mapping[m].original.name === p1) {
                          return 'layer("' + mapping[m].duplicate.name + '")';
                      }
                  }
                  return match;
              });
              expr = expr.replace(/footage\(["']([^"']+)["']\)/g, function(match, p1) {
                  for (var m = 0; m < mapping.length; m++){
                      if (mapping[m].original.name === p1) {
                          return 'footage("' + mapping[m].duplicate.name + '")';
                      }
                  }
                  return match;
              });
              if (expr !== prop.expression) {
                  prop.expression = expr;
              }
          }
          if (prop.numProperties !== undefined && prop.numProperties > 0) {
              updateExpressionsInPropertyGroup(prop, mapping);
          }
      }
  }
}

function updateEssentialProperties(mapping) {
  try {
      for (var i = 0; i < mapping.length; i++) {
          if (mapping[i].duplicate instanceof CompItem) {
              var dupComp = mapping[i].duplicate;

              if (dupComp.motionGraphicsTemplate && dupComp.motionGraphicsTemplate.numProperties > 0) {
                  updateEssentialPropertiesInComp(dupComp, mapping);
              }
          }
      }
  } catch (e) {
  }
}

function updateEssentialPropertiesInComp(comp, mapping) {
  try {
      var mgt = comp.motionGraphicsTemplate;
      if (!mgt) return;

      for (var i = 1; i <= mgt.numProperties; i++) {
          var essentialProp = mgt.property(i);
          if (essentialProp && essentialProp.isEssential) {
              updateEssentialPropertyReferences(essentialProp, mapping);
          }
      }
  } catch (e) {
  }
}

function updateEssentialPropertyReferences(essentialProp, mapping) {
  try {
      if (essentialProp.property && essentialProp.property.propertyGroup) {
          var propGroup = essentialProp.property.propertyGroup;

          while (propGroup && propGroup.propertyType !== PropertyType.NAMED_GROUP) {
              if (propGroup.propertyGroup) {
                  propGroup = propGroup.propertyGroup;
              } else {
                  break;
              }
          }

          if (propGroup && propGroup.source) {
              for (var m = 0; m < mapping.length; m++) {
                  if (propGroup.source === mapping[m].original) {
                      try {
                          essentialProp.property.expression = essentialProp.property.expression.replace(
                              new RegExp('comp\\("' + mapping[m].original.name + '"\\)', 'g'),
                              'comp("' + mapping[m].duplicate.name + '")'
                          );
                      } catch (e) {
                      }
                      break;
                  }
              }
          }
      }
  } catch (e) {
  }
}

function duplicateFolderStructureAndUpdateExpressions(dupFootage, renameOptions) {
  var proj = app.project;
  if (!proj) {
      alert("プロジェクトが開かれていません。");
      return;
  }
  var selItems = proj.selection;
  if (selItems.length === 0) {
      alert("複製するフォルダを選択してください。");
      return;
  }
  for (var i = 0; i < selItems.length; i++){
      if (!(selItems[i] instanceof FolderItem)) {
          alert("選択項目はフォルダのみ選択してください。");
          return;
      }
  }
  app.beginUndoGroup("フォルダ構造複製・リネーム・参照更新");
  try {
      var mapping = [];
      for (var i = 0; i < selItems.length; i++){
          duplicateFolderRecursive(selItems[i], selItems[i].parentFolder, dupFootage, renameOptions, mapping);
      }
      for (var i = 0; i < mapping.length; i++){
          if (mapping[i].duplicate instanceof CompItem) {
              var dupComp = mapping[i].duplicate;
              for (var j = 1; j <= dupComp.numLayers; j++){
                  var layer = dupComp.layer(j);
                  if (layer.source) {
                      for (var k = 0; k < mapping.length; k++){
                          if (layer.source === mapping[k].original) {
                              layer.replaceSource(mapping[k].duplicate, false);
                              break;
                          }
                      }
                  }
              }
          }
      }
      for (var i = 0; i < mapping.length; i++){
          if (mapping[i].duplicate instanceof CompItem) {
              var dupComp = mapping[i].duplicate;
              for (var j = 1; j <= dupComp.numLayers; j++){
                  updateExpressionsInPropertyGroup(dupComp.layer(j), mapping);
              }
              replaceFootageInComp(dupComp, renameOptions);
          }
      }
      updateEssentialProperties(mapping);
  } finally {
      app.endUndoGroup();
  }
  alert("フォルダ複製が完了しました。");
}

function collectCompAssets(mode, renameOptions, duplicateFootage, collectDependencies) {
  var proj = app.project;
  if (!proj) {
      alert("プロジェクトが開かれていません。");
      return;
  }
  var includeSelectedFootage = duplicateFootage && !collectDependencies;
  var selItems = proj.selection;
  if (selItems.length === 0) {
      alert("コンポを選択してください。");
      return;
  }
  var selectedComps = [];
  var selectedFootages = [];
  for (var i = 0; i < selItems.length; i++) {
      if (selItems[i] instanceof CompItem) {
          selectedComps.push(selItems[i]);
      } else if (includeSelectedFootage && selItems[i] instanceof FootageItem) {
          selectedFootages.push(selItems[i]);
      }
  }
  if (selectedComps.length === 0 && selectedFootages.length === 0) {
      alert("コンポを選択してください。");
      return;
  }
  var allowNestedCollection = collectDependencies;
  app.beginUndoGroup("コンポ資産収集");
  var nestedComps = [];
  var collectedFootages = [];
  try {
  var createBaseFolder = (mode === "move") || collectDependencies;
  var baseFolder = null;
  if (createBaseFolder) {
      var baseFolderName = "##Collected Comps - " + selectedComps[0].name;
      if (selectedComps.length > 1) {
          baseFolderName += " etc.";
      }
      baseFolder = proj.items.addFolder(baseFolderName);
  }
  function isInArray(item, arr) {
      for (var i = 0; i < arr.length; i++) {
          if (arr[i] === item) {
              return true;
          }
      }
      return false;
  }
  function collectFromComp(compItem) {
      for (var i = 1; i <= compItem.numLayers; i++) {
          var layer = compItem.layer(i);
          if (layer.source) {
              if (layer.source instanceof CompItem && allowNestedCollection) {
                  var sourceComp = layer.source;
                  var alreadySelected = false;
                  for (var j = 0; j < selectedComps.length; j++) {
                      if (selectedComps[j] === sourceComp) {
                          alreadySelected = true;
                          break;
                      }
                  }
                  if (!alreadySelected && !isInArray(sourceComp, nestedComps)) {
                      nestedComps.push(sourceComp);
                      collectFromComp(sourceComp);
                  }
              } else if (!(layer.source instanceof CompItem) && collectDependencies) {
                  if (!isInArray(layer.source, collectedFootages)) {
                      collectedFootages.push(layer.source);
                  }
              }
          }
      }
  }
  for (var i = 0; i < selectedComps.length; i++) {
      collectFromComp(selectedComps[i]);
  }
  if (collectDependencies) {
      function scanExpressionForDependencies(expressionText) {
          var deps = [];
          var compRegex = /comp\(["']([^"']+)["']\)/g;
          var footageRegex = /footage\(["']([^"']+)["']\)/g;
          var match;
          while (match = compRegex.exec(expressionText)) {
              deps.push(match[1]);
          }
          while (match = footageRegex.exec(expressionText)) {
              deps.push(match[1]);
          }
          return deps;
      }
      function scanPropertyGroupForExpressions(prop) {
          if (prop.canSetExpression && prop.expressionEnabled) {
              var expr = prop.expression;
              if (expr && expr.length > 0) {
                  var depNames = scanExpressionForDependencies(expr);
                  for (var i = 0; i < depNames.length; i++) {
                      var depName = depNames[i];
                      for (var j = 1; j <= proj.numItems; j++) {
                          var item = proj.item(j);
                          if (item.name === depName) {
                              if (item instanceof CompItem) {
                                  if (allowNestedCollection && !isInArray(item, nestedComps) && !isInArray(item, selectedComps)) {
                                      nestedComps.push(item);
                                      collectFromComp(item);
                                  }
                              } else if (collectDependencies && item instanceof FootageItem) {
                                  if (!isInArray(item, collectedFootages)) {
                                      collectedFootages.push(item);
                                  }
                              }
                              break;
                          }
                      }
                  }
              }
          }
          if (prop.numProperties !== undefined) {
              for (var i = 1; i <= prop.numProperties; i++) {
                  scanPropertyGroupForExpressions(prop.property(i));
              }
          }
      }
      var scannedCompsForExpressions = [];
      function scanCompForExpressionDependencies(comp) {
          scannedCompsForExpressions.push(comp);
          for (var i = 1; i <= comp.numLayers; i++) {
              scanPropertyGroupForExpressions(comp.layer(i));
          }
      }
      for (var i = 0; i < selectedComps.length; i++) {
          scanCompForExpressionDependencies(selectedComps[i]);
      }
      var previousLength = 0;
      while (previousLength !== nestedComps.length) {
          previousLength = nestedComps.length;
          for (var i = 0; i < nestedComps.length; i++) {
              if (!isInArray(nestedComps[i], scannedCompsForExpressions)) {
                  scanCompForExpressionDependencies(nestedComps[i]);
              }
          }
      }
  }
  var allItems = [];
  for (var i = 0; i < selectedComps.length; i++) {
      allItems.push(selectedComps[i]);
  }
  for (var i = 0; i < nestedComps.length; i++) {
      allItems.push(nestedComps[i]);
  }
  for (var i = 0; i < collectedFootages.length; i++) {
      if (!isInArray(collectedFootages[i], allItems)) {
          allItems.push(collectedFootages[i]);
      }
  }
  for (var i = 0; i < selectedFootages.length; i++) {
      if (!isInArray(selectedFootages[i], allItems)) {
          allItems.push(selectedFootages[i]);
      }
  }
  function getOriginalFolderChain(item) {
      var chain = [];
      var folder = item.parentFolder;
      while (folder != null && folder.name !== "Root") {
          chain.unshift(folder.name);
          folder = folder.parentFolder;
      }
      if(chain.length > 0 && chain[0] === "ルート"){
          chain.shift();
      }
      return chain;
  }
  function getOrCreateFolderChain(base, chainArray) {
      var currentFolder = base;
      for (var i = 0; i < chainArray.length; i++) {
          var folderName = chainArray[i];
          var foundFolder = null;
          for (var j = 1; j <= proj.numItems; j++){
              var item = proj.item(j);
              if (item instanceof FolderItem && item.name === folderName && item.parentFolder === currentFolder) {
                  foundFolder = item;
                  break;
              }
          }
          if (!foundFolder) {
              foundFolder = proj.items.addFolder(folderName);
              foundFolder.parentFolder = currentFolder;
          }
          currentFolder = foundFolder;
      }
      return currentFolder;
  }
  var mapping = [];
  for (var i = 0; i < allItems.length; i++){
      var item = allItems[i];
      var effectiveSource = item;

      if (item instanceof FootageItem && renameOptions.replaceFootage) {
          var replacementName = buildRenamedName(item.name, renameOptions);
          if (replacementName !== item.name) {
              var replacement = findTargetItem(replacementName);
              if (replacement && replacement instanceof FootageItem) {
                  effectiveSource = replacement;
              }
          }
      }

      var chain = getOriginalFolderChain(effectiveSource);
      var targetFolder = item.parentFolder;
      if (createBaseFolder) {
          targetFolder = baseFolder;
          if (chain.length > 0) {
              targetFolder = getOrCreateFolderChain(baseFolder, chain);
          }
      }
      if (mode === "duplicate") {
          var dup;
          if (item instanceof FootageItem && !(includeSelectedFootage || collectDependencies)) {
              dup = effectiveSource;
          } else {
              dup = duplicateItemWithRename(effectiveSource, renameOptions);
              dup.parentFolder = targetFolder;
          }
          mapping.push({ original: item, duplicate: dup });
      } else {
          if (item instanceof FootageItem) {
              if (includeSelectedFootage || collectDependencies) {
                  effectiveSource.parentFolder = targetFolder;
              }
              mapping.push({ original: item, duplicate: effectiveSource });
          } else {
              item.parentFolder = targetFolder;
              mapping.push({ original: item, duplicate: item });
          }
      }
  }
  if (mode === "duplicate") {
      for (var i = 0; i < mapping.length; i++){
          if (mapping[i].duplicate instanceof CompItem) {
              var dupComp = mapping[i].duplicate;
              for (var j = 1; j <= dupComp.numLayers; j++){
                  var layer = dupComp.layer(j);
                  if (layer.source) {
                      for (var k = 0; k < mapping.length; k++){
                          if (layer.source === mapping[k].original){
                              layer.replaceSource(mapping[k].duplicate, false);
                              break;
                          }
                      }
                  }
              }
          }
      }
      for (var i = 0; i < mapping.length; i++){
          if (mapping[i].duplicate instanceof CompItem) {
              var dupComp = mapping[i].duplicate;
              for (var j = 1; j <= dupComp.numLayers; j++){
                  updateExpressionsInPropertyGroup(dupComp.layer(j), mapping);
              }
              replaceFootageInComp(dupComp, renameOptions);
          }
      }
      updateEssentialProperties(mapping);
  }
  } finally {
      app.endUndoGroup();
  }
  var totalFootages = collectedFootages.length + selectedFootages.length;
  alert("コンポ資産収集が完了しました。\n選択コンポ: " + selectedComps.length +
        " 個\nネストコンポ: " + nestedComps.length +
        " 個\nフッテージ: " + totalFootages + " 個");
}

function main_sugi(options) {
  var selectedItems = app.project.selection;
  if (selectedItems.length === 0) {
    alert("No compositions selected. Please select one or more compositions in the project panel.");
    return;
  }

  var hasFolder = selectedItems[0] instanceof FolderItem;
  var mode = options.move ? "move" : "duplicate";

  if (hasFolder) {
    duplicateFolderStructureAndUpdateExpressions(options.duplicateFootage, options);
  } else {
    collectCompAssets(mode, options, options.duplicateFootage, options.collectDependencies);
  }
}