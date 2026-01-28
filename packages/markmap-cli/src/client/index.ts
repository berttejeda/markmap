import type { INode } from 'markmap-common';
import type { ITransformResult } from 'markmap-lib';
import { IFileState } from '../types';

const { mm, markmap } = window;
const { cliOptions } = markmap;
const key = new URLSearchParams(window.location.search).get('key') || '';

const state: IFileState = {
  content: {
    ts: 0,
    value: undefined,
  },
  line: {
    ts: 0,
    value: 0,
  },
};
const activeNodeOptions: {
  placement?: 'center' | 'visible';
} = {};

const highlightEl = document.createElement('div');
highlightEl.className = 'markmap-highlight-area';

checkData();

async function checkData() {
  try {
    const query = new URLSearchParams(
      [
        ['key', key],
        ['content', state.content.ts],
        ['line', state.line.ts],
      ].map((pair) => pair.map((s) => `${s}`)),
    );
    const resp = await fetch(`/~data?${query}`);
    if (!resp.ok)
      throw {
        status: resp.status,
      };
    const res = (await resp.json()) as IFileState;
    if (res.content) {
      const value = res.content.value as ITransformResult;
      mm.setOptions(markmap.deriveOptions(value.frontmatter?.markmap));
      await mm.setData(value.root);
      if (!state.content.ts) await mm.fit();
      // Render mermaid diagrams after markmap data is set
      renderMermaidDiagrams();
    }
    Object.assign(state, res);
    if (res.line && state.content.value) {
      await setCursor({ line: res.line.value as number });
    }
    setTimeout(checkData);
  } catch (err) {
    if ((err as { status: number }).status !== 404) {
      setTimeout(checkData, 1000);
    }
  }
}

function findActiveNode({
  line,
  autoExpand = true,
}: {
  line: number;
  autoExpand?: boolean;
}) {
  function dfs(node: INode, ancestors: INode[] = []) {
    const [start, end] =
      (node.payload?.lines as string)?.split(',').map((s) => +s) || [];
    if (start >= 0 && start <= line && line < end) {
      best = node;
      bestAncestors = ancestors;
    }
    ancestors = [...ancestors, node];
    node.children?.forEach((child) => {
      dfs(child, ancestors);
    });
  }
  let best: INode | undefined;
  let bestAncestors: INode[] = [];
  dfs((state.content.value as ITransformResult).root as INode);
  if (autoExpand) {
    bestAncestors.forEach((node) => {
      if (node.payload?.fold) {
        node.payload.fold = 0;
      }
    });
  }
  return best;
}

async function setCursor(options: { line: number; autoExpand?: boolean }) {
  if (!state.content.value) return;
  const node = findActiveNode(options);
  await highlightNode(node);
}

async function highlightNode(node?: INode) {
  await mm.setHighlight(node);
  if (!node) return;
  await mm[
    activeNodeOptions.placement === 'center' ? 'centerNode' : 'ensureVisible'
  ](node, {
    bottom: cliOptions.toolbar ? 80 : 0,
  });
}

function renderMermaidDiagrams() {
  console.log('[Mermaid] renderMermaidDiagrams called');
  // Wait for mermaid to be available
  const checkMermaid = () => {
    const { mermaid } = window as any;
    if (!mermaid) {
      console.log('[Mermaid] mermaid.js not loaded yet, retrying...');
      // Retry after a short delay if mermaid isn't loaded yet
      setTimeout(checkMermaid, 100);
      return;
    }
    console.log('[Mermaid] mermaid.js is loaded');

    // Find all mermaid divs in the SVG foreignObjects
    const svg = document.querySelector('svg#mindmap');
    if (!svg) {
      // SVG might not be ready yet, retry
      setTimeout(checkMermaid, 100);
      return;
    }

    const mermaidDivs = Array.from(svg.querySelectorAll('.mermaid'));
    console.log('[Mermaid] Found', mermaidDivs.length, 'mermaid divs in SVG');

    // Also check the entire document
    const allMermaidDivs = Array.from(document.querySelectorAll('.mermaid'));
    console.log(
      '[Mermaid] Found',
      allMermaidDivs.length,
      'mermaid divs in entire document',
    );

    // Check what's actually in the SVG
    const foreignObjects = Array.from(svg.querySelectorAll('foreignObject'));
    console.log(
      '[Mermaid] Found',
      foreignObjects.length,
      'foreignObject elements',
    );
    foreignObjects.forEach((fo, idx) => {
      const html = fo.innerHTML;
      if (html.includes('mermaid')) {
        console.log(
          `[Mermaid] foreignObject ${idx} contains mermaid:`,
          html.substring(0, 200),
        );
      }
    });

    if (mermaidDivs.length === 0) {
      console.log('[Mermaid] No mermaid divs found in SVG');
      return;
    }

    // Initialize mermaid if not already initialized
    try {
      if (!mermaid.initialized) {
        mermaid.initialize({
          startOnLoad: false,
          theme: 'default',
        });
      }
    } catch (e) {
      // mermaid might already be initialized
      console.debug('Mermaid initialization:', e);
    }

    // Render all mermaid diagrams that haven't been rendered yet
    const renderPromises: Promise<any>[] = [];
    mermaidDivs.forEach((div: Element, index: number) => {
      if (div.textContent && !div.querySelector('svg')) {
        // Only render if not already rendered
        console.log(
          `[Mermaid] Rendering diagram ${index + 1}:`,
          div.textContent.substring(0, 50),
        );
        if (typeof mermaid.run === 'function') {
          // mermaid v10+ API
          const promise = mermaid
            .run({
              querySelector: null,
              nodes: [div],
            })
            .then(() => {
              console.log(
                `[Mermaid] Successfully rendered diagram ${index + 1}`,
              );
            })
            .catch((err: any) => {
              console.warn(
                `[Mermaid] Rendering error for diagram ${index + 1}:`,
                err,
              );
            });
          renderPromises.push(promise);
        } else if (typeof mermaid.contentLoaded === 'function') {
          // Older API
          mermaid.contentLoaded();
        } else if (typeof mermaid.init === 'function') {
          // Even older API
          mermaid.init(undefined, div);
        }
      }
    });

    if (renderPromises.length > 0) {
      Promise.all(renderPromises).then(() => {
        // Refresh markmap after mermaid diagrams are rendered
        if (mm && mm.refreshHook) {
          mm.refreshHook.call();
        }
      });
    }
  };

  // Start checking
  checkMermaid();
}
