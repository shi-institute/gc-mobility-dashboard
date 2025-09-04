import Handles from '@arcgis/core/core/Handles.js';
import { useRef } from 'react';

/**
 * A hook for managing ArcGIS handles, with support for grouping handles by ID.
 *
 * This is useful for managing highlight handles, which need to be explicitly
 * removed to clear the highlight.
 */
export function useHighlightHandles() {
  const handles = useRef(new Handles());

  /**
   * Removes all highlight handles being tracked.
   */
  function removeAll() {
    handles.current.destroy();
    handles.current = new Handles();
  }

  /**
   * Adds handles to the tracked handles.
   *
   * If a groupId is provided, the handle(s) will be added to that group.
   * Otherwise, they will be added to the default group.
   */
  function add(toAdd: __esri.Handle | __esri.Handle[], groupId?: string) {
    handles.current.add(toAdd, groupId);
  }

  /**
   * Removes a named group of handles.
   */
  function remove(groupId: string) {
    handles.current.remove(groupId);
  }

  /**
   * Whether handles with the given group ID exist.
   */
  function has(groupId: string) {
    return handles.current.has(groupId);
  }

  return { add, remove, removeAll, has };
}
