import {
  IAssets,
  IPureNode,
  JSItem,
  UrlBuilder,
  buildJSItem,
  urlBuilder as defaultUrlBuilder,
  persistCSS,
  persistJS,
} from 'markmap-common';
import type { IMarkmapJSONOptions, IMarkmapOptions } from 'markmap-view';

export const template = __define__.TEMPLATE || '';

export const baseJsPaths = [
  `d3@${__define__.D3_VERSION}/dist/d3.min.js`,
  `markmap-view@${__define__.VIEW_VERSION}/dist/browser/index.js`,
];

export function fillTemplate(
  root: IPureNode | null,
  assets: IAssets,
  extra?: {
    baseJs?: JSItem[];
    jsonOptions?: Partial<IMarkmapJSONOptions>;
    getOptions?: (
      jsonOptions: Partial<IMarkmapJSONOptions>,
    ) => Partial<IMarkmapOptions>;
    /** See https://github.com/gera2ld/npm2url */
    urlBuilder?: UrlBuilder;
  },
): string {
  extra = {
    ...extra,
  };
  const urlBuilder = extra.urlBuilder ?? defaultUrlBuilder;
  extra.baseJs ??= baseJsPaths
    .map((path) => urlBuilder.getFullUrl(path))
    .map((path) => buildJSItem(path));
  const { scripts, styles } = assets;
  const cssList = [
    ...(styles ? persistCSS(styles) : []),
    ...(extra.jsonOptions?.extraCss || []),
  ];
  const context = {
    getMarkmap: () => window.markmap,
    getOptions: extra.getOptions,
    jsonOptions: extra.jsonOptions,
    root,
  };
  const jsList = [
    ...persistJS(
      [
        ...extra.baseJs,
        ...(scripts || []),
        {
          type: 'iife',
          data: {
            fn: (
              getMarkmap: (typeof context)['getMarkmap'],
              getOptions: (typeof context)['getOptions'],
              root: (typeof context)['root'],
              jsonOptions: IMarkmapJSONOptions,
            ) => {
              // Set mermaid config before markmap creates the SVG (triggers mermaid init)
              if (jsonOptions?.mermaid) {
                (window as any).__mermaidConfig = jsonOptions.mermaid;
              }
              const markmap = getMarkmap();
              window.mm = markmap.Markmap.create(
                'svg#mindmap',
                (getOptions || markmap.deriveOptions)(jsonOptions),
                root,
              );
              if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                document.documentElement.classList.add('markmap-dark');
              }
              // Inject extraCss into the SVG's internal style to override defaults
              if (jsonOptions?.extraCss) {
                const svg = document.querySelector('svg#mindmap');
                if (svg) {
                  const styleEl = svg.querySelector('style');
                  if (styleEl) {
                    const cssTexts = jsonOptions.extraCss.map((s: string) =>
                      s.replace(/<\/?style[^>]*>/gi, ''),
                    );
                    styleEl.textContent += '\n' + cssTexts.join('\n');
                  }
                }
              }
            },
            getParams: ({ getMarkmap, getOptions, root, jsonOptions }) => {
              return [getMarkmap, getOptions, root, jsonOptions];
            },
          },
        } as JSItem,
      ],
      context,
    ),
  ];
  const html = template
    .replace('<!--CSS-->', () => cssList.join(''))
    .replace('<!--JS-->', () => jsList.join(''));
  return html;
}
