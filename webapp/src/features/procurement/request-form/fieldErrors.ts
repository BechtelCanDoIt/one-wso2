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


import { createContext, useContext } from "react";

/** The message to show under each field of the step, by the field's name. Empty until the person tries to move on. */
export const FieldErrorsContext = createContext<Readonly<Record<string, string>>>({});

/** The message for a field, if the step has one for it. A field is known by its `name`, or by its label when it has none. */
export function useFieldError(name: string): string | undefined {
  return useContext(FieldErrorsContext)[name];
}
