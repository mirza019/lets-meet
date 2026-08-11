import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse

from app.api.routes import router
from app.core.config import get_settings

settings = get_settings()
app = FastAPI(title="Let's Meet API", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)
app.include_router(router)


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
    return RedirectResponse(settings.frontend_base_url, status_code=307)


@app.get("/health")
def health():
    return {"status": "ok"}
