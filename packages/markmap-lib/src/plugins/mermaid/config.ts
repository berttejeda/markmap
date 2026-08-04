import { buildJSItem, JSItem } from 'markmap-common';

export const name = 'mermaid';

const preloadScripts = [
  `mermaid@${__define__.MERMAID_VERSION}/dist/mermaid.min.js`,
].map((path) => buildJSItem(path));

export const config = {
  versions: {
    mermaid: __define__.MERMAID_VERSION || '',
  },
  preloadScripts,
  scripts: [
    // Include mermaid.js in scripts so it gets fetched for offline use
    ...preloadScripts,
    {
      type: 'iife',
      data: {
        fn: (getMarkmap: () => typeof import('markmap-view')) => {
          const styleId = 'markmap-mermaid-css';
          if (!document.getElementById(styleId)) {
            const style = document.createElement('style');
            style.id = styleId;
            style.textContent = `
.mermaid {
  transform-origin: top left;
  border: 1px solid #777;
  padding: 1em;
}
.mermaid svg {
  max-width: 100%;
  height: auto;
}
.mermaid .edge-pattern-solid,
.mermaid .flowchart-link {
  stroke-width: 2px !important;
}
`;
            document.head.appendChild(style);
          }

          const refresh = () => {
            try {
              getMarkmap().refreshHook.call();
            } catch {
              // ignore
            }
          };

          const runMermaid = () => {
            const { mermaid } = window as any;
            if (!mermaid) return;

            // Initialize mermaid with user config from frontmatter or defaults
            try {
              const userConfig = (window as any).__mermaidConfig || {};
              const defaults = {
                startOnLoad: false,
                theme: 'default' as const,
                themeVariables: { lineColor: '#333' },
                flowchart: { curve: 'basis' },
              };
              const initConfig = {
                ...defaults,
                ...userConfig,
                themeVariables: {
                  ...defaults.themeVariables,
                  ...(userConfig.themeVariables || {}),
                },
              };
              mermaid.initialize(initConfig);
            } catch (e) {
              console.debug('Mermaid initialization:', e);
            }

            const svg = document.querySelector('svg#mindmap');
            if (!svg) return;

            const mermaidEls = Array.from(svg.querySelectorAll('.mermaid'));
            const renderPromises: Promise<void>[] = [];
            mermaidEls.forEach((el: Element) => {
              if (el.textContent && !el.querySelector('svg')) {
                if (typeof mermaid.render === 'function') {
                  const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
                  const promise = mermaid
                    .render(id, el.textContent)
                    .then(({ svg: renderedSvg }: { svg: string }) => {
                      el.innerHTML = renderedSvg;
                    })
                    .catch((err: any) => {
                      console.warn('Mermaid rendering error:', err);
                    });
                  renderPromises.push(promise);
                } else if (typeof mermaid.run === 'function') {
                  const promise = mermaid
                    .run({
                      querySelector: null,
                      nodes: [el],
                    })
                    .catch((err: any) => {
                      console.warn('Mermaid rendering error:', err);
                    });
                  renderPromises.push(promise);
                } else if (typeof mermaid.init === 'function') {
                  mermaid.init(undefined, el);
                }
              }
            });

            if (renderPromises.length > 0) {
              Promise.all(renderPromises).then(() => {
                refresh();
              });
            }
          };

          const setupObserver = () => {
            const svg = document.querySelector('svg#mindmap');
            if (!svg) return;

            const observer = new MutationObserver((mutationsList) => {
              let shouldRender = false;
              for (const mutation of mutationsList) {
                if (
                  mutation.type === 'childList' &&
                  mutation.addedNodes.length > 0
                ) {
                  for (let i = 0; i < mutation.addedNodes.length; i++) {
                    const node = mutation.addedNodes[i];
                    if (node.nodeType === 1) {
                      const el = node as Element;
                      if (
                        el.classList?.contains('mermaid') ||
                        el.querySelector?.('.mermaid')
                      ) {
                        shouldRender = true;
                        break;
                      }
                    }
                  }
                }
                if (shouldRender) break;
              }

              if (shouldRender) {
                runMermaid();
              }
            });

            observer.observe(svg, { childList: true, subtree: true });
          };

          // Wait for both mermaid and markmap to be ready
          const checkReady = () => {
            const { mermaid } = window as any;
            const svg = document.querySelector('svg#mindmap');
            if (mermaid && svg) {
              runMermaid();
              setupObserver();
            } else {
              setTimeout(checkReady, 100);
            }
          };

          checkReady();
        },
        getParams({ getMarkmap }) {
          return [getMarkmap];
        },
      },
    },
  ] as JSItem[],
};
