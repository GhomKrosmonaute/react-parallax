import React from "react"
import { cn } from "./utils"

interface ParallaxDirection {
  x: `${number}%` | `${number}px`
  y: `${number}%` | `${number}px`
}

interface ParallaxState {
  hovered: boolean
  focusedLayer: number
  direction: ParallaxDirection
  localMousePos: {
    x: number
    y: number
  }
}

interface ParallaxLayerState {
  index: number
  scale: number
  focused: boolean
  hovered: boolean
}

interface ParallaxLayerProps {
  parentState: ParallaxState
  content: React.ReactNode
  scale: number
  index: number
  autoFocus?: "hover" | ParallaxAutoFocusOptions
  setFocusedLayer: React.Dispatch<React.SetStateAction<number>>
}

type ParallaxLayerOptions = Omit<
  ParallaxLayerProps,
  "parentState" | "index" | "setFocusedLayer" | "autoFocus"
>

interface ParallaxOptions {
  defaultFocusedLayer?: number
  focusedLayer?: number
  direction?: ParallaxDirection
  autoDirection?: "mouse"
  autoFocus?: "hover" | "scroll" | ParallaxAutoFocusOptions
  minScale?: number
  maxScale?: number
}

interface ParallaxAutoFocusOptions {
  fromParent?: (state: ParallaxState) => number
  fromLayer?: (state: ParallaxLayerState) => boolean
}

const defaultOptions: ParallaxOptions = {
  minScale: 1,
  maxScale: 1.5,
  autoFocus: "scroll",
  autoDirection: "mouse",
}

export function Parallax({
  className,
  style,
  children,
  options,
}: {
  className?: string
  style?: React.CSSProperties
  children: ParallaxLayerOptions[]
  options?: ParallaxOptions
}) {
  const ref = React.useRef<HTMLDivElement>(null)

  const [hovered, setHovered] = React.useState<boolean>(false)
  const [localMousePos, setLocalMousePos] = React.useState({ x: 0, y: 0 })
  const [focusedLayer, setFocusedLayer] = React.useState<number>(0)
  const [direction, setDirection] = React.useState<ParallaxDirection>()

  const _options = options ?? defaultOptions

  const handleMouseMove: React.MouseEventHandler<HTMLDivElement> = (event) => {
    if (_options.autoDirection === "mouse") {
      // 👇 Get mouse position relative to element
      const target = event.target as HTMLDivElement
      const localX = event.clientX - target.offsetLeft
      const localY = event.clientY - target.offsetTop

      setLocalMousePos({ x: localX, y: localY })
    }
  }

  const handleScroll: React.WheelEventHandler<HTMLDivElement> = (event) => {
    if (_options.autoFocus === "scroll") {
      if (event.deltaY < 0) {
        setFocusedLayer(Math.min(4, focusedLayer + 1))
      } else {
        setFocusedLayer(Math.max(0, focusedLayer - 1))
      }
    }
  }

  // watch focusedLayer
  React.useEffect(() => {
    if (
      typeof _options.autoFocus === "object" &&
      _options.autoFocus.fromParent
    ) {
      setFocusedLayer(
        _options.autoFocus.fromParent({
          focusedLayer,
          direction,
          localMousePos,
          hovered,
        }),
      )
    }
  }, [_options.autoFocus, focusedLayer, direction, localMousePos, hovered])

  // watch direction
  React.useEffect(() => {
    if (_options.autoDirection === "mouse") {
      setDirection({
        x: `${(localMousePos.x / ref.current.clientWidth) * 100}%`,
        y: `${(localMousePos.y / ref.current.clientHeight) * 100}%`,
      })
    }
  }, [_options.autoDirection, localMousePos])

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      ref={ref}
      style={style}
      onMouseMove={handleMouseMove}
      onWheel={handleScroll}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {children.map((child, index) => (
        <ParallaxLayer
          {...child}
          index={index}
          setFocusedLayer={setFocusedLayer}
          parentState={{
            hovered,
            direction,
            focusedLayer,
            localMousePos,
          }}
        />
      ))}
    </div>
  )
}

export function ParallaxLayer({
  index,
  scale,
  content,
  autoFocus,
  parentState,
  setFocusedLayer,
}: ParallaxLayerProps) {
  const ref = React.useRef<HTMLDivElement>(null)

  const [blur, setBlur] = React.useState<number>(0)
  const [focused, setFocused] = React.useState<boolean>(false)
  const [hovered, setHovered] = React.useState<boolean>(false)
  const [translateX, setTranslateX] = React.useState<string>("0")
  const [translateY, setTranslateY] = React.useState<string>("0")

  // watch focused
  React.useEffect(() => {
    setFocused(parentState.focusedLayer === index)
  }, [parentState.focusedLayer, index])

  // watch focused layer
  React.useEffect(() => {
    if (typeof autoFocus === "object" && autoFocus.fromLayer) {
      setFocusedLayer(
        autoFocus.fromLayer({
          index,
          scale,
          focused,
          hovered,
        }),
      )
    }
  }, [autoFocus, parentState.focusedLayer, index, scale])

  // watch blur (focused = 0, unfocused = index distance)
  React.useEffect(() => {
    if (parentState.hovered && parentState.focusedLayer !== index) {
      setBlur(Math.abs(index - parentState.focusedLayer))
    }
  }, [index, parentState.focusedLayer])

  // watch translations
  React.useEffect(() => {
    if (parentState.hovered && parentState.direction) {
      setTranslateX(parentState.direction.x)
      setTranslateY(parentState.direction.y)
    }
  }, [parentState.direction, parentState.hovered])

  return (
    <div
      ref={ref}
      key={index}
      style={{
        width: "100%",
        height: "100%",
        transition: "filter 0.2s ease, transform 0.1s ease",
        zIndex: -index + 10,
        transformOrigin: "center center",
        filter: parentState.hovered ? "none" : `blur(${blur}px)`,
        transform: `translate(${translateX}, ${translateY}px) scale(${hovered ? scale : 1})`,
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {content}
    </div>
  )
}
