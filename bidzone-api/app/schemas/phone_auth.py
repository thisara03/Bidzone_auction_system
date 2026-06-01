from pydantic import BaseModel, Field


class PhoneSendCodeBody(BaseModel):
    phone_e164: str = Field(..., min_length=8, max_length=20, description="E.164, e.g. +94771234567")


class PhoneVerifyBody(BaseModel):
    phone_e164: str = Field(..., min_length=8, max_length=20)
    code: str = Field(..., min_length=6, max_length=6, pattern=r"^\d{6}$")
