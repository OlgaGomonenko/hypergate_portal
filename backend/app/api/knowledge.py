from fastapi import APIRouter, HTTPException, status
from fastapi.responses import FileResponse

from app.content import knowledge as knowledge_repo

router = APIRouter(prefix="/api/knowledge", tags=["knowledge"])


@router.get("/articles")
async def list_articles():
    """Список статей без содержимого (для карточек списка/поиска) — как и
    tax-values, это статичный справочный контент, авторизация не нужна."""
    return [{k: v for k, v in article.items() if k != "content"} for article in knowledge_repo.list_articles()]


@router.get("/articles/{article_id}")
async def get_article(article_id: str):
    article = knowledge_repo.get_article(article_id)
    if article is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Статья не найдена")
    return article


@router.get("/images/{filename}")
async def get_image(filename: str):
    """Скрины для статей (::image / ![]()) — имя файла проверяется в
    get_image_path (только простое имя + разрешённое расширение)."""
    path = knowledge_repo.get_image_path(filename)
    if path is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Файл не найден")
    return FileResponse(path)
