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

import { Alert, Skeleton, Stack } from "@wso2/oxygen-ui";
import ErrorNotice from "@components/error-notice/ErrorNotice";
import { isPreviewEnabled } from "@config/previewFeatures";
import { useMeProfile } from "@features/my/api/useMeProfile";
import { useActiveParCycle, useParRating } from "../api/useParData";
import { useSelfReview } from "../api/useSelfReview";
import { useReviewSummary } from "../api/useReview360";
import { useCycleLeadership360ForPdf } from "../api/useLeadership360";
import { ParLeadFeedbackCard } from "../components/ParRatingSummary";
import { decodeParComment } from "../util/parComment";
import { downloadPar2Pdf } from "../util/parPdf";

// Active cycle → Lead review: the lead's review of your PAR once they share it, with the finished PAR's
// PDF. Your self-review stays on its own page, and your 360° summary on the 360° page.
export default function ParCycleLeadReview() {
  const profile = useMeProfile();
  const workEmail = profile.data?.userInfo.workEmail;
  const activeCycles = useActiveParCycle(workEmail);
  const cycle = activeCycles.data?.[0];
  const rating = useParRating(cycle?.parCycleId, workEmail);
  // Until the lead shares, the backend leaves their comment and rating out.
  const leadShared = Boolean(rating.data?.parLeadComment || rating.data?.parRating);
  // The PDF carries the self-review, the anonymised 360° summary and a leader's Leadership 360° results.
  const selfReview = useSelfReview(cycle?.parCycleId, workEmail, leadShared);
  const review360 = useReviewSummary(cycle?.parCycleId, workEmail, leadShared);
  const leadership360 = useCycleLeadership360ForPdf(
    cycle?.parCycleId ?? 0,
    workEmail,
    leadShared && cycle !== undefined && isPreviewEnabled("leadership360"),
  );

  if (profile.isLoading || activeCycles.isLoading || rating.isLoading) {
    return <Skeleton variant="rectangular" height={260} sx={{ borderRadius: 1.5, maxWidth: 1100 }} />;
  }
  if (activeCycles.isError) {
    return (
      <ErrorNotice error={activeCycles.error} onRetry={() => activeCycles.refetch()} retrying={activeCycles.isFetching}>
        Couldn't load your PAR cycle.
      </ErrorNotice>
    );
  }
  if (rating.isError) {
    return (
      <ErrorNotice error={rating.error} onRetry={() => rating.refetch()} retrying={rating.isFetching}>
        Couldn't load your PAR record for this cycle.
      </ErrorNotice>
    );
  }
  if (!cycle || !rating.data) {
    return <Alert severity="info">There's no PAR cycle open for you right now.</Alert>;
  }
  if (!leadShared) {
    return <Alert severity="info">Your lead's review shows here once they share it.</Alert>;
  }
  const parRating = rating.data;
  const review = selfReview.data;
  return (
    <Stack spacing={1.75} sx={{ maxWidth: 1100 }}>
      <ParLeadFeedbackCard
        rating={parRating}
        onDownloadPdf={
          review
            ? () =>
                downloadPar2Pdf({
                  rating: parRating,
                  leadComment: decodeParComment(parRating.parLeadComment),
                  selfReview: { definition: review.template.definition, answers: review.answers },
                  review360: review360.data ?? undefined,
                  leadership360,
                })
            : undefined
        }
      />
    </Stack>
  );
}
