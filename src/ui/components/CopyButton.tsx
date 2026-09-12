import { useState } from 'react'
import { copySecret } from '../../application/clipboard-service'

type Props = {
  label: string
  value: string
  tone?: 'primary' | 'secondary'
}

export function CopyButton({ label, value, tone = 'secondary' }: Props) {
  const [message, setMessage] = useState('')

  const copy = () => {
    if (navigator.clipboard === undefined) {
      setMessage('このブラウザではコピーできません')
      return
    }
    void copySecret(value, navigator.clipboard, undefined, () => setMessage('コピーしました')).then((result) => {
      if (result === 'copy-failed') setMessage('コピーできませんでした')
      if (result === 'clear-failed') setMessage('コピーしましたが、自動消去できませんでした')
    })
  }

  return (
    <div>
      <button type="button" data-tone={tone} onClick={copy}>{label}</button>
      {message.length > 0 && <p role="status">{message}</p>}
    </div>
  )
}
