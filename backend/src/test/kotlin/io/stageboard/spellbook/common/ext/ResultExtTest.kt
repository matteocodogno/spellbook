package io.stageboard.spellbook.common.ext

import io.stageboard.spellbook.common.model.DomainError
import io.stageboard.spellbook.common.model.FieldError
import io.stageboard.spellbook.common.model.Result
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.Test
import org.springframework.http.HttpStatus

class ResultExtTest {
    // ── Result.toResponseEntity() ────────────────────────────────────────────

    @Test
    fun `success with default status returns 200 with body`() {
        val result = Result.success("hello")

        val response = result.toResponseEntity()

        assertThat(response.statusCode).isEqualTo(HttpStatus.OK)
        assertThat(response.body).isEqualTo("hello")
    }

    @Test
    fun `success with custom status returns that status`() {
        val result = Result.success(mapOf("id" to "123"))

        val response = result.toResponseEntity(HttpStatus.CREATED)

        assertThat(response.statusCode).isEqualTo(HttpStatus.CREATED)
    }

    @Test
    fun `success with custom body transform applies transform`() {
        val result = Result.success(42)

        val response = result.toResponseEntity(successBody = { mapOf("value" to it) })

        assertThat(response.body).isEqualTo(mapOf("value" to 42))
    }

    @Test
    fun `success with null body transform returns 204 with no body`() {
        val result = Result.success(Unit)

        val response = result.toResponseEntity(HttpStatus.NO_CONTENT) { null }

        assertThat(response.statusCode).isEqualTo(HttpStatus.NO_CONTENT)
        assertThat(response.body).isNull()
    }

    @Test
    fun `failure delegates to DomainError toResponseEntity`() {
        val result = Result.failure<String>(DomainError.NotFoundError("not found"))

        val response = result.toResponseEntity()

        assertThat(response.statusCode).isEqualTo(HttpStatus.NOT_FOUND)
    }

    // ── DomainError.toResponseEntity() ───────────────────────────────────────

    @Test
    fun `ValidationError returns 400 with error code and fields`() {
        val error =
            DomainError.ValidationError(
                message = "Validation failed",
                fields = listOf(FieldError("title", "must not be blank")),
            )

        val response = error.toResponseEntity()

        assertThat(response.statusCode).isEqualTo(HttpStatus.BAD_REQUEST)
        @Suppress("UNCHECKED_CAST")
        val body = response.body as Map<String, Any>
        assertThat(body["error"]).isEqualTo("Validation failed")
        assertThat(body["code"]).isEqualTo("ValidationError")
        assertThat(body["fields"]).isEqualTo(listOf(FieldError("title", "must not be blank")))
    }

    @Test
    fun `ValidationError with empty fields returns 400 with empty fields list`() {
        val error = DomainError.ValidationError(message = "Invalid input")

        val response = error.toResponseEntity()

        assertThat(response.statusCode).isEqualTo(HttpStatus.BAD_REQUEST)
        @Suppress("UNCHECKED_CAST")
        val body = response.body as Map<String, Any>
        assertThat(body["fields"]).isEqualTo(emptyList<FieldError>())
    }

    @Test
    fun `NotFoundError returns 404 with error and code`() {
        val error = DomainError.NotFoundError("Workshop not found")

        val response = error.toResponseEntity()

        assertThat(response.statusCode).isEqualTo(HttpStatus.NOT_FOUND)
        @Suppress("UNCHECKED_CAST")
        val body = response.body as Map<String, Any>
        assertThat(body["error"]).isEqualTo("Workshop not found")
        assertThat(body["code"]).isEqualTo("NotFoundError")
    }

    @Test
    fun `StateError returns 409 with error, code, and context payload`() {
        val error =
            DomainError.StateError(
                message = "Workshop is locked",
                context = mapOf("lockedBy" to "Alice", "lockedAt" to "2026-03-11T10:00:00Z"),
            )

        val response = error.toResponseEntity()

        assertThat(response.statusCode).isEqualTo(HttpStatus.CONFLICT)
        @Suppress("UNCHECKED_CAST")
        val body = response.body as Map<String, Any>
        assertThat(body["error"]).isEqualTo("Workshop is locked")
        assertThat(body["code"]).isEqualTo("StateError")
        assertThat(body["lockedBy"]).isEqualTo("Alice")
        assertThat(body["lockedAt"]).isEqualTo("2026-03-11T10:00:00Z")
    }

    @Test
    fun `DatabaseError returns 500 with generic message and no internals`() {
        val error = DomainError.DatabaseError("connection refused", RuntimeException("secret"))

        val response = error.toResponseEntity()

        assertThat(response.statusCode).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR)
        @Suppress("UNCHECKED_CAST")
        val body = response.body as Map<String, Any>
        assertThat(body["error"]).isEqualTo("Internal server error")
        assertThat(body["code"]).isEqualTo("DatabaseError")
        assertThat(body.containsKey("cause")).isFalse()
    }

    @Test
    fun `UnexpectedError returns 500 with generic message and no internals`() {
        val error = DomainError.UnexpectedError("NullPointerException in foo", RuntimeException("secret"))

        val response = error.toResponseEntity()

        assertThat(response.statusCode).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR)
        @Suppress("UNCHECKED_CAST")
        val body = response.body as Map<String, Any>
        assertThat(body["error"]).isEqualTo("Internal server error")
        assertThat(body["code"]).isEqualTo("UnexpectedError")
        assertThat(body.containsKey("cause")).isFalse()
    }
}
