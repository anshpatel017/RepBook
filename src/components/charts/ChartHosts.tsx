/**
 * Native: Skia is a real native module, so the charts import directly.
 * The web twin (ChartHosts.web.tsx) has to defer the import — see the note there.
 */
export { ComparisonBars as ComparisonBarsHost } from './ComparisonBars';
export { TrendLine as TrendLineHost } from './TrendLine';
