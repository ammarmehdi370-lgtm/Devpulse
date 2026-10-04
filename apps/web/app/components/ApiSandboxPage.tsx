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
    <div className="min-h-full w-full max-w-none bg-[#07090e] text-[#c7d2e0] font-sans px-[clamp(16px,2.4vw,26px)] pt-0 pb-3 select-none space-y-[18px]">

      {/* 1. TOP SANDBOX HEADER STATUS BAR (Pixel-matched) */}
      <div className="sticky top-0 z-40 -mx-[clamp(16px,2.4vw,26px)] flex h-[58px] flex-nowrap items-center justify-between gap-2 border-b border-[#171a26] bg-[#080910] px-[clamp(16px,2.4vw,26px)]">
        {/* Brand & Subtitle */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setPage("workspaces")}
            aria-label="Return to workspaces"
            title="Return to workspaces"
            className="w-8 h-8 rounded-lg bg-[#11121d] border border-[#37364c] flex items-center justify-center text-[#b9a8ff] shadow-inner"
          >
            <Layers className="w-4 h-4 text-[#c4b5fd]" />
          </button>
          <div>
            <div className="flex min-w-0 items-center gap-2">
              <span className="font-bold text-white text-sm tracking-tight">Devpulse</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold bg-[#172446] text-[#9db7ff] border border-[#344b82] tracking-wider">
                SANDBOX V4.2
              </span>
            </div>
            <div className="text-[8px] font-mono tracking-widest text-[#526075] uppercase">
              ISOLATED TELEMETRY & VIRTUAL API FABRIC
            </div>
          </div>
        </div>

        {/* Center Indicators */}
        <div className="flex min-w-0 items-center justify-end gap-1.5 sm:gap-2">
          {/* Env / Synthetic Mesh Pill */}
          <div className="hidden min-[900px]:flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#0c121d] border border-[#182335] text-[9px] font-mono">
            <span className="w-2 h-2 rounded-full bg-[#eab308] animate-pulse" />
            <span className="text-[#8494a8]">env:</span>
            <span className="max-w-[90px] truncate text-white font-medium">{scenario.toLowerCase().replaceAll(" ", "-").replaceAll("/", "-")}</span>
          </div>

          {/* Ephemeral Probe Live */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-[#052e16]/40 border border-[#166534]/50 text-[9px] font-mono text-[#4ade80]">
            <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
            <span className="text-white">Probe Live</span>
            <span className="text-[#86efac]">• {runtimeLatency}ms</span>
          </div>

          {/* 100% Air-Gapped Pill */}
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-full bg-[#0b1728] border border-[#1e3a5f] text-[9px] font-mono text-[#38bdf8]">
            <ShieldCheck className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span className="font-medium text-white">100% Air-Gapped</span>
          </div>

          {/* Export Schema Button */}
          <button
            onClick={exportSchema}
            className="hidden sm:flex items-center gap-1 px-2 py-1.5 rounded-lg bg-[#0e1626] hover:bg-[#162238] border border-[#1f2d47] text-white text-[9px] font-mono transition-colors shadow-sm"
          >
            <ExternalLink className="w-3.5 h-3.5 text-[#8ca3ba]" />
            <span>Export Schema</span>
          </button>

          {/* Bell Notifications */}
          <button
            onClick={() =>
              snapshots.length
                ? setIsSnapshotPanelOpen((open) => !open)
                : setNotice("No sandbox alerts. Requests run locally and do not reach production.")
            }
            className="w-7 h-7 rounded-lg bg-[#0e1626] hover:bg-[#172338] border border-[#1f2d47] flex items-center justify-center text-[#94a3b8] transition-colors relative"
          >
            <Activity className="w-4 h-4 text-[#38bdf8]" />
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[#38bdf8]" />
          </button>

          {/* User Avatar */}
          <div className="flex items-center gap-2 pl-1">
            <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-[#0284c7] to-[#0ea5e9] flex items-center justify-center text-white text-[10px] font-bold ring-2 ring-[#0369a1]/40">
              {user.name
                .split(/\s+/)
                .filter(Boolean)
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div className="hidden min-[900px]:block text-left text-xs leading-tight">
              <div className="font-semibold text-white">{user.name}</div>
              <div className="text-[10px] text-[#64748b]">{user.role}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. SUB-BANNER: ISOLATED RUNTIME ACTIVE + CLUSTER INFO + SHIELD BANNER */}
      {notice && (
        <div
          role="status"
          className="fixed right-4 top-16 z-50 flex max-w-lg items-start gap-3 rounded-lg border border-[#344b82] bg-[#101522] px-3 py-2 text-xs text-[#cbd5e1] shadow-xl"
        >
          <span className="flex-1">{notice}</span>
          <button
            type="button"
            aria-label="Dismiss notice"
            onClick={() => setNotice("")}
            className="text-[#8494a8] hover:text-white"
          >
            ×
          </button>
        </div>
      )}
      {isSnapshotPanelOpen && (
        <div className="fixed right-4 top-16 z-50 w-[min(24rem,calc(100vw-2rem))] rounded-lg border border-[#263047] bg-[#0d101a] p-3 shadow-2xl">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-xs font-bold text-white">Sandbox snapshots</h2>
            <button
              type="button"
              onClick={() => setIsSnapshotPanelOpen(false)}
              className="text-xs text-[#8494a8] hover:text-white"
            >
              Close
            </button>
          </div>
          {snapshots.length === 0 ? (
            <p className="text-xs text-[#8494a8]">No snapshots yet.</p>
          ) : (
            <div className="max-h-64 space-y-2 overflow-y-auto">
              {snapshots.map((snapshot) => (
                <div
                  key={snapshot.id}
                  className="flex items-center justify-between gap-3 rounded border border-[#202a3d] bg-[#080b12] p-2"
                >
                  <div className="min-w-0">
                    <div className="truncate font-mono text-[10px] text-[#60a5fa]">
                      {snapshot.id}
                    </div>
                    <div className="text-[10px] text-[#718096]">
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
                    className="shrink-0 rounded border border-[#344b82] px-2 py-1 text-[10px] text-[#c7d2fe] hover:bg-[#1e1b4b]"
                  >
                    Restore
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
      <div className="min-h-[220px] rounded-xl border border-[#1d2030] bg-[#0d0e18] p-[15px] space-y-3">
      <div className="grid grid-cols-1 min-[900px]:grid-cols-[minmax(0,1fr)_250px] items-start gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-md bg-[#052e16]/60 border border-[#166534] text-xs font-mono font-medium text-[#4ade80]">
            <span className="w-2 h-2 rounded-full bg-[#22c55e] animate-pulse" />
            <span>ISOLATED RUNTIME ACTIVE</span>
          </div>

          <div className="text-xs font-mono text-[#718296] flex items-center gap-1.5">
            <span>Cluster:</span>
            <span className="text-[#cbd5e1] font-semibold">browser-local (isolated)</span>
          </div>

          <div className="text-xs font-mono text-[#718296] flex items-center gap-1.5">
            <span>Kernel:</span>
            <span className="text-[#38bdf8] font-semibold">local-simulator-v1</span>
          </div>

          {/* Session ID Chip with Copy */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0f1826] border border-[#1d2c42] text-xs font-mono text-[#899cb3]">
            <span>Session ID:</span>
            <span className="text-white">{sessionId}</span>
            <button
              onClick={handleCopyKernel}
              className="text-[#64748b] hover:text-white transition-colors"
              title="Copy session id"
            >
              {copiedKernel ? <Check className="w-3.5 h-3.5 text-[#22c55e]" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Green Shield Banner */}
        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-[#042f2e]/60 border border-[#0d9488]/40 text-xs font-mono text-[#2dd4bf] min-[900px]:justify-self-end">
          <ShieldCheck className="w-4 h-4 text-[#2dd4bf] shrink-0" />
          <span className="font-medium text-[#5eead4]">
            Shield Active: 100% Synthetic & Zero Production Impact
          </span>
        </div>
      </div>

      {/* 3. VIRTUAL SANDBOX CONTROLS HEADER BAR */}
      <div className="grid grid-cols-1 min-[1200px]:grid-cols-[1.2fr_1fr] items-start gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-lg font-bold text-white tracking-tight">
              Virtual Sandbox: {scenario}
            </h1>
            <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-[#1e1b4b] text-[#a5b4fc] border border-[#4338ca]/60">
              Faker Engine v5.4
            </span>
          </div>
          <p className="text-xs text-[#718096] mt-1 max-w-2xl">
            A local synthetic API simulator. Requests stay in this browser and never reach production services.
          </p>

        </div>

        {/* Right Actions */}
        <div className="grid min-w-0 grid-cols-2 items-center gap-1.5">
          {/* Scenario Selector Dropdown */}
          <div className="flex min-w-0 items-center gap-2">
            <span className="shrink-0 text-[10px] font-mono text-[#718096]">Scenario:</span>
            <div className="relative min-w-0 flex-1">
              <select
                value={scenario}
                onChange={(e) => applyScenario(e.target.value)}
                className="block w-full min-w-0 truncate appearance-none bg-[#0e1726] border border-[#1f2d47] text-white text-xs font-mono rounded-lg px-2 py-2 pr-6 hover:border-[#38bdf8] focus:outline-none focus:ring-1 focus:ring-[#38bdf8] transition-colors cursor-pointer"
              >
                <option value="Fintech / Payments v2">Fintech / Payments v2</option>
                <option value="Auth & Session Token Verification">Auth & Session Token Verification</option>
                <option value="Rate Limit & Backoff Emulation">Rate Limit & Backoff Emulation</option>
                <option value="High Load eBPF Simulation">High Load eBPF Simulation</option>
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-[#64748b] absolute right-2.5 top-2.5 pointer-events-none" />
            </div>
          </div>

          {/* Add Synthetic Records */}
          <button
            onClick={handleAddSyntheticRecords}
            className="flex items-center justify-center gap-1 px-2 py-2 rounded-lg bg-[#064e3b]/80 border border-[#059669]/60 hover:bg-[#065f46] text-[#34d399] text-[10px] font-mono font-medium transition-all shadow-md whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>+1,000 Synthetic Records</span>
          </button>

          {/* Snapshot Button */}
          <button
            onClick={snapshotSandbox}
            className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-[#0f1826] border border-[#213047] hover:bg-[#18253b] text-white text-xs font-mono transition-colors"
          >
            <Camera className="w-3.5 h-3.5 text-[#38bdf8]" />
            <span>Snapshot</span>
          </button>

          {/* Reset State Button */}
          <button
            onClick={handleResetState}
            className="flex items-center justify-center gap-1.5 px-2 py-2 rounded-lg bg-[#1f1620] border border-[#50232c] hover:bg-[#301c27] text-[#f87171] text-xs font-mono transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset State</span>
          </button>
        </div>
      </div>
      {/* Presets Chips */}
      <div className="flex flex-wrap items-center gap-2 text-xs font-mono">
        <span className="text-[#4f5f73] uppercase tracking-wider text-[10px]">PRESETS:</span>
        <button
          onClick={() => applyScenario("Fintech / Payments v2")}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#1e1b4b]/80 border border-[#4f46e5]/50 hover:bg-[#312e81] text-[#c7d2fe] transition-colors"
        >
          <span>+ Stripe/Ledger v2.4</span>
        </button>
        <button
          onClick={() => applyScenario("Auth0 / Token Verification")}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0f192b] border border-[#1e3458] hover:bg-[#1b2b46] text-[#cbd5e1] transition-colors"
        >
          <Key className="w-3 h-3 text-[#facc15]" />
          <span>Auth0 & JWT Verification</span>
        </button>
        <button
          onClick={() => applyScenario("Kafka / SQS Event Bus")}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0f192b] border border-[#1e3458] hover:bg-[#1b2b46] text-[#cbd5e1] transition-colors"
        >
          <Radio className="w-3 h-3 text-[#38bdf8]" />
          <span>Kafka / SQS Event Bus</span>
        </button>
        <button
          onClick={() => applyScenario("Apollo Federation Subgraph")}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0f192b] border border-[#1e3458] hover:bg-[#1b2b46] text-[#cbd5e1] transition-colors"
        >
          <Layers className="w-3 h-3 text-[#818cf8]" />
          <span>Apollo Federation Subgraph</span>
        </button>
      </div>
      </div>

      {/* 4. FOUR TELEMETRY & STATS CARDS */}
      <div className="grid grid-cols-1 min-[520px]:grid-cols-2 min-[1100px]:grid-cols-4 gap-3">
        {/* Card 1: Virtual Isolation */}
        <div className="h-[112px] p-2.5 rounded-lg bg-[#0b0c14] border border-[#1d2030] flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between text-[#718096]">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider">
              VIRTUAL ISOLATION
            </span>
            <div className="w-6 h-6 rounded-md bg-[#0f1c2e] border border-[#1a3354] flex items-center justify-center text-[#38bdf8]">
              <Lock className="w-3 h-3 text-[#38bdf8]" />
            </div>
          </div>
          <div className="mt-1 min-w-0">
            <div className="whitespace-nowrap text-xl font-black text-white font-mono tracking-tight flex items-baseline gap-2">
              100%
              <span className="text-xs font-semibold text-[#38bdf8] font-mono">Air-Gapped</span>
            </div>
            <div className="truncate whitespace-nowrap text-[9px] font-mono text-[#526075] mt-0.5">
              Ephemeral RAM • Zero Live DB writes
            </div>
          </div>
          {/* Progress bar line */}
          <div className="w-full h-1 bg-[#101826] rounded-full overflow-hidden mt-3">
            <div className="w-full h-full bg-[#38bdf8]" />
          </div>
        </div>

        {/* Card 2: Synthetic Masking */}
        <div className="h-[112px] p-2.5 rounded-lg bg-[#0b0c14] border border-[#1d2030] flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between text-[#718096]">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider">
              SYNTHETIC MASKING
            </span>
            <div className="w-6 h-6 rounded-md bg-[#07251f] border border-[#0f4d3f] flex items-center justify-center text-[#34d399]">
              <Fingerprint className="w-3 h-3 text-[#34d399]" />
            </div>
          </div>
          <div className="mt-1 min-w-0">
            <div className="whitespace-nowrap text-xl font-black text-white font-mono tracking-tight flex items-baseline gap-2">
              0 PII
              <span className="text-xs font-semibold text-[#34d399] font-mono">Masked</span>
            </div>
            <div className="truncate whitespace-nowrap text-[9px] font-mono text-[#526075] mt-0.5">
              Synthetic data • Seed alpha_49
            </div>
          </div>
          <div className="w-full h-1 bg-[#101826] rounded-full overflow-hidden mt-3">
            <div className="w-full h-full bg-[#10b981]" />
          </div>
        </div>

        {/* Card 3: Gateway Telemetry */}
        <div className="h-[112px] p-2.5 rounded-lg bg-[#0b0c14] border border-[#1d2030] flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between text-[#718096]">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider">
              GATEWAY TELEMETRY
            </span>
            <div className="w-6 h-6 rounded-md bg-[#2e1d0f] border border-[#5c3a1e] flex items-center justify-center text-[#fbbf24]">
              <Activity className="w-3 h-3 text-[#fbbf24]" />
            </div>
          </div>
          <div className="mt-1 min-w-0">
            <div className="whitespace-nowrap text-xl font-black text-white font-mono tracking-tight flex items-baseline gap-2">
              {runtimeLatency}ms
              <span className="text-xs font-semibold text-[#fbbf24] font-mono">
                {requestsPerMinute}/1000 RPM
              </span>
            </div>
            <div className="truncate whitespace-nowrap text-[9px] font-mono text-[#526075] mt-0.5">
              Local requests • no upstream connection
            </div>
          </div>
          <div className="w-full h-1 bg-[#101826] rounded-full overflow-hidden mt-3">
            <div
              className="h-full bg-[#f59e0b] transition-all"
              style={{ width: `${rateLimitPercent}%` }}
            />
          </div>
        </div>

        {/* Card 4: Security Envelope */}
        <div className="h-[112px] p-2.5 rounded-lg bg-[#0b0c14] border border-[#1d2030] flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between text-[#718096]">
            <span className="text-[10px] font-mono font-semibold uppercase tracking-wider">
              SECURITY ENVELOPE
            </span>
            <div className="w-6 h-6 rounded-md bg-[#1f162e] border border-[#432d66] flex items-center justify-center text-[#c084fc]">
              <ShieldCheck className="w-3 h-3 text-[#c084fc]" />
            </div>
          </div>
          <div className="mt-1 min-w-0">
            <div className="whitespace-nowrap text-xl font-black text-white font-mono tracking-tight flex items-baseline gap-2">
              TLS 1.3
              <span className="text-xs font-semibold text-[#a855f7] font-mono">mTLS Mock</span>
            </div>
            <div className="truncate whitespace-nowrap text-[9px] font-mono text-[#526075] mt-0.5">
              Synthetic JWT • SHA-256 Digest Enforced
            </div>
          </div>
          <div className="w-full h-1 bg-[#101826] rounded-full overflow-hidden mt-3">
            <div className="w-full h-full bg-[#a855f7]" />
          </div>
        </div>
      </div>

      {/* 5. WORKBENCH TWO-COLUMN: HTTP REQUEST WORKBENCH (LEFT) + SIMULATED RESPONSE (RIGHT) */}
      <div className="grid grid-cols-1 min-[1200px]:grid-cols-[minmax(0,1.42fr)_minmax(0,1fr)] gap-4">

        {/* LEFT COLUMN: HTTP REQUEST WORKBENCH */}
        <div className="p-3 rounded-lg bg-[#0b0c14] border border-[#1d2030] flex flex-col justify-between space-y-2">

          {/* Top Bar inside Request Workbench */}
          <div className="flex items-center justify-between pb-2 border-b border-[#141c29]">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-[#1e1b4b] flex items-center justify-center text-[#818cf8]">
                <Code2 className="w-3.5 h-3.5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-tight">HTTP Request Workbench</h2>
                <div className="text-[10px] font-mono text-[#526075]">OpenAPI 3.1 Contract Validated</div>
              </div>
            </div>

            {/* Latency Simulator Dropdown */}
            <div className="flex items-center gap-1.5 text-xs font-mono">
              <span className="text-[#eab308] text-[11px] flex items-center gap-1">
                <span>⏱</span> Latency Sim:
              </span>
              <div className="relative">
                <select
                  value={latencySim}
                  onChange={(e) => setLatencySim(e.target.value)}
                  className="appearance-none bg-[#0e1626] border border-[#1d2a40] text-xs text-[#38bdf8] font-mono rounded px-2.5 py-1 pr-6 hover:border-[#38bdf8] focus:outline-none cursor-pointer"
                >
                  <option value="24ms (Realistic Edge)">24ms (Realistic Edge)</option>
                  <option value="5ms (In-Memory MicroVM)">5ms (In-Memory MicroVM)</option>
                  <option value="120ms (Cross-Region Simulated)">120ms (Cross-Region Simulated)</option>
                  <option value="450ms (Jitter Spikes)">450ms (Jitter Spikes)</option>
                </select>
                <ChevronDown className="w-3 h-3 text-[#64748b] absolute right-1.5 top-2 pointer-events-none" />
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
                className="appearance-none bg-[#1e1b4b] border border-[#4338ca]/70 text-[#818cf8] font-bold text-xs font-mono rounded-lg px-2 py-2 pr-6 hover:border-[#6366f1] focus:outline-none cursor-pointer"
              >
                <option value="POST">POST</option>
                <option value="GET">GET</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
                <option value="PATCH">PATCH</option>
              </select>
              <ChevronDown className="w-3 h-3 text-[#818cf8] absolute right-2 top-3 pointer-events-none" />
            </div>

            {/* URL Input Bar */}
            <div className="flex min-w-0 flex-1 items-center bg-[#060a11] border border-[#162132] rounded-lg px-3 py-2 text-xs font-mono">
              <span className="text-[#475569] mr-1 hidden min-[1024px]:inline">local://sandbox/v1/</span>
              <input
                type="text"
                value={endpointUrl}
                onChange={(e) => setEndpointUrl(e.target.value)}
                className="min-w-0 bg-transparent text-white focus:outline-none flex-1 font-mono text-xs"
              />
              <button
                onClick={() => {
                  void copyText(
                    `local://sandbox/v1/${endpointUrl.replace(/^\/+/, "")}`,
                  );
                }}
                className="text-[#64748b] hover:text-white transition-colors ml-2"
                title="Copy URL"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Execute Button */}
            <button
              onClick={handleExecute}
              disabled={isExecuting}
              className="scroll-mt-16 flex shrink-0 items-center gap-1.5 px-3 py-2 rounded-lg bg-gradient-to-r from-[#4f46e5] to-[#6366f1] hover:from-[#4338ca] hover:to-[#4f46e5] text-white font-mono text-xs font-bold transition-all shadow-lg shadow-indigo-900/30 active:scale-95 disabled:opacity-50"
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
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 border-b border-[#141c29] pt-1">
            <div className="flex min-w-0 flex-wrap items-center gap-1">
              <button
                onClick={() => setRequestTab("body")}
                className={`px-3 py-1.5 rounded-t-lg text-xs font-mono font-medium transition-colors ${
                  requestTab === "body"
                    ? "bg-[#101826] text-white border-t-2 border-[#4f46e5]"
                    : "text-[#64748b] hover:text-[#94a3b8]"
                }`}
              >
                Body (JSON)
              </button>
              <button
                onClick={() => setRequestTab("auth")}
                className={`px-3 py-1.5 rounded-t-lg text-xs font-mono font-medium transition-colors flex items-center gap-1.5 ${
                  requestTab === "auth"
                    ? "bg-[#101826] text-white border-t-2 border-[#4f46e5]"
                    : "text-[#64748b] hover:text-[#94a3b8]"
                }`}
              >
                <span>Auth & Headers</span>
                <span className="w-4 h-4 rounded-full bg-[#1e1b4b] text-[#818cf8] text-[9px] flex items-center justify-center font-bold">
                {getJsonKeyCount(requestHeaders) + 1}
                </span>
              </button>
              <button
                onClick={() => setRequestTab("params")}
                className={`px-3 py-1.5 rounded-t-lg text-xs font-mono font-medium transition-colors flex items-center gap-1.5 ${
                  requestTab === "params"
                    ? "bg-[#101826] text-white border-t-2 border-[#4f46e5]"
                    : "text-[#64748b] hover:text-[#94a3b8]"
                }`}
              >
                <span>Params</span>
                <span className="w-4 h-4 rounded-full bg-[#064e3b] text-[#34d399] text-[9px] flex items-center justify-center font-bold">
                  {getJsonKeyCount(queryParams)}
                </span>
              </button>
              <button
                onClick={() => setRequestTab("rules")}
                className={`px-3 py-1.5 rounded-t-lg text-xs font-mono font-medium transition-colors ${
                  requestTab === "rules"
                    ? "bg-[#101826] text-white border-t-2 border-[#4f46e5]"
                    : "text-[#64748b] hover:text-[#94a3b8]"
                }`}
              >
                Mock Rules
              </button>
              <button
                onClick={() => setRequestTab("schema")}
                className={`px-3 py-1.5 rounded-t-lg text-xs font-mono font-medium transition-colors ${
                  requestTab === "schema"
                    ? "bg-[#101826] text-white border-t-2 border-[#4f46e5]"
                    : "text-[#64748b] hover:text-[#94a3b8]"
                }`}
              >
                Schema
              </button>
            </div>

            {/* Format & Generate Token Buttons */}
            <div className="ml-auto flex shrink-0 items-center gap-2 pb-1">
              <button
                onClick={handleFormatJson}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#0f1724] hover:bg-[#162132] border border-[#1b273b] text-white text-[11px] font-mono transition-colors"
              >
                <Code2 className="w-3 h-3 text-[#38bdf8]" />
                <span>Format</span>
              </button>
              <button
                onClick={handleGenerateToken}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-[#064e3b]/70 hover:bg-[#065f46] border border-[#059669]/60 text-[#34d399] text-[11px] font-mono transition-colors"
              >
                <Sparkles className="w-3 h-3" />
                <span>Generate Token</span>
              </button>
            </div>
          </div>

          {/* JSON Textarea Body */}
          <div className="relative min-h-[241px] rounded-lg bg-[#05080f] border border-[#151d2a] p-3 font-mono text-xs overflow-hidden">
            {requestTab === "body" && (
              <textarea
                aria-label="Request JSON body"
                value={requestBody}
                onChange={(e) => setRequestBody(e.target.value)}
                className="h-full min-h-[221px] w-full bg-transparent text-[#93c5fd] font-mono text-xs focus:outline-none resize-y leading-relaxed"
                spellCheck={false}
              />
            )}
            {requestTab === "auth" && (
              <div className="space-y-4">
                <label className="block space-y-1.5 text-[#94a3b8]">
                  <span>Bearer token (synthetic only)</span>
                  <input
                    value={authToken}
                    onChange={(event) => setAuthToken(event.target.value)}
                    className="w-full rounded border border-[#1b273b] bg-[#080c14] px-3 py-2 text-[#cbd5e1] outline-none focus:border-[#6366f1]"
                  />
                </label>
                <label className="block space-y-1.5 text-[#94a3b8]">
                  <span>Request headers (JSON)</span>
                  <textarea
                    value={requestHeaders}
                    onChange={(event) => setRequestHeaders(event.target.value)}
                    className="min-h-32 w-full rounded border border-[#1b273b] bg-[#080c14] px-3 py-2 text-[#93c5fd] outline-none focus:border-[#6366f1]"
                    spellCheck={false}
                  />
                </label>
              </div>
            )}
            {requestTab === "params" && (
              <label className="block space-y-1.5 text-[#94a3b8]">
                <span>Query parameters (JSON)</span>
                <textarea
                  value={queryParams}
                  onChange={(event) => setQueryParams(event.target.value)}
                  className="min-h-52 w-full rounded border border-[#1b273b] bg-[#080c14] px-3 py-2 text-[#93c5fd] outline-none focus:border-[#6366f1]"
                  spellCheck={false}
                />
              </label>
            )}
            {requestTab === "rules" && (
              <label className="block space-y-1.5 text-[#94a3b8]">
                <span>Mock response rules (JSON)</span>
                <textarea
                  value={mockRules}
                  onChange={(event) => setMockRules(event.target.value)}
                  className="min-h-52 w-full rounded border border-[#1b273b] bg-[#080c14] px-3 py-2 text-[#93c5fd] outline-none focus:border-[#6366f1]"
                  spellCheck={false}
                />
              </label>
            )}
            {requestTab === "schema" && (
              <div className="space-y-2 text-[#94a3b8]">
                <div>Request body schema for {httpMethod} /{endpointUrl}</div>
                <pre className="overflow-auto whitespace-pre-wrap text-[#93c5fd]">
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
          <div className="flex flex-wrap items-center justify-between text-[11px] font-mono text-[#526075] pt-1">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-[#10b981]" />
              <span className="text-[#94a3b8]">Strict RFC 8259 • OpenAPI 3.1 Validated</span>
            </div>
            <div>
              <span className="text-[#64748b]">Deterministic Seed:</span>{" "}
              <span className="text-[#cbd5e1] font-semibold">alpha_49</span>{" "}
              <span className="text-[#475569]">Bytes: {requestBytes.toLocaleString()} B</span>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: SIMULATED RESPONSE */}
        <div className="p-2 rounded-lg bg-[#0b0c14] border border-[#1d2030] flex flex-col justify-between space-y-1">

          {/* Top Bar inside Response Workbench */}
          <div className="flex items-center justify-between pb-2 border-b border-[#141c29]">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-[#052e16] flex items-center justify-center text-[#22c55e]">
                <Activity className="w-3.5 h-3.5" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-white tracking-tight">Simulated Response</h2>
                <div className="text-[10px] font-mono text-[#526075]">Synthetic Output</div>
              </div>
            </div>

            {/* Status Pill */}
            <div
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-mono font-bold ${
                statusCode < 400
                  ? "bg-[#052e16] border-[#15803d]/70 text-[#4ade80]"
                  : "bg-[#451a03]/60 border-[#b45309] text-[#fbbf24]"
              }`}
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  statusCode < 400 ? "bg-[#22c55e]" : "bg-[#f59e0b]"
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
          <div className="grid grid-cols-4 gap-1 text-center font-mono py-1 px-2 rounded-lg bg-[#060a12] border border-[#131c2b]">
            <div>
              <div className="text-[10px] text-[#4f5f73] uppercase tracking-wider">LATENCY</div>
              <div className="text-xs font-bold text-[#34d399] mt-0.5">{latencyValue}</div>
            </div>
            <div>
              <div className="text-[10px] text-[#4f5f73] uppercase tracking-wider">PAYLOAD</div>
              <div className="text-xs font-bold text-white mt-0.5">{payloadSize}</div>
            </div>
            <div>
              <div className="text-[10px] text-[#4f5f73] uppercase tracking-wider">VIRTUAL ID</div>
              <div className="text-xs font-bold text-[#60a5fa] mt-0.5">
                {lastTraceId.slice(-8)}
              </div>
            </div>
            <div>
              <div className="text-[10px] text-[#4f5f73] uppercase tracking-wider">CACHE</div>
              <div className="text-xs font-bold text-[#fbbf24] mt-0.5">
                {lastRunAt === null ? "READY" : "MISS (SIM)"}
              </div>
            </div>
          </div>

          {/* Sub Navigation Tabs (Response Body, Headers (11), eBPF Trace, SDK Snippet, Copy) */}
          <div className="flex items-center justify-between border-b border-[#141c29] pt-1">
            <div className="flex items-center gap-1">
              <button
                onClick={() => setResponseTab("body")}
                className={`px-2 py-1 rounded-t-lg text-[10px] font-mono font-medium transition-colors ${
                  responseTab === "body"
                    ? "bg-[#101826] text-white border-t-2 border-[#10b981]"
                    : "text-[#64748b] hover:text-[#94a3b8]"
                }`}
              >
                Response Body
              </button>
              <button
                onClick={() => setResponseTab("headers")}
                className={`px-2 py-1 rounded-t-lg text-[10px] font-mono font-medium transition-colors ${
                  responseTab === "headers"
                    ? "bg-[#101826] text-white border-t-2 border-[#10b981]"
                    : "text-[#64748b] hover:text-[#94a3b8]"
                }`}
              >
                Headers ({Object.keys(responseHeaders).length})
              </button>
              <button
                onClick={() => setResponseTab("ebpf")}
                className={`px-2 py-1 rounded-t-lg text-[10px] font-mono font-medium transition-colors ${
                  responseTab === "ebpf"
                    ? "bg-[#101826] text-white border-t-2 border-[#10b981]"
                    : "text-[#64748b] hover:text-[#94a3b8]"
                }`}
              >
                eBPF Trace
              </button>
              <button
                onClick={() => setResponseTab("sdk")}
                className={`px-2 py-1 rounded-t-lg text-[10px] font-mono font-medium transition-colors ${
                  responseTab === "sdk"
                    ? "bg-[#101826] text-white border-t-2 border-[#10b981]"
                    : "text-[#64748b] hover:text-[#94a3b8]"
                }`}
              >
                SDK Snippet
              </button>
            </div>

            {/* Copy Response Button */}
            <button
              onClick={handleCopyResponse}
              className="text-[#64748b] hover:text-white transition-colors pb-1 pr-1"
              title="Copy JSON response"
            >
              {copiedResponse ? (
                <Check className="w-4 h-4 text-[#22c55e]" />
              ) : (
                <Copy className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* Response JSON Output */}
          <div className="relative rounded-lg bg-[#05080f] border border-[#151d2a] p-3 font-mono text-xs overflow-hidden h-[300px] overflow-y-auto">
            {responseTab === "body" && (
              <pre className="text-[#38bdf8] leading-relaxed whitespace-pre-wrap font-mono text-xs">
                {responseBody}
              </pre>
            )}
            {responseTab === "headers" && (
              <div className="space-y-1.5 text-xs font-mono text-[#94a3b8]">
                {Object.entries(responseHeaders).map(([name, value]) => (
                  <div key={name}>
                    <span className="text-[#38bdf8]">{name}:</span>{" "}
                    {value}
                  </div>
                ))}
              </div>
            )}
            {responseTab === "ebpf" && (
              <div className="space-y-1 text-xs font-mono text-[#4ade80]">
                {traceLines.map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </div>
            )}
            {responseTab === "sdk" && (
              <pre className="text-[#c084fc] font-mono text-xs">
{`const response = await fetch("local://sandbox/v1/${endpointUrl.replace(/^\/+/, "")}", {
  method: "${httpMethod}",
  headers: ${JSON.stringify({ "Content-Type": "application/json", Authorization: authToken ? "Bearer [SYNTHETIC_TOKEN]" : "" }, null, 2)},
  body: ${httpMethod === "GET" || httpMethod === "DELETE" ? "undefined" : "JSON.stringify(" + JSON.stringify(requestBody) + ")"},
});

const result = await response.json();`}
              </pre>
            )}
          </div>

          <div className="text-[11px] font-mono text-[#526075] pt-1">
            Zero customer state persisted outside volatile node RAM.
          </div>
        </div>
      </div>

      {/* 6. BOTTOM TABLE: LIVE EPHEMERAL LEDGER & SYNTHETIC STATE TABLE */}
      <div className="rounded-lg border border-[#1d2030] bg-[#0b0c14] p-3 space-y-3">

        {/* Table Top Header & Actions */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded bg-[#07251f] border border-[#0f4d3f] flex items-center justify-center text-[#34d399]">
              <Database className="w-4 h-4 text-[#34d399]" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                Live Ephemeral Ledger & Synthetic State Table
              </h2>
              <div className="text-[10px] font-mono text-[#526075]">
                Editable synthetic records held in this browser session
              </div>
            </div>
          </div>

          {/* Counts and Flush Button */}
          <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0b121e] border border-[#162335]">
              <span className="w-2 h-2 rounded-full bg-[#818cf8]" />
              <span className="text-[#64748b]">mock_customers:</span>
              <span className="text-white font-bold">{mockCustomersCount}</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0b121e] border border-[#162335]">
              <span className="w-2 h-2 rounded-full bg-[#34d399]" />
              <span className="text-[#64748b]">simulated_tx:</span>
              <span className="text-white font-bold">{simulatedTxCount.toLocaleString()}</span>
            </div>

            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#0b121e] border border-[#162335]">
              <span className="w-2 h-2 rounded-full bg-[#fbbf24]" />
              <span className="text-[#64748b]">mock_sessions:</span>
              <span className="text-white font-bold">{mockSessionsCount}</span>
            </div>

            <button
              onClick={handleFlushEphemeralDb}
              className="px-3 py-1 rounded bg-[#3b1219]/80 border border-[#7f1d1d] hover:bg-[#501a23] text-[#f87171] text-xs font-mono font-medium transition-colors"
            >
              0x Flush Ephemeral DB
            </button>
          </div>
        </div>

        {/* Search Bar & Filter Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Search Input */}
          <div className="flex-1 min-w-[260px] max-w-xl flex items-center bg-[#060a12] border border-[#162234] rounded-lg px-3 py-2 text-xs font-mono">
            <Search className="w-3.5 h-3.5 text-[#475569] mr-2" />
            <input
              type="text"
              placeholder="Search synthetic identities, customer IDs, tokens, or hashes..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-white focus:outline-none flex-1 font-mono text-xs placeholder-[#475569]"
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
                  ? "bg-[#1e1b4b] text-[#c7d2fe] border border-[#4338ca]"
                  : "text-[#64748b] hover:text-white"
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
                  ? "bg-[#1e1b4b] text-[#c7d2fe] border border-[#4338ca]"
                  : "text-[#64748b] hover:text-white"
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
                  ? "bg-[#1e1b4b] text-[#c7d2fe] border border-[#4338ca]"
                  : "text-[#64748b] hover:text-white"
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
                  ? "bg-[#1e1b4b] text-[#c7d2fe] border border-[#4338ca]"
                  : "text-[#64748b] hover:text-white"
              }`}
            >
              Webhook Dispatched
            </button>
          </div>
        </div>

        {/* Table View */}
        <div className="rounded-xl border border-[#141d2c] overflow-hidden bg-[#060910]">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs font-mono">
              <thead>
                <tr className="border-b border-[#141d2c] bg-[#0b1019] text-[#526075] uppercase text-[10px] tracking-wider">
                  <th className="py-2.5 px-4">ENTITY ID</th>
                  <th className="py-2.5 px-4">SYNTHETIC IDENTITY & FAKER EMAIL</th>
                  <th className="py-2.5 px-4">VIRTUAL LEDGER VOLUME</th>
                  <th className="py-2.5 px-4">SIMULATION STATE</th>
                  <th className="py-2.5 px-4">SECURITY LEVEL</th>
                  <th className="py-2.5 px-4 text-right">ACTIONS</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#101724]">
                {visibleRecords.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-4 py-10 text-center text-xs text-[#64748b]"
                    >
                      No synthetic records match this search or filter.
                    </td>
                  </tr>
                )}
                {visibleRecords.map((row) => (
                  <tr key={row.id} className="hover:bg-[#0c121d] transition-colors group">
                    {/* Entity ID */}
                    <td
                      className="py-3 px-4 font-bold text-[#60a5fa] cursor-pointer hover:underline"
                      onClick={() => setInspectedRecord(row)}
                    >
                      {row.id}
                    </td>

                    {/* Identity + Email */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 rounded-full bg-[#1e293b] text-[#94a3b8] flex items-center justify-center text-[9px] font-bold">
                          {row.avatar}
                        </div>
                        <span className="text-[#cbd5e1] font-medium">{row.email}</span>
                      </div>
                    </td>

                    {/* Virtual Ledger Volume */}
                    <td className="py-3 px-4 font-bold text-[#fbbf24]">
                      {row.volume}
                    </td>

                    {/* Simulation State */}
                    <td className="py-3 px-4">
                      {row.status === "AUTH_VERIFIED_SIMULATED" ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#052e16]/60 border border-[#166534] text-[10px] text-[#4ade80] font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#22c55e]" />
                          <span>AUTH_VERIFIED_SIMULATED</span>
                        </div>
                      ) : (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#451a03]/60 border border-[#b45309] text-[10px] text-[#fbbf24] font-semibold">
                          <span className="w-1.5 h-1.5 rounded-full bg-[#f59e0b]" />
                          <span>RATE_LIMIT_TEST_ACTIVE</span>
                        </div>
                      )}
                    </td>

                    {/* Security Level */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded bg-[#111827] border border-[#1f2937] text-[#9ca3af] text-[10px]">
                          {row.security}
                        </span>
                        {row.securityBadge && (
                          <span className="px-2 py-0.5 rounded bg-[#1f1d2b] border border-[#3b3252] text-[#c084fc] text-[10px]">
                            {row.securityBadge}
                          </span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] ${
                            row.webhookDispatched
                              ? "bg-[#052e16]/60 text-[#4ade80]"
                              : "bg-[#111827] text-[#64748b]"
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
                          className="text-[#38bdf8] hover:underline"
                        >
                          Inspect
                        </button>
                        <button
                          onClick={() => toggleRecordState(row.id)}
                          className="text-[#64748b] hover:text-[#cbd5e1] hover:underline"
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
        <div className="flex flex-wrap items-center justify-between text-xs font-mono text-[#64748b] pt-1">
          <div>
            Showing{" "}
            <span className="text-white font-semibold">
              {filteredRecords.length === 0
                ? 0
                : (currentPage - 1) * pageSize + 1}
              -
              {Math.min(currentPage * pageSize, filteredRecords.length)}
            </span>{" "}
            of{" "}
            <span className="text-white font-semibold">
              {filteredRecords.length.toLocaleString()}
            </span>{" "}
            entries • Memory Pool:{" "}
            <span className="text-[#34d399] font-bold">
              {memoryUsedMb.toFixed(1)} MB
            </span>{" "}
            / {memoryLimitMb} MB
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={currentPage <= 1}
              className="px-2.5 py-1 rounded bg-[#0d1421] border border-[#1a273a] hover:bg-[#152135] text-[#94a3b8] transition-colors"
            >
              &lt; Prev
            </button>
            <span className="px-2.5 py-1 rounded bg-[#1e1b4b] border border-[#4338ca] text-[#c7d2fe] font-bold">
              {currentPage} / {pageCount}
            </span>
            <button
              onClick={() =>
                setCurrentPage((page) => Math.min(pageCount, page + 1))
              }
              disabled={currentPage >= pageCount}
              className="px-2.5 py-1 rounded bg-[#0d1421] border border-[#1a273a] hover:bg-[#152135] text-[#94a3b8] transition-colors"
            >
              Next &gt;
            </button>
          </div>
        </div>
      </div>

      {/* 7. BOTTOM PLATFORM FOOTER STATUS STRIP (Pixel-matched) */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#141b27] pt-3 text-[11px] font-mono text-[#526075]">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-[#34d399]">
            <span className="w-2 h-2 rounded-full bg-[#10b981]" />
            <span className="font-bold text-white">Devpulse Local Simulator</span>
          </div>
          <span>•</span>
          <span>In-memory session</span>
          <span>•</span>
          <span className="text-[#64748b]">Trace:</span>
          <span className="text-[#38bdf8]">{lastTraceId}</span>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <span className="text-[#64748b]">Last simulated latency:</span>
            <span className="text-[#34d399] font-bold">{latencyValue}</span>
          </div>
          <div className="flex items-center gap-1 text-[#94a3b8]">
            <span className="w-1.5 h-1.5 rounded-full bg-[#10b981]" />
            <span>No external requests sent</span>
          </div>
        </div>
      </div>

      {inspectedRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="sandbox-record-title"
            className="w-full max-w-lg rounded-xl border border-[#263047] bg-[#0d101a] p-4 shadow-2xl"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="sandbox-record-title"
                  className="text-sm font-bold text-white"
                >
                  Synthetic ledger record
                </h2>
                <p className="mt-1 font-mono text-xs text-[#60a5fa]">
                  {inspectedRecord.id}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setInspectedRecord(null)}
                className="rounded px-2 py-1 text-[#94a3b8] hover:bg-white/5 hover:text-white"
                aria-label="Close record details"
              >
                ×
              </button>
            </div>
            <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-xs">
              <dt className="text-[#64748b]">Name</dt>
              <dd className="text-white">{inspectedRecord.name}</dd>
              <dt className="text-[#64748b]">Email</dt>
              <dd className="break-all text-white">{inspectedRecord.email}</dd>
              <dt className="text-[#64748b]">Ledger volume</dt>
              <dd className="text-amber-300">{inspectedRecord.volume}</dd>
              <dt className="text-[#64748b]">Simulation state</dt>
              <dd className="text-white">{inspectedRecord.status}</dd>
              <dt className="text-[#64748b]">Webhook</dt>
              <dd className="text-white">
                {inspectedRecord.webhookDispatched ? "Dispatched" : "Not dispatched"}
              </dd>
              <dt className="text-[#64748b]">Security</dt>
              <dd className="text-white">{inspectedRecord.security}</dd>
            </dl>
            <div className="mt-5 flex justify-end">
              <button
                type="button"
                onClick={() => setInspectedRecord(null)}
                className="rounded-lg border border-[#343444] px-3 py-2 text-xs text-white hover:bg-white/5"
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
