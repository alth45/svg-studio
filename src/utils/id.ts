import { state } from '../core/state';
export const uid = () => `el_${state.nextId++}`;