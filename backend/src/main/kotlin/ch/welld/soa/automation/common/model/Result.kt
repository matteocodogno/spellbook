package ch.welld.soa.automation.common.model

import org.springframework.dao.DataAccessException

/**
 * Represents the result of an operation that can either succeed with a value or fail with an error.
 *
 * This is a union type (sealed class) that forces exhaustive when-expression handling,
 * making error handling explicit and type-safe.
 *
 * @param T The type of the success value
 */
@Suppress("TooManyFunctions")
sealed class Result<out T> {
    /**
     * Represents a successful operation with a value.
     */
    data class Success<T>(
        val value: T,
    ) : Result<T>()

    /**
     * Represents a failed operation with an error.
     */
    data class Failure(
        val error: DomainError,
    ) : Result<Nothing>()

    /**
     * Returns true if this is a Success result.
     */
    val isSuccess: Boolean get() = this is Success

    /**
     * Returns true if this is a Failure result.
     */
    val isFailure: Boolean get() = this is Failure

    /**
     * Maps a successful result to a new value using the provided transform function.
     * If this is a Failure, returns the Failure unchanged.
     */
    inline fun <R> map(transform: (T) -> R): Result<R> =
        when (this) {
            is Success -> Success(transform(value))
            is Failure -> this
        }

    /**
     * Maps a failed result to a new error using the provided transform function.
     * If this is a Success, returns the Success unchanged.
     */
    inline fun mapError(transform: (DomainError) -> DomainError): Result<T> =
        when (this) {
            is Success -> this
            is Failure -> Failure(transform(error))
        }

    /**
     * FlatMaps a successful result to a new Result using the provided transform function.
     * If this is a Failure, returns the Failure unchanged.
     */
    inline fun <R> flatMap(transform: (T) -> Result<R>): Result<R> =
        when (this) {
            is Success -> transform(value)
            is Failure -> this
        }

    /**
     * Returns the result of [onSuccess] for the encapsulated value if this instance represents [Success]
     * or the result of [onFailure] function for the encapsulated [DomainError] if it is [Failure].
     */
    inline fun <R> fold(
        onSuccess: (T) -> R,
        onFailure: (DomainError) -> R,
    ): R =
        when (this) {
            is Success -> onSuccess(value)
            is Failure -> onFailure(error)
        }

    /**
     * Executes the provided action if this is a Success.
     */
    inline fun onSuccess(action: (T) -> Unit): Result<T> {
        if (this is Success) action(value)
        return this
    }

    /**
     * Executes the provided action if this is a Failure.
     */
    inline fun onFailure(action: (DomainError) -> Unit): Result<T> {
        if (this is Failure) action(error)
        return this
    }

    /**
     * Returns the value if Success, or throws the error if Failure.
     */
    fun getOrThrow(): T =
        when (this) {
            is Success -> value
            is Failure -> throw error.toException()
        }

    /**
     * Returns the value if Success, or the provided default value if Failure.
     */
    fun getOrElse(default: @UnsafeVariance T): T =
        when (this) {
            is Success -> value
            is Failure -> default
        }

    /**
     * Returns the value if Success, or computes a default value from the error if Failure.
     */
    inline fun getOrElse(default: (DomainError) -> @UnsafeVariance T): T =
        when (this) {
            is Success -> value
            is Failure -> default(error)
        }

    /**
     * Returns the value if Success, or null if Failure.
     */
    fun getOrNull(): T? =
        when (this) {
            is Success -> value
            is Failure -> null
        }

    /**
     * Recovers from a Failure by transforming the error into a Success.
     */
    inline fun recover(transform: (DomainError) -> @UnsafeVariance T): Result<T> =
        when (this) {
            is Success -> this
            is Failure -> Success(transform(error))
        }

    /**
     * Recovers from a Failure by transforming the error into a new Result.
     */
    inline fun recoverWith(transform: (DomainError) -> Result<@UnsafeVariance T>): Result<T> =
        when (this) {
            is Success -> this
            is Failure -> transform(error)
        }

    companion object {
        /**
         * Creates a Success result.
         */
        fun <T> success(value: T): Result<T> = Success(value)

        /**
         * Creates a Failure result.
         */
        fun <T> failure(error: DomainError): Result<T> = Failure(error)

        /**
         * Catches exceptions and wraps them in a Result.
         */
        inline fun <T> catching(block: () -> T): Result<T> =
            try {
                Success(block())
            } catch (e: DataAccessException) {
                Failure(DomainError.DatabaseError(e.message ?: "Unknown database error", e))
            } catch (e: Exception) {
                Failure(DomainError.UnexpectedError(e.message ?: "Unknown error", e))
            }
    }
}
