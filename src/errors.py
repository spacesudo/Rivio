import logging
from collections.abc import Callable
from typing import Any

from fastapi import FastAPI, status
from fastapi.requests import Request
from fastapi.responses import JSONResponse
from sqlalchemy.exc import SQLAlchemyError


class VeloException(Exception):
    """Base exception for Velo API errors."""

    pass


class UserNotFoundError(VeloException):
    """Raised if the user is not found."""

    pass


class UserNotAuthenticatedError(VeloException):
    """Raised if the user is not authenticated."""

    pass


class UserNotAuthorizedError(VeloException):
    """Raised if the user is not authorized to access the resource."""

    pass


class InvalidTokenError(VeloException):
    """Raised if the OAuth id_token is invalid or fails verification."""

    pass


class TokenExpiredError(VeloException):
    """Raised if the OAuth id_token has expired."""

    pass


class UnsupportedProviderError(VeloException):
    """Raised if the OAuth issuer/provider is not supported or configured."""

    pass


class AccountRestrictedError(VeloException):
    """Raised if the account is restricted."""

    pass


class EnokiError(VeloException):
    """Raised when an Enoki API request fails."""

    pass


class SuiBuildError(VeloException):
    """Raised when building a Sui transaction fails."""

    pass


class KycRequiredError(VeloException):
    """Raised when an action requires a completed KYC verification."""

    pass


class UserUpdateError(VeloException):
    """Raised when updating a user fails."""

    pass


class UserAlreadyExistsError(VeloException):
    """Raised when an email is already in use by another user."""

    pass


class OnrampError(VeloException):
    """Raised when a fiat on-ramp (Transak) request fails."""

    pass


class SwapError(VeloException):
    """Raised when a DeepBook swap request is invalid (e.g. unsupported pair)."""

    pass


class LendingError(VeloException):
    """Raised when a lending request is invalid (e.g. unsupported asset)."""

    pass


def create_exception_handler(
    status_code: int, initial_details: Any
) -> Callable[[Request, Exception], JSONResponse]:
    async def exception_handler(request: Request, exc: VeloException):
        return JSONResponse(content=initial_details, status_code=status_code)

    return exception_handler


def register_all_errors(app: FastAPI) -> None:
    """Register all custom exception handlers with the FastAPI app."""

    app.add_exception_handler(
        UserNotAuthenticatedError,
        create_exception_handler(
            status_code=status.HTTP_401_UNAUTHORIZED,
            initial_details={
                "message": "User is not authenticated",
                "error_code": "not_authenticated",
                "resolution": "Log in or sign up to access this resource.",
            },
        ),
    )

    app.add_exception_handler(
        UserNotAuthorizedError,
        create_exception_handler(
            status_code=status.HTTP_403_FORBIDDEN,
            initial_details={
                "message": "User is not authorized to access this resource",
                "error_code": "not_authorized",
                "resolution": "You do not have permission for this action.",
            },
        ),
    )

    app.add_exception_handler(
        UserNotFoundError,
        create_exception_handler(
            status_code=status.HTTP_404_NOT_FOUND,
            initial_details={
                "message": "User not found",
                "error_code": "user_not_found",
                "resolution": "Check the identifier or sign up if you do not have an account.",
            },
        ),
    )

    app.add_exception_handler(
        AccountRestrictedError,
        create_exception_handler(
            status_code=status.HTTP_403_FORBIDDEN,
            initial_details={
                "message": "Account is restricted",
                "error_code": "account_restricted",
                "resolution": "Please contact support to unrestrict your account.",
            },
        ),
    )

    app.add_exception_handler(
        UserUpdateError,
        create_exception_handler(
            status_code=status.HTTP_400_BAD_REQUEST,
            initial_details={
                "message": "Failed to update user",
                "error_code": "user_update_failed",
                "resolution": "Please try again or contact support.",
            },
        ),
    )

    app.add_exception_handler(
        UserAlreadyExistsError,
        create_exception_handler(
            status_code=status.HTTP_409_CONFLICT,
            initial_details={
                "message": "Email is already in use",
                "error_code": "user_already_exists",
                "resolution": "Use a different email address.",
            },
        ),
    )

    app.add_exception_handler(
        InvalidTokenError,
        create_exception_handler(
            status_code=status.HTTP_401_UNAUTHORIZED,
            initial_details={
                "message": "Invalid authentication token",
                "error_code": "invalid_token",
                "resolution": "Sign in again to obtain a fresh id_token.",
            },
        ),
    )

    app.add_exception_handler(
        TokenExpiredError,
        create_exception_handler(
            status_code=status.HTTP_401_UNAUTHORIZED,
            initial_details={
                "message": "Authentication token has expired",
                "error_code": "token_expired",
                "resolution": "Sign in again to obtain a fresh id_token.",
            },
        ),
    )

    app.add_exception_handler(
        UnsupportedProviderError,
        create_exception_handler(
            status_code=status.HTTP_400_BAD_REQUEST,
            initial_details={
                "message": "Unsupported or unconfigured OAuth provider",
                "error_code": "unsupported_provider",
                "resolution": "Use a supported login provider (Google or Apple).",
            },
        ),
    )

    app.add_exception_handler(
        OnrampError,
        create_exception_handler(
            status_code=status.HTTP_502_BAD_GATEWAY,
            initial_details={
                "message": "On-ramp request failed",
                "error_code": "onramp_error",
                "resolution": "Try again later. If the problem persists, contact support.",
            },
        ),
    )

    app.add_exception_handler(
        EnokiError,
        create_exception_handler(
            status_code=status.HTTP_502_BAD_GATEWAY,
            initial_details={
                "message": "Enoki request failed",
                "error_code": "enoki_error",
                "resolution": "Try again later. If the problem persists, contact support.",
            },
        ),
    )

    app.add_exception_handler(
        SuiBuildError,
        create_exception_handler(
            status_code=status.HTTP_400_BAD_REQUEST,
            initial_details={
                "message": "Failed to build the Sui transaction",
                "error_code": "sui_build_error",
                "resolution": "Check the recipient address, amount, and that you have sufficient balance.",
            },
        ),
    )

    app.add_exception_handler(
        SwapError,
        create_exception_handler(
            status_code=status.HTTP_400_BAD_REQUEST,
            initial_details={
                "message": "Swap request is invalid",
                "error_code": "swap_error",
                "resolution": "Check the trading pair, amount, and slippage settings.",
            },
        ),
    )

    app.add_exception_handler(
        LendingError,
        create_exception_handler(
            status_code=status.HTTP_400_BAD_REQUEST,
            initial_details={
                "message": "Lending request is invalid",
                "error_code": "lending_error",
                "resolution": "Check the asset, amount, and that the action is supported.",
            },
        ),
    )

    app.add_exception_handler(
        KycRequiredError,
        create_exception_handler(
            status_code=status.HTTP_403_FORBIDDEN,
            initial_details={
                "message": "KYC verification is required",
                "error_code": "kyc_required",
                "resolution": "Complete identity verification before making transfers.",
            },
        ),
    )

    @app.exception_handler(500)
    async def internal_server_error(request: Request, exc: Exception):
        return JSONResponse(
            content={
                "message": "Oops! Something went wrong",
                "error_code": "server_error",
                "resolution": "Try again later. If the problem persists, contact support.",
            },
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    @app.exception_handler(SQLAlchemyError)
    async def database_error(request: Request, exc: Exception):
        logging.exception("Database error: %s", exc)
        return JSONResponse(
            content={
                "message": "Oops! Something went wrong",
                "error_code": "server_error",
                "resolution": "Try again later. If the problem persists, contact support.",
            },
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
