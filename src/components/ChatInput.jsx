import { useRef, useState } from 'react'
import {
  ArrowUpOutlined,
  PictureOutlined,
  CloseOutlined,
} from '@ant-design/icons'

export default function ChatInput({ onSend, onStop, loading, allowImage }) {
  const [text, setText] = useState('')
  const [images, setImages] = useState([]) // { url, base64 }
  const fileRef = useRef(null)
  const taRef = useRef(null)

  const autoResize = (el) => {
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 200) + 'px'
  }

  const pickImages = async (e) => {
    const files = Array.from(e.target.files || [])
    const next = []
    for (const f of files) {
      const url = URL.createObjectURL(f)
      const base64 = await new Promise((resolve) => {
        const r = new FileReader()
        r.onload = () => resolve(String(r.result).split(',')[1] || '')
        r.readAsDataURL(f)
      })
      next.push({ url, base64 })
    }
    setImages((prev) => [...prev, ...next])
    e.target.value = ''
  }

  const removeImage = (i) => {
    setImages((prev) => prev.filter((_, idx) => idx !== i))
  }

  const submit = () => {
    if (loading) return
    const value = text.trim()
    if (!value && images.length === 0) return
    onSend(value, images)
    setText('')
    setImages([])
    if (taRef.current) taRef.current.style.height = 'auto'
  }

  const onKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      submit()
    }
  }

  const canSend = (text.trim() || images.length > 0) && !loading

  return (
    <div className="composer">
      {images.length > 0 && (
        <div className="composer-images">
          {images.map((img, i) => (
            <div className="composer-image" key={i}>
              <img src={img.url} alt="preview" />
              <button onClick={() => removeImage(i)}>
                <CloseOutlined />
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="composer-row">
        {allowImage && (
          <button
            className="composer-icon"
            title="上传图片"
            onClick={() => fileRef.current?.click()}
          >
            <PictureOutlined />
          </button>
        )}
        <textarea
          ref={taRef}
          className="composer-input"
          placeholder="给 AI 发送消息，Enter 发送，Shift+Enter 换行"
          value={text}
          rows={1}
          onChange={(e) => {
            setText(e.target.value)
            autoResize(e.target)
          }}
          onKeyDown={onKeyDown}
        />
        {loading ? (
          <button className="composer-send stop" onClick={onStop} title="停止">
            <span className="stop-square" />
          </button>
        ) : (
          <button
            className="composer-send"
            disabled={!canSend}
            onClick={submit}
            title="发送"
          >
            <ArrowUpOutlined />
          </button>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={pickImages}
      />
    </div>
  )
}
