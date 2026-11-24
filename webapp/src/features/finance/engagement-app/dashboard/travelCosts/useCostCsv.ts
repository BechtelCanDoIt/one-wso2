
import { useCallback } from "react";
import { describeError } from "@api/errors";
import { engagementServiceUrls, type EngagementQueryParams } from "@config/apiConfig";
import { saveBlob } from "@utils/saveFile";
import { useEngagementBasis } from "../../api/engagementBasis";
import { eaError, engagementCsv } from "../../api/engagementHttp";
import type { CostCsvSection } from "../widgets/types";

const FILE_PART: Readonly<Record<CostCsvSection | "summary", string>> = {
  summary: "Summary",
  kpis: "Key_Figures",
  bySource: "By_Source",
  byMonth: "By_Month",
  byCountry: "By_Country",
  byCustomer: "By_Customer",
  byTravelAgent: "By_Travel_Agent",
  byCostType: "By_Cost_Type",
  byPaid: "Paid_vs_Non_Paid",
  transactions: "Transactions",
};

/** The file a CSV download is saved as: Travel_Costs_<Section>_<from>_<to>.csv. */
export const costCsvName = (section: CostCsvSection | "summary", range: { from: string; to: string }): string => `Travel_Costs_${FILE_PART[section]}_${range.from}_${range.to}.csv`;

/** The CSV URL for a section: the summary endpoint with `section`, or the transactions endpoint for every filtered line. */
export function costCsvUrl(section: CostCsvSection | "summary", params: EngagementQueryParams): string {
  if (section === "transactions") return engagementServiceUrls.travelCostTransactions({ ...params, format: "csv" });
  return engagementServiceUrls.travelCosts({ ...params, format: "csv", section: section === "summary" ? undefined : section });
}

/** Downloads a Travel Costs CSV for the current range and filters. A failure is reported through `onError`, never thrown. */
export function useCostCsv(params: EngagementQueryParams, range: { from: string; to: string }, onError: (message: string) => void): (section: CostCsvSection | "summary") => Promise<void> {
  const { getToken } = useEngagementBasis();
  return useCallback(
    async (section) => {
      try {
        saveBlob(await engagementCsv(costCsvUrl(section, params), await getToken()), costCsvName(section, range));
      } catch (e) {
        onError(`Couldn't download the CSV. ${describeError(eaError(e))}`);
      }
    },
    [getToken, params, range, onError],
  );
}
