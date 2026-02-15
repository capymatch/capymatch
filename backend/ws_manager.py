from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List
import json
import logging

logger = logging.getLogger(__name__)


class ConnectionManager:
    """In-memory WebSocket connection registry keyed by tenant_id."""

    def __init__(self):
        self.connections: Dict[str, List[WebSocket]] = {}

    async def connect(self, tenant_id: str, ws: WebSocket):
        await ws.accept()
        if tenant_id not in self.connections:
            self.connections[tenant_id] = []
        self.connections[tenant_id].append(ws)
        logger.info(f"WebSocket connected: tenant={tenant_id} (total={len(self.connections[tenant_id])})")

    def disconnect(self, tenant_id: str, ws: WebSocket):
        if tenant_id in self.connections:
            self.connections[tenant_id] = [c for c in self.connections[tenant_id] if c is not ws]
            if not self.connections[tenant_id]:
                del self.connections[tenant_id]
        logger.info(f"WebSocket disconnected: tenant={tenant_id}")

    async def send_to_tenant(self, tenant_id: str, event: dict):
        if tenant_id not in self.connections:
            return
        dead = []
        for ws in self.connections[tenant_id]:
            try:
                await ws.send_json(event)
            except Exception:
                dead.append(ws)
        for ws in dead:
            self.disconnect(tenant_id, ws)


manager = ConnectionManager()
