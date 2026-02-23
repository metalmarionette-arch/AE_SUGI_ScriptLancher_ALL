# AE_SUGI_ScriptLancher 配布・インストール手順

このリポジトリには、以下2つをインストールするためのスクリプトを同梱しています。

1. `AE_SUGI_ScriptLancher.jsx`  
   - コピー先:  
     `C:\Program Files\Adobe\Adobe After Effects <バージョン>\Support Files\Scripts\ScriptUI Panels`
2. `AE_SUGI_ScriptLancher` フォルダ一式  
   - コピー先:  
     `C:\Users\<ユーザー名>\Documents\Adobe\After Effects\AE_SUGI_ScriptLancher`

---

## 配布時のおすすめ形

以下を **zip** にまとめて配布すると、受け取り側は解凍して `install.bat` を実行するだけでインストールできます。

- `AE_SUGI_ScriptLancher.jsx`
- `AE_SUGI_ScriptLancher` フォルダ
- `install.bat`
- `install.ps1`

---

## インストール方法（受け取り側）

1. zip を任意の場所に解凍
2. `install.bat` をダブルクリックして実行（自動で管理者権限を要求します）
3. バージョン入力の案内が出たら `2024` / `2025` / `2026` などを入力
4. 完了後、After Effects を起動して  
   `ウィンドウ > AE_SUGI_ScriptLancher` から開く

> `Program Files` 配下に書き込むため、途中で UAC（管理者権限確認）が表示されます。

---

## 便利な実行例

- バージョンを指定して実行

```bat
install.bat -AeVersion 2025
```

- PC内で検出できた AE 全バージョンに `jsx` を入れる

```bat
install.bat -AllDetectedVersions
```

- 既存ファイルを確認なしで上書き

```bat
install.bat -AeVersion 2026 -Force
```

---

## 補足

- `AE_SUGI_ScriptLancher.jsx` は Documents 配下の
  `Adobe\After Effects\AE_SUGI_ScriptLancher` を参照して動作します。
- そのため、`AE_SUGI_ScriptLancher` フォルダも必ず同時に配置してください。


- `install.bat` は処理後に自動で閉じず、結果表示のまま停止します。
