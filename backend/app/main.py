import logging
from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles

from app.api.routes import router
from app.core.config import get_settings

settings = get_settings()
static_dir = Path(__file__).resolve().parents[1] / "static"
index_file = static_dir / "index.html"
app = FastAPI(title="Let's Meet API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)
app.include_router(router)
if (static_dir / "assets").is_dir():
    app.mount("/assets", StaticFiles(directory=static_dir / "assets"), name="frontend-assets")


class TokenRedactionFilter(logging.Filter):
    def filter(self, record: logging.LogRecord) -> bool:
        if record.args and isinstance(record.args, tuple):
            record.args = tuple(
                "[REDACTED_PATH]" if isinstance(v, str) and ("/invite/" in v or "/respond/" in v) else v for v in record.args
            )
        return True


logging.getLogger("uvicorn.access").addFilter(TokenRedactionFilter())


@app.get("/", include_in_schema=False)
def home():
    if index_file.is_file():
        return FileResponse(index_file)
    return RedirectResponse(settings.frontend_base_url, status_code=307)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/{path:path}", include_in_schema=False)
def frontend(path: str):
    if path.startswith("api/"):
        raise HTTPException(404, "Not found")
    requested_file = static_dir / path
    if requested_file.is_file() and static_dir in requested_file.resolve().parents:
        return FileResponse(requested_file)
    if index_file.is_file():
        return FileResponse(index_file)
    raise HTTPException(404, "Frontend build not found")
