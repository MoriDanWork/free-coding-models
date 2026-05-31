/**
 * @file web/src/hooks/useSocket.js
 * @description Socket.IO hook for real-time model data + ping timer state.
 * 📖 Connects to backend server URL, auto-reconnects with websocket+polling fallback.
 * → useSocket(serverUrl)
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import { io } from 'socket.io-client'

export function useSocket(serverUrl = 'http://localhost:3333') {
  const [models, setModels] = useState([])
  const [connected, setConnected] = useState(false)
  const [updateCount, setUpdateCount] = useState(0)
  // ── Ping timer state ──
  const [nextPingAt, setNextPingAt] = useState(null)
  const [isPinging, setIsPinging] = useState(false)
  const [pingMode, setPingMode] = useState('speed')
  // ── Global benchmark state (Ctrl+U equivalent) ──
  const [globalBenchmarkRunning, setGlobalBenchmarkRunning] = useState(false)
  const [globalBenchmarkTotal, setGlobalBenchmarkTotal] = useState(0)
  const [globalBenchmarkCompleted, setGlobalBenchmarkCompleted] = useState(0)
  const socketRef = useRef(null)
  const pingTimerRef = useRef(null)

  const connect = useCallback(() => {
    if (socketRef.current) socketRef.current.disconnect()

    const socket = io(serverUrl, {
      transports: ['polling', 'websocket'],
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    })
    socketRef.current = socket

    socket.on('connect', () => {
      setConnected(true)
    })
    socket.on('disconnect', () => {
      setConnected(false)
    })
    socket.on('connect_error', () => {
      setConnected(false)
    })

    socket.on('models:update', (data) => {
      if (!data) return
      if (Array.isArray(data)) {
        // Legacy flat array format
        setModels(data)
        setUpdateCount(c => c + 1)
      } else if (data.models) {
        // New wrapped format: { pingMode, nextPingAt, isPinging, models }
        setPingMode(data.pingMode ?? 'speed')
        setNextPingAt(data.nextPingAt ?? null)
        setIsPinging(data.isPinging ?? false)
        setGlobalBenchmarkRunning(data.globalBenchmarkRunning ?? false)
        setGlobalBenchmarkTotal(data.globalBenchmarkTotal ?? 0)
        setGlobalBenchmarkCompleted(data.globalBenchmarkCompleted ?? 0)
        setModels(data.models ?? [])
        setUpdateCount(c => c + 1)
      }
    })
  }, [serverUrl])

  // ── Local countdown ticker (updates every second) ──
  useEffect(() => {
    if (pingTimerRef.current) clearInterval(pingTimerRef.current)
    pingTimerRef.current = setInterval(() => {
      setNextPingAt(prev => {
        if (prev == null) return prev
        const remaining = prev - Date.now()
        if (remaining <= 0) {
          setIsPinging(true)
          return null  // cleared — refreshed on next models:update
        }
        return prev
      })
    }, 1000)
    return () => clearInterval(pingTimerRef.current)
  }, [])

  useEffect(() => {
    connect()
    return () => {
      socketRef.current?.disconnect()
    }
  }, [connect])

  return { models, connected, updateCount, nextPingAt, isPinging, pingMode, globalBenchmarkRunning, globalBenchmarkTotal, globalBenchmarkCompleted }
}