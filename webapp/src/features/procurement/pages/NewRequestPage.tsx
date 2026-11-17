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

import { useState } from "react";
import { useNavigate } from "react-router";
import { Alert, Button, Skeleton } from "@wso2/oxygen-ui";
import { describeError } from "@api/errors";
import RequestSubmitted from "../components/RequestSubmitted";
import RequestForm from "../request-form/RequestForm";
import { emptyDraft } from "../request-form/requestFormModel";
import { useProcurementLookups, useProcurementMe, useSubmitRequest } from "../api/useProcurement";
import { procurementPaths } from "../procurementPaths";

export default function NewRequestPage() {
  const navigate = useNavigate();
  const me = useProcurementMe();
  const lookups = useProcurementLookups();
  const submit = useSubmitRequest();
  const [reference, setReference] = useState<string | null>(null);
  // Changing the key starts the form over for "Submit another request".
  const [formKey, setFormKey] = useState(0);

  const failed = me.isError ? me : lookups.isError ? lookups : null;

  return (
    <>
      {failed && (
        <Alert
          severity="error"
          action={
            <Button color="inherit" size="small" onClick={() => void failed.refetch()}>
              Retry
            </Button>
          }
        >
          {describeError(failed.error)}
        </Alert>
      )}
      {!failed && (!me.data || !lookups.data) && <Skeleton variant="rounded" height={320} />}
      {reference && (
        <RequestSubmitted
          reference={reference}
          onSubmitAnother={() => {
            submit.reset();
            setReference(null);
            setFormKey((key) => key + 1);
          }}
          onClose={() => navigate(procurementPaths.requests)}
        />
      )}
      {!reference && me.data && lookups.data && (
        <RequestForm
          key={formKey}
          initialDraft={emptyDraft()}
          me={me.data}
          lookups={lookups.data}
          submitLabel="Submit request"
          submitting={submit.isPending}
          error={submit.isError ? describeError(submit.error) : undefined}
          onSubmit={(input) =>
            submit.mutate(input, { onSuccess: (created) => setReference(created.reference ?? "Pending") })
          }
        />
      )}
    </>
  );
}
