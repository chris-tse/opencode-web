import type { StreamEvent } from './types'
import { logger } from '../lib/logger'

// Event listener type
type EventListener<T = unknown> = (data: T) => void

// EventStream service for handling Server-Sent Events
export class EventStreamService {
  private eventSource: EventSource | null = null
  private listeners: Map<string, EventListener[]> = new Map()
  private reconnectAttempts = 0
  private maxReconnectAttempts = 5
  private reconnectDelay = 1000
  private baseUrl: string

  constructor(baseUrl: string = '') {
    this.baseUrl = baseUrl || (import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:4096')
    
    // Expose debug object globally in development
    if (import.meta.env.DEV) {
      (window as any).__eventStreamDebug = this
    }
  }

  // Connect to the event stream
  connect(): void {
    if (this.eventSource) {
      this.disconnect()
    }

    const url = `${this.baseUrl}/event`
    this.eventSource = new EventSource(url)

    this.eventSource.onopen = () => {
      // console.log('✅ EventSource connected to:', url)
      // console.log('📡 Connection state:', this.eventSource?.readyState)
      // console.log('🎯 Active listeners:', Array.from(this.listeners.keys()))
      this.reconnectAttempts = 0
    }

    this.eventSource.onmessage = (event) => {
      try {
        const data: StreamEvent = JSON.parse(event.data)
        // Debug: Log all events to help identify the echo issue
        logger.debug('📨 Received event:', data.type, data.properties)
        this.handleEvent(data)
      } catch (error) {
        logger.error('Failed to parse event data:', error)
      }
    }

    this.eventSource.onerror = (error) => {
      logger.error('EventSource error:', error)
      this.handleReconnect()
    }
  }

  // Disconnect from the event stream
  disconnect(): void {
    if (this.eventSource) {
      this.eventSource.close()
      this.eventSource = null
    }
    this.listeners.clear()
    this.reconnectAttempts = 0
  }

  // Subscribe to specific event types
  subscribe<T = unknown>(eventType: string, callback: EventListener<T>): () => void {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, [])
    }
    
    this.listeners.get(eventType)!.push(callback as EventListener)
    // console.log(`🔔 Subscribed to '${eventType}' (${this.listeners.get(eventType)!.length} listeners)`)

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(eventType)
      if (callbacks) {
        const index = callbacks.indexOf(callback as EventListener)
        if (index > -1) {
          callbacks.splice(index, 1)
          // console.log(`🔕 Unsubscribed from '${eventType}' (${callbacks.length} listeners remaining)`)
        }
      }
    }
  }

  // Handle incoming events
  private handleEvent(event: StreamEvent): void {
    const callbacks = this.listeners.get(event.type)
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(event.properties)
        } catch (error) {
          logger.error(`Error in event callback for ${event.type}:`, error)
        }
      })
    }
  }

  // Handle reconnection logic
  private handleReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      logger.error('Max reconnection attempts reached')
      return
    }

    this.reconnectAttempts++
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1)

    logger.info(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`)
    
    setTimeout(() => {
      this.connect()
    }, delay)
  }

  // Get connection state
  get isConnected(): boolean {
    return this.eventSource?.readyState === EventSource.OPEN
  }

  get connectionState(): number {
    return this.eventSource?.readyState ?? EventSource.CLOSED
  }

  // Debug methods
  getDebugInfo() {
    return {
      isConnected: this.isConnected,
      connectionState: this.connectionState,
      url: this.eventSource?.url,
      listeners: Object.fromEntries(
        Array.from(this.listeners.entries()).map(([key, callbacks]) => [
          key, 
          callbacks.length
        ])
      ),
      reconnectAttempts: this.reconnectAttempts
    }
  }
}

// Functional API for event streaming
export const createEventStream = (baseUrl?: string): EventStreamService => {
  return new EventStreamService(baseUrl)
}

// Hook-friendly event stream utilities
export const subscribeToMessageUpdates = (
  eventStream: EventStreamService,
  callback: EventListener
) => {
  return eventStream.subscribe('message.updated', callback)
}

export const subscribeToMessagePartUpdates = (
  eventStream: EventStreamService,
  callback: EventListener
) => {
  return eventStream.subscribe('message.part.updated', callback)
}

export const subscribeToSessionErrors = (
  eventStream: EventStreamService,
  callback: EventListener
) => {
  return eventStream.subscribe('session.error', callback)
}

export const subscribeToSessionIdle = (
  eventStream: EventStreamService,
  callback: EventListener
) => {
  return eventStream.subscribe('session.idle', callback)
}

// Default export
export default EventStreamService