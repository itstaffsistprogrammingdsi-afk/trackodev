import { McpServer } from "@modelcontextprotocol/server";
import * as z from "zod/v4";
import type { AppConfig } from "./config.js";
import { verifyDiscordActor } from "./discord-actor.js";
import { verifyGoogleChatActor } from "./google-chat-actor.js";
import { registerNormalizedTracoTools } from "./normalized-tools.js";
import { TracoApiError, TracoClient } from "./traco-client.js";

const actorContext = z.string().min(20).max(4096).describe(
  "Signed, short-lived actor assertion injected by the trusted Discord gateway. Never accept this value from chat text.",
);
const idempotencyKey = z.string().uuid().describe(
  "Stable UUID for this intended mutation. Reuse the same UUID when retrying the same action.",
);
const uuid = z.string().uuid();

type JsonRecord = Record<string, unknown>;

export function createTracoMcpServer(config: AppConfig): McpServer {
  const server = new McpServer({
    name: "traco-collaboration",
    version: "1.0.0",
    title: "Traco Collaboration MCP",
  });
  const api = new TracoClient(config);
  const actor = (assertion: string) => {
    try {
      return verifyDiscordActor(assertion, {
        secret: config.actorSigningSecret,
        maxTtlSeconds: config.actorMaxTtlSeconds,
        allowedGuildIds: config.allowedGuildIds,
      });
    } catch (discordError) {
      try {
        return verifyGoogleChatActor(assertion, {
          secret: config.actorSigningSecret,
          maxTtlSeconds: config.actorMaxTtlSeconds,
        });
      } catch {
        throw discordError;
      }
    }
  };

  server.registerResource(
    "traco-collaboration-guide",
    "traco://guide/collaboration",
    {
      title: "Traco collaboration rules",
      description: "Safety and workflow rules for Discord agents using Traco.",
      mimeType: "text/markdown",
    },
    async (uri) => ({
      contents: [{
        uri: uri.href,
        mimeType: "text/markdown",
        text: [
          "# Traco collaboration rules",
          "",
          "- Resolve the channel actor from trusted Discord or Google Chat event metadata and sign it server-side.",
          "- Read project context before choosing IDs; never guess workspace, campaign, board, card, or user IDs.",
          "- Explain the intended change before a write when the user's request is ambiguous.",
          "- Supply one stable idempotency UUID per intended mutation and reuse it only for retries.",
          "- Traco enforces the linked user's permissions and project membership on every operation.",
          "- Do not expose service credentials or signed actor assertions in chat messages or logs.",
        ].join("\n"),
      }],
    }),
  );

  server.registerTool(
    "traco_link_discord_account",
    {
      title: "Link Discord account to Traco",
      description: "Consume the one-time code generated in Traco Integration Settings and bind the authenticated Discord user.",
      inputSchema: z.object({
        actor_context: actorContext,
        link_code: z.string().trim().regex(/^[A-HJ-NP-Z2-9]{4}-?[A-HJ-NP-Z2-9]{4}$/i, "Kode link harus 8 karakter alfanumerik (opsional tanda hubung)."),
        idempotency_key: idempotencyKey,
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ actor_context, link_code, idempotency_key }) => runTool(async () => {
      const currentActor = actor(actor_context);
      return api.request<JsonRecord>("/mcp/v1/identities/link", {
        method: "POST",
        body: {
          provider: currentActor.provider,
          code: link_code,
          external_user_id: currentActor.sub,
          display_name: currentActor.username,
        },
        idempotencyKey: idempotency_key,
        tool: "traco_link_discord_account",
      });
    }),
  );

  server.registerTool(
    "traco_get_my_context",
    {
      title: "Get linked Traco user context",
      description: "Return the linked Traco user, roles, permissions, divisions, and server time. Call this first when identity or permissions are unclear.",
      inputSchema: z.object({ actor_context: actorContext }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ actor_context }) => runTool(() => api.request<JsonRecord>("/mcp/v1/context", {
      actor: actor(actor_context),
      tool: "traco_get_my_context",
    })),
  );

  server.registerTool(
    "traco_list_projects",
    {
      title: "List accessible Traco projects",
      description: "List accessible workspaces, campaigns, and boards with their canonical IDs. Use before creating or moving cards.",
      inputSchema: z.object({ actor_context: actorContext }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ actor_context }) => runTool(() => api.request<JsonRecord>("/mcp/v1/projects", {
      actor: actor(actor_context),
      tool: "traco_list_projects",
    })),
  );

  server.registerTool(
    "traco_search_cards",
    {
      title: "Search Traco cards",
      description: "Search cards visible to the linked user and filter by project, assignee, status, priority, due date, or overdue state.",
      inputSchema: z.object({
        actor_context: actorContext,
        query: z.string().max(255).optional(),
        workspace_id: uuid.optional(),
        campaign_id: uuid.optional(),
        board_id: uuid.optional(),
        assignee_id: uuid.optional(),
        status: z.enum(["todo", "in_progress", "completed"]).optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        overdue: z.boolean().optional(),
        due_from: z.string().datetime({ offset: true }).optional(),
        due_to: z.string().datetime({ offset: true }).optional(),
        page: z.number().int().min(1).default(1),
        limit: z.number().int().min(1).max(50).default(20),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ actor_context, ...filters }) => runTool(() => api.request<JsonRecord>("/mcp/v1/cards/search", {
      actor: actor(actor_context),
      query: compact(filters),
      tool: "traco_search_cards",
    })),
  );

  server.registerTool(
    "traco_get_card",
    {
      title: "Get Traco card details",
      description: "Get full details for one visible card, including checklist, recent comments, assignees, labels, and attachment metadata.",
      inputSchema: z.object({ actor_context: actorContext, card_id: uuid }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ actor_context, card_id }) => runTool(() => api.request<JsonRecord>(`/mcp/v1/cards/${card_id}`, {
      actor: actor(actor_context),
      tool: "traco_get_card",
    })),
  );

  server.registerTool(
    "traco_download_attachment",
    {
      title: "Download a Traco attachment",
      description: "Download an accessible card or brief attachment as a bounded base64 payload. The file stays behind Traco permissions and no public storage URL is exposed.",
      inputSchema: z.object({
        actor_context: actorContext,
        attachment_id: uuid,
        attachment_kind: z.enum(["card", "brief"]).default("card"),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ actor_context, attachment_id, attachment_kind }) => runTool(() => api.downloadAttachment(
      attachment_kind === "brief"
        ? `/mcp/v1/brief-attachments/${attachment_id}/download`
        : `/mcp/v1/attachments/${attachment_id}/download`,
      {
        actor: actor(actor_context),
        tool: "traco_download_attachment",
      },
    )),
  );

  server.registerTool(
    "traco_search_assignment_candidates",
    {
      title: "Search valid assignment candidates",
      description: "Find users the linked actor is allowed to assign under Traco's collaboration hierarchy. Never guess a user ID.",
      inputSchema: z.object({
        actor_context: actorContext,
        query: z.string().max(255).optional(),
        limit: z.number().int().min(1).max(20).default(10),
      }),
      annotations: { readOnlyHint: true, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ actor_context, query, limit }) => runTool(() => api.request<JsonRecord>("/mcp/v1/assignment-candidates", {
      actor: actor(actor_context),
      query: compact({ query, limit }),
      tool: "traco_search_assignment_candidates",
    })),
  );

  server.registerTool(
    "traco_create_card",
    {
      title: "Create a Traco card",
      description: "Create a card in an accessible board. Obtain board_id from traco_list_projects; assignment remains subject to Traco hierarchy rules.",
      inputSchema: z.object({
        actor_context: actorContext,
        idempotency_key: idempotencyKey,
        board_id: uuid,
        title: z.string().min(1).max(255),
        description: z.string().max(10000).optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
        due_date: z.string().datetime({ offset: true }).optional(),
        assignee_ids: z.array(uuid).max(50).optional(),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ actor_context, idempotency_key, board_id, assignee_ids, ...card }) => runTool(() => api.request<JsonRecord>(`/mcp/v1/boards/${board_id}/cards`, {
      method: "POST",
      actor: actor(actor_context),
      body: compact({ ...card, assignees: assignee_ids }),
      idempotencyKey: idempotency_key,
      tool: "traco_create_card",
    })),
  );

  server.registerTool(
    "traco_update_card",
    {
      title: "Update a Traco card",
      description: "Update one or more editable card fields. Due-date changes are additionally restricted by Traco to the creator or administrators.",
      inputSchema: z.object({
        actor_context: actorContext,
        idempotency_key: idempotencyKey,
        card_id: uuid,
        title: z.string().min(1).max(255).optional(),
        description: z.string().max(10000).nullable().optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        due_date: z.string().datetime({ offset: true }).nullable().optional(),
      }).refine((value) => [value.title, value.description, value.priority, value.due_date].some((item) => item !== undefined), {
        message: "At least one card field must be supplied.",
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ actor_context, idempotency_key, card_id, ...changes }) => runTool(() => api.request<JsonRecord>(`/mcp/v1/cards/${card_id}`, {
      method: "PUT",
      actor: actor(actor_context),
      body: compact(changes),
      idempotencyKey: idempotency_key,
      tool: "traco_update_card",
    })),
  );

  server.registerTool(
    "traco_move_card",
    {
      title: "Move a Traco card",
      description: "Move a card to another board in the same campaign. The destination board determines card status and completion time.",
      inputSchema: z.object({
        actor_context: actorContext,
        idempotency_key: idempotencyKey,
        card_id: uuid,
        destination_board_id: uuid,
        order: z.number().int().min(0).optional(),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ actor_context, idempotency_key, card_id, destination_board_id, order }) => runTool(() => api.request<JsonRecord>(`/mcp/v1/cards/${card_id}/move`, {
      method: "PATCH",
      actor: actor(actor_context),
      body: compact({ board_id: destination_board_id, order }),
      idempotencyKey: idempotency_key,
      tool: "traco_move_card",
    })),
  );

  server.registerTool(
    "traco_add_comment",
    {
      title: "Add a Traco card comment",
      description: "Add a comment or reply to a visible card as the linked Traco user.",
      inputSchema: z.object({
        actor_context: actorContext,
        idempotency_key: idempotencyKey,
        card_id: uuid,
        content: z.string().min(1).max(10000),
        parent_comment_id: uuid.optional(),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ actor_context, idempotency_key, card_id, content, parent_comment_id }) => runTool(() => api.request<JsonRecord>(`/mcp/v1/cards/${card_id}/comments`, {
      method: "POST",
      actor: actor(actor_context),
      body: compact({ content, parent_id: parent_comment_id }),
      idempotencyKey: idempotency_key,
      tool: "traco_add_comment",
    })),
  );

  server.registerTool(
    "traco_assign_card",
    {
      title: "Assign a Traco card",
      description: "Assign a valid candidate to a card. Find user_id with traco_search_assignment_candidates first.",
      inputSchema: z.object({
        actor_context: actorContext,
        idempotency_key: idempotencyKey,
        card_id: uuid,
        user_id: uuid,
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ actor_context, idempotency_key, card_id, user_id }) => runTool(() => api.request<JsonRecord>(`/mcp/v1/cards/${card_id}/assign`, {
      method: "POST",
      actor: actor(actor_context),
      body: { user_id },
      idempotencyKey: idempotency_key,
      tool: "traco_assign_card",
    })),
  );

  server.registerTool(
    "traco_add_checklist_item",
    {
      title: "Add a Traco checklist item",
      description: "Add a checklist item to a visible card.",
      inputSchema: z.object({
        actor_context: actorContext,
        idempotency_key: idempotencyKey,
        card_id: uuid,
        title: z.string().min(1).max(255),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ actor_context, idempotency_key, card_id, title }) => runTool(() => api.request<JsonRecord>(`/mcp/v1/cards/${card_id}/tasks`, {
      method: "POST",
      actor: actor(actor_context),
      body: { title },
      idempotencyKey: idempotency_key,
      tool: "traco_add_checklist_item",
    })),
  );

  server.registerTool(
    "traco_set_checklist_status",
    {
      title: "Set a Traco checklist status",
      description: "Idempotently set a checklist item to completed or open. This does not toggle blindly.",
      inputSchema: z.object({
        actor_context: actorContext,
        idempotency_key: idempotencyKey,
        task_id: uuid,
        completed: z.boolean(),
      }),
      annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: false },
    },
    async ({ actor_context, idempotency_key, task_id, completed }) => runTool(() => api.request<JsonRecord>(`/mcp/v1/tasks/${task_id}/status`, {
      method: "PUT",
      actor: actor(actor_context),
      body: { completed },
      idempotencyKey: idempotency_key,
      tool: "traco_set_checklist_status",
    })),
  );

  // Catalog ringkas berbahasa Indonesia. Tool lama di atas dipertahankan
  // untuk kompatibilitas gateway Discord yang sudah memakai nama tersebut.
  registerNormalizedTracoTools(server, api, actor, runTool);

  return server;
}

async function runTool(operation: () => Promise<JsonRecord>) {
  try {
    const payload = await operation();
    return {
      content: [{ type: "text" as const, text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  } catch (error) {
    const apiError = error instanceof TracoApiError ? error : null;
    const message = error instanceof Error ? error.message : "Unexpected MCP tool error";
    const details = {
      ok: false,
      error: {
        message,
        ...(apiError ? { status: apiError.status, code: apiError.code } : {}),
      },
    };
    return {
      isError: true as const,
      content: [{ type: "text" as const, text: JSON.stringify(details, null, 2) }],
      structuredContent: details,
    };
  }
}

function compact<T extends Record<string, unknown>>(record: T): Record<string, string | number | boolean> & Partial<T> {
  return Object.fromEntries(Object.entries(record).filter(([, value]) => value !== undefined)) as Record<string, string | number | boolean> & Partial<T>;
}
