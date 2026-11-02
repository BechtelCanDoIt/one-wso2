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

import type { JSX } from "react";
import { Alert, FormControlLabel, Skeleton, Stack, Switch, Typography } from "@wso2/oxygen-ui";
import { MailIcon } from "@wso2/oxygen-ui-icons-react";
import ErrorNotice from "@components/error-notice/ErrorNotice";
import { useCado2Toast } from "@features/sales/cado2/components/toast/toastContext";
import PageHeader from "@features/sales/cado2/components/page-header/PageHeader";
import SectionCard from "@features/sales/cado2/components/section-card/SectionCard";
import { changedText } from "@features/sales/cado2/quotes/form/draftForm";
import {
  useEmailNotifications,
  useSaveEmailNotifications,
} from "@features/sales/cado2/admin/email-notifications/api/useEmailNotifications";

/**
 * CadO2 Admin → Email Notifications (D103): whether approval emails (D102)
 * go out. An Admin's switch, like the Salesforce sync (D84); it applies to the
 * next submit or decision. Both ways are immediate: an email is easy to
 * ignore, unlike a Salesforce write. The environment must also have the email
 * service set up; without it the switch is greyed out and says so.
 */
export default function EmailNotificationsPage(): JSX.Element {
  const setting = useEmailNotifications();
  const save = useSaveEmailNotifications();
  const notify = useCado2Toast();

  const switchTo = (enabled: boolean) =>
    save.mutate(enabled, {
      onSuccess: () => notify(enabled ? "Email notifications turned on" : "Email notifications turned off"),
    });

  return (
    <Stack spacing={3} sx={{ maxWidth: 900 }}>
      <PageHeader title="Email Notifications" />
      <SectionCard title="Approval Emails" icon={<MailIcon size={16} />}>
        {setting.error ? (
          <ErrorNotice error={setting.error} onRetry={() => void setting.refetch()} retrying={setting.isFetching}>
            Couldn&apos;t load the email notifications setting.
          </ErrorNotice>
        ) : setting.isPending ? (
          <Skeleton variant="rounded" height={120} aria-label="Loading the email notifications setting" />
        ) : (
          <Stack spacing={1.5}>
            {setting.data.configured ? null : (
              <Alert severity="warning">
                The email service isn&apos;t set up in this environment, so no email can be sent, whatever the
                switch says.
              </Alert>
            )}
            <FormControlLabel
              control={
                <Switch
                  checked={setting.data.enabled}
                  disabled={save.isPending || !setting.data.configured}
                  onChange={(_, on) => {
                    save.reset();
                    switchTo(on);
                  }}
                />
              }
              label={
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  Send approval emails
                </Typography>
              }
            />
            <Typography variant="body2" color="text.secondary">
              When on, QuickQuote sends an email when a quote is submitted, when an approver&apos;s turn comes, and when
              an approver approves or returns a quote. When off, no email is sent; approvers still see their quotes
              in My Approvals.
            </Typography>
            {save.error ? (
              <ErrorNotice error={save.error}>Couldn&apos;t change the email notifications.</ErrorNotice>
            ) : null}
            {setting.data.updatedByEmail && setting.data.updatedAt ? (
              <Typography variant="caption" color="text.secondary">
                Last changed {changedText(setting.data.updatedAt, setting.data.updatedByEmail)}
              </Typography>
            ) : null}
          </Stack>
        )}
      </SectionCard>
    </Stack>
  );
}
