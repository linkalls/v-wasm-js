/**
 * V-Signal Event Delegation System
 *
 * Instead of attaching event listeners to every element, we attach a single listener
 * to the document root for each event type. When an event occurs, we traverse the
 * DOM tree upwards from the target to find elements that have handlers registered.
 */

// Symbol to store event handlers on DOM nodes
const HANDLERS = Symbol('v-handlers')

type EventHandler = (event: Event) => void
type HandlersMap = Record<string, EventHandler>

interface ElementWithHandlers extends Element {
  [HANDLERS]?: HandlersMap
}

// Track which event types we're already listening to globally
const attachedEvents = new Set<string>()

/**
 * Global event dispatcher
 * Traverses up the DOM tree executing handlers for the triggered event type
 */
function dispatchEvent(event: Event) {
  let target = event.target as Node | null
  const type = event.type

  // Bubble up to find handlers
  while (target && target !== document) {
    if (target instanceof Element) {
      const el = target as ElementWithHandlers
      const handlers = el[HANDLERS]

      if (handlers && handlers[type]) {
        handlers[type](event)

        // Stop propagation if requested (handled via standard event.stopPropagation() inside the handler)
        if (event.cancelBubble) {
          return
        }
      }
    }
    target = target.parentNode
  }
}

/**
 * Register an event handler for a specific element
 * This sets up the delegation if it hasn't been set up for this event type yet.
 */
export function addDelegatedEvent(
  element: Element,
  eventType: string,
  handler: EventHandler
): void {
  const el = element as ElementWithHandlers

  if (!el[HANDLERS]) {
    el[HANDLERS] = {}
  }

  el[HANDLERS]![eventType] = handler

  ensureGlobalListener(eventType)
}

/**
 * Ensure we have a global listener on the document for this event type
 */
function ensureGlobalListener(eventType: string) {
  if (!attachedEvents.has(eventType)) {
    // Capture phase for focus/blur, Bubble for others
    const capture = ['focus', 'blur'].includes(eventType)

    document.addEventListener(eventType, dispatchEvent, capture)
    attachedEvents.add(eventType)
  }
}

/**
 * Remove a specific event handler from an element
 * Note: We don't remove the global listener even if count drops to zero
 * to avoid thrashing listeners.
 */
export function removeDelegatedEvent(
  element: Element,
  eventType: string
): void {
  const el = element as ElementWithHandlers
  if (el[HANDLERS]) {
    delete el[HANDLERS]![eventType]
  }
}
