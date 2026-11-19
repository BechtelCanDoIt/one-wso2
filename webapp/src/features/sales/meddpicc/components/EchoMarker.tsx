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

import { Chip } from "@wso2/oxygen-ui";
import { AudioLinesIcon } from "@wso2/oxygen-ui-icons-react";
import { confidenceWord } from "../util/meddpiccFormat";

/**
 * The one mark for anything Echo heard rather than someone typed: sound lines, for a
 * value that came out of a conversation. Used wherever a suggestion is pointed at, so the
 * deals table, the Letter circles, a field's title and the chip beside a value all say it
 * the same way.
 */
export const EchoIcon = AudioLinesIcon;

/** A small "Echo" chip beside a suggested value, with its confidence as a tooltip. */
export default function EchoMarker({ confidence }: { confidence?: number }) {
  return (
    <Chip
      icon={<EchoIcon size={12} />}
      label="Echo"
      size="small"
      color="warning"
      variant="outlined"
      title={confidence !== undefined ? `Suggested by Echo, ${confidenceWord(confidence)} confidence` : "Suggested by Echo"}
      sx={{ height: 18, fontSize: "0.65rem", fontWeight: 700, "& .MuiChip-icon": { ml: 0.5 } }}
    />
  );
}
