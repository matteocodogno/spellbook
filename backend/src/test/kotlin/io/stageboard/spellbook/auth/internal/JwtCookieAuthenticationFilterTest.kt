package io.stageboard.spellbook.auth.internal

import jakarta.servlet.FilterChain
import org.assertj.core.api.Assertions.assertThat
import org.junit.jupiter.api.AfterEach
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.junit.jupiter.api.extension.ExtendWith
import org.mockito.Mock
import org.mockito.Mockito.verifyNoInteractions
import org.mockito.Mockito.`when`
import org.mockito.junit.jupiter.MockitoExtension
import org.springframework.mock.web.MockFilterChain
import org.springframework.mock.web.MockHttpServletRequest
import org.springframework.mock.web.MockHttpServletResponse
import org.springframework.security.core.context.SecurityContextHolder
import org.springframework.security.oauth2.jwt.BadJwtException
import org.springframework.security.oauth2.jwt.Jwt
import org.springframework.security.oauth2.jwt.JwtDecoder
import java.time.Instant

@ExtendWith(MockitoExtension::class)
class JwtCookieAuthenticationFilterTest {
    @Mock
    lateinit var jwtDecoder: JwtDecoder

    private lateinit var filter: JwtCookieAuthenticationFilter
    private lateinit var chain: FilterChain

    @BeforeEach
    fun setUp() {
        filter = JwtCookieAuthenticationFilter(jwtDecoder)
        chain = MockFilterChain()
        SecurityContextHolder.clearContext()
    }

    @AfterEach
    fun tearDown() {
        SecurityContextHolder.clearContext()
    }

    @Test
    fun `when no cookies, security context is not populated and chain proceeds`() {
        val request = MockHttpServletRequest()
        val response = MockHttpServletResponse()

        filter.doFilter(request, response, chain)

        assertThat(SecurityContextHolder.getContext().authentication).isNull()
    }

    @Test
    fun `when session cookie with valid JWT, security context is populated`() {
        val jwt = buildJwt("user-id")
        `when`(jwtDecoder.decode("valid-token")).thenReturn(jwt)

        val request =
            MockHttpServletRequest().apply {
                setCookies(jakarta.servlet.http.Cookie("session", "valid-token"))
            }
        val response = MockHttpServletResponse()

        filter.doFilter(request, response, chain)

        val auth = SecurityContextHolder.getContext().authentication
        assertThat(auth).isNotNull
        assertThat(auth).isInstanceOf(JwtCookieAuthentication::class.java)
    }

    @Test
    fun `when session cookie with invalid JWT, security context is not populated and chain proceeds`() {
        `when`(jwtDecoder.decode("bad-token")).thenThrow(BadJwtException("invalid"))

        val request =
            MockHttpServletRequest().apply {
                setCookies(jakarta.servlet.http.Cookie("session", "bad-token"))
            }
        val response = MockHttpServletResponse()

        filter.doFilter(request, response, chain)

        assertThat(SecurityContextHolder.getContext().authentication).isNull()
    }

    @Test
    fun `when other cookies present but no session cookie, security context is not populated`() {
        val request =
            MockHttpServletRequest().apply {
                setCookies(
                    jakarta.servlet.http.Cookie("other", "value"),
                    jakarta.servlet.http.Cookie("csrf", "token"),
                )
            }
        val response = MockHttpServletResponse()

        filter.doFilter(request, response, chain)

        assertThat(SecurityContextHolder.getContext().authentication).isNull()
        verifyNoInteractions(jwtDecoder)
    }

    @Test
    fun `when no cookies at all, security context is not populated`() {
        val request = MockHttpServletRequest() // no cookies set
        val response = MockHttpServletResponse()

        filter.doFilter(request, response, chain)

        assertThat(SecurityContextHolder.getContext().authentication).isNull()
        verifyNoInteractions(jwtDecoder)
    }

    private fun buildJwt(subject: String): Jwt =
        Jwt
            .withTokenValue("valid-token")
            .header("alg", "HS256")
            .subject(subject)
            .issuedAt(Instant.now())
            .expiresAt(Instant.now().plusSeconds(86400))
            .build()
}
