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
- `install.bat` (全検出AE対象)
- `install_AE2024.bat`
- `install_AE2025.bat`
- `install_AE2026.bat`
- `install.ps1`

---

## インストール方法（受け取り側）

1. zip を任意の場所に解凍
2. 対象バージョンに合わせて次のいずれかをダブルクリック
   - `install_AE2024.bat`
   - `install_AE2025.bat`
   - `install_AE2026.bat`
3. 完了後、After Effects を起動して  
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

※ `install.bat` は文字化け/実行崩れを防ぐため、ASCII の表示文言のみを使っています。
※ `install.ps1` も文字化け/実行崩れを防ぐため、ASCII の表示文言のみを使っています。
※ AE が既定パスで見つからない場合、Documents 側のみインストールして警告を表示します。

- 既定では非対話モード（`-NonInteractive`）と上書き（`-Force`）、クリーン再配置（`-CleanInstall`）で実行します。

## 旧バージョン番号スクリプトの扱い

- 既定は `-CleanInstall` で実行されるため、`Documents\Adobe\After Effects\AE_SUGI_ScriptLancher` 配下は一度クリアしてから再コピーします。
- そのため、アップデート時に古いナンバリングの `.jsx` が残りにくい構成です。
- もし手動ファイルを残したい場合は、`install.ps1` を `-CleanInstall` なしで実行してください。

