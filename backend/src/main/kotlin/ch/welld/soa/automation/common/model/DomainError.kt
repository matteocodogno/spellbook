package ch.welld.soa.automation.common.model

/**
 * Represents a sealed class for domain-specific errors in the application.
 *
 * This base class serves as a blueprint for encapsulating various categories
 * of errors that can occur within a domain. Each specific error type extends
 * this class, providing additional context for the error. All errors contain
 * a message describing the issue and an optional cause.
 *
 * The following subclasses are included:
 * - `DatabaseError`: Represents errors related to database operations.
 * - `ValidationError`: Represents errors related to validation rules.
 * - `NotFoundError`: Indicates a missing or non-existent resource.
 * - `UnexpectedError`: Represents unexpected or unforeseen errors.
 *
 * The `toException` method allows for converting a `DomainError` into a corresponding
 * exception class based on the specific error type.
 */
sealed class DomainError {
    abstract val message: String
    abstract val cause: Throwable?

    data class DatabaseError(
        override val message: String,
        override val cause: Throwable? = null,
    ) : DomainError()

    data class ValidationError(
        override val message: String,
        override val cause: Throwable? = null,
    ) : DomainError()

    data class NotFoundError(
        override val message: String,
        override val cause: Throwable? = null,
    ) : DomainError()

    data class UnexpectedError(
        override val message: String,
        override val cause: Throwable? = null,
    ) : DomainError()

    data class StateError(
        override val message: String,
        override val cause: Throwable? = null,
    ) : DomainError()

    /**
     * Converts the current domain-specific error into a corresponding runtime exception.
     *
     * This method maps the specific type of `DomainError` to its equivalent runtime exception by:
     * - Converting `DatabaseError` to `DatabaseException`.
     * - Converting `ValidationError` to `ValidationException`.
     * - Converting `NotFoundError` to `NotFoundException`.
     * - Converting `UnexpectedError` to `UnexpectedException`.
     * - Converting `StateError` to `IllegalStateException`.
     *
     * @return A `RuntimeException` representing the specific error type.
     */
    fun toException(): RuntimeException =
        when (this) {
            is DatabaseError -> DatabaseException(message, cause)
            is ValidationError -> ValidationException(message, cause)
            is NotFoundError -> NotFoundException(message, cause)
            is UnexpectedError -> UnexpectedException(message, cause)
            is StateError -> IllegalStateException(message, cause)
        }
}

// Domain-specific exceptions

/**
 * Represents an exception that occurs during database operations.
 *
 * This exception is typically used to encapsulate errors related to
 * database connectivity, queries, or any database-specific issues.
 *
 * @param message A detailed message describing the error.
 * @param cause The root cause of the exception, if available.
 */
class DatabaseException(
    message: String,
    cause: Throwable? = null,
) : RuntimeException(message, cause)

/**
 * Represents an exception that is specifically thrown in cases of validation errors.
 *
 * This exception is typically used to indicate that a certain validation rule has failed,
 * often in the context of domain validation or input validation processes.
 *
 * @param message A detailed message describing the error.
 * @param cause The root cause of the exception, if available.
 */
class ValidationException(
    message: String,
    cause: Throwable? = null,
) : RuntimeException(message, cause)

/**
 * Exception indicating that a requested resource or entity was not found.
 *
 * This exception is typically used to signify that an operation failed due to a missing or
 * non-existent resource. It can encapsulate additional context about the error by providing
 * an optional cause.
 *
 * @param message A detailed message describing the error.
 * @param cause The root cause of the exception, if available.
 */
class NotFoundException(
    message: String,
    cause: Throwable? = null,
) : RuntimeException(message, cause)

/**
 * Represents an unexpected exception that occurs during program execution.
 *
 * This exception is typically used to wrap cases of unforeseen failures or errors
 * that do not fall into predefined error categories.
 *
 * @param message A detailed message describing the error.
 * @param cause The root cause of the exception, if available.
 */
class UnexpectedException(
    message: String,
    cause: Throwable? = null,
) : RuntimeException(message, cause)
