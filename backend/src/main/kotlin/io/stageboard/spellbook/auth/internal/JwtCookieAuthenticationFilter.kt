package io.stageboard.spellbook.auth.internal

import io.stageboard.spellbook.common.model.Result
import jakarta.servlet.FilterChain
import jakarta.servlet.http.HttpServletRequest
import jakarta.servlet.http.HttpServletResponse
import org.springframework.security.authentication.AbstractAuthenticationToken
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.security.oauth2.jwt.JwtDecoder
import org.springframework.web.filter.OncePerRequestFilter

class JwtCookieAuthentication(
    private val jwt: Jwt,
) : AbstractAuthenticationToken(emptyList()) {
    init {
        isAuthenticated = true
    }

    override fun getCredentials(): Any = jwt.tokenValue
    override fun getPrincipal(): Any = jwt
}

class JwtCookieAuthenticationFilter(
    private val jwtDecoder: JwtDecoder,
) : OncePerRequestFilter() {
    override fun doFilterInternal(
        request: HttpServletRequest,
        response: HttpServletResponse,
        chain: FilterChain,
    ) {
        val token = request.cookies?.find { it.name == "session" }?.value
        if (token != null) {
            val jwt = Result.catching { jwtDecoder.decode(token) }
            jwt.fold(
                onSuccess = { decoded ->
                    val context = SecurityContextHolder.createEmptyContext()
                    context.authentication = JwtCookieAuthentication(decoded)
                    SecurityContextHolder.setContext(context)
                },
                onFailure = { /* invalid token — let downstream 401 */ },
            )
        }
        chain.doFilter(request, response)
    }
}
