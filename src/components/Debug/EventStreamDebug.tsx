import { useState, useEffect } from 'react'
import type { EventStreamService } from '../../services/eventStream'

interface EventStreamDebugProps {
  eventStream: EventStreamService
}

export const EventStreamDebug = ({ eventStream }: EventStreamDebugProps) => {
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [events, setEvents] = useState<any[]>([])

  useEffect(() => {
    // Update debug info every second
    const interval = setInterval(() => {
      setDebugInfo(eventStream.getDebugInfo())
    }, 1000)

    // Subscribe to all events for debugging
    const unsubscribes = [
      eventStream.subscribe('message.updated', (data) => {
        setEvents(prev => [...prev.slice(-9), { type: 'message.updated', data, time: Date.now() }])
      }),
      eventStream.subscribe('message.part.updated', (data) => {
        setEvents(prev => [...prev.slice(-9), { type: 'message.part.updated', data, time: Date.now() }])
      }),
      eventStream.subscribe('session.error', (data) => {
        setEvents(prev => [...prev.slice(-9), { type: 'session.error', data, time: Date.now() }])
      }),
      eventStream.subscribe('session.idle', (data) => {
        setEvents(prev => [...prev.slice(-9), { type: 'session.idle', data, time: Date.now() }])
      })
    ]

    return () => {
      clearInterval(interval)
      unsubscribes.forEach(unsub => unsub())
    }
  }, [eventStream])

  if (!import.meta.env.DEV) {
    return null // Only show in development
  }

  return (
    <div style={{
      position: 'fixed',
      top: 10,
      right: 10,
      background: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      borderRadius: '5px',
      fontSize: '12px',
      fontFamily: 'monospace',
      maxWidth: '300px',
      zIndex: 9999
    }}>
      <h4>EventStream Debug</h4>
      
      {debugInfo && (
        <div>
          <div>Status: {debugInfo.isConnected ? '🟢 Connected' : '🔴 Disconnected'}</div>
          <div>State: {debugInfo.connectionState}</div>
          <div>URL: {debugInfo.url}</div>
          <div>Listeners: {JSON.stringify(debugInfo.listeners)}</div>
          <div>Reconnects: {debugInfo.reconnectAttempts}</div>
        </div>
      )}

      <h5>Recent Events:</h5>
      <div style={{ maxHeight: '200px', overflow: 'auto' }}>
        {events.map((event, i) => (
          <div key={i} style={{ marginBottom: '5px', fontSize: '10px' }}>
            <div>{new Date(event.time).toLocaleTimeString()}</div>
            <div>{event.type}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default EventStreamDebug