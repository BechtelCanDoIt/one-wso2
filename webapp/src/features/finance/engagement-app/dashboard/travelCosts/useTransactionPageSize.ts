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
// under the License.

import { useCallback, useState } from "react";
import { PAGE_SIZE, PAGE_SIZES } from "./costView";

const KEY = "engagement-app.transactions.pageSize";

function stored(): number {
  try {
    const n = Number(localStorage.getItem(KEY));
    return PAGE_SIZES.includes(n) ? n : PAGE_SIZE;
  } catch {
    return PAGE_SIZE;
  }
}

/** Rows per page in the Transactions widget, kept in this browser. Falls back to 25 when storage is blocked or holds something else. */
export function useTransactionPageSize(): [number, (size: number) => void] {
  const [size, setSize] = useState(stored);
  const choose = useCallback((next: number) => {
    setSize(next);
    try {
      localStorage.setItem(KEY, String(next));
    } catch {
      // Storage blocked (a private window): the choice lasts for this visit only.
    }
  }, []);
  return [size, choose];
}
