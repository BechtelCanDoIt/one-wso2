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

// Generates and downloads an NDA with the same document and renderer as
// NdaPage, then reports the result in #status for check-prod-pdf.mjs. Any CSP
// violation on the page is recorded too, so a blocked resource that doesn't
// break the PDF still fails the check.

import { pdf } from "@react-pdf/renderer";
import NdaPdfDocument, { entityForCountry } from "@features/legal/pages/NdaPdfDocument";

declare global {
  interface Window {
    cspViolations: string[];
  }
}

window.cspViolations = [];
document.addEventListener("securitypolicyviolation", (e) => {
  window.cspViolations.push(`${e.violatedDirective} blocked ${e.blockedURI || "(inline)"}`);
});

const status = document.getElementById("status")!;

function report(state: "ok" | "error", message: string) {
  status.dataset.state = state;
  status.textContent = message;
}

document.getElementById("generate")!.addEventListener("click", async () => {
  try {
    const now = new Date();
    const blob = await pdf(
      <NdaPdfDocument
        template="Mutual NDA"
        wso2Company={entityForCountry("Sri Lanka")}
        customerName="Example Customer Ltd"
        customerAddress="1 Example Street, Colombo, Sri Lanka"
        effectiveDate={now.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
        notes=""
        year={now.getFullYear()}
      />,
    ).toBlob();

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "NDA-prod-check.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 100);

    report("ok", `Generated ${blob.size} bytes.`);
  } catch (e) {
    report("error", e instanceof Error ? `${e.name}: ${e.message}` : String(e));
  }
});
