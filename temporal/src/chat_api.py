from __future__ import annotations
import asyncio
import logging
import uuid

from aiohttp import web
from temporalio.client import Client

from .config import settings

logger = logging.getLogger(__name__)

CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
}


def _json(data: dict, status: int = 200) -> web.Response:
    return web.json_response(data, status=status, headers=CORS_HEADERS)


async def handle_options(_req: web.Request) -> web.Response:
    return web.Response(status=204, headers=CORS_HEADERS)


async def handle_chat(req: web.Request) -> web.Response:
    try:
        body = await req.json()
    except Exception:
        return _json({"error": "Invalid JSON"}, 400)

    message = body.get("message", "").strip()
    if not message:
        return _json({"error": "message is required"}, 400)

    conversation_id = body.get("conversation_id") or str(uuid.uuid4())
    user_id = body.get("user_id") or "00000000-0000-0000-0000-000000000000"
    workflow_id = f"chat-{conversation_id}-{uuid.uuid4().hex[:8]}"

    client: Client = req.app["temporal_client"]

    try:
        handle = await client.start_workflow(
            "ChatWorkflow",
            {"user_id": user_id, "conversation_id": conversation_id, "message": message, "context": body.get("context") or {}},
            id=workflow_id,
            task_queue=settings.temporal_task_queue,
        )
        result = await asyncio.wait_for(handle.result(), timeout=90)
        return _json(result)
    except asyncio.TimeoutError:
        return _json({"error": "Chat took too long, please try again"}, 504)
    except Exception as exc:
        logger.error("chat_api_error error=%s", str(exc))
        return _json({"error": str(exc)}, 500)


async def handle_health(_req: web.Request) -> web.Response:
    return _json({"status": "ok"})


def create_app() -> web.Application:
    app = web.Application()
    app.router.add_route("OPTIONS", "/api/chat", handle_options)
    app.router.add_route("POST", "/api/chat", handle_chat)
    app.router.add_route("GET", "/api/health", handle_health)
    return app


async def start_chat_api(client: Client, host: str = "0.0.0.0", port: int = 8081) -> web.AppRunner:
    app = create_app()
    app["temporal_client"] = client
    runner = web.AppRunner(app)
    await runner.setup()
    site = web.TCPSite(runner, host, port)
    await site.start()
    logger.info("Chat API started host=%s port=%d", host, port)
    return runner
