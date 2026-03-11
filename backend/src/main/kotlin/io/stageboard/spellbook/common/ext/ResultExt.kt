package io.stageboard.spellbook.common.ext

import io.stageboard.spellbook.common.model.DomainError
import io.stageboard.spellbook.common.model.Result
import org.slf4j.LoggerFactory
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity

private val log = LoggerFactory.getLogger("io.stageboard.spellbook.common.ext.ResultExt")

/**
 * Converts a [Result] to a [ResponseEntity].
 *
 * On [Result.Success], wraps the value in a response with [successStatus].
 * An optional [successBody] transform can be used to shape the response payload
 * (e.g. map to a DTO, or return `null` for 204 No Content responses).
 *
 * On [Result.Failure], delegates to [DomainError.toResponseEntity].
 */
fun <T> Result<T>.toResponseEntity(
    successStatus: HttpStatus = HttpStatus.OK,
    successBody: (T) -> Any? = { it },
): ResponseEntity<Any> =
    when (this) {
        is Result.Success -> ResponseEntity.status(successStatus).body(successBody(value))
        is Result.Failure -> error.toResponseEntity()
    }

/**
 * Maps a [DomainError] to a [ResponseEntity] with the appropriate HTTP status and
 * a structured error body `{ "error": "...", "code": "..." }`.
 *
 * 5xx errors are logged at ERROR level server-side; the response body never exposes
 * internal details such as stack traces or underlying exception messages.
 */
fun DomainError.toResponseEntity(): ResponseEntity<Any> =
    when (this) {
        is DomainError.ValidationError -> {
            ResponseEntity.status(HttpStatus.BAD_REQUEST).body(
                mapOf("error" to message, "code" to "ValidationError", "fields" to fields),
            )
        }

        is DomainError.NotFoundError -> {
            ResponseEntity.status(HttpStatus.NOT_FOUND).body(
                mapOf("error" to message, "code" to "NotFoundError"),
            )
        }

        is DomainError.StateError -> {
            ResponseEntity.status(HttpStatus.CONFLICT).body(
                mapOf("error" to message, "code" to "StateError") + context,
            )
        }

        is DomainError.DatabaseError -> {
            log.error("Database error: $message", cause)
            ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                mapOf("error" to "Internal server error", "code" to "DatabaseError"),
            )
        }

        is DomainError.UnexpectedError -> {
            log.error("Unexpected error: $message", cause)
            ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(
                mapOf("error" to "Internal server error", "code" to "UnexpectedError"),
            )
        }
    }
