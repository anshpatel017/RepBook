import { WithSkiaWeb } from '@shopify/react-native-skia/lib/module/web';

import { LoadingState } from '@/components/Screen';

import type { ComparisonBarsProps } from './ComparisonBars';
import type { TrendLineProps } from './TrendLine';

/**
 * On web, Skia builds its API at module load (`JsiSkApi(global.CanvasKit)` in
 * Skia.web.js), so importing victory-native before the CanvasKit WASM has
 * downloaded captures an undefined CanvasKit and crashes on first draw
 * ("Cannot read properties of undefined (reading 'XYWHRect')").
 *
 * WithSkiaWeb awaits the WASM and only then imports the chart module, which is
 * why these are dynamic imports rather than plain ones.
 *
 * locateFile points at public/canvaskit.wasm (see the postinstall script);
 * without it CanvasKit looks beside the JS bundle under /_expo/... and 404s.
 */
const opts = { locateFile: (file: string) => `/${file}` };

export function ComparisonBarsHost(props: ComparisonBarsProps) {
  return (
    <WithSkiaWeb
      getComponent={() => import('./ComparisonBars')}
      componentProps={props}
      opts={opts}
      fallback={<LoadingState label="Preparing charts…" />}
    />
  );
}

export function TrendLineHost(props: TrendLineProps) {
  return (
    <WithSkiaWeb
      getComponent={() => import('./TrendLine')}
      componentProps={props}
      opts={opts}
      fallback={<LoadingState label="Preparing charts…" />}
    />
  );
}
