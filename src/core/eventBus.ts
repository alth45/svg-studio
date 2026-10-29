type Handler = (data?: any) => void;

class EventBus {
  private handlers = new Map<string, Set<Handler>>();
  on(evt: string, fn: Handler) {
    if (!this.handlers.has(evt)) this.handlers.set(evt, new Set());
    this.handlers.get(evt)!.add(fn);
    return () => this.off(evt, fn);
  }
  off(evt: string, fn: Handler) { this.handlers.get(evt)?.delete(fn); }
  emit(evt: string, data?: any) { this.handlers.get(evt)?.forEach(fn => fn(data)); }
}

export const bus = new EventBus();
export const EVT = {
  STATE_CHANGED: 'state:changed',
  SELECTION_CHANGED: 'selection:changed',
  TOOL_CHANGED: 'tool:changed',
  ZOOM_CHANGED: 'zoom:changed',
};