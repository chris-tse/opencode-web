import { useRef, useEffect } from 'react'
import { ScrollArea } from '../ui/scroll-area'
import { MessageBubble } from './MessageBubble'
import type { ChatMessage } from '../../stores/messageStore'

interface ChatContainerProps {
  messages: ChatMessage[]
  isLoading: boolean
}

export const ChatContainer = ({ messages, isLoading }: ChatContainerProps) => {
  const scrollAreaRef = useRef<HTMLDivElement>(null)

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]')
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight
      }
    }
  }, [messages, isLoading])

  return (
    <ScrollArea ref={scrollAreaRef} className="h-[calc(100vh-280px)] mb-4 border rounded-lg p-4">
      <div className="space-y-4">
        {messages.map((message) => (
          <MessageBubble key={message.id} message={message} />
        ))}
      </div>
    </ScrollArea>
  )
}