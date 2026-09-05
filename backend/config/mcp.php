<?php

return [
    'rate_limit_per_minute' => (int) env('MCP_RATE_LIMIT_PER_MINUTE', 120),
    'link_code_ttl_minutes' => (int) env('MCP_LINK_CODE_TTL_MINUTES', 10),
    'idempotency_ttl_hours' => (int) env('MCP_IDEMPOTENCY_TTL_HOURS', 24),
    'audit_retention_days' => (int) env('MCP_AUDIT_RETENTION_DAYS', 90),
    'max_page_size' => (int) env('MCP_MAX_PAGE_SIZE', 50),
    // External channel identities accepted by the MCP actor boundary.
    'providers' => ['discord', 'google_chat'],
];
