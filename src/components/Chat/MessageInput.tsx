import React, { useRef, useCallback, type FormEvent } from 'react'
import { Button } from '../ui/button'
import { Textarea } from '../ui/textarea'

interface MessageInputProps {
  onSubmit: (message: string) => void
  disabled: boolean
  isLoading: boolean
  isInitializing: boolean
}

export function MessageInput({ onSubmit, disabled, isLoading, isInitializing }: MessageInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  const handleSubmit = useCallback((e: FormEvent) => {
    e.preventDefault()
    const userInput = textareaRef.current?.value.trim() ?? ''
    if (!userInput || disabled) return
    
    if (textareaRef.current) {
      textareaRef.current.value = ''
    }
    
    onSubmit(userInput)
  }, [onSubmit, disabled])

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e as unknown as FormEvent)
    }
  }, [handleSubmit])

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Textarea
        ref={textareaRef}
        placeholder="Type your message..."
        disabled={disabled}
        className="flex-1 min-h-[60px] resize-none"
        onKeyDown={handleKeyDown}
      />
      <Button 
        type="submit" 
        disabled={disabled}
        className="self-end"
      >
        {isLoading ? 'Sending...' : isInitializing ? 'Initializing...' : 'Send'}
      </Button>
    </form>
  )
}