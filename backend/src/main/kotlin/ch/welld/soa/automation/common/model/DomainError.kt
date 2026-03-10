package ch.welld.soa.automation.common.model

sealed class DomainError {
    // Auth errors
    data object Unauthorized : DomainError()
    data object Forbidden : DomainError()

    // Resource errors
    data class NotFound(val resource: String, val id: String) : DomainError()
    data class Conflict(val message: String) : DomainError()

    // Lock errors
    data class WorkshopLocked(val lockedBy: String) : DomainError()

    // Validation errors
    data class ValidationFailed(val field: String, val reason: String) : DomainError()
    data class InvalidContent(val message: String) : DomainError()

    // Infrastructure errors
    data class StorageError(val message: String) : DomainError()
    data class ExternalServiceError(val service: String, val message: String) : DomainError()

    // Import errors
    data class ImportFailed(val message: String) : DomainError()
    data class SessionNotFound(val sessionId: String) : DomainError()
    data class SessionExpired(val sessionId: String) : DomainError()
}
