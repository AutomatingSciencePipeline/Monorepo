// Never pass Auth.js errors directly to the console: causes can contain tokens,
// request bodies, connection strings, or provider responses.
const errorTypes = new Set([
  "AdapterError", "CallbackRouteError", "OAuthCallbackError",
  "OAuthProfileParseError", "OAuthAccountNotLinked", "AccountNotLinked",
  "InvalidCheck", "MissingCSRF", "MissingSecret", "UntrustedHost",
  "AccessDenied", "SessionTokenError", "JWTSessionError", "Configuration",
]);
const causeNames = new Set([
  "Error", "TypeError", "BSONError", "MongoServerError",
  "MongoNetworkError", "MongoServerSelectionError", "OperationProcessingError",
  "ResponseBodyError", "AuthorizationResponseError",
]);
const causeCodes = new Set([
  "ECONNREFUSED", "ETIMEDOUT", "ENOTFOUND", "ECONNRESET",
  "invalid_client", "invalid_grant", "bad_verification_code",
  "incorrect_client_credentials", "redirect_uri_mismatch",
  "OAUTH_PARSE_ERROR", "OAUTH_INVALID_RESPONSE", "OAUTH_INVALID_REQUEST",
  "OAUTH_RESPONSE_IS_NOT_JSON", "OAUTH_RESPONSE_IS_NOT_CONFORM",
  "OAUTH_HTTP_REQUEST_FORBIDDEN", "OAUTH_REQUEST_PROTOCOL_FORBIDDEN",
  "OAUTH_JSON_ATTRIBUTE_COMPARISON_FAILED", "OAUTH_RESPONSE_BODY_ERROR",
]);

export function summarizeAuthError(error) {
  const cause = error?.cause?.err ?? error?.cause;
  const code = cause?.error ?? cause?.code;
  const summary = {
    type: errorTypes.has(error?.type) ? error.type : "UnknownAuthError",
    provider: ["github", "google"].includes(error?.cause?.provider)
      ? error.cause.provider : "unknown",
    cause: causeNames.has(cause?.name) ? cause.name : "UnknownError",
    code: causeCodes.has(code) ? code
      : Number.isSafeInteger(code) ? code : undefined,
  };
  // Only numeric HTTP status is retained; never serialize the Response/body.
  const status = cause?.response?.status ?? cause?.cause?.status;
  if (Number.isInteger(status) && status >= 100 && status <= 599) summary.httpStatus = status;
  const providerError = cause?.cause?.body?.error;
  if (causeCodes.has(providerError)) summary.providerError = providerError;
  // Report only fixed field names/reasons, never the original error message.
  for (const field of ["access_token", "token_type", "expires_in", "refresh_token", "scope", "id_token"]) {
    if (cause?.message?.includes(`"response" body "${field}"`)) summary.invalidField = field;
  }
  if (cause?.message === 'no authorization code in "callbackParameters"') summary.reason = "missing_authorization_code";
  const knownReasons = new Map([
    ['unexpected "state" response parameter encountered', 'unexpected_state'],
    ['unexpected "state" response parameter value', 'state_mismatch'],
    ['response parameter "state" missing', 'missing_state'],
    ['response parameter "iss" (issuer) missing', 'missing_issuer'],
    ['unexpected "iss" (issuer) response parameter value', 'issuer_mismatch'],
    ['"response" body must be a top level object', 'non_object_response'],
  ]);
  if (knownReasons.has(cause?.message)) summary.reason = knownReasons.get(cause.message);
  return summary;
}

export function logAuthError(error) {
  console.error("[glados-auth]", JSON.stringify({
    timestamp: new Date().toISOString(), ...summarizeAuthError(error),
  }));
}
