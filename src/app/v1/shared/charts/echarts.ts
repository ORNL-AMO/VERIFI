import * as echarts from 'echarts/core';
export { echarts };
import {
  PieChart,
  PieSeriesOption,
  SunburstChart,
  SunburstSeriesOption,
  SankeyChart,
  SankeySeriesOption,
  TreemapChart,
  TreemapSeriesOption,
  BarChart,
  BarSeriesOption,
  CustomChart,
  CustomSeriesOption,
  HeatmapChart,
  HeatmapSeriesOption,
  LineChart,
  LineSeriesOption,
  ScatterChart,
  ScatterSeriesOption
} from 'echarts/charts';
import {
  AriaComponent,
  AriaComponentOption,
  DataZoomComponent,
  DataZoomComponentOption,
  DatasetComponent,
  DatasetComponentOption,
  GridComponent,
  GridComponentOption,
  LegendComponent,
  LegendComponentOption,
  MarkAreaComponent,
  MarkAreaComponentOption,
  ToolboxComponent,
  ToolboxComponentOption,
  TooltipComponent,
  TooltipComponentOption,
  TransformComponent,
  VisualMapComponent,
  VisualMapComponentOption
} from 'echarts/components';
import { CanvasRenderer } from 'echarts/renderers';
import { LegacyGridContainLabel } from 'echarts/features';

echarts.use([
  AriaComponent,
  PieChart,
  SunburstChart,
  SankeyChart,
  TreemapChart,
  BarChart,
  CustomChart,
  HeatmapChart,
  LineChart,
  ScatterChart,
  DataZoomComponent,
  DatasetComponent,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  ToolboxComponent,
  TooltipComponent,
  TransformComponent,
  VisualMapComponent,
  CanvasRenderer,
  LegacyGridContainLabel
]);

export type V1EChartsOption = echarts.ComposeOption<
  | PieSeriesOption
  | SunburstSeriesOption
  | SankeySeriesOption
  | TreemapSeriesOption
  | BarSeriesOption
  | CustomSeriesOption
  | HeatmapSeriesOption
  | LineSeriesOption
  | ScatterSeriesOption
  | AriaComponentOption
  | DataZoomComponentOption
  | DatasetComponentOption
  | GridComponentOption
  | LegendComponentOption
  | MarkAreaComponentOption
  | ToolboxComponentOption
  | TooltipComponentOption
  | VisualMapComponentOption
>;
