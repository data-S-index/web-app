import percentileThresholds from "@/assets/data/percentile.json";

type PercentileThreshold = {
  metric_name: string;
  percentile: number;
  score_threshold: number;
};

const thresholds = percentileThresholds as PercentileThreshold[];

/**
 * Returns the highest percentile whose score_threshold is <= value, mirroring
 * the pandas lookup against percentile_thresholds.csv used to generate this data.
 */
export function getPercentile(
  value: number,
  metricName: string,
): number | null {
  let best: number | null = null;

  for (const row of thresholds) {
    if (row.metric_name !== metricName) continue;
    if (row.score_threshold > value) continue;
    if (best === null || row.percentile > best) best = row.percentile;
  }

  return best;
}
