//@ts-nocheck
"use client"

import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from "react"
import { debounce } from "lodash"
import {
  Bodies,
  Body,
  Engine,
  Events,
  Mouse,
  MouseConstraint,
  Render,
  Runner,
  World,
} from "matter-js"

import { cn } from "@marketing/lib/utils"

// ─── Types ────────────────────────────────────────────────────────────────────

export type AttractionRef = {
  start: () => void
  stop: () => void
  reset: () => void
  shake: (force?: number) => void
}

export type CollisionEvent = {
  elements: [HTMLElement, HTMLElement]
  pair: Matter.ICollisionPair
}

type AttractionProps = {
  children: React.ReactNode
  gravity?: { x: number; y: number }
  gravityScale?: number
  timeScale?: number
  enableSleep?: boolean
  autoStart?: boolean
  friction?: number
  frictionAir?: number
  restitution?: number
  draggable?: boolean
  dragStiffness?: number
  onReady?: () => void
  onCollision?: (event: CollisionEvent) => void
  className?: string
}

// ─── Component ────────────────────────────────────────────────────────────────

const Attraction = forwardRef<AttractionRef, AttractionProps>(
  (
    {
      children,
      gravity = { x: 0, y: 1 },
      gravityScale = 1,
      timeScale = 1,
      enableSleep = false,
      autoStart = true,
      friction = 1,
      frictionAir = 0.01,
      restitution = 0.5,
      draggable = true,
      dragStiffness = 0.5,
      onReady,
      onCollision,
      className,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null)
    const engine = useRef(Engine.create())
    const runner = useRef<Runner | null>(null)
    const render = useRef<Render | null>(null)
    const bodies = useRef<{ el: HTMLElement; body: Matter.Body }[]>([])
    const animationFrame = useRef<number | null>(null)

    const onReadyRef = useRef(onReady)
    const onCollisionRef = useRef(onCollision)
    useEffect(() => {
      onReadyRef.current = onReady
    }, [onReady])
    useEffect(() => {
      onCollisionRef.current = onCollision
    }, [onCollision])

    const dataNum = (el, key, fallback) => {
      const v = el.dataset[key]
      return v !== undefined ? parseFloat(v) : fallback
    }

    const parsePos = (value, size) => {
      if (!value) return Math.random() * size
      if (value.includes("%")) return (parseFloat(value) / 100) * size
      return parseFloat(value)
    }

    const init = () => {
      if (!containerRef.current) return

      const width = containerRef.current.offsetWidth
      const height = containerRef.current.offsetHeight

      engine.current.gravity.x = gravity.x * gravityScale
      engine.current.gravity.y = gravity.y * gravityScale
      engine.current.timing.timeScale = timeScale
      engine.current.enableSleeping = enableSleep

      render.current = Render.create({
        element: containerRef.current,
        engine: engine.current,
        options: {
          width,
          height,
          wireframes: false,
          background: "transparent",
        },
      })
      render.current.canvas.style.pointerEvents = "none"
      render.current.canvas.style.display = "none"

      const isMobile = window.innerWidth < 768
      const mouse = Mouse.create(containerRef.current)
      const mouseConstraint = MouseConstraint.create(engine.current, {
        mouse,
        constraint: {
          stiffness: !draggable || isMobile ? 0 : dragStiffness,
          render: { visible: false },
        },
      })
      World.add(engine.current.world, mouseConstraint)

      const walls = [
        Bodies.rectangle(width / 2, height + 20, width, 40, { isStatic: true }),
        Bodies.rectangle(width + 20, height / 2, 40, height, {
          isStatic: true,
        }),
        Bodies.rectangle(-20, height / 2, 40, height, { isStatic: true }),
        Bodies.rectangle(width / 2, -20, width, 40, { isStatic: true }),
      ]
      World.add(engine.current.world, walls)

      const items = containerRef.current.querySelectorAll(
        "[data-physics-item]"
      )
      const containerRect = containerRef.current.getBoundingClientRect()

      items.forEach((el) => {
        const rect = el.getBoundingClientRect()

        const x = parsePos(el.dataset.x, containerRect.width)
        const y = parsePos(el.dataset.y, containerRect.height)
        const angle = el.dataset.angle
          ? (parseFloat(el.dataset.angle) * Math.PI) / 180
          : 0

        const bodyFriction = dataNum(el, "friction", friction)
        const bodyFrictionAir = dataNum(el, "frictionAir", frictionAir)
        const bodyRestitution = dataNum(el, "restitution", restitution)
        const bodyMass = el.dataset.mass
          ? parseFloat(el.dataset.mass)
          : undefined
        const isStatic = el.dataset.static === "true"

        const shape = el.dataset.shape ?? "rectangle"

        let body

        if (shape === "circle") {
          const radius = Math.min(rect.width, rect.height) / 2
          body = Bodies.circle(x, y, radius, {
            friction: bodyFriction,
            frictionAir: bodyFrictionAir,
            restitution: bodyRestitution,
            isStatic,
            angle,
          })
        } else {
          body = Bodies.rectangle(x, y, rect.width, rect.height, {
            friction: bodyFriction,
            frictionAir: bodyFrictionAir,
            restitution: bodyRestitution,
            isStatic,
            angle,
          })
        }

        if (bodyMass !== undefined) Body.setMass(body, bodyMass)

        World.add(engine.current.world, body)
        body.home = { x, y }
        body.lastTouched = performance.now()
        bodies.current.push({ el, body })
      })

      if (onCollisionRef.current) {
        Events.on(engine.current, "collisionStart", (event) => {
          if (!onCollisionRef.current) return
          event.pairs.forEach((pair) => {
            const a = bodies.current.find((b) => b.body === pair.bodyA)
            const b = bodies.current.find((b) => b.body === pair.bodyB)
            if (a && b) {
              onCollisionRef.current({
                elements: [a.el, b.el],
                pair,
              })
            }
          })
        })
      }

      // ── Premium feel: hover magnetic pull + auto-return home after idle ──
      const HOVER_RADIUS = 240 // px — only logos within this drift toward the cursor
      const HOVER_FORCE = 0.0009 // strength of the magnetic pull
      const RETURN_DELAY = 5000 // ms of stillness before a logo floats home
      const RETURN_EASE = 0.008 // how briskly it glides back (0–1)
      let prevMouse = { x: -9999, y: -9999 }
      let stillTicks = 0

      Events.on(engine.current, "beforeUpdate", () => {
        const now = performance.now()
        const m = mouse.position
        const moved =
          Math.hypot(m.x - prevMouse.x, m.y - prevMouse.y) > 0.5
        prevMouse = { x: m.x, y: m.y }
        stillTicks = moved ? 0 : stillTicks + 1
        const overContainer =
          m.x > 0 && m.x < width && m.y > 0 && m.y < height
        const hoverActive = overContainer && stillTicks < 8
        const dragged = mouseConstraint.body

        bodies.current.forEach(({ body }) => {
          // currently being dragged → reset its idle timer, let physics handle it
          if (body === dragged) {
            body.lastTouched = now
            return
          }

          // 1) magnetic pull toward the moving cursor when it's nearby
          if (hoverActive) {
            const dx = m.x - body.position.x
            const dy = m.y - body.position.y
            const dist = Math.hypot(dx, dy)
            if (dist < HOVER_RADIUS && dist > 4) {
              const falloff = 1 - dist / HOVER_RADIUS
              Body.applyForce(body, body.position, {
                x: (dx / dist) * HOVER_FORCE * falloff * body.mass,
                y: (dy / dist) * HOVER_FORCE * falloff * body.mass,
              })
              body.lastTouched = now
            }
          }

          // 2) float back to home spot after sitting idle for RETURN_DELAY
          const home = body.home
          const last = body.lastTouched ?? now
          if (home && now - last > RETURN_DELAY) {
            const toX = home.x - body.position.x
            const toY = home.y - body.position.y
            if (Math.hypot(toX, toY) > 1) {
              Body.setVelocity(body, {
                x: body.velocity.x * 0.9 + toX * RETURN_EASE,
                y: body.velocity.y * 0.9 + toY * RETURN_EASE,
              })
            }
          }
        })
      })

      runner.current = Runner.create()
      if (autoStart) {
        Runner.run(runner.current, engine.current)
        Render.run(render.current)
      }

      const update = () => {
        bodies.current.forEach(({ el, body }) => {
          const { x, y } = body.position
          const rotation = body.angle * (180 / Math.PI)
          el.style.transform = `translate(${x - el.offsetWidth / 2}px, ${
            y - el.offsetHeight / 2
          }px) rotate(${rotation}deg)`
        })
        animationFrame.current = requestAnimationFrame(update)
      }
      update()

      onReadyRef.current?.()
    }

    const clear = () => {
      if (animationFrame.current) cancelAnimationFrame(animationFrame.current)
      if (runner.current) Runner.stop(runner.current)
      if (render.current) {
        Render.stop(render.current)
        render.current.canvas.remove()
      }
      Events.off(engine.current, "collisionStart")
      Events.off(engine.current, "beforeUpdate")
      World.clear(engine.current.world, false)
      Engine.clear(engine.current)
      bodies.current = []
    }

    useImperativeHandle(ref, () => ({
      start: () => {
        if (runner.current) Runner.run(runner.current, engine.current)
        if (render.current) Render.run(render.current)
      },
      stop: () => {
        if (runner.current) Runner.stop(runner.current)
      },
      reset: () => {
        clear()
        init()
      },
      shake: (force = 0.05) => {
        bodies.current.forEach(({ body }) => {
          if (body.isStatic) return
          Body.applyForce(body, body.position, {
            x: (Math.random() - 0.5) * force,
            y: (Math.random() - 0.5) * force,
          })
        })
      },
    }))

    useEffect(() => {
      init()

      const handleResize = debounce(() => {
        clear()
        init()
      }, 400)

      window.addEventListener("resize", handleResize)
      return () => {
        window.removeEventListener("resize", handleResize)
        clear()
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    useEffect(() => {
      engine.current.gravity.x = gravity.x * gravityScale
      engine.current.gravity.y = gravity.y * gravityScale
    }, [gravity.x, gravity.y, gravityScale])

    useEffect(() => {
      engine.current.timing.timeScale = timeScale
    }, [timeScale])

    useEffect(() => {
      engine.current.enableSleeping = enableSleep
    }, [enableSleep])

    return (
      <div
        ref={containerRef}
        className={cn(
          "pointer-events-none absolute inset-0 select-none",
          className
        )}
      >
        {React.Children.map(children, (child) => {
          if (!React.isValidElement(child)) return child
          const childProps = child.props as Record<string, unknown>
          const dataProps = Object.fromEntries(
            Object.entries(childProps).filter(([k]) => k.startsWith("data-"))
          )
          return (
            <div
              data-physics-item
              {...dataProps}
              className="pointer-events-auto absolute cursor-grab"
            >
              {child}
            </div>
          )
        })}
      </div>
    )
  }
)

Attraction.displayName = "Attraction"
export { Attraction }
export type { AttractionProps }
