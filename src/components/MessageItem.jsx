import { RobotOutlined, UserOutlined } from '@ant-design/icons'
import Markdown from './Markdown'
import ReasoningPanel from './ReasoningPanel'
import { splitThinking } from '../api/ollama'

export default function MessageItem({ message, streaming }) {
  const isUser = message.role === 'user'

  if (isUser) {
    return (
      <div className="msg msg-user">
        <div className="msg-body">
          {message.images?.length > 0 && (
            <div className="msg-images">
              {message.images.map((src, i) => (
                <img key={i} src={src} alt="upload" />
              ))}
            </div>
          )}
          <div className="bubble bubble-user">{message.content}</div>
        </div>
        <div className="avatar avatar-user">
          <UserOutlined />
        </div>
      </div>
    )
  }

  const { reasoning, answer } = splitThinking(message.content || '')
  const thinking = streaming && reasoning && !answer
  const isEmpty = !reasoning && !answer

  return (
    <div className="msg msg-assistant">
      <div className="avatar avatar-assistant">
        <RobotOutlined />
      </div>
      <div className="msg-body">
        <ReasoningPanel reasoning={reasoning} thinking={thinking} />
        <div className="bubble bubble-assistant">
          {isEmpty && streaming ? (
            <span className="typing">
              <i></i>
              <i></i>
              <i></i>
            </span>
          ) : (
            <Markdown>{answer || (reasoning ? '' : message.content)}</Markdown>
          )}
        </div>
      </div>
    </div>
  )
}
