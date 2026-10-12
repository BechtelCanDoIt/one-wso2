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
import { useMemo, useState } from "react";
import { Box } from "@wso2/oxygen-ui";
import { BookOpenIcon, Building2Icon, HandshakeIcon, LightbulbIcon, type LucideIcon } from "@wso2/oxygen-ui-icons-react";
import type { TilSubmission, TilWhere } from "../api/tilTypes";
import { tilFirstImageSrc } from "../util/tilRichText";
import { tilSourceColors } from "../util/tilSourceTones";

const SOURCE_ICONS: Record<TilWhere, LucideIcon> = {
  Customer: Building2Icon,
  Partner: HandshakeIcon,
  Internal: LightbulbIcon,
  Other: BookOpenIcon,
};

// The picture for an entry in the thumbnail layouts: the first picture in the
// entry, or else a cover in its source's colour with the source's icon. Fills
// its parent, which sets the size and shape. Decorative (alt=""): the title
// is always right beside it.
export default function TilEntryCover({ submission, iconSize }: { submission: TilSubmission; iconSize: number }) {
  const src = useMemo(() => tilFirstImageSrc(submission.what), [submission.what]);
  // A picture that fails to load (removed, or refused by the page's image
  // policy) falls back to the cover instead of showing a broken image.
  const [failedSrc, setFailedSrc] = useState<string | null>(null);

  if (src && src !== failedSrc) {
    return (
      <Box
        component="img"
        src={src}
        alt=""
        loading="lazy"
        onError={() => setFailedSrc(src)}
        sx={{ display: "block", width: "100%", height: "100%", objectFit: "cover" }}
      />
    );
  }
  const Icon = SOURCE_ICONS[submission.where] ?? BookOpenIcon;
  return (
    <Box
      sx={[
        { display: "grid", placeItems: "center", width: "100%", height: "100%" },
        tilSourceColors(submission.where, true),
      ]}
    >
      <Icon size={iconSize} strokeWidth={1.75} aria-hidden />
    </Box>
  );
}
