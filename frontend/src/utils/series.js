// Reconstructs a per-year time series for one company from the flat
// variance-flag endpoint, rather than adding a new backend route for it.
//
// `GET /api/analysis/flags?threshold_pct=0` returns every consecutive-year
// comparison for every watched metric across every company (a 0% threshold
// means nothing is filtered out). Each flag already carries both the prior
// and current year's raw value for one metric, so walking every flag for
// one company reconstructs its full year-by-year history for that metric
// without inventing any number that wasn't already in the dataset.
export function buildYearSeries(flags, company, metrics) {
  const byYear = new Map();

  const setPoint = (year, metric, value) => {
    if (year === undefined || year === null || value === undefined || value === null) return;
    if (!byYear.has(year)) byYear.set(year, { year });
    byYear.get(year)[metric] = value;
  };

  for (const flag of flags) {
    if (flag.company !== company || !metrics.includes(flag.metric)) continue;
    setPoint(flag.prior_year, flag.metric, flag.prior_value);
    setPoint(flag.year, flag.metric, flag.value);
  }

  return Array.from(byYear.values()).sort((a, b) => a.year - b.year);
}
