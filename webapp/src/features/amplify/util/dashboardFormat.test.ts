// Copyright (c) 2026 WSO2 LLC. (https://www.wso2.com).
//
// WSO2 LLC. licenses this file to you under the Apache License,
// Version 2.0 (the "License"); you may not use this file except
// in compliance with the License.
// You may obtain a copy of the License at
//
// http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing,
// software distributed under the License is distributed on an
// "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
// KIND, either express or implied.  See the License for the
// specific language governing permissions and limitations

import { describe, expect, it } from "vitest";
import type { ScorecardMeasure } from "../api/amplifyTypes";
import {
  announcementLabel,
  changePercent,
  deltaText,
  fraction,
  measureValue,
  num,
  percentOf,
  rate,
  targetText,
} from "./dashboardFormat";

const measure = (over: Partial<ScorecardMeasure>): ScorecardMeasure => ({
  key: "connected",
  label: "Employees connected",
  unit: "PERCENT",
  value: 18.04,
  target: 25,
  comparison: "AT_LEAST",
  status: "WATCH",
  ...over,
});

describe("dashboardFormat", () => {
  it("formats numbers and rates", () => {
    expect(num(1840)).toBe("1,840");
    expect(num(null)).toBe("0");
    expect(rate(0.667)).toBe("67%");
    expect(percentOf(150, 830)).toBe("18%");
    expect(percentOf(1, 0)).toBe("-");
    expect(percentOf(1, null)).toBe("-");
  });

  it("describes change without inventing a base", () => {
    expect(deltaText(187, 164, "previous 7 days")).toBe("+23 vs previous 7 days");
    expect(deltaText(5, 9)).toBe("-4 vs previous period");
    expect(deltaText(3, 3)).toBe("same as previous period");
    expect(changePercent(138, 100)).toBe("+38%");
    expect(changePercent(5, 0)).toBe("-");
  });

  it("words the Chat card state, with the retry the worker is on", () => {
    expect(announcementLabel(undefined)).toBe("Not announced");
    expect(announcementLabel({ status: "NONE" })).toBe("Not announced");
    expect(announcementLabel({ status: "SENT" })).toBe("Sent");
    expect(announcementLabel({ status: "FAILED" })).toBe("Failed after retries");
    expect(announcementLabel({ status: "QUEUED", attempts: 3 })).toBe("Retrying · attempt 3");
    expect(announcementLabel({ status: "QUEUED", attempts: 0 })).toBe("Queued");
  });

  it("shows a scorecard value against its target and the API's own counts", () => {
    expect(measureValue(measure({}))).toBe("18%");
    expect(measureValue(measure({ unit: "COUNT", value: 1500 }))).toBe("1,500");
    expect(targetText(measure({}))).toBe("At least 25%");
    expect(targetText(measure({ comparison: "AT_MOST", target: 5 }))).toBe("At most 5%");
    expect(fraction(measure({ numerator: 150, denominator: 830 }))).toBe("150 / 830");
    expect(fraction(measure({}))).toBeNull();
  });
});
