from fastapi import APIRouter, Depends
from sqlmodel.ext.asyncio.session import AsyncSession

from src.db.main import get_session
from src.db.models import User
from src.errors import UserAlreadyExistsError

from .dependencies import get_current_user, user_service
from .schemas import UserResponseModel, UserUpdateModel

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/me", response_model=UserResponseModel)
async def get_me(user: User = Depends(get_current_user)) -> User:
    """Return the authenticated user.

    Verifying the OAuth id_token here doubles as "login or signup": the first
    time a verified identity is seen, the user record is created and their
    zkLogin Sui address is resolved via Enoki.
    """
    return user


@router.patch("/me", response_model=UserResponseModel)
async def update_me(
    user_data: UserUpdateModel,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
) -> User:
    """Update the authenticated user's editable profile fields.

    Args:
        user_data: The partial profile fields to update.
        user: The authenticated user.
        session: The database session.

    Raises:
        UserAlreadyExistsError: If the email is already in use by another user.

    Returns:
        The updated user.
    """
    user_data_dict = user_data.model_dump(exclude_unset=True)

    email = user_data_dict.get("email")
    if email and email != user.email:
        existing_user = await user_service.get_user_by_email(email, session)
        if existing_user is not None:
            raise UserAlreadyExistsError()

    return await user_service.update_user(user, user_data_dict, session)
