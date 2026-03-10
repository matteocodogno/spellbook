package ch.welld.soa.automation.common.model

sealed class Result<out T> {
    data class Success<T>(val value: T) : Result<T>()
    data class Failure(val error: DomainError) : Result<Nothing>()
}

fun <T> T.ok(): Result<T> = Result.Success(this)
fun DomainError.fail(): Result<Nothing> = Result.Failure(this)

inline fun <T, R> Result<T>.map(transform: (T) -> R): Result<R> = when (this) {
    is Result.Success -> Result.Success(transform(value))
    is Result.Failure -> this
}

inline fun <T> Result<T>.onSuccess(action: (T) -> Unit): Result<T> {
    if (this is Result.Success) action(value)
    return this
}

inline fun <T> Result<T>.onFailure(action: (DomainError) -> Unit): Result<T> {
    if (this is Result.Failure) action(error)
    return this
}
