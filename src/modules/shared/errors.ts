export class BusinessError extends Error {
  readonly code: string;

  constructor(message: string, code = "BUSINESS") {
    super(message);
    this.name = "BusinessError";
    this.code = code;
  }
}

export class ForbiddenError extends BusinessError {
  constructor(permission: string) {
    super(`ไม่มีสิทธิ์: ${permission}`, "FORBIDDEN");
    this.name = "ForbiddenError";
  }
}

export class UnauthenticatedError extends BusinessError {
  constructor(message = "ต้องเข้าสู่ระบบก่อน") {
    super(message, "UNAUTHENTICATED");
    this.name = "UnauthenticatedError";
  }
}
