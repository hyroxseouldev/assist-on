import * as React from "react"

import { cn } from "@/lib/utils"

const cardTones = {
  "default": "",
  "problem": "border-warning-line/80 bg-white/95",
  "solution": "border-info-border-soft/80 bg-white/95",
  "value": "border-success-line/80 bg-white/95",
  "outcome": "border-feature-line/80 bg-white/95"
} as const

function Card({
  className,
  tone = "default",
  radius = "default",
  ...props
}: React.ComponentProps<"div"> & {
  tone?: keyof typeof cardTones
  radius?: "default" | "panel"
}) {
  return (
    <div
      data-slot="card"
      className={cn(
        "bg-card text-card-foreground flex flex-col gap-6 rounded-xl border py-6 shadow-sm",
        cardTones[tone],
        radius === "panel" && "rounded-panel",
        className
      )}
      {...props}
    />
  )
}

function NonBorderCard({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="non-border-card"
      className={cn(
        "text-card-foreground flex flex-col gap-6 rounded-xl border-none bg-transparent py-6 shadow-none",
        className
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-header"
      className={cn(
        "@container/card-header grid auto-rows-min grid-rows-[auto_auto] items-start gap-2 px-6 has-data-[slot=card-action]:grid-cols-[1fr_auto] [.border-b]:pb-6",
        className
      )}
      {...props}
    />
  )
}

function CardTitle({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-title"
      className={cn("leading-none font-semibold", className)}
      {...props}
    />
  )
}

function CardDescription({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-description"
      className={cn("text-muted-foreground text-sm", className)}
      {...props}
    />
  )
}

function CardAction({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-action"
      className={cn(
        "col-start-2 row-span-2 row-start-1 self-start justify-self-end",
        className
      )}
      {...props}
    />
  )
}

function CardContent({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
}

function CardFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6 [.border-t]:pt-6", className)}
      {...props}
    />
  )
}

export {
  Card,
  NonBorderCard,
  CardHeader,
  CardFooter,
  CardTitle,
  CardAction,
  CardDescription,
  CardContent,
}
