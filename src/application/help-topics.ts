export type HelpTopic = {
  id: 'setup' | 'registration' | 'copy' | 'sort' | 'category' | 'sync' | 'backup'
  title: string
  body: string
}

export const helpTopics: HelpTopic[] = [
  { id: 'setup', title: '初回設定', body: '最初にマスターパスワードを決めます。忘れると保管庫を解除できないため、安全な場所に保管してください。' },
  { id: 'registration', title: '登録・編集', body: 'サイト名、ID、パスワード、URL、カテゴリ、メモを登録できます。URLは https:// または http:// で始まるものだけを開けます。' },
  { id: 'copy', title: 'コピー', body: 'IDとパスワードは別々にコピーできます。コピー後30秒で内容を空に戻すよう試みます。ブラウザが拒否した場合は画面に表示します。' },
  { id: 'sort', title: '並び替え', body: '右上の並び順で手動・名前順・更新日順・登録日順を選べます。手動の順番は他の並び順を見ても変わりません。' },
  { id: 'category', title: 'カテゴリ', body: 'カテゴリは選択式です。カテゴリごとの件数は一覧に表示されます。削除時に登録が残っている場合は、移動先を選びます。' },
  { id: 'sync', title: 'PCとの同期', body: '初期版は端末内だけで使えます。PCとの暗号化同期は次の段階で、同じ自宅ネットワーク内から追加します。' },
  { id: 'backup', title: 'バックアップと復元', body: 'バックアップは暗号化された KAGITO 形式です。復元には同じマスターパスワードが必要で、通常のCSVとしては出力しません。' },
]
