"use client";

import React, { useMemo, useState } from "react";
import { useApp } from "../context/AppContext";
import {
  ShieldCheck,
  Zap,
  RotateCcw,
  Camera,
  Play,
  Copy,
  Check,
  ChevronDown,
  Search,
  Layers,
  Database,
  Lock,
  Activity,
  ExternalLink,
  Code2,
  RefreshCw,
  Sparkles,
  Radio,
  Fingerprint,
  Key,
} from "lucide-react";
import { LOGO_COLORS } from "../logoColors";

interface LedgerRecord {
  id: string;
  name: string;
  email: string;
  avatar: string;
  volume: string;
  status: "AUTH_VERIFIED_SIMULATED" | "RATE_LIMIT_TEST_ACTIVE";
  security: string;
  securityBadge?: string;
  webhookDispatched: boolean;
}

const INITIAL_RECORDS: LedgerRecord[] = [
  {
    id: "cust_syn_9981a",
    name: "Alex Vance (Synthetic Dev)",
    email: "alex.vance+test@sandbox.internal",
    avatar: "AV",
    volume: "$149.00 MOCK",
    status: "AUTH_VERIFIED_SIMULATED",
    security: "SHA-256 Masked",
    webhookDispatched: true,
  },
  {
    id: "cust_syn_8042b",
    name: "Marcus Dev",
    email: "mock_marcus_dev@codeplane.internal",
    avatar: "MD",
    volume: "$1,420.00 MOCK",
    status: "AUTH_VERIFIED_SIMULATED",
    security: "SHA-256 Masked",
    webhookDispatched: false,
  },
  {
    id: "cust_syn_7719c",
    name: "Elena Rostova",
    email: "elena.rostova+sandbox@sim.io",
    avatar: "ER",
    volume: "$890.50 MOCK",
    status: "AUTH_VERIFIED_SIMULATED",
    security: "SHA-256 Masked",
    webhookDispatched: true,
  },
  {
    id: "cust_syn_6602d",
    name: "QA Circuit Breaker",
    email: "qa_circuit_breaker+test@sandbox.internal",
    avatar: "CB",
    volume: "$0.00 MOCK",
    status: "RATE_LIMIT_TEST_ACTIVE",
    security: "SHA-256 Masked",
    securityBadge: "Faker Guard Filtered",
    webhookDispatched: false,
  },
  {
    id: "cust_syn_5190e",
    name: "Synthetic Partner Billing",
    email: "synthetic_partner_billing@vendor.sandbox",
    avatar: "SP",
    volume: "$4,920.00 MOCK",
    status: "AUTH_VERIFIED_SIMULATED",
    security: "SHA-256 Masked",
    webhookDispatched: true,
  },
];

type HttpMethod = "POST" | "GET" | "PUT" | "DELETE" | "PATCH";
type RequestTab = "body" | "auth" | "params" | "rules" | "schema";
type ResponseTab = "body" | "headers" | "ebpf" | "sdk";
type SandboxSnapshot = {
  id: string;
  createdAt: string;
  records: LedgerRecord[];
  transactionCount: number;
  customerCount: number;
  sessionCount: number;
};

const LATENCY_OPTIONS = [
  { label: "24ms (Realistic Edge)", milliseconds: 24 },
  { label: "5ms (In-Memory MicroVM)", milliseconds: 5 },
  { label: "120ms (Cross-Region Simulated)", milliseconds: 120 },
  { label: "450ms (Jitter Spikes)", milliseconds: 450 },
];

const createId = (prefix: string) =>
  `${prefix}_${Math.random().toString(36).slice(2, 10)}`;

const getJsonKeyCount = (json: string) => {
  try {
    const value = JSON.parse(json) as unknown;
    return value && typeof value === "object" && !Array.isArray(value)
      ? Object.keys(value).length
      : 0;
  } catch {
    return 0;
  }
};

const DEFAULT_REQUEST_BODY = `{
  "amount": 14900,
  "currency": "usd",
  "synthetic_customer_id": "cust_syn_9981a",
  "payment_method": {
    "type": "card",
    "token": "tok_visa_synthetic_4242",
    "mock_cvc_check": "passed",
    "exp_month": 12,
    "exp_year": 2028
  },
  "metadata": {
    "order_id": "ord_sim_88190"
  }
}`;

const DEFAULT_RESPONSE_BODY = `{
  "id": "pi_syn_9201a4b2c801",
  "object": "payment_intent",
  "amount": 14900,
  "amount_received": 14900,
  "currency": "usd",
  "status": "succeeded",
  "synthetic_mode": true,
  "airgap_isolated": true,
  "customer": {
    "id": "cust_syn_9981a",
    "name": "Alex Vance (Synthetic Dev)",
    "email": "alex.vance+test@sandbox.internal",
    "card_last4": "4242",
    "card_brand": "visa"
  },
  "created_at": 1711829823,
  "sandbox_trace_id": "sbx_trc_9942a88192bc"
}`;

const SCENARIOS: Record<
  string,
  { endpoint: string; method: HttpMethod; body: string }
> = {
  "Fintech / Payments v2": {
    endpoint: "payments/intents",
    method: "POST",
    body: DEFAULT_REQUEST_BODY,
  },
  "Auth & Session Token Verification": {
    endpoint: "auth/verify",
    method: "POST",
    body: JSON.stringify(
      { token: "jwt_synthetic_demo", audience: "sandbox-api" },
      null,
      2,
    ),
  },
  "Rate Limit & Backoff Emulation": {
    endpoint: "rate-limits/check",
    method: "GET",
    body: JSON.stringify({ client_id: "client_synthetic_01" }, null, 2),
  },
  "High Load eBPF Simulation": {
    endpoint: "runtime/health",
    method: "GET",
    body: JSON.stringify({ include_metrics: true }, null, 2),
  },
  "Auth0 / Token Verification": {
    endpoint: "auth/verify",
    method: "POST",
    body: JSON.stringify(
      { token: "jwt_synthetic_demo", audience: "sandbox-api" },
      null,
      2,
    ),
  },
  "Kafka / SQS Event Bus": {
    endpoint: "events/publish",
    method: "POST",
    body: JSON.stringify(
      { topic: "synthetic-events", event: { type: "sandbox.ping" } },
      null,
      2,
    ),
  },
  "Apollo Federation Subgraph": {
    endpoint: "graphql",
    method: "POST",
    body: JSON.stringify({ query: "{ health { status } }" }, null, 2),
  },
};

