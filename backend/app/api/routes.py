from fastapi import APIRouter, Depends

from app.auth.dependencies import get_current_init_data
from app.auth.telegram import InitData

router = APIRouter(prefix="/api")


@router.get("/me")
async def read_me(init_data: InitData = Depends(get_current_init_data)):
    return {
        "telegram_id": init_data.user.id,
        "first_name": init_data.user.first_name,
        "username": init_data.user.username,
    }
