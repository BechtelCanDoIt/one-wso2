// Copyright (c) 2026, WSO2 LLC. (https://www.wso2.com).
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


import { Typography } from "@wso2/oxygen-ui";
import { safeHttpUrl } from "./amplifyUi";

/**
 * The evidence URL as a link — only when it is http(s). It is employee-typed
 * text; anything else (a `javascript:` URL that slipped past, say) is shown as
 * plain text and never made clickable.
 */
export default function EvidenceLink({ url }: { url: string }) {
  const href = safeHttpUrl(url);
  const sx = { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "inherit" } as const;
  if (!href) {
    return (
      <Typography variant="body2" sx={sx}>
        {url}
      </Typography>
    );
  }
  return (
    <Typography variant="body2" component="a" href={href} target="_blank" rel="noopener noreferrer" sx={sx}>
      {url}
    </Typography>
  );
}