export const ApiSandboxPage: React.FC = () => {
  const { user, setPage } = useApp();
  // Top level config states
  const [scenario, setScenario] = useState("Fintech / Payments v2");
  const [httpMethod, setHttpMethod] = useState<HttpMethod>("POST");
  const [endpointUrl, setEndpointUrl] = useState(SCENARIOS["Fintech / Payments v2"]!.endpoint);
  const [latencySim, setLatencySim] = useState("24ms (Realistic Edge)");
  const [requestTab, setRequestTab] = useState<RequestTab>("body");
  const [responseTab, setResponseTab] = useState<ResponseTab>("body");
  const [activeFilter, setActiveFilter] = useState<"all" | "auth" | "rate" | "webhook">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedResponse, setCopiedResponse] = useState(false);
  const [copiedKernel, setCopiedKernel] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [sessionId] = useState("sbx-kernel-node-4829a");
  const [notice, setNotice] = useState("");
  const [authToken, setAuthToken] = useState("sk_test_synthetic_4829a");
  const [requestHeaders, setRequestHeaders] = useState(
    JSON.stringify({ "Content-Type": "application/json", "X-Sandbox-Mode": "synthetic" }, null, 2),
  );
  const [queryParams, setQueryParams] = useState(
    JSON.stringify({ expand: "customer" }, null, 2),
  );
  const [mockRules, setMockRules] = useState(
    JSON.stringify({ force_status: "succeeded", failure_rate: 0 }, null, 2),
  );

  // Editable body and live response states
  const [requestBody, setRequestBody] = useState(DEFAULT_REQUEST_BODY);
  const [responseBody, setResponseBody] = useState(DEFAULT_RESPONSE_BODY);
  const [statusCode, setStatusCode] = useState(201);
  const [latencyValue, setLatencyValue] = useState("28ms");
  const [payloadSize, setPayloadSize] = useState("1.4 KB");
  const [lastTraceId, setLastTraceId] = useState("sbx_trc_9942a88192bc");
  const [lastRunAt, setLastRunAt] = useState<number | null>(null);
  const [responseHeaders, setResponseHeaders] = useState<Record<string, string>>({
    "content-type": "application/json; charset=utf-8",
    "x-codeplane-airgap": "enabled; isolated-v4",
    "x-synthetic-latency": "28ms",
    "x-faker-seed": "alpha_49",
    "x-ebpf-runtime-status": "kernel_pass_ok",
    "x-ratelimit-remaining": "994",
    server: "codeplane-mock-edge/3.2",
  });
  const [traceLines, setTraceLines] = useState<string[]>([
    "[0.001ms] synthetic sandbox session initialized",
  ]);

  // Synthetic Ledger State
  const [records, setRecords] = useState<LedgerRecord[]>(INITIAL_RECORDS);
  const [mockCustomersCount, setMockCustomersCount] = useState(250);
  const [simulatedTxCount, setSimulatedTxCount] = useState(1241);
  const [mockSessionsCount, setMockSessionsCount] = useState(12);
  const [currentPage, setCurrentPage] = useState(1);
  const [snapshots, setSnapshots] = useState<SandboxSnapshot[]>([]);
  const [isSnapshotPanelOpen, setIsSnapshotPanelOpen] = useState(false);
  const [inspectedRecord, setInspectedRecord] = useState<LedgerRecord | null>(null);
  const [memoryLimitMb] = useState(512);

  const selectedLatency =
    LATENCY_OPTIONS.find((option) => option.label === latencySim) ??
    LATENCY_OPTIONS[0]!;
  const runtimeLatency = lastRunAt === null ? 3 : selectedLatency.milliseconds;
  const requestBytes = new TextEncoder().encode(requestBody).length;
  const memoryUsedMb = Math.min(
    memoryLimitMb,
    14.2 + records.length * 0.012 + snapshots.length * 0.25,
  );
  const requestsPerMinute = Math.min(simulatedTxCount % 1001, 1000);
  const rateLimitPercent = Math.round((requestsPerMinute / 1000) * 100);

  const handleExecute = async () => {
    if (!endpointUrl.trim()) {
      setStatusCode(400);
      setResponseBody(JSON.stringify({ error: "Endpoint is required." }, null, 2));
      setNotice("Enter an endpoint before executing the request.");
      return;
    }
    setIsExecuting(true);
    setNotice("");
    const startedAt = performance.now();
    const traceId = createId("sbx_trc");
    setLastTraceId(traceId);
    const traceStart = new Date().toISOString();

    try {
      await new Promise((resolve) =>
        window.setTimeout(resolve, Math.min(selectedLatency.milliseconds, 600)),
      );

      let body: Record<string, unknown> = {};
      try {
        body = requestBody.trim()
          ? (JSON.parse(requestBody) as Record<string, unknown>)
          : {};
        if (typeof body !== "object" || body === null || Array.isArray(body)) {
          throw new Error("Request body must be a JSON object.");
        }
      } catch (error) {
        throw new Error(
          error instanceof Error ? error.message : "Invalid JSON request body.",
        );
      }

      let headers: Record<string, unknown>;
      let params: Record<string, unknown>;
      let rules: Record<string, unknown>;
      try {
        headers = JSON.parse(requestHeaders) as Record<string, unknown>;
        params = JSON.parse(queryParams) as Record<string, unknown>;
        rules = JSON.parse(mockRules) as Record<string, unknown>;
      } catch {
        throw new Error("Headers, query parameters, and mock rules must be valid JSON.");
      }
      if (
        !headers ||
        typeof headers !== "object" ||
        Array.isArray(headers) ||
        !params ||
        typeof params !== "object" ||
        Array.isArray(params) ||
        !rules ||
        typeof rules !== "object" ||
        Array.isArray(rules)
      ) {
        throw new Error("Headers, query parameters, and mock rules must be JSON objects.");
      }

      const normalizedEndpoint = endpointUrl.replace(/^\/+|\/+$/g, "");
      const isAuthRequest = normalizedEndpoint.startsWith("auth/");
      const isRateLimitRequest = normalizedEndpoint.startsWith("rate-limits/");
      let nextStatus = httpMethod === "POST" ? 201 : 200;
      let generated: Record<string, unknown>;

      if (isAuthRequest && !authToken.trim()) {
        nextStatus = 401;
        generated = { error: "A synthetic bearer token is required.", status: "unauthorized" };
      } else if (isRateLimitRequest && requestsPerMinute >= 1000) {
        nextStatus = 429;
        generated = {
          error: "Synthetic rate limit exceeded.",
          retry_after_ms: 1000,
          limit: 1000,
        };
      } else if (httpMethod === "DELETE") {
        const deletedCustomerId =
          typeof body.synthetic_customer_id === "string"
            ? body.synthetic_customer_id
            : "";
        if (deletedCustomerId) {
          setRecords((previous) =>
            previous.filter((record) => record.id !== deletedCustomerId),
          );
          setMockCustomersCount((previous) =>
            Math.max(
              0,
              previous -
                (records.some((record) => record.id === deletedCustomerId)
                  ? 1
                  : 0),
            ),
          );
        }
        generated = {
          id: createId("del_syn"),
          object: normalizedEndpoint,
          status: "deleted",
          deleted_customer_id: deletedCustomerId || undefined,
          synthetic_mode: true,
          sandbox_trace_id: traceId,
        };
      } else if (normalizedEndpoint.startsWith("payments/")) {
        const customerId =
          typeof body.synthetic_customer_id === "string"
            ? body.synthetic_customer_id
            : INITIAL_RECORDS[0]!.id;
        const amount =
          typeof body.amount === "number" ? body.amount : 14900;
        const status =
          typeof rules.force_status === "string"
            ? rules.force_status
            : "succeeded";
        generated = {
          id: createId("pi_syn"),
          object: "payment_intent",
          amount,
          amount_received: status === "succeeded" ? amount : 0,
          currency:
            typeof body.currency === "string" ? body.currency : "usd",
          status,
          synthetic_mode: true,
          airgap_isolated: true,
          customer: {
            id: customerId,
            name:
              records.find((record) => record.id === customerId)?.name ??
              "Synthetic Customer",
            email:
              records.find((record) => record.id === customerId)?.email ??
              "customer+synthetic@sandbox.internal",
          },
          created_at: Math.floor(Date.now() / 1000),
          sandbox_trace_id: traceId,
        };
        if (httpMethod === "POST" && !records.some((record) => record.id === customerId)) {
          setRecords((previous) => [
            {
              id: customerId,
              name: "Synthetic Customer",
              email: "customer+synthetic@sandbox.internal",
              avatar: "SC",
              volume: `$${(amount / 100).toFixed(2)} MOCK`,
              status: "AUTH_VERIFIED_SIMULATED",
              security: "SHA-256 Masked",
              webhookDispatched: true,
            },
            ...previous,
          ]);
          setMockCustomersCount((previous) => previous + 1);
        } else if (
          (httpMethod === "PATCH" || httpMethod === "PUT") &&
          records.some((record) => record.id === customerId)
        ) {
          setRecords((previous) =>
            previous.map((record) =>
              record.id === customerId
                ? {
                    ...record,
                    volume: `$${(amount / 100).toFixed(2)} MOCK`,
                  }
                : record,
            ),
          );
        }
      } else {
        generated = {
          id: createId("sim"),
          object: normalizedEndpoint || "sandbox_response",
          method: httpMethod,
          status: "succeeded",
          synthetic_mode: true,
          request: body,
          query: params,
          headers,
          sandbox_trace_id: traceId,
        };
      }

      const elapsed = Math.round(performance.now() - startedAt);
      const nextHeaders = {
        "content-type": "application/json; charset=utf-8",
        "x-codeplane-airgap": "enabled; isolated-v4",
        "x-synthetic-latency": `${elapsed}ms`,
        "x-faker-seed": "alpha_49",
        "x-ebpf-runtime-status": nextStatus < 400 ? "kernel_pass_ok" : "request_rejected",
        "x-ratelimit-remaining": String(Math.max(0, 1000 - requestsPerMinute - 1)),
        "x-sandbox-trace-id": traceId,
        server: "codeplane-local-simulator/1.0",
      };
      setResponseBody(JSON.stringify(generated, null, 2));
      setStatusCode(nextStatus);
      setLatencyValue(`${elapsed}ms`);
      setPayloadSize(`${(new TextEncoder().encode(JSON.stringify(generated)).length / 1024).toFixed(1)} KB`);
      setResponseHeaders(nextHeaders);
      setLastRunAt(Date.now());
      setSimulatedTxCount((previous) => previous + 1);
      setTraceLines([
        `[${(performance.now() - startedAt).toFixed(2)}ms] ${httpMethod} /v1/${normalizedEndpoint}`,
        `[${(performance.now() - startedAt).toFixed(2)}ms] synthetic memory lookup completed`,
        `[${(performance.now() - startedAt).toFixed(2)}ms] response ${nextStatus} • trace ${traceId}`,
        `started_at: ${traceStart}`,
      ]);
      if (nextStatus >= 400) setNotice(`Request completed with status ${nextStatus}.`);
      else if (httpMethod === "POST") setMockSessionsCount((previous) => previous + 1);
    } catch (error) {
      const elapsed = Math.round(performance.now() - startedAt);
      const message =
        error instanceof Error ? error.message : "Sandbox request failed.";
      setStatusCode(400);
      setLatencyValue(`${elapsed}ms`);
      setResponseBody(JSON.stringify({ error: message, sandbox_trace_id: traceId }, null, 2));
      setResponseHeaders((previous) => ({
        ...previous,
        "x-synthetic-latency": `${elapsed}ms`,
        "x-ebpf-runtime-status": "request_rejected",
        "x-sandbox-trace-id": traceId,
      }));
      setLastRunAt(Date.now());
      setTraceLines([
        `[${elapsed}ms] ${httpMethod} /v1/${endpointUrl}`,
        `[${elapsed}ms] request rejected: ${message}`,
        `trace_id: ${traceId}`,
      ]);
      setNotice(message);
    } finally {
      setIsExecuting(false);
    }
  };

  const copyText = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setNotice("Copied to clipboard.");
      return true;
    } catch {
      setNotice("Clipboard access was denied by the browser.");
      return false;
    }
  };

  const handleCopyResponse = async () => {
    if (await copyText(responseBody)) {
      setCopiedResponse(true);
      window.setTimeout(() => setCopiedResponse(false), 2000);
    }
  };

  const handleCopyKernel = async () => {
    if (await copyText(sessionId)) {
      setCopiedKernel(true);
      window.setTimeout(() => setCopiedKernel(false), 2000);
    }
  };

  const handleFormatJson = () => {
    try {
      const obj = JSON.parse(requestBody);
      setRequestBody(JSON.stringify(obj, null, 2));
      setNotice("Request JSON formatted.");
    } catch {
      setNotice("Invalid JSON syntax in request body.");
    }
  };

  const handleGenerateToken = () => {
    const randomTok = `tok_visa_synthetic_${Math.floor(1000 + Math.random() * 9000)}`;
    try {
      const parsed = JSON.parse(requestBody);
      if (
        parsed.payment_method &&
        typeof parsed.payment_method === "object"
      ) {
        parsed.payment_method.token = randomTok;
        setRequestBody(JSON.stringify(parsed, null, 2));
      } else {
        parsed.payment_method = { type: "card", token: randomTok };
        setRequestBody(JSON.stringify(parsed, null, 2));
      }
      setNotice(`Generated synthetic token ${randomTok}.`);
    } catch (error) {
      setNotice(
        error instanceof Error
          ? `Fix the request JSON before generating a token: ${error.message}`
          : "Fix the request JSON before generating a token.",
      );
    }
  };

  const handleAddSyntheticRecords = () => {
    setMockCustomersCount((prev) => prev + 1000);
    setRecords((previous) => [
      ...Array.from({ length: 1000 }, (_, index) => {
        const sequence = mockCustomersCount + index + 1;
        const name = `Synthetic User ${sequence}`;
        return {
          id: `cust_syn_${sequence.toString(36)}`,
          name,
          email: `synthetic.user.${sequence}@sandbox.internal`,
          avatar: `S${sequence % 10}`,
          volume: `$${((sequence * 37) % 10000).toFixed(2)} MOCK`,
          status:
            sequence % 8 === 0
              ? "RATE_LIMIT_TEST_ACTIVE" as const
              : "AUTH_VERIFIED_SIMULATED" as const,
          security: "SHA-256 Masked",
          securityBadge: sequence % 8 === 0 ? "Faker Guard Filtered" : undefined,
          webhookDispatched: sequence % 3 === 0,
        };
      }),
      ...previous,
    ]);
    setNotice("Added 1,000 synthetic customer records to the in-memory ledger.");
  };

  const handleFlushEphemeralDb = () => {
    setRecords([]);
    setMockCustomersCount(0);
    setSimulatedTxCount(0);
    setMockSessionsCount(0);
    setCurrentPage(1);
    setNotice("Ephemeral in-memory ledger flushed.");
  };

  const handleResetState = () => {
    setRecords(INITIAL_RECORDS);
    setMockCustomersCount(250);
    setSimulatedTxCount(1241);
    setMockSessionsCount(12);
    setRequestBody(DEFAULT_REQUEST_BODY);
    setResponseBody(DEFAULT_RESPONSE_BODY);
    setStatusCode(201);
    setLatencyValue("28ms");
    setPayloadSize("1.4 KB");
    setLastRunAt(null);
    setResponseHeaders({
      "content-type": "application/json; charset=utf-8",
      "x-codeplane-airgap": "enabled; isolated-v4",
      "x-synthetic-latency": "28ms",
      "x-faker-seed": "alpha_49",
      "x-ebpf-runtime-status": "kernel_pass_ok",
      "x-ratelimit-remaining": "994",
      server: "codeplane-mock-edge/3.2",
    });
    setSnapshots([]);
    setIsSnapshotPanelOpen(false);
    setCurrentPage(1);
    setNotice("Sandbox state reset to its demo baseline.");
  };

  const filteredRecords = useMemo(
    () =>
      records.filter((record) => {
        if (
          activeFilter === "auth" &&
          record.status !== "AUTH_VERIFIED_SIMULATED"
        )
          return false;
        if (
          activeFilter === "rate" &&
          record.status !== "RATE_LIMIT_TEST_ACTIVE"
        )
          return false;
        if (activeFilter === "webhook" && !record.webhookDispatched)
          return false;
        if (!searchQuery.trim()) return true;
        const query = searchQuery.trim().toLowerCase();
        return [
          record.id,
          record.name,
          record.email,
          record.volume,
          record.security,
          record.status,
        ].some((value) => value.toLowerCase().includes(query));
      }),
    [records, activeFilter, searchQuery],
  );
  const pageSize = 5;
  const pageCount = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const visibleRecords = filteredRecords.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );
  const exportSchema = () => {
    const schema = {
      openapi: "3.1.0",
      info: { title: "Devpulse Local Sandbox API", version: "1.0.0" },
      servers: [{ url: "local://sandbox/v1", description: "In-browser simulator" }],
      paths: {
        [`/${endpointUrl.replace(/^\/+/, "")}`]: {
          [httpMethod.toLowerCase()]: {
            summary: `${httpMethod} ${endpointUrl}`,
            responses: {
              [String(statusCode)]: {
                description: "Latest local sandbox response",
              },
            },
          },
        },
      },
      components: {
        schemas: {
          SyntheticResponse: {
            type: "object",
            properties: {
              id: { type: "string" },
              status: { type: "string" },
              synthetic_mode: { type: "boolean" },
            },
          },
        },
      },
    };
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(schema, null, 2)], {
        type: "application/json",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "devpulse-sandbox-openapi.json";
    anchor.click();
    URL.revokeObjectURL(url);
    setNotice("OpenAPI schema downloaded.");
  };

  const applyScenario = (nextScenario: string) => {
    const preset = SCENARIOS[nextScenario];
    if (!preset) return;
    setScenario(nextScenario);
    setEndpointUrl(preset.endpoint);
    setHttpMethod(preset.method);
    setRequestBody(preset.body);
    setRequestTab("body");
    setNotice(`Loaded ${nextScenario} preset.`);
  };

  const snapshotSandbox = () => {
    const snapshot = {
      id: createId("snap"),
      createdAt: new Date().toISOString(),
      records: records.map((record) => ({ ...record })),
      transactionCount: simulatedTxCount,
      customerCount: mockCustomersCount,
      sessionCount: mockSessionsCount,
    };
    setSnapshots((previous) => [snapshot, ...previous]);
    setIsSnapshotPanelOpen(true);
    setNotice(`Snapshot ${snapshot.id} created (${snapshot.records.length} records).`);
  };

  const toggleRecordState = (recordId: string) => {
    setRecords((previous) =>
      previous.map((record) => {
        if (record.id !== recordId) return record;
        return record.status === "AUTH_VERIFIED_SIMULATED"
          ? {
              ...record,
              status: "RATE_LIMIT_TEST_ACTIVE",
              securityBadge: "Faker Guard Filtered",
            }
          : {
              ...record,
              status: "AUTH_VERIFIED_SIMULATED",
              securityBadge: undefined,
            };
      }),
    );
    setNotice(`Simulation state changed for ${recordId}.`);
  };

  return (
    <div className="min-h-full w-full max-w-none bg-ide-bg text-ide-text-secondary font-sans px-[clamp(16px,2.4vw,26px)] pt-0 pb-3 select-none space-y-[18px]">

      {/* 1. TOP SANDBOX HEADER STATUS BAR (Pixel-matched) */}
      <div className="sticky top-0 z-40 -mx-[clamp(16px,2.4vw,26px)] flex h-[58px] flex-nowrap items-center justify-between gap-2 border-b border-ide-border-strong bg-ide-bg px-[clamp(16px,2.4vw,26px)]">
        {/* Brand & Subtitle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPage("workspaces")}
            aria-label="Return to workspaces"
            title="Return to workspaces"
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{
              backgroundColor: LOGO_COLORS.background,
              borderColor: LOGO_COLORS.background,
              color: LOGO_COLORS.foreground,
              boxShadow: LOGO_COLORS.shadow,
            }}
          >
            <Layers className="w-4 h-4" />
          </button>
          <div>
            <div className="flex min-w-0 items-center gap-2">
              <span
                className="font-bold text-sm tracking-tight"
                style={{ color: LOGO_COLORS.wordmarkStrong }}
              >
                Devpulse
              </span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-ide-surface-hover text-[var(--ide-color-info-readable)] border border-ide-info tracking-wider">
                SANDBOX V4.2
              </span>
            </div>
            <div className="text-[8px] font-mono tracking-widest text-ide-text-placeholder uppercase">
              ISOLATED TELEMETRY & VIRTUAL API FABRIC
            </div>
          </div>
        </div>

        {/* Center Indicators */}
        <div className="flex min-w-0 items-center justify-end gap-1.5 sm:gap-2">
          {/* Env / Synthetic Mesh Pill */}
          <div className="hidden min-[900px]:flex items-center gap-2 px-2.5 py-1 rounded-full bg-ide-surface border border-ide-border-strong text-[9px] font-mono">
            <span className="w-2 h-2 rounded-full bg-ide-warning animate-pulse" />
            <span className="text-[var(--ide-color-info-readable)]">env:</span>
            <span className="max-w-[90px] truncate text-ide-text-strong font-medium">{scenario.toLowerCase().replaceAll(" ", "-").replaceAll("/", "-")}</span>
          </div>

          {/* Ephemeral Probe Live */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-ide-success/10 border border-ide-success/50 text-[9px] font-mono text-[var(--ide-color-success-readable)]">
            <span className="w-2 h-2 rounded-full bg-ide-success" />
            <span className="text-ide-text-strong">Probe Live</span>
            <span className="text-[var(--ide-color-success-readable)]">• {runtimeLatency}ms</span>
          </div>

          {/* 100% Air-Gapped Pill */}
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-full bg-ide-surface border border-ide-info text-[9px] font-mono text-[var(--ide-color-info-readable)]">
            <ShieldCheck className="w-3.5 h-3.5 text-ide-info" />
            <span className="font-medium text-ide-text-strong">100% Air-Gapped</span>
          </div>

          {/* Export Schema Button */}
          <button
            onClick={exportSchema}
            className="hidden sm:flex items-center gap-1 px-2 py-1.5 rounded-lg bg-ide-surface hover:bg-ide-surface-hover border border-ide-modal-border text-ide-text-strong text-[9px] font-mono transition-colors shadow-sm"
          >
            <ExternalLink className="w-3.5 h-3.5 text-ide-info" />
            <span>Export Schema</span>
          </button>

          {/* Bell Notifications */}
          <button
            onClick={() =>
              snapshots.length
                ? setIsSnapshotPanelOpen((open) => !open)
                : setNotice("No sandbox alerts. Requests run locally and do not reach production.")
            }
            className="w-7 h-7 rounded-lg bg-ide-surface hover:bg-ide-surface-hover border border-ide-modal-border flex items-center justify-center text-ide-info transition-colors relative"
          >
            <Activity className="w-4 h-4 text-ide-info" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-ide-info" />
          </button>

          {/* User Avatar */}
          <div className="flex items-center gap-2 pl-1">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-ide-info to-ide-accent flex items-center justify-center text-ide-text-strong text-[10px] font-bold ring-2 ring-ide-focus-ring/40">
              {user.name
                .split(/\s+/)
                .filter(Boolean)
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div className="hidden min-[900px]:block text-left text-xs leading-tight">
              <div className="font-semibold text-ide-text-strong">{user.name}</div>
              <div className="text-[10px] text-ide-text-dim">{user.role}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SUB-BANNER: ISOLATED RUNTIME ACTIVE + CLUSTER INFO + SHIELD BANNER */}
      {notice && (
        <div
          role="status"
          className="fixed right-4 top-16 z-50 flex max-w-lg items-start gap-3 rounded-lg border border-ide-info bg-ide-surface px-3 py-2 text-xs text-ide-text shadow-xl"
        >
          <span className="flex-1">{notice}</span>
          <button
            type="button"
            aria-label="Dismiss notice"
            onClick={() => setNotice("")}
            className="text-ide-info hover:text-ide-text-strong"
          >
            ×
          </button>
        </div>
      )}
      {isSnapshotPanelOpen && (
        <div className="fixed right-4 top-16 z-50 w-[min(24rem,calc(100vw-2rem))] rounded-lg border border-ide-modal-border bg-ide-surface p-3 shadow-2xl">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-bold text-ide-text-strong">Sandbox snapshots</h2>
            <button
              type="button"
              onClick={() => setIsSnapshotPanelOpen(false)}
              className="text-xs text-ide-info hover:text-ide-text-strong"
            >
              Close
            </button>
          </div>
          {snapshots.length === 0 ? (
            <p className="text-xs text-ide-info">No snapshots yet.</p>
          ) : (
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {snapshots.map((snapshot) => (
                <div
                  key={snapshot.id}
                  className="flex items-center justify-between gap-3 rounded border border-ide-modal-border bg-ide-panel p-2"
                >
                  <div className="min-w-0">
                    <div className="truncate font-mono text-[10px] text-ide-info">
                      {snapshot.id}
                    </div>
                    <div className="text-[10px] text-ide-muted">
                      {new Date(snapshot.createdAt).toLocaleString()} ·{" "}
                      {snapshot.records.length} visible records
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setRecords(snapshot.records.map((record) => ({ ...record })));
                      setMockCustomersCount(snapshot.customerCount);
                      setSimulatedTxCount(snapshot.transactionCount);
                      setMockSessionsCount(snapshot.sessionCount);
                      setCurrentPage(1);
                      setIsSnapshotPanelOpen(false);
                      setNotice(`Restored ${snapshot.id}.`);
                    }}
                    className="shrink-0 rounded border border-ide-info px-2 py-1 text-[10px] text-ide-text-strong hover:bg-ide-surface-raised"
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="min-h-[220px] rounded-xl border border-ide-border-strong bg-ide-panel p-[15px] space-y-3">
      <div className="grid grid-cols-1 min-[900px]:grid-cols-[minmax(0,1fr)_250px] items-start gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-ide-success/10 border border-ide-success text-xs font-mono font-medium text-ide-success">
            <span className="w-2 h-2 rounded-full bg-ide-success animate-pulse" />
            <span>ISOLATED RUNTIME ACTIVE</span>
          </div>

          <div className="text-xs font-mono text-ide-text-quiet flex items-center gap-1.5">
            <span>Cluster:</span>
            <span className="text-ide-text font-semibold">browser-local (isolated)</span>
          </div>

          <div className="text-xs font-mono text-ide-text-quiet flex items-center gap-1.5">
            <span>Kernel:</span>
            <span className="text-ide-info font-semibold">local-simulator-v1</span>
          </div>

          {/* Session ID Chip with Copy */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-ide-surface-raised border border-ide-modal-border text-xs font-mono text-ide-info">
            <span>Session ID:</span>
            <span className="text-ide-text-strong">{sessionId}</span>
            <button
              onClick={handleCopyKernel}
              className="text-ide-text-dim hover:text-ide-text-strong transition-colors"
              title="Copy session id"
            >
              {copiedKernel ? <Check className="w-3.5 h-3.5 text-ide-success" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Green Shield Banner */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-ide-info/10 border border-ide-success/40 text-xs font-mono text-ide-success min-[900px]:justify-self-end">
          <ShieldCheck className="w-4 h-4 text-ide-success shrink-0" />
          <span className="font-medium text-ide-success">
            Shield Active: 100% Synthetic & Zero Production Impact
          </span>
        </div>
      </div>

      {/* 3. VIRTUAL SANDBOX CONTROLS HEADER BAR */}
      <div className="grid grid-cols-1 min-[1200px]:grid-cols-[1.2fr_1fr] items-start gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold text-ide-text-strong tracking-tight">
              Virtual Sandbox: {scenario}
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-ide-surface-raised text-ide-info border border-ide-info/60">
              Faker Engine v5.4
            </span>
          </div>
          <p className="text-xs text-ide-muted mt-1 max-w-2xl">
            A local synthetic API simulator. Requests stay in this browser and never reach production services.
          </p>

        </div>

        {/* Right Actions */}
        <div className="grid min-w-0 grid-cols-2 items-center gap-1.5">
          {/* Scenario Selector Dropdown */}
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 text-[10px] font-mono text-ide-muted">Scenario:</span>
            <div className="relative min-w-0 flex-1">
              <select
                value={scenario}
                onChange={(e) => applyScenario(e.target.value)}
                className="block w-full min-w-0 truncate appearance-none bg-ide-surface border border-ide-modal-border text-ide-text-strong text-xs font-mono rounded-lg px-2 py-2 pr-6 hover:border-ide-info focus:outline-none focus:ring-1 focus:ring-ide-focus-ring transition-colors cursor-pointer"
              >
                <option value="Fintech / Payments v2">Fintech / Payments v2</option>
                <option value="Auth & Session Token Verification">Auth & Session Token Verification</option>
                <option value="Rate Limit & Backoff Emulation">Rate Limit & Backoff Emulation</option>
                <option value="High Load eBPF Simulation">High Load eBPF Simulation</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-ide-text-dim absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Add Synthetic Records */}
          <button
            onClick={handleAddSyntheticRecords}
            className="flex items-center justify-center gap-1 px-2 py-2 rounded-lg bg-ide-accent border border-ide-accent/60 hover:bg-ide-accent/90 text-ide-accent-fg text-[10px] font-mono font-medium transition-all shadow-md whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>+1,000 Synthetic Records</span>
          </button>

          {/* Snapshot Button */}
          <button
            onClick={snapshotSandbox}
            className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-ide-surface-raised border border-ide-modal-border hover:bg-ide-surface-hover text-ide-text-strong text-xs font-mono transition-colors"
          >
            <Camera className="w-3.5 h-3.5 text-ide-info" />
            <span>Snapshot</span>
          </button>

          {/* Reset State Button */}
          <button
            onClick={handleResetState}
            className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-ide-surface-raised border border-ide-modal-border hover:bg-ide-surface-hover text-ide-danger text-xs font-mono transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset State</span>
          </button>
        </div>
      </div>
      {/* Presets Chips */}
      <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
        <span className="text-ide-text-placeholder uppercase tracking-wider text-[10px]">PRESETS:</span>
        <button
          onClick={() => applyScenario("Fintech / Payments v2")}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-ide-surface-raised/80 border border-ide-info/50 hover:bg-ide-info text-[var(--ide-color-info-readable)] hover:text-[var(--ide-color-secondary-fg)] transition-colors"
        >
          <span>+ Stripe/Ledger v2.4</span>
        </button>
        <button
          onClick={() => applyScenario("Auth0 / Token Verification")}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-ide-surface-raised border border-ide-modal-border hover:bg-ide-surface-hover-strong text-ide-text transition-colors"
        >
          <Key className="w-3 h-3 text-ide-warning" />
          <span>Auth0 & JWT Verification</span>
        </button>
        <button
          onClick={() => applyScenario("Kafka / SQS Event Bus")}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-ide-surface-raised border border-ide-modal-border hover:bg-ide-surface-hover-strong text-ide-text transition-colors"
        >
          <Radio className="w-3 h-3 text-ide-info" />
          <span>Kafka / SQS Event Bus</span>
        </button>
        <button
          onClick={() => applyScenario("Apollo Federation Subgraph")}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-ide-surface-raised border border-ide-modal-border hover:bg-ide-surface-hover-strong text-ide-text transition-colors"
        >
          <Layers className="w-3 h-3 text-ide-info" />
          <span>Apollo Federation Subgraph</span>
        </button>
      </div>
      </div>

      {/* 4. FOUR TELEMETRY & STATS CARDS */}
      <div className="grid grid-cols-1 min-[520px]:grid-cols-2 min-[1100px]:grid-cols-4 gap-3">
        {/* Card 1: Virtual Isolation */}
        <div className="h-[112px] p-2.5 rounded-lg bg-ide-panel border border-ide-border-strong flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between text-ide-muted">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider">
              VIRTUAL ISOLATION
            </span>
            <div className="w-6 h-6 rounded-md bg-ide-surface-raised border border-ide-modal-border flex items-center justify-center text-ide-info">
              <Lock className="w-3 h-3 text-ide-info" />
            </div>
          </div>
          <div className="mt-1 min-w-0">
            <div className="whitespace-nowrap text-xl font-black text-ide-text-strong font-mono tracking-tight flex items-baseline gap-2">
              100%
              <span className="text-xs font-semibold text-ide-info font-mono">Air-Gapped</span>
            </div>
            <div className="truncate whitespace-nowrap text-[9px] font-mono text-ide-text-placeholder mt-0.5">
              Ephemeral RAM • Zero Live DB writes
            </div>
          </div>
          {/* Progress bar line */}
          <div className="w-full h-1 bg-ide-surface-raised rounded-full overflow-hidden mt-3">
            <div className="w-full h-full bg-ide-info" />
          </div>
        </div>

        {/* Card 2: Synthetic Masking */}
        <div className="h-[112px] p-2.5 rounded-lg bg-ide-panel border border-ide-border-strong flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between text-ide-muted">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider">
              SYNTHETIC MASKING
            </span>
            <div className="w-6 h-6 rounded-md bg-ide-success/10 border border-ide-success flex items-center justify-center text-ide-success">
              <Fingerprint className="w-3 h-3 text-ide-success" />
            </div>
          </div>
          <div className="mt-1 min-w-0">
            <div className="whitespace-nowrap text-xl font-black text-ide-text-strong font-mono tracking-tight flex items-baseline gap-2">
              0 PII
              <span className="text-xs font-semibold text-ide-success font-mono">Masked</span>
            </div>
            <div className="truncate whitespace-nowrap text-[9px] font-mono text-ide-text-placeholder mt-0.5">
              Synthetic data • Seed alpha_49
            </div>
          </div>
          <div className="w-full h-1 bg-ide-surface-raised rounded-full overflow-hidden mt-3">
            <div className="w-full h-full bg-ide-success" />
          </div>
        </div>

        {/* Card 3: Gateway Telemetry */}
        <div className="h-[112px] p-2.5 rounded-lg bg-ide-panel border border-ide-border-strong flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between text-ide-muted">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider">
              GATEWAY TELEMETRY
            </span>
            <div className="w-6 h-6 rounded-md bg-ide-surface-raised border border-ide-warning flex items-center justify-center text-ide-warning">
              <Activity className="w-3 h-3 text-ide-warning" />
            </div>
          </div>
          <div className="mt-1 min-w-0">
            <div className="whitespace-nowrap text-xl font-black text-ide-text-strong font-mono tracking-tight flex items-baseline gap-2">
              {runtimeLatency}ms
              <span className="text-xs font-semibold text-ide-warning font-mono">
                {requestsPerMinute}/1000 RPM
              </span>
            </div>
            <div className="truncate whitespace-nowrap text-[9px] font-mono text-ide-text-placeholder mt-0.5">
              Local requests • no upstream connection
            </div>
          </div>
          <div className="w-full h-1 bg-ide-surface-raised rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-ide-warning transition-all"
              style={{ width: `${rateLimitPercent}%` }}
            />
          </div>
        </div>

        {/* Card 4: Security Envelope */}
        <div className="h-[112px] p-2.5 rounded-lg bg-ide-panel border border-ide-border-strong flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between text-ide-muted">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider">
              SECURITY ENVELOPE
            </span>
            <div className="w-6 h-6 rounded-md bg-ide-surface-raised border border-ide-secondary flex items-center justify-center text-ide-secondary">
              <ShieldCheck className="w-3 h-3 text-ide-secondary" />
            </div>
          </div>
          <div className="mt-1 min-w-0">
            <div className="whitespace-nowrap text-xl font-black text-ide-text-strong font-mono tracking-tight flex items-baseline gap-2">
              TLS 1.3
              <span className="text-xs font-semibold text-ide-secondary font-mono">mTLS Mock</span>
            </div>
            <div className="truncate whitespace-nowrap text-[9px] font-mono text-ide-text-placeholder mt-0.5">
              Synthetic JWT • SHA-256 Digest Enforced
            </div>
          </div>
          <div className="w-full h-1 bg-ide-surface-raised rounded-full overflow-hidden mt-3">
            <div className="w-full h-full bg-ide-secondary" />
          </div>
        </div>
      </div>

      {/* 5. WORKBENCH TWO-COLUMN: HTTP REQUEST WORKBENCH (LEFT) + SIMULATED RESPONSE (RIGHT) */}
      <div className="grid grid-cols-1 min-[1200px]:grid-cols-[minmax(0,1.42fr)_minmax(0,1fr)] gap-4">

        {/* LEFT COLUMN: HTTP REQUEST WORKBENCH */}
        <div className="p-3 rounded-lg bg-ide-panel border border-ide-border-strong flex flex-col justify-between space-y-2">

          {/* Top Bar inside Request Workbench */}
          <div className="flex items-center justify-between pb-2 border-b border-ide-border-strong">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-ide-surface-raised flex items-center justify-center text-ide-info">
                <Code2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-ide-text-strong tracking-tight">HTTP Request Workbench</h2>
                <div className="text-[10px] font-mono text-ide-text-placeholder">OpenAPI 3.1 Contract Validated</div>
              </div>
            </div>

            {/* Latency Simulator Dropdown */}
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="text-ide-warning text-[11px] flex items-center gap-1">
                <span>⏱</span> Latency Sim:
              </span>
              <div className="relative">
                <select
                  value={latencySim}
                  onChange={(e) => setLatencySim(e.target.value)}
                  className="appearance-none bg-ide-surface border border-ide-modal-border text-xs text-[var(--ide-color-info-readable)] font-mono rounded px-2.5 py-1 pr-6 hover:border-ide-info focus:outline-none cursor-pointer"
                >
                  <option value="24ms (Realistic Edge)">24ms (Realistic Edge)</option>
                  <option value="5ms (In-Memory MicroVM)">5ms (In-Memory MicroVM)</option>
                  <option value="120ms (Cross-Region Simulated)">120ms (Cross-Region Simulated)</option>
                  <option value="450ms (Jitter Spikes)">450ms (Jitter Spikes)</option>
                </select>
                <ChevronDown className="w-3 h-3 text-ide-text-dim absolute right-1.5 top-2 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* URL bar + Method + Execute Button */}
          <div className="flex items-center gap-2">
            {/* Method selector */}
            <div className="relative">
              <select
                value={httpMethod}
                onChange={(e) => setHttpMethod(e.target.value as HttpMethod)}
                className="appearance-none bg-ide-surface-raised border border-ide-info/70 text-[var(--ide-color-info-readable)] font-bold text-xs font-mono rounded-lg px-2 py-2 pr-6 hover:border-ide-info focus:outline-none cursor-pointer"
              >
                <option value="POST">POST</option>
                <option value="GET">GET</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
              </select>
              <ChevronDown className="w-3 h-3 text-ide-info absolute right-2 top-3 pointer-events-none" />
            </div>

            {/* URL Input Bar */}
            <div className="flex min-w-0 flex-1 items-center bg-ide-bg border border-ide-border-strong rounded-lg px-3 py-2 text-xs font-mono">
              <span className="text-ide-subtle mr-1 hidden min-[1024px]:inline">local://sandbox/v1/</span>
              <input
                type="text"
                value={endpointUrl}
                onChange={(e) => setEndpointUrl(e.target.value)}
                className="min-w-0 bg-transparent text-ide-text-strong focus:outline-none flex-1 font-mono text-xs"
              />
              <button
                onClick={() => {
                  void copyText(
                    `local://sandbox/v1/${endpointUrl.replace(/^\/+/, "")}`,
                  );
                }}
                className="text-ide-text-dim hover:text-ide-text-strong transition-colors ml-2"
                title="Copy URL"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Execute Button */}
            <button
              onClick={handleExecute}
              disabled={isExecuting}
              className="scroll-mt-16 flex shrink-0 items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-ide-info to-ide-info hover:from-ide-info hover:to-ide-info text-[var(--ide-color-secondary-fg)] font-mono text-xs font-bold transition-all shadow-lg shadow-indigo-900/30 active:scale-95 disabled:cursor-not-allowed"
            >
              {isExecuting ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Zap className="w-3.5 h-3.5 fill-current" />
              )}
              <span>Execute</span>
            </button>
          </div>

          {/* Sub Navigation Tabs (Body, Auth & Headers, Params, Mock Rules, Schema) */}
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-b border-ide-border-strong pt-1">
            <div className="flex min-w-0 flex-wrap items-center gap-1">
              <button
                onClick={() => setRequestTab("body")}
                className={`px-3 py-1.5 rounded-t-lg text-xs font-mono font-medium transition-colors ${
                  requestTab === "body"
                    ? "bg-ide-surface-raised text-[var(--ide-color-info-readable)] border-t-2 border-ide-info"
                    : "text-ide-text-dim hover:text-ide-text-strong"
                }`}
              >
                Body (JSON)
              </button>
              <button
                onClick={() => setRequestTab("auth")}
                className={`px-3 py-1.5 rounded-t-lg text-xs font-mono font-medium transition-colors flex items-center gap-1.5 ${
                  requestTab === "auth"
                    ? "bg-ide-surface-raised text-[var(--ide-color-info-readable)] border-t-2 border-ide-info"
                    : "text-ide-text-dim hover:text-ide-text-strong"
                }`}
              >
                <span>Auth & Headers</span>
                <span                 className="w-4 h-4 rounded-full bg-ide-surface-raised text-ide-text-strong text-[9px] flex items-center justify-center font-bold">
                {getJsonKeyCount(requestHeaders) + 1}
                </span>
              </button>
              <button
                onClick={() => setRequestTab("params")}
                className={`px-3 py-1.5 rounded-t-lg text-xs font-mono font-medium transition-colors flex items-center gap-1.5 ${
                  requestTab === "params"
                    ? "bg-ide-surface-raised text-[var(--ide-color-info-readable)] border-t-2 border-ide-info"
                    : "text-ide-text-dim hover:text-ide-text-strong"
                }`}
              >
                <span>Params</span>
                <span                 className="w-4 h-4 rounded-full bg-ide-success text-ide-text-strong text-[9px] flex items-center justify-center font-bold">
                  {getJsonKeyCount(queryParams)}
                </span>
              </button>
              <button
                onClick={() => setRequestTab("rules")}
                className={`px-3 py-1.5 rounded-t-lg text-xs font-mono font-medium transition-colors ${
                  requestTab === "rules"
                    ? "bg-ide-surface-raised text-[var(--ide-color-info-readable)] border-t-2 border-ide-info"
                    : "text-ide-text-dim hover:text-ide-text-strong"
                }`}
              >
                Mock Rules
              </button>
              <button
                onClick={() => setRequestTab("schema")}
                className={`px-3 py-1.5 rounded-t-lg text-xs font-mono font-medium transition-colors ${
                  requestTab === "schema"
                    ? "bg-ide-surface-raised text-[var(--ide-color-info-readable)] border-t-2 border-ide-info"
                    : "text-ide-text-dim hover:text-ide-text-strong"
                }`}
              >
                Schema
              </button>
            </div>

            {/* Format & Generate Token Buttons */}
            <div className="ml-auto flex shrink-0 items-center gap-2 pb-1">
              <button
                onClick={handleFormatJson}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-ide-surface hover:bg-ide-surface-raised border border-ide-border-strong text-ide-text-strong text-[11px] font-mono transition-colors"
              >
                <Code2 className="w-3 h-3 text-ide-info" />
                <span>Format</span>
              </button>
              <button
                onClick={handleGenerateToken}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-ide-accent border border-ide-accent/60 hover:bg-ide-accent/90 text-ide-accent-fg text-[11px] font-mono transition-colors"
              >
                <Sparkles className="w-3 h-3" />
                <span>Generate Token</span>
              </button>
            </div>
          </div>

          {/* JSON Textarea Body */}
          <div className="relative min-h-[241px] rounded-lg bg-ide-bg border border-ide-border-strong p-3 font-mono text-xs overflow-hidden">
            {requestTab === "body" && (
              <textarea
                aria-label="Request JSON body"
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                className="h-full min-h-[221px] w-full bg-transparent text-ide-info font-mono text-xs focus:outline-none resize-y leading-relaxed"
                spellCheck={false}
              />
            )}
            {requestTab === "auth" && (
              <div className="space-y-4">
                <label className="block space-y-1.5 text-ide-text-strong">
                  <span>Bearer token (synthetic only)</span>
                  <input
                    value={authToken}
                    onChange={(event) => setAuthToken(event.target.value)}
                    className="w-full rounded border border-ide-border-strong bg-ide-panel px-3 py-2 text-ide-text outline-none focus:border-ide-info"
                  />
                </label>
                <label className="block space-y-1.5 text-ide-info">
                  <span>Request headers (JSON)</span>
                  <textarea
                    value={requestHeaders}
                    onChange={(event) => setRequestHeaders(event.target.value)}
                    className="min-h-32 w-full rounded border border-ide-border-strong bg-ide-panel px-3 py-2 text-ide-info outline-none focus:border-ide-info"
                    spellCheck={false}
                  />
                </label>
              </div>
            )}
            {requestTab === "params" && (
              <label className="block space-y-1.5 text-ide-info">
                <span>Query parameters (JSON)</span>
                <textarea
                  value={queryParams}
                  onChange={(event) => setQueryParams(event.target.value)}
                  className="min-h-52 w-full rounded border border-ide-border-strong bg-ide-panel px-3 py-2 text-ide-info outline-none focus:border-ide-info"
                  spellCheck={false}
                />
              </label>
            )}
            {requestTab === "rules" && (
              <label className="block space-y-1.5 text-ide-info">
                <span>Mock response rules (JSON)</span>
                <textarea
                  value={mockRules}
                  onChange={(event) => setMockRules(event.target.value)}
                  className="min-h-52 w-full rounded border border-ide-border-strong bg-ide-panel px-3 py-2 text-ide-info outline-none focus:border-ide-info"
                  spellCheck={false}
                />
              </label>
            )}
            {requestTab === "schema" && (
              <div className="space-y-2 text-ide-info">
                <div>Request body schema for {httpMethod} /{endpointUrl}</div>
                <pre className="overflow-auto whitespace-pre-wrap text-ide-info">
                  {JSON.stringify(
                    {
                      type: "object",
                      additionalProperties: true,
                      example: (() => {
                        try {
                          return JSON.parse(requestBody) as unknown;
                        } catch {
                          return "Enter valid JSON to preview the body schema.";
                        }
                      })(),
                    },
                    null,
                    2,
                  )}
                </pre>
              </div>
            )}
          </div>

          {/* Bottom Verification Footer in Left Column */}
          <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-ide-text-placeholder pt-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-ide-success" />
              <span className="text-ide-info">Strict RFC 8259 • OpenAPI 3.1 Validated</span>
            </div>
            <div>
              <span className="text-ide-text-dim">Deterministic Seed:</span>{" "}
              <span className="text-ide-text font-semibold">alpha_49</span>{" "}
              <span className="text-ide-subtle">Bytes: {requestBytes.toLocaleString()} B</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: SIMULATED RESPONSE */}
        <div className="p-2 rounded-lg bg-ide-panel border border-ide-border-strong flex flex-col justify-between space-y-1">

          {/* Top Bar inside Response Workbench */}
          <div className="flex items-center justify-between pb-2 border-b border-ide-border-strong">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-ide-success/10 flex items-center justify-center text-ide-success">
                <Activity className="w-3.5 h-3.5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-ide-text-strong tracking-tight">Simulated Response</h2>
                <div className="text-[10px] font-mono text-ide-text-placeholder">Synthetic Output</div>
              </div>
            </div>

            {/* Status Pill */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-mono font-bold ${
                statusCode < 400
                  ? "bg-ide-success/10 border-ide-success/70 text-[var(--ide-color-success-readable)]"
                  : statusCode === 429
                    ? "bg-ide-warning/10 border-ide-warning text-[var(--ide-color-warning-readable)]"
                    : "bg-ide-danger/10 border-ide-danger text-[var(--ide-color-danger-readable)]"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  statusCode < 400
                    ? "bg-ide-success"
                    : statusCode === 429
                      ? "bg-ide-warning"
                      : "bg-ide-danger"
                }`}
              />
              <span>
                {statusCode}{" "}
                {statusCode === 201
                  ? "CREATED"
                  : statusCode === 200
                    ? "OK"
                    : statusCode === 401
                      ? "UNAUTHORIZED"
                      : statusCode === 429
                        ? "RATE LIMITED"
                        : "BAD REQUEST"}
              </span>
            </div>
          </div>

          {/* Response Telemetry Metrics */}
          <div className="grid grid-cols-4 gap-1 text-center font-mono py-1 px-2 rounded-lg bg-ide-bg border border-ide-border-strong">
            <div>
              <div className="text-[10px] text-ide-text-placeholder uppercase tracking-wider">LATENCY</div>
              <div className="text-xs font-bold text-[var(--ide-color-success-readable)] mt-0.5">{latencyValue}</div>
            </div>
            <div>
              <div className="text-[10px] text-ide-text-placeholder uppercase tracking-wider">PAYLOAD</div>
              <div className="text-xs font-bold text-ide-text-strong mt-0.5">{payloadSize}</div>
            </div>
            <div>
              <div className="text-[10px] text-ide-text-placeholder uppercase tracking-wider">VIRTUAL ID</div>
              <div className="text-xs font-bold text-[var(--ide-color-info-readable)] mt-0.5">
                {lastTraceId.slice(-8)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-ide-text-placeholder uppercase tracking-wider">CACHE</div>
              <div className="text-xs font-bold text-[var(--ide-color-warning-readable)] mt-0.5">
                {lastRunAt === null ? "READY" : "MISS (SIM)"}
              </div>
            </div>
          </div>

          {/* Sub Navigation Tabs (Response Body, Headers (11), eBPF Trace, SDK Snippet, Copy) */}
          <div className="flex items-center justify-between border-b border-ide-border-strong pt-1">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setResponseTab("body")}
                className={`px-2 py-1 rounded-t-lg text-[10px] font-mono font-medium transition-colors ${
                  responseTab === "body"
                    ? "bg-ide-surface-raised text-ide-text-strong border-t-2 border-ide-accent"
                    : "text-ide-text-dim hover:text-ide-text-strong"
                }`}
              >
                Response Body
              </button>
              <button
                onClick={() => setResponseTab("headers")}
                className={`px-2 py-1 rounded-t-lg text-[10px] font-mono font-medium transition-colors ${
                  responseTab === "headers"
                    ? "bg-ide-surface-raised text-ide-text-strong border-t-2 border-ide-accent"
                    : "text-ide-text-dim hover:text-ide-text-strong"
                }`}
              >
                Headers ({Object.keys(responseHeaders).length})
              </button>
              <button
                onClick={() => setResponseTab("ebpf")}
                className={`px-2 py-1 rounded-t-lg text-[10px] font-mono font-medium transition-colors ${
                  responseTab === "ebpf"
                    ? "bg-ide-surface-raised text-ide-text-strong border-t-2 border-ide-accent"
                    : "text-ide-text-dim hover:text-ide-info"
                }`}
              >
                eBPF Trace
              </button>
              <button
                onClick={() => setResponseTab("sdk")}
                className={`px-2 py-1 rounded-t-lg text-[10px] font-mono font-medium transition-colors ${
                  responseTab === "sdk"
                    ? "bg-ide-surface-raised text-ide-text-strong border-t-2 border-ide-accent"
                    : "text-ide-text-dim hover:text-ide-info"
                }`}
              >
                SDK Snippet
              </button>
            </div>

            {/* Copy Response Button */}
            <button
              onClick={handleCopyResponse}
              className="text-ide-text-dim hover:text-ide-text-strong transition-colors pb-1 pr-1"
              title="Copy JSON response"
            >
              {copiedResponse ? (
                <Check className="w-4 h-4 text-ide-success" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Response JSON Output */}
          <div className="relative rounded-lg bg-ide-bg border border-ide-border-strong p-3 font-mono text-xs overflow-hidden h-[300px] overflow-y-auto">
            {responseTab === "body" && (
              <pre className="text-ide-info leading-relaxed whitespace-pre-wrap font-mono text-xs">
                {responseBody}
              </pre>
            )}
            {responseTab === "headers" && (
              <div className="space-y-1.5 text-xs font-mono text-ide-info">
                {Object.entries(responseHeaders).map(([name, value]) => (
                  <div key={name}>
                    <span className="text-ide-info">{name}:</span>{" "}
                    {value}
                  </div>
                ))}
              </div>
            )}
            {responseTab === "ebpf" && (
              <div className="space-y-1 text-xs font-mono text-ide-success">
                {traceLines.map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </div>
            )}
            {responseTab === "sdk" && (
              <pre className="text-ide-secondary font-mono text-xs">
{`const response = await fetch("local://sandbox/v1/${endpointUrl.replace(/^\/+/, "")}", {
  method: "${httpMethod}",
  headers: ${JSON.stringify({ "Content-Type": "application/json", Authorization: authToken ? "Bearer [SYNTHETIC_TOKEN]" : "" }, null, 2)},
  body: ${httpMethod === "GET" || httpMethod === "DELETE" ? "undefined" : "JSON.stringify(" + JSON.stringify(requestBody) + ")"},
});

const result = await response.json();`}
              </pre>
            )}
          </div>

          <div className="text-[11px] font-mono text-ide-text-placeholder pt-1">
            Zero customer state persisted outside volatile node RAM.
          </div>
        </div>
      </div>

      {/* 6. BOTTOM TABLE: LIVE EPHEMERAL LEDGER & SYNTHETIC STATE TABLE */}
      <div className="rounded-lg border border-ide-border-strong bg-ide-panel p-3 space-y-3">

        {/* Table Top Header & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-ide-success border border-ide-success flex items-center justify-center text-ide-success">
              <Database className="w-4 h-4 text-ide-success" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-ide-text-strong tracking-tight">
                Live Ephemeral Ledger & Synthetic State Table
              </h2>
              <div className="text-[10px] font-mono text-ide-text-placeholder">
                Editable synthetic records held in this browser session
              </div>
            </div>
          </div>

          {/* Counts and Flush Button */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-ide-surface border border-ide-border-strong">
              <span className="w-2 h-2 rounded-full bg-ide-info" />
              <span className="text-ide-text-dim">mock_customers:</span>
              <span className="text-ide-text-strong font-bold">{mockCustomersCount}</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-ide-surface border border-ide-border-strong">
              <span className="w-2 h-2 rounded-full bg-ide-success" />
              <span className="text-ide-text-dim">simulated_tx:</span>
              <span className="text-ide-text-strong font-bold">{simulatedTxCount.toLocaleString()}</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-ide-surface border border-ide-border-strong">
              <span className="w-2 h-2 rounded-full bg-ide-warning" />
              <span className="text-ide-text-dim">mock_sessions:</span>
              <span className="text-ide-text-strong font-bold">{mockSessionsCount}</span>
            </div>

            <button
              onClick={handleFlushEphemeralDb}
              className="px-3 py-1 rounded bg-ide-surface-raised/80 border border-ide-modal-border hover:bg-ide-surface-hover text-ide-danger text-xs font-mono font-medium transition-colors"
            >
              0x Flush Ephemeral DB
            </button>
          </div>
        </div>

        {/* Search Bar & Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Input */}
          <div className="flex-1 min-w-[260px] max-w-xl flex items-center bg-ide-bg border border-ide-border-strong rounded-lg px-3 py-2 text-xs font-mono">
            <Search className="w-3.5 h-3.5 text-ide-subtle mr-2" />
            <input
              type="text"
              placeholder="Search synthetic identities, customer IDs, tokens, or hashes..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-ide-text-strong focus:outline-none flex-1 font-mono text-xs placeholder-ide-text-placeholder"
            />
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 text-xs font-mono">
            <button
              onClick={() => {
                setActiveFilter("all");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeFilter === "all"
                  ? "bg-ide-surface-raised text-ide-text-strong border border-ide-info"
                  : "text-ide-text-dim hover:text-ide-text-strong"
              }`}
            >
              All Entities
            </button>
            <button
              onClick={() => {
                setActiveFilter("auth");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeFilter === "auth"
                  ? "bg-ide-surface-raised text-ide-text-strong border border-ide-info"
                  : "text-ide-text-dim hover:text-ide-text-strong"
              }`}
            >
              Simulated Auth
            </button>
            <button
              onClick={() => {
                setActiveFilter("rate");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeFilter === "rate"
                  ? "bg-ide-surface-raised text-[var(--ide-color-info-readable)] border border-ide-info"
                  : "text-ide-text-dim hover:text-ide-text-strong"
              }`}
            >
              Rate Limited
            </button>
            <button
              onClick={() => {
                setActiveFilter("webhook");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg transition-colors ${
                activeFilter === "webhook"
                  ? "bg-ide-surface-raised text-[var(--ide-color-info-readable)] border border-ide-info"
                  : "text-ide-text-dim hover:text-ide-text-strong"
              }`}
            >
              Webhook Dispatched
            </button>
          </div>
        </div>

        {/* Table View */}
        <div className="rounded-xl border border-ide-border-strong overflow-hidden bg-ide-bg">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-ide-border-strong bg-ide-panel text-ide-text-placeholder uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-4">ENTITY ID</th>
                  <th className="py-2.5 px-4">SYNTHETIC IDENTITY & FAKER EMAIL</th>
                  <th className="py-2.5 px-4">VIRTUAL LEDGER VOLUME</th>
                  <th className="py-2.5 px-4">SIMULATION STATE</th>
                  <th className="py-2.5 px-4">SECURITY LEVEL</th>
                  <th className="py-2.5 px-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ide-border-subtle">
                {visibleRecords.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-xs text-ide-text-dim"
                    >
                      No synthetic records match this search or filter.
                    </td>
                  </tr>
                )}
                {visibleRecords.map((row) => (
                  <tr key={row.id} className="hover:bg-ide-surface transition-colors group">
                    {/* Entity ID */}
                    <td
                      className="py-3 px-4 font-bold text-ide-info cursor-pointer hover:underline"
                      onClick={() => setInspectedRecord(row)}
                    >
                      {row.id}
                    </td>

                    {/* Identity + Email */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-ide-surface-hover text-ide-info flex items-center justify-center text-[9px] font-bold">
                          {row.avatar}
                        </div>
                        <span className="text-ide-text font-medium">{row.email}</span>
                      </div>
                    </td>

                    {/* Virtual Ledger Volume */}
                    <td className="py-3 px-4 font-bold text-ide-warning">
                      {row.volume}
                    </td>

                    {/* Simulation State */}
                    <td className="py-3 px-4">
                      {row.status === "AUTH_VERIFIED_SIMULATED" ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-ide-success/10 border border-ide-success text-[10px] text-ide-success font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-ide-success" />
                          <span>AUTH_VERIFIED_SIMULATED</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-ide-warning/10 border border-ide-warning text-[10px] text-ide-warning font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-ide-warning" />
                          <span>RATE_LIMIT_TEST_ACTIVE</span>
                        </div>
                      )}
                    </td>

                    {/* Security Level */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-ide-surface-raised border border-ide-modal-border text-ide-text-soft text-[10px]">
                          {row.security}
                        </span>
                        {row.securityBadge && (
                          <span className="px-2 py-0.5 rounded bg-ide-surface-raised border border-ide-secondary text-ide-secondary text-[10px]">
                            {row.securityBadge}
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] ${
                            row.webhookDispatched
                              ? "bg-ide-success/10 text-ide-success"
                              : "bg-ide-surface-raised text-ide-text-dim"
                          }`}
                        >
                          {row.webhookDispatched ? "WEBHOOK_SENT" : "NO_WEBHOOK"}
                        </span>
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-3 font-medium">
                        <button
                          onClick={() => setInspectedRecord(row)}
                          className="text-ide-info hover:underline"
                        >
                          Inspect
                        </button>
                        <button
                          onClick={() => toggleRecordState(row.id)}
                          className="text-ide-text-dim hover:text-ide-text hover:underline"
                        >
                          Mutate
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Pagination & Memory Pool Footer */}
        <div className="flex flex-wrap items-center justify-between text-xs font-mono text-ide-text-dim pt-1">
          <div>
            Showing{" "}
            <span className="text-ide-text-strong font-semibold">
              {filteredRecords.length === 0
                ? 0
                : (currentPage - 1) * pageSize + 1}
              -
              {Math.min(currentPage * pageSize, filteredRecords.length)}
            </span>{" "}
            of{" "}
            <span className="text-ide-text-strong font-semibold">
              {filteredRecords.length.toLocaleString()}
            </span>{" "}
            entries • Memory Pool:{" "}
            <span className="text-ide-success font-bold">
              {memoryUsedMb.toFixed(1)} MB
            </span>{" "}
            / {memoryLimitMb} MB
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage <= 1}
              className="px-2.5 py-1 rounded bg-ide-surface border border-ide-border-strong hover:bg-ide-surface-raised text-ide-text-strong transition-colors"
            >
              &lt; Prev
            </button>
            <span className="px-2.5 py-1 rounded bg-ide-surface-raised border border-ide-info text-ide-text-strong font-bold">
              {currentPage} / {pageCount}
            </span>
            <button
              onClick={() =>
                setCurrentPage((page) => Math.min(pageCount, page + 1))
              }
              disabled={currentPage >= pageCount}
              className="px-2.5 py-1 rounded bg-ide-surface border border-ide-border-strong hover:bg-ide-surface-raised text-ide-text-strong transition-colors"
            >
              Next &gt;
            </button>
          </div>
        </div>
      </div>

      {/* 7. BOTTOM PLATFORM FOOTER STATUS STRIP (Pixel-matched) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-ide-border-strong pt-3 text-[11px] font-mono text-ide-text-placeholder">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[var(--ide-color-success-readable)]">
            <span className="w-2 h-2 rounded-full bg-ide-success" />
            <span className="font-bold text-ide-text-strong">Devpulse Local Simulator</span>
          </div>
          <span>•</span>
          <span>In-memory session</span>
          <span>•</span>
          <span className="text-ide-text-dim">Trace:</span>
          <span className="text-[var(--ide-color-info-readable)]">{lastTraceId}</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <span className="text-ide-text-dim">Last simulated latency:</span>
            <span className="text-[var(--ide-color-success-readable)] font-bold">{latencyValue}</span>
          </div>
          <div className="flex items-center gap-1 text-[var(--ide-color-info-readable)]">
            <span className="w-1.5 h-1.5 rounded-full bg-ide-success" />
            <span>No external requests sent</span>
          </div>
        </div>
      </div>

      {inspectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ide-overlay p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="sandbox-record-title"
            className="w-full max-w-lg rounded-xl border border-ide-modal-border bg-ide-surface p-4 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="sandbox-record-title"
                  className="text-sm font-bold text-ide-text-strong"
                >
                  Synthetic ledger record
                </h2>
                <p className="mt-1 font-mono text-xs text-ide-info">
                  {inspectedRecord.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectedRecord(null)}
                className="rounded px-2 py-1 text-ide-info hover:bg-ide-hover hover:text-ide-text-strong"
                aria-label="Close record details"
              >
                ×
              </button>
            </div>
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
              <dt className="text-ide-text-dim">Name</dt>
              <dd className="text-ide-text-strong">{inspectedRecord.name}</dd>
              <dt className="text-ide-text-dim">Email</dt>
              <dd className="break-all text-ide-text-strong">{inspectedRecord.email}</dd>
              <dt className="text-ide-text-dim">Ledger volume</dt>
              <dd className="text-ide-warning">{inspectedRecord.volume}</dd>
              <dt className="text-ide-text-dim">Simulation state</dt>
              <dd className="text-ide-text-strong">{inspectedRecord.status}</dd>
              <dt className="text-ide-text-dim">Webhook</dt>
              <dd className="text-ide-text-strong">
                {inspectedRecord.webhookDispatched ? "Dispatched" : "Not dispatched"}
              </dd>
              <dt className="text-ide-text-dim">Security</dt>
              <dd className="text-ide-text-strong">{inspectedRecord.security}</dd>
            </dl>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectedRecord(null)}
                className="rounded-lg border border-ide-modal-border px-3 py-2 text-xs text-ide-text-strong hover:bg-ide-hover"
              >
                Done
              </button>
            </div>
          </section>
        </div>
      )}

    </div>
  );
};
